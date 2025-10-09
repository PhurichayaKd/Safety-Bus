/*
 * ===== RFID Bus System - Updated for driver_bus Table =====
 * 
 * การเปลี่ยนแปลงสำคัญ:
 * 1. ใช้ตาราง driver_bus แทน driver_status
 * 2. API endpoint: /rest/v1/rpc/get_driver_current_status
 * 3. รองรับ trip_phase: 'pickup' และ 'dropoff'
 * 4. ป้องกันการสแกนซ้ำในเส้นทางเดียวกันต่อวัน
 * 
 * ฟังก์ชันใหม่ที่ใช้:
 * - get_driver_current_status(p_driver_id) - ดึงสถานะคนขับ
 * - record_rfid_scan() - บันทึกการสแกน RFID (ปรับปรุงแล้ว)
 * - update_driver_trip_phase() - อัปเดต trip_phase
 */

#include <SPI.h>
#include <MFRC522.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <HardwareSerial.h>   // UART2 ไปหา ESP8266
#include <ArduinoJson.h>      // สำหรับจัดการ JSON

/* ===== Wi-Fi & Supabase ===== */
const char* WIFI_SSID = "Phuri";
const char* WIFI_PASS = "11111111";

const char* SUPABASE_URL = "https://ugkxolufzlnvjsvtpxhp.supabase.co";
const char* SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE";

/* ===== การตั้งค่าระบบ ===== */
const int DRIVER_ID = 1;                    // รหัสคนขับ (ต้องตั้งค่าให้ถูกต้อง)
String CURRENT_TRIP_PHASE = "pickup";       // "pickup" หรือ "dropoff" - จะอัปเดตจาก API
                                             // pickup = เส้นทางรับนักเรียน (บ้าน -> โรงเรียน)
                                             // dropoff = เส้นทางส่งนักเรียน (โรงเรียน -> บ้าน)
const bool ENABLE_GPS = false;              // เปิด/ปิดการใช้ GPS
const float DEFAULT_LAT = 13.7563;          // ตำแหน่งเริ่มต้น (กรุงเทพฯ)
const float DEFAULT_LNG = 100.5018;

/* ===== API URLs ===== */
const String DRIVER_STATUS_API = "/rest/v1/rpc/get_driver_current_status";

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
const unsigned long DEDUP_MS = 2000;        // เพิ่มเวลา dedup เป็น 2 วินาที
unsigned long lastAnyActivity = 0;
const unsigned long REINIT_AFTER_MS = 10000; // เพิ่มเวลา watchdog

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
void beep_error()   { beep(40); delay(60); beep(40); delay(60); beep(40); }

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

/* ===== ตรวจสอบ trip_phase ปัจจุบันจาก API ===== */
bool updateTripPhase() {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[TRIP_PHASE] No WiFi connection");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String url = String(SUPABASE_URL) + DRIVER_STATUS_API;
  Serial.printf("[TRIP_PHASE] POST %s\n", url.c_str());

  if (!https.begin(client, url)) {
    Serial.println("[TRIP_PHASE] HTTPS begin failed");
    return false;
  }

  https.setTimeout(10000);
  https.addHeader("Content-Type", "application/json");
  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  // สร้าง JSON payload สำหรับ RPC function call
  DynamicJsonDocument doc(256);
  doc["p_driver_id"] = DRIVER_ID;
  
  String payload;
  serializeJson(doc, payload);
  Serial.printf("[TRIP_PHASE] Payload: %s\n", payload.c_str());

  int code = https.POST(payload);
  String response = https.getString();
  https.end();

  Serial.printf("[TRIP_PHASE] HTTP %d\n", code);
  if (response.length() > 0) {
    Serial.printf("[TRIP_PHASE] Response: %s\n", response.c_str());
  }

  if (code == 200) {
    DynamicJsonDocument responseDoc(512);
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      bool success = responseDoc["success"] | false;
      if (success) {
        String tripPhase = responseDoc["trip_phase"] | "pickup";
        String previousPhase = CURRENT_TRIP_PHASE;
        CURRENT_TRIP_PHASE = tripPhase;
        
        Serial.printf("[TRIP_PHASE] ✅ Updated: %s -> %s\n", previousPhase.c_str(), CURRENT_TRIP_PHASE.c_str());
        return true;
      } else {
        String errorMsg = responseDoc["error"] | "Unknown error";
        Serial.printf("[TRIP_PHASE] ❌ Error: %s\n", errorMsg.c_str());
        return false;
      }
    } else {
      Serial.printf("[TRIP_PHASE] ❌ JSON Parse Error: %s\n", error.c_str());
      return false;
    }
  } else {
    Serial.printf("[TRIP_PHASE] ❌ HTTP Error: %d\n", code);
    return false;
  }
}

/* ===== ส่งข้อมูลการสแกนไป Supabase API ===== */
bool sendScanToAPI(const String& uid, int driverId, float lat, float lng) {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[API] No WiFi connection");
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String url = String(SUPABASE_URL) + "/rest/v1/rpc/record_rfid_scan";
  Serial.printf("[API] POST %s\n", url.c_str());

  if (!https.begin(client, url)) {
    Serial.println("[API] HTTPS begin failed");
    return false;
  }

  https.setTimeout(15000);
  https.addHeader("Content-Type", "application/json");
  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  // สร้าง JSON payload โดยใช้ trip_phase ปัจจุบัน
  DynamicJsonDocument doc(512);
  doc["p_rfid_code"] = uid;
  doc["p_driver_id"] = driverId;
  doc["p_latitude"] = lat;
  doc["p_longitude"] = lng;
  doc["p_location_type"] = CURRENT_TRIP_PHASE;

  String payload;
  serializeJson(doc, payload);
  Serial.printf("[API] Payload: %s\n", payload.c_str());

  int code = https.POST(payload);
  String response = https.getString();
  https.end();

  Serial.printf("[API] HTTP %d\n", code);
  if (response.length() > 0) {
    Serial.printf("[API] Response: %s\n", response.c_str());
  }

  if (code == 200) {
    // แยกวิเคราะห์ response JSON
    DynamicJsonDocument responseDoc(1024);
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      bool success = responseDoc["success"] | false;
      if (success) {
        String studentName = responseDoc["student_name"] | "Unknown";
        String message = responseDoc["message"] | "บันทึกการสแกน RFID สำเร็จ";
        
        Serial.printf("[API] ✅ Success: %s\n", studentName.c_str());
        Serial.printf("[API] Message: %s\n", message.c_str());
        return true;
      } else {
        String errorMsg = responseDoc["error"] | "Unknown error";
        bool alreadyScanned = responseDoc["already_scanned"] | false;
        String studentName = responseDoc["student_name"] | "";
        
        // ตรวจสอบว่าเป็น duplicate key error หรือไม่
        if (errorMsg.indexOf("duplicate key") >= 0 || errorMsg.indexOf("uniq_daily_pickup_per_student_phase") >= 0) {
          Serial.printf("[API] ⚠️  Already Scanned: %s\n", studentName.length() > 0 ? studentName.c_str() : "นักเรียนคนนี้");
          Serial.println("[API] ℹ️  นักเรียนได้สแกนบัตรในเส้นทางนี้แล้ววันนี้");
          return true; // ถือว่าสำเร็จเพราะนักเรียนได้ขึ้นรถแล้ว
        } else if (alreadyScanned) {
          Serial.printf("[API] ⚠️  Already Scanned: %s\n", studentName.c_str());
          Serial.println("[API] ℹ️  นักเรียนได้สแกนบัตรในเส้นทางนี้แล้ววันนี้");
          return true; // ถือว่าสำเร็จเพราะนักเรียนได้ขึ้นรถแล้ว
        } else {
          Serial.printf("[API] ❌ Error: %s\n", errorMsg.c_str());
          return false;
        }
      }
    } else {
      Serial.printf("[API] ❌ JSON Parse Error: %s\n", error.c_str());
      return false;
    }
  } else if (code == 400) {
    Serial.printf("[API] ❌ Bad Request (400): Invalid parameters\n");
    return false;
  } else if (code == 401) {
    Serial.printf("[API] ❌ Unauthorized (401): Check API key\n");
    return false;
  } else if (code == 404) {
    Serial.printf("[API] ❌ Not Found (404): Function not found\n");
    return false;
  } else if (code == 500) {
    Serial.printf("[API] ❌ Server Error (500): Database error\n");
    return false;
  } else if (code < 0) {
    Serial.printf("[API] ❌ Connection Error: %d\n", code);
    return false;
  } else {
    Serial.printf("[API] ❌ Unexpected HTTP Code: %d\n", code);
    return false;
  }
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

  if (USE_BUZZER) { 
    pinMode(BUZZER_PIN, OUTPUT); 
    digitalWrite(BUZZER_PIN, LOW); 
  }

  commBegin();            // เริ่ม UART ไป ESP8266 (9600)

  // ทดสอบการเชื่อมต่อ WiFi และ API
  ensureWifi();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ System ready - WiFi connected");
    
    // ตรวจสอบ trip_phase ปัจจุบันจาก API
    if (updateTripPhase()) {
      Serial.printf("✅ Trip phase initialized: %s\n", CURRENT_TRIP_PHASE.c_str());
    } else {
      Serial.printf("⚠️  Using default trip phase: %s\n", CURRENT_TRIP_PHASE.c_str());
    }
    
    beep_ok();
  } else {
    Serial.println("⚠️  System ready - WiFi not connected (offline mode)");
    Serial.printf("⚠️  Using default trip phase: %s\n", CURRENT_TRIP_PHASE.c_str());
    beep_error();
  }

  noteActivity();
  Serial.printf("RC522 ready. Driver ID: %d, Trip Phase: %s\n", DRIVER_ID, CURRENT_TRIP_PHASE.c_str());
  Serial.println("Scan a card...");
}

void loop() {
  // watchdog: ถ้าเงียบเกิน ให้รี-init ผู้อ่าน
  if (millis() - lastAnyActivity > REINIT_AFTER_MS) {
    Serial.println("[Watchdog] Reinitializing RC522...");
    resetRC522();
    noteActivity();
  }

  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial())   return;

  noteActivity();

  unsigned long now = millis();
  String uid = uidHex(rfid.uid, PRINT_WITH_COLON);

  // กันพิมพ์/ส่งซ้ำบัตรเดิมเร็วไป
  if (uid == lastUID && (now - lastScanMs) < DEDUP_MS) {
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    return;
  }
  lastUID = uid;
  lastScanMs = now;

  Serial.println("=== RFID SCAN ===");
  Serial.println("UID: " + uid);
  
  // ตรวจสอบ trip_phase ปัจจุบันก่อนส่งข้อมูล
  updateTripPhase();
  Serial.printf("Driver: %d, Trip Phase: %s\n", DRIVER_ID, CURRENT_TRIP_PHASE.c_str());

  // ====== ส่งข้อมูลไป API ======
  bool apiSuccess = sendScanToAPI(uid, DRIVER_ID, DEFAULT_LAT, DEFAULT_LNG);
  
  if (apiSuccess) {
    // สำเร็จ: ติ๊กยาว 1 ครั้ง + ส่งคำสั่งเปิดประตูไป ESP8266
    beep_ok();
    notifyDoorOpen(uid);
    Serial.println("✅ ACCESS GRANTED - Student verified");
  } else {
    // ล้มเหลว: ปฏิเสธการเข้าถึง
    beep_denied();
    Serial.println("❌ ACCESS DENIED - Verification failed");
  }

  // ปิดการติดต่อ + รอจนยกบัตรออก + รีเซ็ตพร้อมใบถัดไป
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  waitForCardRemoval();
  resetRC522();
  lastUID = "";
  noteActivity();
  
  Serial.println("Ready for next card...\n");
}