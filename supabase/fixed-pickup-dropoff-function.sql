-- ฟังก์ชัน record_rfid_scan ที่ใช้ตาราง pickup_dropoff และแก้ไข data type casting
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
    v_scan_time TIMESTAMPTZ;
    v_event_local_date DATE;
BEGIN
    -- ตั้งค่าเวลาปัจจุบัน
    v_scan_time := NOW();
    v_event_local_date := (v_scan_time AT TIME ZONE 'Asia/Bangkok')::DATE;
    
    -- ตรวจสอบบัตร RFID และหา student_id (แก้ไข casting)
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
    WHERE rc.rfid_code = p_rfid_code::VARCHAR  -- แก้ไข casting
        AND rc.is_active = true;

    -- ตรวจสอบว่าพบบัตรหรือไม่
    IF v_card_status IS NULL THEN
        -- บันทึก error ใน notification_logs
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
                'driver_id', p_driver_id,
                'location_type', p_location_type
            ),
            v_scan_time
        );

        RETURN json_build_object(
            'success', false,
            'error', 'ไม่พบบัตร RFID หรือบัตรไม่ได้ใช้งาน',
            'rfid_code', p_rfid_code,
            'debug_info', 'Card not found or inactive'
        );
    END IF;

    -- ตรวจสอบสถานะบัตร
    IF v_card_status NOT IN ('assigned', 'available') THEN
        -- บันทึก error ใน notification_logs
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
    INSERT INTO pickup_dropoff (
        student_id,
        driver_id,
        event_time,
        event_type,
        gps_latitude,
        gps_longitude,
        last_scan_time,
        location_type,
        pickup_source,
        event_local_date
    ) VALUES (
        v_student_id,
        p_driver_id,
        v_scan_time,
        'rfid_scan',  -- ใช้ event_type เป็น 'rfid_scan'
        p_latitude,
        p_longitude,
        v_scan_time,
        p_location_type::VARCHAR,  -- แก้ไข casting
        'rfid_device',
        v_event_local_date
    );

    -- บันทึก success notification
    INSERT INTO notification_logs (
        notification_type,
        recipient_id,
        message,
        status,
        error_details,
        created_at
    ) VALUES (
        'rfid_scan_success',
        p_driver_id,
        'สแกน RFID สำเร็จ: ' || COALESCE(v_student_name, 'ไม่ระบุชื่อ'),
        'success',
        json_build_object(
            'rfid_code', p_rfid_code,
            'student_id', v_student_id,
            'student_name', v_student_name,
            'driver_id', p_driver_id,
            'location_type', p_location_type,
            'scan_time', v_scan_time
        ),
        v_scan_time
    );

    -- อัปเดต last_seen_at ของบัตร
    UPDATE rfid_cards 
    SET last_seen_at = v_scan_time 
    WHERE rfid_code = p_rfid_code::VARCHAR;  -- แก้ไข casting

    -- ส่งคืนผลลัพธ์สำเร็จ
    RETURN json_build_object(
        'success', true,
        'message', 'บันทึกการสแกน RFID สำเร็จ',
        'rfid_code', p_rfid_code,
        'student_id', v_student_id,
        'student_name', v_student_name,
        'driver_id', p_driver_id,
        'location_type', p_location_type,
        'scan_time', v_scan_time,
        'debug_info', 'Using pickup_dropoff table - fixed casting'
    );

EXCEPTION
    WHEN OTHERS THEN
        -- บันทึก exception ใน notification_logs
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
                'sqlstate', SQLSTATE,
                'error', SQLERRM,
                'rfid_code', p_rfid_code,
                'driver_id', p_driver_id,
                'location_type', p_location_type
            ),
            NOW()
        );

        RETURN json_build_object(
            'success', false,
            'error', 'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM,
            'sqlstate', SQLSTATE,
            'rfid_code', p_rfid_code,
            'debug_info', 'Function with fixed data type casting'
        );
END;
$$;