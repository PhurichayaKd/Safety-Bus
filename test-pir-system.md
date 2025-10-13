# การทดสอบระบบ PIR Sensor ตามสถานะ trip_phase

## ภาพรวมการทำงาน

ระบบ PIR Sensor จะทำงานเฉพาะเมื่อ `trip_phase` ของคนขับเป็น `'completed'` เท่านั้น

## ขั้นตอนการทดสอบ

### 1. ทดสอบการตรวจสอบสถานะคนขับ

```
เงื่อนไข: IoT device เชื่อมต่อ WiFi และสามารถเข้าถึง Supabase ได้
ผลลัพธ์ที่คาดหวัง:
- ระบบจะตรวจสอบสถานะคนขับทุก 10 วินาที
- แสดงข้อความ "[DRIVER_STATUS] GET ..." ใน Serial Monitor
- แสดงสถานะ trip_phase ปัจจุบัน
```

### 2. ทดสอบ PIR Sensor เมื่อ trip_phase ≠ 'completed'

```
เงื่อนไข: trip_phase เป็น 'go' หรือ 'return'
การทดสอบ: เคลื่อนไหวหน้า PIR Sensor
ผลลัพธ์ที่คาดหวัง:
- PIR Sensor ไม่ทำงาน
- ไม่มีการแจ้งเตือน
- แสดงข้อความ "[PIR] PIR disabled, reset motion state" (ถ้ามี)
```

### 3. ทดสอบ PIR Sensor เมื่อ trip_phase = 'completed'

```
เงื่อนไข: trip_phase เป็น 'completed'
การทดสอบ: เคลื่อนไหวหน้า PIR Sensor เป็นเวลา 5 วินาที
ผลลัพธ์ที่คาดหวัง:
- แสดงข้อความ "[PIR] Motion detected, start timer (Trip completed mode)"
- หลังจาก 5 วินาที แสดงข้อความ "[PIR] Motion held >= 5s → ALARM"
- เปิดไซเรน (Buzzer)
- ส่งแจ้งเตือนไปยัง Supabase พร้อมข้อความ "ตรวจพบการเคลื่อนไหวผิดปกติหลังจบการเดินทาง ตรวจสอบทันที"
```

### 4. ทดสอบการรีเซ็ตระบบ

```
เงื่อนไข: ไซเรนกำลังทำงานอยู่
การทดสอบ: กดปุ่มรีเซ็ต
ผลลัพธ์ที่คาดหวัง:
- ไซเรนหยุดทำงาน
- แสดงข้อความ "[RESET] Button pressed → stop siren & mute 5s"
- ระบบเงียบเป็นเวลา 5 วินาที
```

### 5. ทดสอบการเปลี่ยนสถานะ trip_phase

```
เงื่อนไข: trip_phase เปลี่ยนจาก 'completed' เป็น 'go' หรือ 'return'
ผลลัพธ์ที่คาดหวัง:
- แสดงข้อความ "[DRIVER_STATUS] Trip phase changed: completed → go"
- แสดงข้อความ "[PIR] PIR Sensor DISABLED - Trip not completed"
- หยุดไซเรนถ้ากำลังทำงานอยู่
```

## ข้อมูลที่ต้องตรวจสอบใน Serial Monitor

### การเชื่อมต่อ WiFi
```
[WiFi] Connecting to SSID...
[WiFi] Connected! IP: xxx.xxx.xxx.xxx
```

### การตรวจสอบสถานะคนขับ
```
[DRIVER_STATUS] GET https://xxx.supabase.co/rest/v1/driver_bus?driver_id=eq.1&select=trip_phase,current_status
[DRIVER_STATUS] HTTP 200
[DRIVER_STATUS] Resp: [{"trip_phase":"completed","current_status":"active"}]
[DRIVER_STATUS] Trip phase changed: go → completed
[PIR] PIR Sensor ENABLED - Trip completed, monitoring for motion
```

### การตรวจจับการเคลื่อนไหว
```
[PIR] Motion detected, start timer (Trip completed mode)
[PIR] Motion held >= 5000 ms, trigger alert!
[Supabase] POST https://xxx.supabase.co/rest/v1/emergency_logs
Body: {"driver_id":1,"event_type":"SENSOR_ALERT","triggered_by":"sensor","details":{"source":"motion_detected_after_trip","message":"ตรวจพบการเคลื่อนไหวผิดปกติหลังจบการเดินทาง ตรวจสอบทันที"}}
```

## การตรวจสอบในฐานข้อมูล

### ตาราง driver_bus
```sql
SELECT driver_id, trip_phase, current_status, updated_at 
FROM driver_bus 
WHERE driver_id = 1;
```

### ตาราง emergency_logs
```sql
SELECT * FROM emergency_logs 
WHERE driver_id = 1 
AND event_type = 'SENSOR_ALERT'
AND details->>'source' = 'motion_detected_after_trip'
ORDER BY created_at DESC;
```

## ปัญหาที่อาจพบและการแก้ไข

### 1. PIR Sensor ไม่ทำงานแม้ trip_phase = 'completed'
- ตรวจสอบการเชื่อมต่อ WiFi
- ตรวจสอบการตอบสนองจาก Supabase API
- ตรวจสอบค่า `pirSensorEnabled` ใน Serial Monitor

### 2. ไม่สามารถส่งแจ้งเตือนได้
- ตรวจสอบ Supabase API Key และ URL
- ตรวจสอบสิทธิ์การเข้าถึงตาราง emergency_logs
- ตรวจสอบ HTTP response code

### 3. การตรวจสอบสถานะคนขับไม่ทำงาน
- ตรวจสอบ DRIVER_ID ในโค้ด
- ตรวจสอบข้อมูลในตาราง driver_bus
- ตรวจสอบ JSON parsing ใน checkDriverStatus()

## สรุป

ระบบนี้จะทำงานตามลำดับดังนี้:
1. ตรวจสอบสถานะคนขับทุก 10 วินาที
2. เปิด PIR Sensor เฉพาะเมื่อ trip_phase = 'completed'
3. ตรวจจับการเคลื่อนไหวเป็นเวลา 5 วินาที
4. ส่งแจ้งเตือนและเปิดไซเรน
5. รอการรีเซ็ตจากคนขับ