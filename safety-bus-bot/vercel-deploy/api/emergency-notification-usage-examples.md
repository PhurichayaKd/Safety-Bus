# Emergency Notification API - Usage Examples

## การใช้งาน API แจ้งเตือนฉุกเฉินที่ปรับปรุงแล้ว

### 1. การส่งแจ้งเตือนเหตุการณ์ฉุกเฉิน (Emergency Events)

#### 1.1 เซ็นเซอร์การเคลื่อนไหว (Motion Sensor)
```json
{
  "eventType": "MOVEMENT_DETECTED",
  "eventId": "emergency_001",
  "sensorType": "motion_sensor",
  "description": "ตรวจพบการเคลื่อนไหวหลังจอดรถ",
  "location": "โรงเรียนบ้านดอนไผ่",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### 1.2 เซ็นเซอร์อุณหภูมิสูง (Temperature Sensor)
```json
{
  "eventType": "HIGH_TEMPERATURE",
  "eventId": "emergency_002",
  "sensorType": "temperature_sensor",
  "temperature": 45,
  "description": "อุณหภูมิในรถสูงผิดปกติ",
  "location": "โรงเรียนบ้านดอนไผ่",
  "timestamp": "2024-01-15T11:00:00Z"
}
```

#### 1.3 เซ็นเซอร์ควันและความร้อน (Smoke & Heat Sensor)
```json
{
  "eventType": "SMOKE_AND_HEAT",
  "eventId": "emergency_003",
  "sensorType": "smoke_heat_sensor",
  "temperature": 50,
  "smokeLevel": 75,
  "description": "ตรวจพบควันและอุณหภูมิสูง",
  "location": "โรงเรียนบ้านดอนไผ่",
  "timestamp": "2024-01-15T11:30:00Z"
}
```

#### 1.4 ปุ่มฉุกเฉินคนขับ (Manual Driver Emergency)
```json
{
  "eventType": "DRIVER_PANIC",
  "eventId": "emergency_004",
  "sensorType": "manual_driver_emergency",
  "driverId": "driver_001",
  "busId": "bus_001",
  "description": "คนขับกดปุ่มฉุกเฉินด้วยตนเอง",
  "location": "โรงเรียนบ้านดอนไผ่",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

#### 1.5 สวิตช์นักเรียน (Student Switch)
```json
{
  "eventType": "STUDENT_SWITCH",
  "eventId": "emergency_005",
  "sensorType": "student_switch",
  "isStudentEmergency": true,
  "description": "นักเรียนกดสวิตช์ในรถ",
  "location": "โรงเรียนบ้านดอนไผ่",
  "timestamp": "2024-01-15T12:30:00Z"
}
```

### 2. การตอบสนองของคนขับ (Driver Responses)

#### 2.1 คนขับตรวจสอบแล้ว - ตอบสนองต่อเซ็นเซอร์การเคลื่อนไหว
```json
{
  "responseType": "CHECKED",
  "emergencyLogId": "emergency_001",
  "driverId": "driver_001",
  "busId": "bus_001",
  "originalSensorType": "motion_sensor",
  "notes": "ตรวจสอบแล้ว เป็นแมวเข้ามาในรถ",
  "timestamp": "2024-01-15T10:35:00Z"
}
```

#### 2.2 คนขับยืนยันเหตุฉุกเฉิน - ตอบสนองต่อเซ็นเซอร์อุณหภูมิ
```json
{
  "responseType": "EMERGENCY",
  "emergencyLogId": "emergency_002",
  "driverId": "driver_001",
  "busId": "bus_001",
  "originalSensorType": "temperature_sensor",
  "notes": "ยืนยันเหตุฉุกเฉิน เครื่องยนต์ร้อนผิดปกติ",
  "timestamp": "2024-01-15T11:05:00Z"
}
```

#### 2.3 สถานการณ์กลับสู่ปกติ - ตอบสนองต่อปุ่มฉุกเฉินคนขับ
```json
{
  "responseType": "CONFIRMED_NORMAL",
  "emergencyLogId": "emergency_004",
  "driverId": "driver_001",
  "busId": "bus_001",
  "originalSensorType": "manual_driver_emergency",
  "notes": "สถานการณ์กลับสู่ปกติ นักเรียนทุกคนปลอดภัย",
  "timestamp": "2024-01-15T12:10:00Z"
}
```

#### 2.4 การใช้ originalEventType แทน originalSensorType
```json
{
  "responseType": "CHECKED",
  "emergencyLogId": "emergency_003",
  "driverId": "driver_001",
  "busId": "bus_001",
  "originalEventType": "SMOKE_AND_HEAT",
  "notes": "ตรวจสอบแล้ว เป็นไอน้ำจากแอร์",
  "timestamp": "2024-01-15T11:35:00Z"
}
```

### 3. ข้อความที่จะถูกส่งไปยัง LINE

#### 3.1 ข้อความเหตุการณ์ฉุกเฉิน
- **เซ็นเซอร์การเคลื่อนไหว**: "🚨 ตรวจพบการเคลื่อนไหวหลังจอดรถ 🗣‼️"
- **เซ็นเซอร์อุณหภูมิ**: "🚨 ตรวจพบการอุณหภูมิสูง 🌡‼️"
- **เซ็นเซอร์ควันและความร้อน**: "🚨 ตรวจพบการอุณหภูมิสูงและควันจำนวนมาก 🧯‼️"
- **ปุ่มฉุกเฉินคนขับ**: "🚨 คนขับแจ้งเหตุฉุกเฉิน‼️"

#### 3.2 ข้อความตอบสนองของคนขับ
- **ตรวจสอบเซ็นเซอร์การเคลื่อนไหว**: "คนขับได้ตรวจสอบการเคลื่อนไหวแล้ว สถานการณ์กลับสู่ปกติ (เซ็นเซอร์การเคลื่อนไหว)"
- **ยืนยันเหตุฉุกเฉินจากอุณหภูมิ**: "🔻 สถานะ : คนขับยืนยันเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: ยืนยันเหตุการณ์จากเซ็นเซอร์อุณหภูมิสูง"
- **สถานการณ์กลับสู่ปกติ**: "สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว\n\n📍 เหตุการณ์: [ประเภทเซ็นเซอร์]"

### 4. การทำงานของระบบ

#### 4.1 การแยกแยะประเภทเซ็นเซอร์
ระบบจะแยกแยะประเภทเซ็นเซอร์ตามลำดับความสำคัญ:
1. `sensorType` ที่ส่งมาใน request
2. `eventType` ที่ส่งมาใน request
3. ข้อมูลจากฐานข้อมูล (สำหรับ driver response)

#### 4.2 การเก็บข้อมูลในฐานข้อมูล
- `emergency_logs`: เก็บข้อมูลเหตุการณ์และประเภทเซ็นเซอร์
- `emergency_responses`: เก็บการตอบสนองของคนขับพร้อมประเภทเซ็นเซอร์ต้นฉบับ

#### 4.3 การส่งแจ้งเตือน LINE
- ส่งไปยังนักเรียนและผู้ปกครองที่ลงทะเบียนแล้ว
- ไม่ส่งแจ้งเตือนสำหรับ `STUDENT_SWITCH`
- ข้อความจะระบุประเภทเซ็นเซอร์ที่ชัดเจน

### 5. Response Format

```json
{
  "success": true,
  "message": "Emergency notification sent successfully",
  "eventType": "MOVEMENT_DETECTED",
  "responseType": null,
  "eventId": "emergency_001",
  "emergencyLogId": null,
  "driverId": null,
  "busId": null,
  "isStudentEmergency": false,
  "shouldSendToLine": true,
  "detectedSensorType": "motion_sensor",
  "originalSensorType": null,
  "originalEventType": null,
  "notificationResults": [...],
  "timestamp": "15/01/2024, 17:30:00"
}
```