#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

/* ===== Wi-Fi & Supabase ===== */
const char* WIFI_SSID = "Phuri";
const char* WIFI_PASS = "11111111";

const char* SUPABASE_URL  = "https://ugkxolufzlnvjsvtpxhp.supabase.co";
const char* SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE";

const int DRIVER_ID = 1;

/* ===== Pins ===== */
// PIR
#define PIN_PIR1        25
#define PIN_PIR2        26
// MQ gas sensors (ADC1 only)
#define PIN_MQ2_AO      34   // MQ-2
#define PIN_MQ135_AO    35   // MQ-135
// DHT
#define PIN_DHT         4
#define DHT_TYPE        DHT22
// Buzzer + Reset
#define PIN_BUZZER      22
#define PIN_RESET_BTN   14
// GPS (NEO-6M on UART2)
#define GPS_RX_PIN      16   // ESP32 RX2 ← GPS TX
#define GPS_TX_PIN      17   // ESP32 TX2 → GPS RX (ไม่จำเป็นถ้าอ่านอย่างเดียว)

/* ===== Threshold / Timing ===== */
const unsigned long PIR_HOLD_MS      = 5000;  // 5 วินาที (ตามความต้องการ)
const float  TEMP_HIGH_C             = 45.0;
const int    GAS_RAW_THRESHOLD       = 500;
const unsigned long SENSOR_READ_MS   = 2000;

/* ===== GPS timing ===== */
const unsigned long GPS_POST_MS      = 1000;   // รอบส่งสูงสุด

/* ===== Driver Status Check ===== */
const unsigned long DRIVER_STATUS_CHECK_MS = 10000;  // ตรวจสอบสถานะคนขับทุก 10 วินาที

/* ===== Objects / States ===== */
DHT dht(PIN_DHT, DHT_TYPE);

bool sirenActive = false;
unsigned long lastSirenStepAt = 0;
bool sirenToneHigh = false;

unsigned long pirHighSince = 0;
bool pirIsHigh = false;

unsigned long lastSensorSampleAt = 0;

/* กันทริกซ้ำหลังรีเซ็ต (เงียบ 5 วินาที) */
unsigned long alarmMuteUntil = 0;

/* Temp-only alarm (hot without smoke) — ส่งครั้งเดียวจนกว่าจะรีเซ็ต */
bool tempOnlyLatched = false;

/* GPS */
HardwareSerial GPSser(2);
TinyGPSPlus gps;
unsigned long lastGpsPostAt = 0;

/* Driver Status */
String currentTripPhase = "go";  // สถานะปัจจุบันของคนขับ
bool pirSensorEnabled = false;   // เปิด/ปิด PIR Sensor ตามสถานะคนขับ
unsigned long lastDriverStatusCheckAt = 0;

/* ===== Helpers ===== */
String jsonEscape(const String& in) {
  String out; out.reserve(in.length() + 16);
  for (size_t i = 0; i < in.length(); ++i) {
    char c = in[i];
    switch (c) {
      case '\"': out += "\\\""; break;
      case '\\': out += "\\\\"; break;
      case '\b': out += "\\b";  break;
      case '\f': out += "\\f";  break;
      case '\n': out += "\\n";  break;
      case '\r': out += "\\r";  break;
      case '\t': out += "\\t";  break;
      default:
        if ((uint8_t)c < 0x20) {
          char buf[7];
          snprintf(buf, sizeof(buf), "\\u%04x", (uint8_t)c);
          out += buf;
        } else {
          out += c; // UTF-8 OK
        }
    }
  }
  return out;
}

/* ===== Wi-Fi ===== */
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

/* ===== Siren (Active buzzer) – non-blocking ===== */
void sirenStart()    { 
  sirenActive = true; 
  lastSirenStepAt = 0; 
}
void sirenStop()     { 
  sirenActive = false; 
  noTone(PIN_BUZZER); 
}
void sirenUpdate() {
  if (!sirenActive) return;
  unsigned long now = millis();
  if (now - lastSirenStepAt >= 250) {
    lastSirenStepAt = now;
    sirenToneHigh = !sirenToneHigh;
    tone(PIN_BUZZER, sirenToneHigh ? 1800 : 1000);
  }
}

/* ===== Supabase: emergency_logs (details → JSON ที่อ่านง่าย) ===== */
bool postSensorAlertMessage(const String& sourceKey, const String& humanMessage) {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Supabase] No WiFi, skip send.");
    return false;
  }

  WiFiClientSecure client; client.setInsecure();
  HTTPClient https;
  String url = String(SUPABASE_URL) + "/rest/v1/emergency_logs";

  if (!https.begin(client, url)) {
    Serial.println("[Supabase] HTTP begin failed");
    return false;
  }

  https.setTimeout(10000);
  https.addHeader("Content-Type", "application/json; charset=utf-8");
  https.addHeader("Accept", "application/json");
  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  https.addHeader("Prefer", "return=representation");

  String detailsJson = String("{\"source\":\"") + jsonEscape(sourceKey) +
                       "\",\"message\":\"" + jsonEscape(humanMessage) + "\"}";

  String body = String("{")
    + "\"driver_id\":" + DRIVER_ID + ","
    + "\"event_type\":\"SENSOR_ALERT\","
    + "\"triggered_by\":\"sensor\","
    + "\"details\":" + detailsJson +
    "}";

  Serial.printf("[Supabase] POST %s\nBody: %s\n", url.c_str(), body.c_str());
  int code = https.POST(body);
  String resp = https.getString();
  https.end();

  Serial.printf("[Supabase] HTTP %d\n", code);
  if (resp.length()) Serial.printf("[Supabase] Resp: %s\n", resp.c_str());
  return (code >= 200 && code < 300);
}

/* ===== Supabase: live_driver_locations (upsert ทุก 5 วิ) ===== */
bool postLiveLocation(double lat, double lon) {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client; client.setInsecure();
  HTTPClient https;

  String url = String(SUPABASE_URL) + "/rest/v1/live_driver_locations?on_conflict=driver_id";

  if (!https.begin(client, url)) return false;

  https.setTimeout(10000);
  https.addHeader("Content-Type", "application/json");
  https.addHeader("Accept", "application/json");
  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
  https.addHeader("Prefer", "resolution=merge-duplicates,return=representation");

  String body = String("{")
    + "\"driver_id\":" + DRIVER_ID + ","
    + "\"latitude\":"  + String(lat, 7) + ","
    + "\"longitude\":" + String(lon, 7)
    + "}";

  int code = https.POST(body);
  String resp = https.getString();
  https.end();

  Serial.printf("[GPS] Upsert loc HTTP %d  lat=%.7f lon=%.7f\n", code, lat, lon);
  if (resp.length()) Serial.println(resp);
  return (code >= 200 && code < 300);
}

/* ===== Supabase: ตรวจสอบสถานะคนขับ ===== */
bool checkDriverStatus() {
  ensureWifi();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[DRIVER_STATUS] No WiFi, skip check.");
    return false;
  }

  WiFiClientSecure client; client.setInsecure();
  HTTPClient https;
  String url = String(SUPABASE_URL) + "/rest/v1/driver_bus?driver_id=eq." + String(DRIVER_ID) + "&select=trip_phase,current_status";

  if (!https.begin(client, url)) {
    Serial.println("[DRIVER_STATUS] HTTP begin failed");
    return false;
  }

  https.setTimeout(10000);
  https.addHeader("Accept", "application/json");
  https.addHeader("apikey", SUPABASE_ANON_KEY);
  https.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);

  Serial.printf("[DRIVER_STATUS] GET %s\n", url.c_str());
  int code = https.GET();
  String resp = https.getString();
  https.end();

  Serial.printf("[DRIVER_STATUS] HTTP %d\n", code);
  if (resp.length()) Serial.printf("[DRIVER_STATUS] Resp: %s\n", resp.c_str());

  if (code >= 200 && code < 300) {
    // แยกข้อมูล trip_phase จาก JSON response
    int tripPhaseStart = resp.indexOf("\"trip_phase\":\"") + 14;
    if (tripPhaseStart > 13) {
      int tripPhaseEnd = resp.indexOf("\"", tripPhaseStart);
      if (tripPhaseEnd > tripPhaseStart) {
        String newTripPhase = resp.substring(tripPhaseStart, tripPhaseEnd);
        
        if (newTripPhase != currentTripPhase) {
          Serial.printf("[DRIVER_STATUS] Trip phase changed: %s → %s\n", 
                        currentTripPhase.c_str(), newTripPhase.c_str());
          currentTripPhase = newTripPhase;
          
          // เปิด PIR Sensor เฉพาะเมื่อ trip_phase เป็น 'completed'
          if (currentTripPhase == "completed") {
            pirSensorEnabled = true;
            Serial.println("[PIR] PIR Sensor ENABLED - Trip completed, monitoring for motion");
          } else {
            pirSensorEnabled = false;
            Serial.println("[PIR] PIR Sensor DISABLED - Trip not completed");
            // หยุดไซเรนถ้ากำลังทำงานอยู่
            if (sirenActive) {
              sirenStop();
              pirIsHigh = false;
            }
          }
        }
        return true;
      }
    }
  }
  return false;
}

/* ===== Logic: PIR ===== */
void checkMotion() {
  if (millis() < alarmMuteUntil) return;

  // ตรวจสอบเฉพาะเมื่อ PIR Sensor ถูกเปิดใช้งาน (trip_phase = 'completed')
  if (!pirSensorEnabled) {
    // ถ้า PIR ถูกปิด แต่ pirIsHigh ยังเป็น true ให้รีเซ็ต
    if (pirIsHigh) {
      pirIsHigh = false;
      Serial.println("[PIR] PIR disabled, reset motion state");
    }
    return;
  }

  bool anyHigh = (digitalRead(PIN_PIR1) == HIGH) || (digitalRead(PIN_PIR2) == HIGH);
  unsigned long now = millis();

  if (anyHigh) {
    if (!pirIsHigh) {
      pirIsHigh = true;
      pirHighSince = now;
      Serial.println("[PIR] Motion detected, start timer (Trip completed mode)");
    } else if (!sirenActive && (now - pirHighSince >= PIR_HOLD_MS)) {
      Serial.println("[PIR] Motion held >= 30s → ALARM");
      sirenStart();
      postSensorAlertMessage("motion_detected_after_trip", "ตรวจพบการเคลื่อนไหวผิดปกติหลังจบการเดินทาง ตรวจสอบทันที");
    }
  } else {
    pirIsHigh = false;
  }
}

/* ===== Logic: Smoke + Heat + Temp-only ===== */
void checkSmokeAndHeat() {
  unsigned long now = millis();
  if (now - lastSensorSampleAt < SENSOR_READ_MS) return;
  lastSensorSampleAt = now;

  int gasRaw2   = analogRead(PIN_MQ2_AO);
  int gasRaw135 = analogRead(PIN_MQ135_AO);
  int gasRaw    = max(gasRaw2, gasRaw135);

  float tC = dht.readTemperature();
  bool tOk = !isnan(tC);

  Serial.printf("[SENSORS] MQ2=%d MQ135=%d gasRaw=%d  temp=%.1fC (ok=%d)\n",
                gasRaw2, gasRaw135, gasRaw, tOk ? tC : -999.0, tOk);

  bool smoke = (gasRaw >= GAS_RAW_THRESHOLD);
  bool hot   = (tOk && tC >= TEMP_HIGH_C);

  if (smoke && hot) {
    if (!sirenActive) {
      Serial.println("[SMOKE+HEAT] condition met → ALARM");
      sirenStart();
      String msg = "เซ็นเซอร์ควันและอุณหภูมิสูง: MQ-2=" + String(gasRaw2) +
                   ", MQ-135=" + String(gasRaw135) + ", อุณหภูมิ=" + String(tC, 1) + "°C";
      postSensorAlertMessage("smoke_heat", msg);
    }
  }

  if (hot && !smoke && !tempOnlyLatched) {
    Serial.println("[TEMP ONLY] high temperature without smoke → ALARM");
    sirenStart();
    String msg = "เซ็นเซอร์วัดอุณหภูมิพบอุณหภูมิสูง " + String(tC, 1) + "°C (ยังไม่พบควัน)";
    postSensorAlertMessage("temp_only", msg);
    tempOnlyLatched = true;
  }
}

/* ====== Anti-spam GPS (ออปชัน): ส่งเมื่อขยับ >~10m หรือครบ 5s ====== */
double lastSentLat = NAN, lastSentLon = NAN;

bool shouldSend(double lastLat, double lastLon, double lat, double lon, unsigned long lastPostMs) {
  const double MIN_METERS = 10.0;
  const unsigned long MAX_INTERVAL_MS = 5000;

  unsigned long elapsed = millis() - lastPostMs;
  if (isnan(lastLat) || isnan(lastLon)) return elapsed >= MAX_INTERVAL_MS; // ครั้งแรก

  const double R = 6371000.0;
  const double d2r = 0.017453292519943295;
  double dLat = (lat - lastLat) * d2r;
  double dLon = (lon - lastLon) * d2r;
  double a = sin(dLat/2)*sin(dLat/2) +
             cos(lastLat*d2r)*cos(lat*d2r) * sin(dLon/2)*sin(dLon/2);
  double meters = R * 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

  return (meters > MIN_METERS) || (elapsed >= MAX_INTERVAL_MS);
}

/* ===== Setup / Loop ===== */
void setup() {
  Serial.begin(115200);
  delay(50);

  pinMode(PIN_PIR1, INPUT);
  pinMode(PIN_PIR2, INPUT);

  pinMode(PIN_RESET_BTN, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  noTone(PIN_BUZZER);

  dht.begin();

  // GPS start @9600
  GPSser.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println("GPS serial started @9600");

  ensureWifi();
  Serial.println("=== ESP32 Sensor Hub + GPS ready (no servo) ===");
}

void loop() {
  // อัปเดตไซเรน
  sirenUpdate();

  // ปุ่มรีเซ็ต → หยุดไซเรน + รีเซ็ตสถานะ + ตั้งช่วงเงียบ 5s
  if (digitalRead(PIN_RESET_BTN) == LOW) {
    delay(20);
    if (digitalRead(PIN_RESET_BTN) == LOW) {
      Serial.println("[RESET] Button pressed → stop siren & mute 5s");
      while (digitalRead(PIN_RESET_BTN) == LOW) { delay(5); }
      sirenStop();
      pirIsHigh = false;
      pirHighSince = millis();
      alarmMuteUntil = millis() + 5000;
      tempOnlyLatched = false;
    }
  }

  // อ่าน GPS ต่อเนื่อง
  while (GPSser.available()) {
    gps.encode(GPSser.read());
  }

  // ส่งตำแหน่งตามเงื่อนไข anti-spam
  if (gps.location.isValid()) {
    double lat = gps.location.lat();
    double lon = gps.location.lng();
    if (shouldSend(lastSentLat, lastSentLon, lat, lon, lastGpsPostAt)) {
      lastGpsPostAt = millis();
      Serial.printf("[GPS] lat=%.7f lon=%.7f sats=%d hdop=%.1f\n",
                    lat, lon,
                    gps.satellites.isValid() ? gps.satellites.value() : -1,
                    gps.hdop.isValid() ? gps.hdop.hdop() : -1.0);
      if (postLiveLocation(lat, lon)) {
        lastSentLat = lat; lastSentLon = lon;
      }
    }
  }

  // ตรวจสอบสถานะคนขับทุก 10 วินาที
  if (millis() - lastDriverStatusCheckAt >= DRIVER_STATUS_CHECK_MS) {
    lastDriverStatusCheckAt = millis();
    checkDriverStatus();
  }

  // ตรวจเงื่อนไขเซ็นเซอร์
  checkMotion();
  checkSmokeAndHeat();

  delay(5);
}
