# ระบบแจ้งเตือนเหตุฉุกเฉิน (Emergency Alert System)

## ภาพรวมระบบ

ระบบแจ้งเตือนเหตุฉุกเฉินสำหรับแอปคนขับรถบัส ที่ทำงานร่วมกับอุปกรณ์ IoT ปุ่มฉุกเฉินภายนอก

## การทำงานของระบบ

### 1. การตรวจสอบเหตุฉุกเฉิน
- แอปจะตรวจสอบ `emergency_logs` ทุก 10 วินาที
- ค้นหาเหตุฉุกเฉินที่มี `triggered_by = 'driver'` และยังไม่ได้ตอบสนอง
- เมื่อพบเหตุฉุกเฉินใหม่ จะแสดง Modal ยืนยัน

### 2. Modal ยืนยันเหตุฉุกเฉิน
- แสดงข้อมูลเหตุฉุกเฉิน (เวลา, สถานที่)
- มีปุ่ม 2 ตัวเลือก:
  - **ยืนยันเหตุฉุกเฉิน**: ส่งแจ้งเตือนไปยังผู้ใช้ทั้งหมด
  - **สถานการณ์ปกติ**: บันทึกว่าเป็นการกดผิด/สถานการณ์ปกติ

### 3. การตอบสนองเหตุฉุกเฉิน

#### เมื่อยืนยันเหตุฉุกเฉิน:
1. อัปเดต `emergency_logs` ด้วย `response_type = 'EMERGENCY'`
2. ส่งการแจ้งเตือนไปยัง LINE API
3. แสดงข้อความ "ส่งสัญญาณฉุกเฉินเรียบร้อย กรุณายืนยันเมื่อสถานการณ์กลับมาปกติ"
4. Modal ยังคงเปิดอยู่เพื่อรอการยืนยันสถานการณ์ปกติ

#### เมื่อยืนยันสถานการณ์ปกติ:
1. อัปเดต `emergency_logs` ด้วย `response_type = 'CONFIRMED_NORMAL'`
2. แสดงข้อความยืนยัน
3. ปิด Modal

## โครงสร้างข้อมูล

### emergency_logs table
```sql
- id: UUID (Primary Key)
- driver_id: INTEGER (Foreign Key)
- triggered_by: TEXT ('driver' | 'system' | 'manual')
- emergency_type: TEXT
- location: TEXT
- notes: TEXT
- response_type: TEXT ('EMERGENCY' | 'CONFIRMED_NORMAL' | NULL)
- response_time: TIMESTAMP
- created_at: TIMESTAMP
```

## API Endpoints

### Emergency Notification
- **URL**: `/api/emergency-notification`
- **Method**: POST
- **Body**:
```json
{
  "emergency_id": "uuid",
  "driver_id": 1,
  "message": "คนขับได้ยืนยันเหตุฉุกเฉินแล้ว กำลังส่งแจ้งเตือนไปยังผู้ใช้ทุกคน",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## การทดสอบระบบ

### 1. ทดสอบการสร้างเหตุฉุกเฉิน
```bash
node test-emergency.js
```

### 2. ทดสอบผ่าน Supabase Dashboard
1. เข้าไปที่ตาราง `emergency_logs`
2. เพิ่มข้อมูลใหม่:
   - `driver_id`: 1
   - `triggered_by`: 'driver'
   - `emergency_type`: 'BUTTON_PRESS'
   - `location`: 'ทดสอบ'
   - `notes`: 'ทดสอบระบบ'
3. แอปควรแสดง Modal ภายใน 10 วินาที

## การติดตั้งและใช้งาน

### 1. Environment Variables
ตรวจสอบว่ามี environment variables ที่จำเป็น:
```
EXPO_PUBLIC_API_BASE_URL=https://safety-bus-liff-v4-new.vercel.app/api
```

### 2. Dependencies
ระบบใช้ libraries ที่มีอยู่แล้ว:
- `@supabase/supabase-js`
- `react-native`
- `expo-router`

### 3. การเปิดใช้งาน
ระบบจะเริ่มทำงานอัตโนมัติเมื่อเปิดหน้า Home ของแอปคนขับ

## หมายเหตุสำคัญ

1. **การรีเฟรช**: ระบบตรวจสอบเหตุฉุกเฉินทุก 10 วินาที
2. **การแจ้งเตือน**: ใช้ LINE API สำหรับส่งแจ้งเตือนไปยังผู้ใช้
3. **การจัดการ State**: ใช้ React State สำหรับจัดการ Modal และข้อมูลเหตุฉุกเฉิน
4. **ความปลอดภัย**: ตรวจสอบ driver_id เพื่อให้แน่ใจว่าเป็นเหตุฉุกเฉินของคนขับคนนั้น

## การแก้ไขปัญหา

### Modal ไม่แสดง
1. ตรวจสอบ console logs
2. ตรวจสอบการเชื่อมต่อ Supabase
3. ตรวจสอบ driver_id ในระบบ

### การแจ้งเตือนไม่ส่ง
1. ตรวจสอบ API endpoint
2. ตรวจสอบ network connection
3. ตรวจสอบ environment variables