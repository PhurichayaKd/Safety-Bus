-- ฟังก์ชัน record_rfid_scan ที่ปรับปรุงให้รองรับการส่ง LINE notification และอัปเดตสถานะนักเรียนอัตโนมัติ
-- บังคับลบฟังก์ชันเวอร์ชัน/ซิกเนเจอร์เก่าทั้งหมด เพื่อหลีกเลี่ยง RPC เรียกเวอร์ชันที่ไม่ถูกต้อง
DROP FUNCTION IF EXISTS public.record_rfid_scan(varchar, integer, numeric, numeric, varchar);
DROP FUNCTION IF EXISTS public.record_rfid_scan(varchar, integer, decimal, decimal, varchar);
DROP FUNCTION IF EXISTS public.record_rfid_scan(varchar, integer, double precision, double precision, varchar);
DROP FUNCTION IF EXISTS public.record_rfid_scan(varchar, integer, varchar, varchar, varchar);

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
    v_trip_date DATE;
    v_trip_phase VARCHAR;
    v_current_status VARCHAR;
    v_new_status VARCHAR;
    v_status_id BIGINT;
    v_route_id INTEGER;
    v_driver_name VARCHAR;
BEGIN
    -- ตั้งเวลาสแกนและวันที่
    v_scan_time := NOW();
    v_trip_date := v_scan_time::DATE;
    
    -- กำหนด trip_phase ตาม location_type
    IF p_location_type = 'go' THEN
        v_trip_phase := 'go';
        v_action_text := 'ขึ้นรถ';
        v_new_status := 'boarded';
    ELSIF p_location_type = 'return' THEN
        v_trip_phase := 'return';
        v_action_text := 'ลงรถ';
        v_new_status := 'dropped_off';
    ELSE
        v_trip_phase := 'go';
        v_action_text := 'สแกนบัตร';
        v_new_status := 'boarded';
    END IF;
    
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
        -- บันทึก error log
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
        -- บันทึก error log
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

    -- ดึงข้อมูลคนขับและเส้นทาง
    SELECT db.route_id, d.driver_name
    INTO v_route_id, v_driver_name
    FROM driver_bus db
    LEFT JOIN drivers d ON db.driver_id = d.driver_id
    WHERE db.driver_id = p_driver_id
        AND db.is_active = true
    LIMIT 1;

    -- บันทึกข้อมูลการสแกนลงใน pickup_dropoff
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
        'pickup',
        p_latitude, 
        p_longitude,
        v_scan_time, 
        p_location_type, 
        NULL
    ) RETURNING record_id INTO v_record_id;

    -- อัปเดต last_seen_at ของบัตร RFID
    UPDATE rfid_cards 
    SET last_seen_at = v_scan_time 
    WHERE rfid_code = p_rfid_code;

    -- ตรวจสอบและอัปเดตสถานะนักเรียนใน student_boarding_status
    BEGIN
        -- ตรวจสอบว่ามีสถานะของนักเรียนในวันนี้หรือไม่
        SELECT boarding_status, status_id
        INTO v_current_status, v_status_id
        FROM student_boarding_status
        WHERE student_id = v_student_id::text
            AND driver_id = p_driver_id
            AND trip_date = v_trip_date
            AND trip_phase = v_trip_phase
        LIMIT 1;

        IF v_status_id IS NOT NULL THEN
            -- อัปเดตสถานะที่มีอยู่
            UPDATE student_boarding_status
            SET boarding_status = v_new_status,
                pickup_time = CASE WHEN v_trip_phase = 'go' THEN v_scan_time ELSE pickup_time END,
                dropoff_time = CASE WHEN v_trip_phase = 'return' THEN v_scan_time ELSE dropoff_time END,
                last_scan_id = v_record_id,
                updated_at = v_scan_time
            WHERE status_id = v_status_id;
        ELSE
            -- สร้างสถานะใหม่
            INSERT INTO student_boarding_status (
                student_id,
                driver_id,
                trip_date,
                trip_phase,
                boarding_status,
                pickup_time,
                dropoff_time,
                last_scan_id,
                route_id,
                created_at,
                updated_at
            ) VALUES (
                v_student_id::text,
                p_driver_id,
                v_trip_date,
                v_trip_phase,
                v_new_status,
                CASE WHEN v_trip_phase = 'go' THEN v_scan_time ELSE NULL END,
                CASE WHEN v_trip_phase = 'return' THEN v_scan_time ELSE NULL END,
                v_record_id,
                v_route_id,
                v_scan_time,
                v_scan_time
            ) RETURNING status_id INTO v_status_id;
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            -- บันทึก error log สำหรับการอัปเดตสถานะ
            INSERT INTO notification_logs (
                notification_type, recipient_id, 
                message, status, error_details
            ) VALUES (
                'status_update_error', v_student_id::text,
                'ข้อผิดพลาดในการอัปเดตสถานะนักเรียน: ' || SQLERRM,
                'error',
                json_build_object(
                    'student_id', v_student_id,
                    'trip_phase', v_trip_phase,
                    'new_status', v_new_status,
                    'error_message', SQLERRM,
                    'scan_time', v_scan_time
                )
            );
    END;

    -- ส่ง LINE notification ไปยังนักเรียนและผู้ปกครอง
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
                AND sg.is_primary = true
            LIMIT 1;
        END IF;

        -- สร้างข้อความแจ้งเตือน
        v_time_text := TO_CHAR(v_scan_time AT TIME ZONE 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI');

        v_notification_message := '🚌 แจ้งเตือนการเดินทาง' || E'\n' ||
                                 '👦 นักเรียน: ' || COALESCE(v_student_name, 'ไม่ระบุชื่อ') || E'\n' ||
                                 '📍 สถานะ: ' || v_action_text || E'\n' ||
                                 '🕐 เวลา: ' || v_time_text || E'\n' ||
                                 CASE WHEN v_driver_name IS NOT NULL THEN '👨‍✈️ คนขับ: ' || v_driver_name || E'\n' ELSE '' END ||
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

    -- บันทึก success log
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
            'status_id', v_status_id,
            'trip_phase', v_trip_phase,
            'new_status', v_new_status,
            'scan_time', v_scan_time,
            'line_notification_sent', CASE WHEN v_line_user_id IS NOT NULL THEN true ELSE false END
        )
    );

    -- ส่งผลลัพธ์สำเร็จ
    RETURN json_build_object(
        'success', true, 
        'message', 'บันทึกการสแกน RFID สำเร็จ',
        'rfid_code', p_rfid_code,
        'student_id', v_student_id,
        'student_name', v_student_name,
        'record_id', v_record_id,
        'status_id', v_status_id,
        'trip_phase', v_trip_phase,
        'boarding_status', v_new_status,
        'scan_time', v_scan_time,
        'line_notification_sent', CASE WHEN v_line_user_id IS NOT NULL THEN true ELSE false END
    );

EXCEPTION
    WHEN OTHERS THEN
        -- บันทึก error log
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

-- ให้สิทธิ์เรียกใช้กับ anon/authenticated ให้ RPC ใช้งานได้
GRANT EXECUTE ON FUNCTION public.record_rfid_scan(varchar, integer, decimal, decimal, varchar) TO anon, authenticated;