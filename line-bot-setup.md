# การตั้งค่า LINE Bot สำหรับระบบแจ้งเตือน RFID

## ขั้นตอนการสร้าง LINE Bot

### 1. สร้าง LINE Developer Account
1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เข้าสู่ระบบด้วยบัญชี LINE ของคุณ
3. สร้าง Provider ใหม่ (ชื่อองค์กร/โรงเรียน)

### 2. สร้าง Messaging API Channel
1. คลิก "Create a new channel"
2. เลือก "Messaging API"
3. กรอกข้อมูล:
   - Channel name: "ระบบแจ้งเตือนรถรับส่งนักเรียน"
   - Channel description: "แจ้งเตือนการขึ้น-ลงรถของนักเรียน"
   - Category: Education
   - Subcategory: School

### 3. ตั้งค่า Channel
1. ไปที่แท็บ "Messaging API"
2. สร้าง Channel Access Token (Long-lived)
3. คัดลอก Token เก็บไว้ (จะใช้ในโค้ด)
4. เปิดใช้งาน "Use webhooks" (ถ้าต้องการ)

### 4. การเชื่อมต่อผู้ปกครองกับ LINE Bot

#### วิธีที่ 1: QR Code
1. สร้าง QR Code สำหรับเพิ่มเพื่อน Bot
2. ผู้ปกครองสแกน QR Code
3. ส่งข้อความ "เชื่อมต่อ [รหัสนักเรียน]" เช่น "เชื่อมต่อ STD001"

#### วิธีที่ 2: LINE ID
1. แชร์ LINE ID ของ Bot: @your-bot-id
2. ผู้ปกครองเพิ่มเพื่อนด้วย LINE ID

### 5. การอัปเดต LINE User ID ในฐานข้อมูล

```sql
-- อัปเดต line_user_id ในตาราง students
UPDATE students 
SET line_user_id = 'U1234567890abcdef1234567890abcdef'
WHERE student_code = 'STD001';

-- หรือใช้ฟังก์ชันสำหรับเชื่อมต่อ
CREATE OR REPLACE FUNCTION link_student_line(
    p_student_code TEXT,
    p_line_user_id TEXT
) RETURNS JSON AS $$
DECLARE
    student_count INTEGER;
BEGIN
    -- ตรวจสอบว่ามีนักเรียนหรือไม่
    SELECT COUNT(*) INTO student_count
    FROM students
    WHERE student_code = p_student_code;
    
    IF student_count = 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Student not found'
        );
    END IF;
    
    -- อัปเดต line_user_id
    UPDATE students
    SET line_user_id = p_line_user_id,
        updated_at = NOW()
    WHERE student_code = p_student_code;
    
    RETURN json_build_object(
        'success', true,
        'message', 'LINE account linked successfully'
    );
END;
$$ LANGUAGE plpgsql;
```

### 6. การทดสอบระบบ

```sql
-- ทดสอบส่งข้อความ
SELECT send_line_notification(
    'U1234567890abcdef1234567890abcdef',
    'ทดสอบการส่งข้อความจากระบบ'
);

-- ทดสอบการสแกน RFID
SELECT record_rfid_scan(
    'ABCD1234',  -- RFID code
    1,           -- Driver ID
    13.7563,     -- Latitude
    100.5018,    -- Longitude
    'go'         -- Location type
);
```

### 7. การตั้งค่าใน Supabase

1. ไปที่ Supabase Dashboard
2. เข้าไปที่ SQL Editor
3. รันคำสั่ง SQL ในไฟล์ `line-notification.sql`
4. อัปเดต LINE Channel Access Token:

```sql
-- อัปเดต token ในฟังก์ชัน send_line_notification
-- แทนที่ 'YOUR_LINE_CHANNEL_ACCESS_TOKEN' ด้วย token จริง
```

### 8. การติดตั้ง HTTP Extension (ถ้าจำเป็น)

```sql
-- เปิดใช้งาน http extension ใน Supabase
CREATE EXTENSION IF NOT EXISTS http;
```

### 9. ข้อความแจ้งเตือนที่ระบบจะส่ง

#### การขึ้นรถ (go)
```
🚌 แจ้งเตือนการเดินทาง
👦 นักเรียน: สมชาย ใจดี
📍 สถานะ: ขึ้นรถ
🕐 เวลา: 07/01/2025 07:30
คนขับ: คุณสมศักดิ์

✅ ระบบบันทึกข้อมูลเรียบร้อยแล้ว
```

#### การลงรถ (return)
```
🚌 แจ้งเตือนการเดินทาง
👦 นักเรียน: สมชาย ใจดี
📍 สถานะ: ลงรถ
🕐 เวลา: 07/01/2025 16:45
คนขับ: คุณสมศักดิ์

✅ ระบบบันทึกข้อมูลเรียบร้อยแล้ว
```

### 10. การตรวจสอบ Logs

```sql
-- ดู notification logs
SELECT 
    nl.*,
    s.student_name,
    d.driver_name
FROM notification_logs nl
LEFT JOIN students s ON nl.student_id = s.id
LEFT JOIN drivers d ON nl.driver_id = d.id
ORDER BY nl.created_at DESC
LIMIT 50;

-- ดูสถิติการส่งข้อความ
SELECT 
    status,
    COUNT(*) as count,
    DATE(created_at) as date
FROM notification_logs
WHERE notification_type = 'line'
GROUP BY status, DATE(created_at)
ORDER BY date DESC;
```

### 11. การแก้ไขปัญหาที่พบบ่อย

#### ปัญหา: ส่งข้อความไม่ได้
- ตรวจสอบ Channel Access Token
- ตรวจสอบว่า LINE User ID ถูกต้อง
- ตรวจสอบว่าผู้ใช้ยังเป็นเพื่อนกับ Bot อยู่

#### ปัญหา: HTTP Extension ไม่ทำงาน
- ติดต่อ Supabase Support เพื่อเปิดใช้งาน
- ใช้ Edge Functions แทน (ทางเลือก)

#### ปัญหา: Rate Limiting
- LINE API มีข้อจำกัดการส่งข้อความ
- ใช้ Queue system สำหรับข้อความจำนวนมาก

### 12. ความปลอดภัย

1. **เก็บ Token อย่างปลอดภัย**
   - ไม่เก็บใน code
   - ใช้ Environment Variables
   - หมุนเวียน Token เป็นระยะ

2. **ตรวจสอบสิทธิ์**
   - ตรวจสอบว่าผู้ใช้มีสิทธิ์รับข้อความ
   - ป้องกันการส่งข้อความไปยังคนที่ไม่เกี่ยวข้อง

3. **จำกัดการใช้งาน**
   - ตั้งค่า Rate Limiting
   - บันทึก Audit Logs