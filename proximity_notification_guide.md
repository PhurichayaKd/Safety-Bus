# คู่มือการใช้งานระบบแจ้งเตือนตำแหน่งรถบัส

## ภาพรวมระบบ

ระบบนี้จะตรวจสอบตำแหน่งรถบัสจาก `live_driver_locations` และเมื่อรถบัสเข้าใกล้บ้านของนักเรียนในระยะ 50 เมตร ตามลำดับใน `route_students` จะส่งข้อความแจ้งเตือน "รถบัสใกล้ถึงแล้วให้เตรียมตัว" ไปยัง `line_user_id` ที่ผูกกับนักเรียนคนนั้น

## ฟังก์ชันที่สร้างขึ้น

### 1. `fn_calculate_distance(lat1, lon1, lat2, lon2)`
- คำนวณระยะห่างระหว่างจุดสองจุดด้วย Haversine formula
- ส่งคืนระยะห่างเป็นเมตร

### 2. `fn_check_bus_proximity(driver_id, proximity_threshold)`
- ตรวจสอบนักเรียนที่รถบัสใกล้ถึงบ้านในระยะที่กำหนด
- ส่งคืนรายการนักเรียนพร้อมข้อมูลระยะห่างและ LINE User ID

### 3. `fn_send_proximity_notifications(driver_id, proximity_threshold)`
- ส่งการแจ้งเตือนไปยัง LINE และบันทึกลงในฐานข้อมูล
- ป้องกันการส่งซ้ำภายใน 10 นาที

### 4. `fn_auto_proximity_check()`
- ตรวจสอบและส่งการแจ้งเตือนอัตโนมัติสำหรับคนขับทั้งหมด

## ตารางที่เพิ่มขึ้น

### `notification_logs`
เก็บประวัติการส่งการแจ้งเตือนทั้งหมด
- `log_id`: รหัสประจำการแจ้งเตือน
- `student_id`: รหัสนักเรียน
- `driver_id`: รหัสคนขับ
- `notification_type`: ประเภทการแจ้งเตือน
- `message`: ข้อความที่ส่ง
- `line_user_id`: LINE User ID ที่ส่งไป
- `sent_at`: เวลาที่ส่ง
- `status`: สถานะการส่ง
- `distance_meters`: ระยะห่างขณะส่ง
- พิกัดต่างๆ สำหรับการตรวจสอบ

## วิธีการติดตั้ง

1. รันไฟล์ `fn_bus_proximity_notification.sql` ใน Supabase SQL Editor
2. ตรวจสอบว่าตารางและฟังก์ชันถูกสร้างเรียบร้อยแล้ว

## ตัวอย่างการใช้งาน

### ตรวจสอบนักเรียนที่รถบัสใกล้ถึงบ้าน
```sql
-- ตรวจสอบนักเรียนที่รถบัสใกล้ถึงบ้านในระยะ 50 เมตร
SELECT * FROM fn_check_bus_proximity(1, 50);
```

### ส่งการแจ้งเตือน
```sql
-- ส่งการแจ้งเตือนสำหรับคนขับรหัส 1
SELECT * FROM fn_send_proximity_notifications(1, 50);
```

### ตรวจสอบอัตโนมัติสำหรับคนขับทั้งหมด
```sql
-- ตรวจสอบและส่งการแจ้งเตือนอัตโนมัติ
SELECT * FROM fn_auto_proximity_check();
```

### ดูประวัติการแจ้งเตือน
```sql
-- ดูการแจ้งเตือนล่าสุด 10 รายการ
SELECT 
    nl.*,
    s.student_name,
    d.driver_name
FROM notification_logs nl
JOIN students s ON s.student_id = nl.student_id
JOIN driver_bus d ON d.driver_id = nl.driver_id
ORDER BY nl.sent_at DESC
LIMIT 10;
```

## การตั้งค่าการทำงานอัตโนมัติ

### ใช้ Supabase Edge Functions
สร้าง Edge Function ที่เรียกใช้ `fn_auto_proximity_check()` ทุก 30 วินาที

### ใช้ Cron Job (ถ้ามี pg_cron extension)
```sql
-- ตั้งค่าให้ทำงานทุก 30 วินาที
SELECT cron.schedule('proximity-check', '*/30 * * * * *', 'SELECT fn_auto_proximity_check();');
```

## การปรับแต่ง

### เปลี่ยนระยะห่างการแจ้งเตือน
```sql
-- เปลี่ยนจาก 50 เมตร เป็น 100 เมตร
SELECT * FROM fn_send_proximity_notifications(1, 100);
```

### เปลี่ยนข้อความแจ้งเตือน
แก้ไขในฟังก์ชัน `fn_send_proximity_notifications` บรรทัดที่สร้าง `notification_message`

## การตรวจสอบปัญหา

### ตรวจสอบว่ามีข้อมูลตำแหน่งรถบัส
```sql
SELECT * FROM live_driver_locations WHERE last_updated > now() - interval '5 minutes';
```

### ตรวจสอบข้อมูลบ้านนักเรียน
```sql
SELECT 
    s.student_id,
    s.student_name,
    s.home_latitude,
    s.home_longitude
FROM students s
WHERE s.home_latitude IS NULL OR s.home_longitude IS NULL;
```

### ตรวจสอบการเชื่อมโยง LINE
```sql
-- ตรวจสอบนักเรียนที่ยังไม่ได้เชื่อมโยง LINE
SELECT 
    s.student_id,
    s.student_name,
    sll.line_user_id as student_line,
    pll.line_user_id as parent_line
FROM students s
LEFT JOIN student_line_links sll ON sll.student_id = s.student_id AND sll.active = true
LEFT JOIN student_guardians sg ON sg.student_id = s.student_id AND sg.is_primary = true
LEFT JOIN parent_line_links pll ON pll.parent_id = sg.parent_id AND pll.active = true
WHERE sll.line_user_id IS NULL AND pll.line_user_id IS NULL;
```

## ข้อควรระวัง

1. **ระยะห่างการแจ้งเตือน**: ระบบจะไม่ส่งการแจ้งเตือนซ้ำภายใน 10 นาที
2. **ข้อมูลตำแหน่ง**: ต้องมีข้อมูล `home_latitude` และ `home_longitude` ของนักเรียน
3. **การเชื่อมโยง LINE**: ต้องมี `line_user_id` ของนักเรียนหรือผู้ปกครอง
4. **ลำดับการส่ง**: ระบบจะส่งตามลำดับ `stop_order` ใน `route_students`

## การบำรุงรักษา

### ลบข้อมูลการแจ้งเตือนเก่า
```sql
-- ลบข้อมูลที่เก่ากว่า 30 วัน
DELETE FROM notification_logs WHERE sent_at < now() - interval '30 days';
```

### ตรวจสอบประสิทธิภาพ
```sql
-- ดูสถิติการส่งการแจ้งเตือน
SELECT 
    DATE(sent_at) as date,
    COUNT(*) as total_notifications,
    COUNT(DISTINCT student_id) as unique_students,
    COUNT(DISTINCT driver_id) as unique_drivers
FROM notification_logs
WHERE sent_at > now() - interval '7 days'
GROUP BY DATE(sent_at)
ORDER BY date DESC;
```