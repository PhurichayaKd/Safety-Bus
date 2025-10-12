# คำแนะนำการแก้ไขปัญหา event_local_date

## ปัญหาที่พบ
```
Error: cannot insert a non-DEFAULT value into column "event_local_date"
```

## สาเหตุ
ฟังก์ชัน `record_rfid_scan` ในฐานข้อมูล Supabase ยังคงพยายาม insert ค่า `event_local_date` โดยตรง แต่คอลัมน์นี้ถูกกำหนดให้คำนวณอัตโนมัติจาก `event_time`

## วิธีแก้ไข

### ขั้นตอนที่ 1: เข้าไปที่ Supabase Dashboard
1. เปิด [Supabase Dashboard](https://supabase.com/dashboard)
2. เลือกโปรเจกต์ของคุณ
3. ไปที่ **SQL Editor**

### ขั้นตอนที่ 2: รันคำสั่ง SQL ด้านล่างนี้

```sql
-- ฟังก์ชัน record_rfid_scan ที่แก้ไขแล้ว (ไม่ส่ง event_local_date)
CREATE OR REPLACE FUNCTION record_rfid_scan(
    p_rfid_code VARCHAR,
    p_driver_id INTEGER,
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_location_type VARCHAR DEFAULT 'go'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_student_id INTEGER;
    v_card_status VARCHAR;
    v_student_name VARCHAR;
    v_result JSON;
    v_scan_time TIMESTAMPTZ;
BEGIN
    -- ตั้งค่าเวลาปัจจุบัน
    v_scan_time := NOW();
    
    -- ตรวจสอบบัตร RFID และหา student_id
    SELECT 
        rca.student_id,
        rc.status,
        s.student_name
    INTO 
        v_student_id,
        v_card_status,
        v_student_name
    FROM rfid_cards rc
    LEFT JOIN rfid_card_assignments rca ON rc.card_id = rca.card_id 
        AND rca.is_active = true
        AND rca.valid_from <= v_scan_time
        AND (rca.valid_to IS NULL OR rca.valid_to >= v_scan_time)
    LEFT JOIN students s ON rca.student_id = s.student_id
    WHERE rc.rfid_code = p_rfid_code 
        AND rc.is_active = true;

    -- ตรวจสอบว่าพบบัตรหรือไม่
    IF v_card_status IS NULL THEN
        -- บันทึก error notification
        INSERT INTO notification_logs (
            notification_type,
            recipient_id,
            message,
            status,
            error_details,
            created_at
        ) VALUES (
            'rfid_scan_error',
            p_driver_id,
            'ไม่พบบัตร RFID: ' || p_rfid_code,
            'failed',
            json_build_object(
                'error', 'card_not_found',
                'rfid_code', p_rfid_code,
                'driver_id', p_driver_id
            ),
            v_scan_time
        );

        RETURN json_build_object(
            'success', false,
            'error', 'ไม่พบบัตร RFID หรือบัตรไม่ได้ใช้งาน',
            'rfid_code', p_rfid_code
        );
    END IF;

    -- ตรวจสอบสถานะบัตร
    IF v_card_status NOT IN ('assigned', 'available') THEN
        -- บันทึก error notification
        INSERT INTO notification_logs (
            notification_type,
            recipient_id,
            message,
            status,
            error_details,
            created_at
        ) VALUES (
            'rfid_scan_error',
            p_driver_id,
            'บัตร RFID สถานะไม่ถูกต้อง: ' || v_card_status,
            'failed',
            json_build_object(
                'error', 'invalid_card_status',
                'rfid_code', p_rfid_code,
                'card_status', v_card_status,
                'driver_id', p_driver_id
            ),
            v_scan_time
        );

        RETURN json_build_object(
            'success', false,
            'error', 'สถานะบัตรไม่ถูกต้อง: ' || v_card_status,
            'rfid_code', p_rfid_code,
            'card_status', v_card_status
        );
    END IF;

    -- บันทึกการสแกนใน pickup_dropoff table
    -- ไม่ส่ง event_local_date เพราะคำนวณอัตโนมัติจาก event_time
    INSERT INTO pickup_dropoff (
        student_id,
        driver_id,
        event_time,
        event_type,
        gps_latitude,
        gps_longitude,
        last_scan_time,
        location_type,
        pickup_source
    ) VALUES (
        v_student_id,
        p_driver_id,
        v_scan_time,
        'pickup',  -- ใช้ event_type เป็น 'pickup' ตาม constraint
        p_latitude,
        p_longitude,
        v_scan_time,
        p_location_type,
        'rfid_device'
    );

    -- อัปเดต last_seen_at ของบัตร RFID
    UPDATE rfid_cards 
    SET last_seen_at = v_scan_time 
    WHERE rfid_code = p_rfid_code;

    -- บันทึก success notification
    INSERT INTO notification_logs (
        notification_type,
        recipient_id,
        message,
        status,
        created_at
    ) VALUES (
        'rfid_scan_success',
        p_driver_id,
        'สแกน RFID สำเร็จ: ' || v_student_name || ' (' || p_rfid_code || ')',
        'success',
        v_scan_time
    );

    -- ส่งผลลัพธ์
    RETURN json_build_object(
        'success', true,
        'message', 'บันทึกการสแกน RFID สำเร็จ',
        'rfid_code', p_rfid_code,
        'student_id', v_student_id,
        'student_name', v_student_name,
        'driver_id', p_driver_id,
        'location_type', p_location_type,
        'scan_time', v_scan_time
    );

EXCEPTION
    WHEN OTHERS THEN
        -- บันทึก error notification
        INSERT INTO notification_logs (
            notification_type,
            recipient_id,
            message,
            status,
            error_details,
            created_at
        ) VALUES (
            'rfid_scan_error',
            p_driver_id,
            'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM,
            'failed',
            json_build_object(
                'error', 'system_error',
                'sqlstate', SQLSTATE,
                'sqlerrm', SQLERRM,
                'rfid_code', p_rfid_code,
                'driver_id', p_driver_id
            ),
            NOW()
        );

        RETURN json_build_object(
            'success', false,
            'error', 'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM,
            'sqlstate', SQLSTATE
        );
$$;
```

### ขั้นตอนที่ 3: ทดสอบฟังก์ชัน
หลังจากรันคำสั่ง SQL แล้ว ให้ทดสอบด้วยคำสั่งนี้:

```sql
SELECT record_rfid_scan('F3C9DC34', 1, 13.7563, 100.5018, 'go');
```

### ขั้นตอนที่ 4: ตรวจสอบผลลัพธ์
ถ้าทำงานได้ปกติ จะได้ผลลัพธ์แบบนี้:
```json
{
  "success": true,
  "message": "บันทึกการสแกน RFID สำเร็จ",
  "rfid_code": "F3C9DC34",
  "student_id": 123,
  "student_name": "ชื่อนักเรียน",
  "driver_id": 1,
  "location_type": "go",
  "scan_time": "2024-01-01T10:00:00Z"
}
```

## หมายเหตุ
- คอลัมน์ `event_local_date` จะถูกคำนวณอัตโนมัติจาก `event_time` ตาม constraint ในฐานข้อมูล
- ไม่ต้องส่งค่า `event_local_date` ในการ INSERT
- ฟังก์ชันนี้จะใช้ `event_type = 'pickup'` ตาม constraint ที่กำหนดไว้