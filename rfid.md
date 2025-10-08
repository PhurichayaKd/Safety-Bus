#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <HardwareSerial.h>   // UART2 ไปหา ESP8266

/* ===== Wi-Fi & Supabase ===== */
const char* WIFI_SSID = "Phuri";
const char* WIFI_PASS = "11111111";

const char* SUPABASE_URL = "https://ugkxolufzlnvjsvtpxhp.supabase.co";
const char* SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE";

/* ===== ESP32 ↔ RC522 (3.3V only) =====
   GPIO5  -> SDA/SS
   GPIO18 -> SCK
   GPIO23 -> MOSI
   GPIO19 -> MISO
   GPIO27 -> RST
*/
#define RF_SS   5
#define RF_RST  27
#define RF_SCK  18
#define RF_MOSI 23
#define RF_MISO 19

MFRC522 rfid(RF_SS, RF_RST);

/* ===== Buzzer ===== */
#define BUZZER_PIN 4
const bool USE_BUZZER = true;
const bool USE_PASSIVE_BUZZER = false;

/* UID formatting */
const bool PRINT_WITH_COLON = false;

/* Dedup & watchdog */
String lastUID = "";
unsigned long lastScanMs = 0;
const unsigned long DEDUP_MS = 3000;  // เพิ่มเป็น 3 วินาที เพื่อป้องกันการสแกนซ้ำ
unsigned long lastAnyActivity = 0;
const unsigned long REINIT_AFTER_MS = 8000;

/* การป้องกันการสแกนซ้ำขั้นสูง */
struct ScanHistory {
  String uid;
  unsigned long timestamp;
  String location_type;
};
const int MAX_SCAN_HISTORY = 10;
ScanHistory scanHistory[MAX_SCAN_HISTORY];
int scanHistoryIndex = 0;

/* ===== UART ไป ESP8266 =====
   ต่อสาย: ESP32 TX2(GPIO17) -> ESP8266 RX0(GPIO3), และ GND↔GND
*/
HardwareSerial Link(2);
const int UART_TX = 17;  // TX2
const int UART_RX = 16;  // RX2 (อาจไม่ใช้ถ้าส่งทางเดียว)

/* ===== Helpers ===== */
String uidHex(const MFRC522::Uid &uid, bool withColon) {
  String s;
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) s += "0";
    s += String(uid.uidByte[i], HEX);
    if (withColon && i + 1 < uid.size) s += ":";
  }
  s.toUpperCase();
  return s;
}

void noteActivity(){ lastAnyActivity = millis(); }

/* ===== ฟังก์ชันป้องกันการสแกนซ้ำขั้นสูง ===== */
bool isRecentScan(const String& uid, const String& locationType) {
  unsigned long now = millis();
  
  // ตรวจสอบประวัติการสแกน 10 ครั้งล่าสุด
  for (int i = 0; i < MAX_SCAN_HISTORY; i++) {
    if (scanHistory[i].uid == uid && 
        scanHistory[i].location_type == locationType &&
        (now - scanHistory[i].timestamp) < DEDUP_MS) {
      Serial.printf("[DEDUP] Card %s already scanned %lu ms ago for %s\n", 
                    uid.c_str(), now - scanHistory[i].timestamp, locationType.c_str());
      return true;
    }
  }
  return false;
}

void addToScanHistory(const String& uid, const String& locationType) {
  scanHistory[scanHistoryIndex].uid = uid;
  scanHistory[scanHistoryIndex].timestamp = millis();
  scanHistory[scanHistoryIndex].location_type = locationType;
  scanHistoryIndex = (scanHistoryIndex + 1) % MAX_SCAN_HISTORY;
}

void waitForCardRemoval() {
  while (rfid.PICC_IsNewCardPresent() || rfid.PICC_ReadCardSerial()) {
    delay(50);
  }
  delay(150);
}

void resetRC522() {
  rfid.PCD_Reset();
  rfid.PCD_Init();
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);
  rfid.PCD_AntennaOn();
  delay(20);
}

/* Buzzer patterns */
void beep(unsigned ms=80) {
  if (!USE_BUZZER) return;
  pinMode(BUZZER_PIN, OUTPUT);
  if (USE_PASSIVE_BUZZER) { tone(BUZZER_PIN, 2400); delay(ms); noTone(BUZZER_PIN); }
  else { digitalWrite(BUZZER_PIN, HIGH); delay(ms); digitalWrite(BUZZER_PIN, LOW); }
}
void beep_ok()      { beep(120); }
void beep_denied()  { beep(60); delay(80); beep(60); }

/* Wi-Fi */
void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.persistent(false);
  WiFi.setSleep(false);
  WiFi.mode(WIFI_STA);

  Serial.printf("Connecting WiFi to %s ...\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("WiFi connected: %s  RSSI=%d\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("WiFi connect timeout.");
  }
}

/* ===== ส่งข้อมูลการสแกนไปยัง API และรับผลการตรวจสอบ =====
   POST /api/rfid-scan
   Body: {"rfid_code": "<UID>", "driver_id": <DRIVER_ID>, "location_type": "<TYPE>"}
   Response: {"success": true, "access_granted": true, "student": {...}, "event": {...}}
*/

// ตัวแปรสำหรับกำหนด driver_id และ location_type
const int DRIVER_ID = 1;  // *** ต้องเปลี่ยนตาม driver ที่ใช้งาน ***
String LOCATION_TYPE = "go";  // "go" = ไปโรงเรียน, "return" = กลับบ้าน

bool sendRfidScanToAPI(const String& uid) {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] No WiFi; treat as NOT allowed.");
    return false;
  }

  WiFiClientSecure client; client.setInsecure();
  HTTPClient https;

  // ใช้ URL ของ Vercel deployment หรือ localhost สำหรับทดสอบ
  String apiUrl = "https://safety-bus-liff-v4.vercel.app/api/rfid-scan";
  // String apiUrl = "http://localhost:3000/api/rfid-scan";  // สำหรับทดสอบ local

  Serial.printf("[API] POST %s\n", apiUrl.c_str());

  if (!https.begin(client, apiUrl)) {
    Serial.println("[API] HTTP begin failed");
    return false;
  }

  https.setTimeout(15000);
  https.addHeader("Content-Type", "application/json");

  // สร้าง JSON payload
  String payload = "{";
  payload += "\"rfid_code\":\"" + uid + "\",";
  payload += "\"driver_id\":" + String(DRIVER_ID) + ",";
  payload += "\"location_type\":\"" + LOCATION_TYPE + "\"";
  payload += "}";

  Serial.printf("[API] Payload: %s\n", payload.c_str());

  int code = https.POST(payload);
  String resp = https.getString();
  https.end();

  Serial.printf("[API] HTTP %d\n", code);
  if (resp.length()) Serial.printf("[API] Response: %s\n", resp.c_str());

  if (code != 200) {
    Serial.printf("[API] Error: HTTP %d\n", code);
    return false;
  }

  // ตรวจสอบ response JSON
  if (resp.indexOf("\"access_granted\":true") >= 0) {
    // แสดงข้อมูลนักเรียนและเหตุการณ์
    if (resp.indexOf("\"student\"") >= 0) {
      int nameStart = resp.indexOf("\"name\":\"") + 8;
      int nameEnd = resp.indexOf("\"", nameStart);
      if (nameStart > 7 && nameEnd > nameStart) {
        String studentName = resp.substring(nameStart, nameEnd);
        Serial.printf("[API] Student: %s\n", studentName.c_str());
      }
    }
    
    if (resp.indexOf("\"type\":\"pickup\"") >= 0) {
      Serial.println("[API] Event: Student picked up (ขึ้นรถ)");
    } else if (resp.indexOf("\"type\":\"dropoff\"") >= 0) {
      Serial.println("[API] Event: Student dropped off (ลงรถ)");
    }
    
    return true;
  }

  return false;
}

/* ===== UART helper: แจ้งให้ ESP8266 เปิดประตู ===== */
void commBegin() {
  Link.begin(9600, SERIAL_8N1, UART_RX, UART_TX);  // 9600 เสถียรกับสายยาว
}
void notifyDoorOpen(const String& uid) {
  Link.print("OPEN:");   // รูปแบบบรรทัด: OPEN:<UID>\n
  Link.println(uid);
  Serial.println("[UART] sent OPEN:" + uid);
}

/* ===== Setup / Loop ===== */
void setup() {
  Serial.begin(9600);     // ใช้ 9600 กับ Serial Monitor
  delay(50);

  SPI.begin(RF_SCK, RF_MISO, RF_MOSI, RF_SS);
  resetRC522();

  if (USE_BUZZER) { pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW); }

  commBegin();            // เริ่ม UART ไป ESP8266 (9600)

  noteActivity();
  Serial.println("RC522 ready. Scan a card...");
}

void loop() {
  // ตรวจสอบคำสั่งจาก Serial
  handleSerialCommands();

  // watchdog: ถ้าเงียบเกิน ให้รี-init ผู้อ่าน
  if (millis() - lastAnyActivity > REINIT_AFTER_MS) {
    resetRC522();
    noteActivity();
  }

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial())   return;

  noteActivity();

  unsigned long now = millis();
  String uid = uidHex(rfid.uid, PRINT_WITH_COLON);

  // ตรวจสอบการสแกนซ้ำด้วยระบบขั้นสูง
  if (isRecentScan(uid, LOCATION_TYPE)) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    waitForCardRemoval();  // รอให้ยกบัตรออกก่อน
    return;
  }

  // เก็บข้อมูลการสแกนลงในประวัติ
  addToScanHistory(uid, LOCATION_TYPE);
  lastUID = uid;
  lastScanMs = now;

  Serial.println("UID : " + uid);

  // ====== ส่งข้อมูลการสแกนไปยัง API ======
  bool allowed = sendRfidScanToAPI(uid);
  Serial.printf("Access: %s\n", allowed ? "GRANTED" : "DENIED");

  if (allowed) {
    // อนุญาต: ติ๊กยาว 1 ครั้ง + ส่งคำสั่งเปิดประตูไป ESP8266
    beep_ok();
    notifyDoorOpen(uid);
  } else {
    // ไม่อนุญาต: ติ๊กสั้น 2 ครั้ง และไม่สั่งเปิด
    beep_denied();
    Serial.println("ACCESS DENIED");
  }

  // ปิดการติดต่อ + รอจนยกบัตรออก + รีเซ็ตพร้อมใบถัดไป
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  waitForCardRemoval();
  resetRC522();
  // ไม่รีเซ็ต lastUID เพื่อป้องกันการสแกนซ้ำ
  noteActivity();
}

/* ===== ฟังก์ชันสำหรับเปลี่ยน location_type =====
   เรียกใช้เมื่อต้องการเปลี่ยนจาก "go" เป็น "return" หรือกลับกัน
*/
void setLocationTypeGo() {
  LOCATION_TYPE = "go";
  Serial.println("[Config] Location type set to: go (ไปโรงเรียน)");
}

void setLocationTypeReturn() {
  LOCATION_TYPE = "return";
  Serial.println("[Config] Location type set to: return (กลับบ้าน)");
}

// ตัวอย่างการใช้งาน: เรียกฟังก์ชันเหล่านี้ผ่าน Serial หรือปุ่มกด
void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readString();
    command.trim();
    
    if (command == "go") {
      setLocationTypeGo();
    } else if (command == "return") {
      setLocationTypeReturn();
    } else if (command == "status") {
      Serial.printf("[Status] Driver ID: %d, Location Type: %s\n", DRIVER_ID, LOCATION_TYPE.c_str());
    }
  }
}
