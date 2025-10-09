-- ฟังก์ชัน record_rfid_scan ที่แก้ไขให้ตรงกับโครงสร้างตารางจริงใน db.md และเพิ่มการส่ง LINE notification
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
    v_record_id INTEGER;
    v_line_user_id TEXT;
    v_notification_message TEXT;
    v_line_result JSON;
    v_action_text TEXT;
    v_time_text TEXT;
BEGIN
    -- ตั้งเวลาสแกน
    v_scan_time := NOW();
    
    -- ตรวจสอบบัตร RFID และดึงข้อมูลนักเรียน
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
        -- บันทึก error log (ใช้คอลัมน์ที่มีจริงในตาราง)
        INSERT INTO notification_logs (
            notification_type, recipient_id, 
            message, status, error_details
        ) VALUES (
            'rfid_scan_error', p_driver_id::text,
            'ไม่พบบัตร RFID หรือบัตรไม่ได้ใช้งาน: ' || p_rfid_code,
            'sent',
            json_build_object(
                'rfid_code', p_rfid_code,
                'error_type', 'card_not_found',
                'scan_time', v_scan_time
            )
        );
        
        RETURN json_build_object(
            'success', false, 
            'error', 'ไม่พบบัตร RFID หรือบัตรไม่ได้ใช้งาน',
            'rfid_code', p_rfid_code
        );
    END IF;

    -- ตรวจสอบสถานะบัตร
    IF v_card_status NOT IN ('assigned', 'available') THEN
        -- บันทึก error log (ใช้คอลัมน์ที่มีจริงในตาราง)
        INSERT INTO notification_logs (
            notification_type, recipient_id, 
            message, status, error_details
        ) VALUES (
            'rfid_scan_error', p_driver_id::text,
            'สถานะบัตรไม่ถูกต้อง: ' || v_card_status || ' สำหรับบัตร: ' || p_rfid_code,
            'sent',
            json_build_object(
                'rfid_code', p_rfid_code,
                'card_status', v_card_status,
                'error_type', 'invalid_card_status',
                'scan_time', v_scan_time
            )
        );
        
        RETURN json_build_object(
            'success', false, 
            'error', 'สถานะบัตรไม่ถูกต้อง: ' || v_card_status,
            'rfid_code', p_rfid_code
        );
    END IF;

    -- บันทึกข้อมูลการสแกนลงใน pickup_dropoff (ไม่ส่ง event_local_date เพราะเป็น GENERATED column)
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
        'pickup',  -- ใช้ 'pickup' ตามที่กำหนดใน constraint
        p_latitude, 
        p_longitude,
        v_scan_time, 
        p_location_type, 
        NULL  -- ใช้ NULL เพราะ constraint อนุญาตเฉพาะ NULL
    ) RETURNING record_id INTO v_record_id;

    -- อัปเดต last_seen_at ของบัตร RFID
    UPDATE rfid_cards 
    SET last_seen_at = v_scan_time 
    WHERE rfid_code = p_rfid_code;

    -- ส่ง LINE notification ไปยังนักเรียน
    BEGIN
        -- ค้นหา LINE User ID ของนักเรียน
        SELECT sll.line_user_id 
        INTO v_line_user_id
        FROM student_line_links sll
        WHERE sll.student_id = v_student_id 
            AND sll.active = true
        LIMIT 1;

        -- ถ้าไม่พบ LINE ของนักเรียน ให้ลองหา LINE ของผู้ปกครอง
        IF v_line_user_id IS NULL THEN
            SELECT pll.line_user_id 
            INTO v_line_user_id
            FROM student_guardians sg
            JOIN parent_line_links pll ON sg.parent_id = pll.parent_id
            WHERE sg.student_id = v_student_id 
                AND pll.active = true
            LIMIT 1;
        END IF;

        -- สร้างข้อความแจ้งเตือน (ไม่แสดง longitude และ location)
        IF p_location_type = 'go' THEN
            v_action_text := 'ขึ้นรถ';
        ELSIF p_location_type = 'return' THEN
            v_action_text := 'ลงรถ';
        ELSE
            v_action_text := 'สแกนบัตร';
        END IF;

        v_time_text := TO_CHAR(v_scan_time AT TIME ZONE 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI');

        v_notification_message := '🚌 แจ้งเตือนการเดินทาง' || E'\n' ||
                                 '👦 นักเรียน: ' || COALESCE(v_student_name, 'ไม่ระบุชื่อ') || E'\n' ||
                                 '📍 สถานะ: ' || v_action_text || E'\n' ||
                                 '🕐 เวลา: ' || v_time_text || E'\n' ||
                                 '✅ ระบบบันทึกข้อมูลเรียบร้อยแล้ว';

        -- ส่ง LINE notification ถ้าพบ LINE User ID
        IF v_line_user_id IS NOT NULL THEN
            SELECT send_line_notification(v_line_user_id, v_notification_message) INTO v_line_result;
            
            -- บันทึก log การส่ง LINE notification
            INSERT INTO notification_logs (
                notification_type, recipient_id, 
                message, status, error_details
            ) VALUES (
                'line_notification', v_line_user_id,
                v_notification_message,
                CASE WHEN (v_line_result->>'success')::boolean THEN 'sent' ELSE 'failed' END,
                v_line_result
            );
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            -- บันทึก error log สำหรับ LINE notification
            INSERT INTO notification_logs (
                notification_type, recipient_id, 
                message, status, error_details
            ) VALUES (
                'line_notification_error', COALESCE(v_line_user_id, 'unknown'),
                'ข้อผิดพลาดในการส่ง LINE notification: ' || SQLERRM,
                'error',
                json_build_object(
                    'student_id', v_student_id,
                    'error_message', SQLERRM,
                    'scan_time', v_scan_time
                )
            );
    END;

    -- บันทึก success log (ใช้คอลัมน์ที่มีจริงในตาราง)
    INSERT INTO notification_logs (
        notification_type, recipient_id, 
        message, status, error_details
    ) VALUES (
        'rfid_scan_success', p_driver_id::text,
        'สแกน RFID สำเร็จ: ' || COALESCE(v_student_name, 'ไม่ระบุชื่อ') || ' (' || p_rfid_code || ')',
        'sent',
        json_build_object(
            'rfid_code', p_rfid_code,
            'student_id', v_student_id,
            'student_name', v_student_name,
            'record_id', v_record_id,
            'scan_time', v_scan_time,
            'line_notification_sent', CASE WHEN v_line_user_id IS NOT NULL THEN true ELSE false END
        )
    );

    -- ส่งผลลัพธ์สำเร็จ (ไม่แสดง location_type)
    RETURN json_build_object(
        'success', true, 
        'message', 'บันทึกการสแกน RFID สำเร็จ',
        'rfid_code', p_rfid_code,
        'student_id', v_student_id,
        'student_name', v_student_name,
        'record_id', v_record_id,
        'scan_time', v_scan_time,
        'line_notification_sent', CASE WHEN v_line_user_id IS NOT NULL THEN true ELSE false END
    );

EXCEPTION
    WHEN OTHERS THEN
        -- บันทึก error log (ใช้คอลัมน์ที่มีจริงในตาราง)
        INSERT INTO notification_logs (
            notification_type, recipient_id, 
            message, status, error_details
        ) VALUES (
            'rfid_scan_error', p_driver_id::text,
            'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM,
            'sent',
            json_build_object(
                'rfid_code', p_rfid_code,
                'error_type', 'system_error',
                'error_message', SQLERRM,
                'scan_time', v_scan_time
            )
        );
        
        RETURN json_build_object(
            'success', false, 
            'error', 'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM,
            'rfid_code', p_rfid_code
        );
END;
$$;