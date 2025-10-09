-- Supabase Function สำหรับบันทึกการสแกน RFID และส่งแจ้งเตือน LINE (แก้ไขแล้ว)
CREATE OR REPLACE FUNCTION record_rfid_scan(
  p_rfid_code VARCHAR,
  p_driver_id INTEGER,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_location_type VARCHAR DEFAULT 'pickup'
) RETURNS JSON AS $$
DECLARE
  v_student_id TEXT;
  v_line_user_id TEXT;
  v_student_name VARCHAR;
  v_driver_name VARCHAR;
  v_record_id INTEGER;
  v_scan_id BIGINT;
  v_card_id BIGINT;
  v_existing_scan INTEGER;
  v_today DATE;
  v_trip_phase TEXT;
  v_boarding_status TEXT;
  v_status_id BIGINT;
  notification_message TEXT;
  line_result JSON;
  line_notified BOOLEAN := false;
BEGIN
  -- ตั้งค่าวันที่ปัจจุบัน (เวลาไทย)
  v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE;
  
  -- กำหนด trip_phase จาก location_type
  v_trip_phase := CASE 
    WHEN p_location_type IN ('pickup', 'go') THEN 'go'
    WHEN p_location_type IN ('dropoff', 'return') THEN 'return'
    ELSE 'go'
  END;
  
  -- ค้นหา student_id จาก RFID code (แก้ไขเงื่อนไข status)
  SELECT 
    s.student_id, 
    s.student_name,
    rc.card_id
  INTO v_student_id, v_student_name, v_card_id
  FROM students s
  JOIN rfid_card_assignments rca ON s.student_id = rca.student_id
  JOIN rfid_cards rc ON rca.card_id = rc.card_id
  WHERE rc.rfid_code = p_rfid_code
    AND rca.is_active = true
    AND rc.is_active = true
    AND rc.status IN ('assigned', 'available')  -- แก้ไขตรงนี้
    AND s.is_active = true
    AND (rca.valid_to IS NULL OR rca.valid_to > NOW())
  LIMIT 1;

  -- ตรวจสอบว่าพบนักเรียนหรือไม่
  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'ไม่พบนักเรียนที่ใช้บัตรนี้ หรือบัตรไม่ได้รับอนุญาต',
      'rfid_code', p_rfid_code,
      'debug_info', 'Status condition updated to include both assigned and available'
    );
  END IF;

  -- ตรวจสอบว่ามีการสแกนในวันนี้แล้วหรือไม่ (สำหรับ trip_phase เดียวกัน)
  SELECT COUNT(*)
  INTO v_existing_scan
  FROM rfid_scan_logs
  WHERE student_id = v_student_id
    AND DATE(scan_timestamp AT TIME ZONE 'Asia/Bangkok') = v_today
    AND trip_phase = v_trip_phase
    AND is_valid_scan = true;

  -- ถ้ามีการสแกนแล้ว ให้ส่งข้อความแจ้งเตือน
  IF v_existing_scan > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'นักเรียนคนนี้ได้สแกนบัตรในเส้นทางนี้แล้ววันนี้',
      'student_name', v_student_name,
      'already_scanned', true
    );
  END IF;

  -- ค้นหาชื่อคนขับ
  SELECT driver_name 
  INTO v_driver_name
  FROM driver_bus 
  WHERE driver_id = p_driver_id;

  -- บันทึกการสแกนในตาราง rfid_scan_logs
  INSERT INTO rfid_scan_logs (
    rfid_code,
    student_id, 
    driver_id, 
    location_type,
    latitude, 
    longitude,
    trip_phase,
    is_valid_scan,
    notification_sent
  ) VALUES (
    p_rfid_code,
    v_student_id, 
    p_driver_id, 
    p_location_type,
    p_latitude, 
    p_longitude,
    v_trip_phase,
    true,
    false
  ) RETURNING scan_id INTO v_scan_id;

  -- บันทึกการสแกนในตาราง pickup_dropoff (เพื่อความเข้ากันได้)
  INSERT INTO pickup_dropoff (
    student_id, 
    driver_id, 
    event_type, 
    gps_latitude, 
    gps_longitude,
    location_type, 
    rfid_code, 
    scan_method,
    event_local_date
  ) VALUES (
    v_student_id, 
    p_driver_id, 
    'pickup', 
    p_latitude, 
    p_longitude,
    p_location_type, 
    p_rfid_code, 
    'rfid',
    v_today
  ) RETURNING record_id INTO v_record_id;

  -- อัปเดตหรือสร้างสถานะการขึ้นรถของนักเรียน
  INSERT INTO student_boarding_status (
    student_id,
    driver_id,
    trip_date,
    trip_phase,
    boarding_status,
    pickup_time,
    last_scan_id
  ) VALUES (
    v_student_id,
    p_driver_id,
    v_today,
    v_trip_phase,
    'boarded',
    NOW() AT TIME ZONE 'Asia/Bangkok',
    v_scan_id
  )
  ON CONFLICT (student_id, driver_id, trip_date, trip_phase)
  DO UPDATE SET
    boarding_status = 'boarded',
    pickup_time = NOW() AT TIME ZONE 'Asia/Bangkok',
    last_scan_id = v_scan_id,
    updated_at = NOW() AT TIME ZONE 'Asia/Bangkok'
  RETURNING status_id INTO v_status_id;

  -- อัปเดต last_seen_at ในตาราง rfid_cards
  UPDATE rfid_cards 
  SET last_seen_at = NOW() AT TIME ZONE 'Asia/Bangkok'
  WHERE card_id = v_card_id;

  -- ค้นหา LINE user ID ของนักเรียน
  SELECT line_user_id 
  INTO v_line_user_id
  FROM student_line_links
  WHERE student_id = v_student_id 
    AND active = true
  LIMIT 1;

  -- ส่งแจ้งเตือน LINE (ถ้ามี LINE ID)
  IF v_line_user_id IS NOT NULL THEN
    BEGIN
      -- สร้างข้อความแจ้งเตือน
      notification_message := '🚌 ' || v_student_name || ' ขึ้นรถแล้ว' || 
        CASE 
          WHEN v_trip_phase = 'go' THEN ' (เส้นทางไป)' 
          WHEN v_trip_phase = 'return' THEN ' (เส้นทางกลับ)' 
          ELSE '' 
        END ||
        ' เวลา ' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') || 
        ' น. คนขับ: ' || COALESCE(v_driver_name, 'ไม่ระบุ');

      -- ส่ง LINE notification
      SELECT send_line_notification(
        v_line_user_id,
        notification_message
      ) INTO line_result;

      -- ตรวจสอบผลลัพธ์
      IF (line_result->>'success')::boolean THEN
        line_notified := true;
        
        -- อัปเดตสถานะการส่งแจ้งเตือน
        UPDATE rfid_scan_logs 
        SET notification_sent = true 
        WHERE scan_id = v_scan_id;
        
        -- บันทึก log สำเร็จ
        INSERT INTO notification_logs (
          student_id, 
          driver_id, 
          notification_type, 
          message, 
          line_user_id,
          student_latitude, 
          student_longitude, 
          bus_latitude, 
          bus_longitude,
          status
        ) VALUES (
          v_student_id, 
          p_driver_id, 
          'rfid_scan',
          notification_message,
          v_line_user_id,
          p_latitude, 
          p_longitude, 
          p_latitude, 
          p_longitude,
          'sent'
        );
      ELSE
        line_notified := false;
        
        -- บันทึก log ล้มเหลว
        INSERT INTO notification_logs (
          student_id, 
          driver_id, 
          notification_type, 
          message, 
          line_user_id,
          student_latitude, 
          student_longitude, 
          bus_latitude, 
          bus_longitude,
          status,
          error_message
        ) VALUES (
          v_student_id, 
          p_driver_id, 
          'rfid_scan',
          notification_message,
          v_line_user_id,
          p_latitude, 
          p_longitude, 
          p_latitude, 
          p_longitude,
          'failed',
          line_result->>'error'
        );
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        line_notified := false;
        
        -- บันทึก log error
        INSERT INTO notification_logs (
          student_id, 
          driver_id, 
          notification_type, 
          message, 
          line_user_id,
          student_latitude, 
          student_longitude, 
          bus_latitude, 
          bus_longitude,
          status,
          error_message
        ) VALUES (
          v_student_id, 
          p_driver_id, 
          'rfid_scan',
          notification_message,
          v_line_user_id,
          p_latitude, 
          p_longitude, 
          p_latitude, 
          p_longitude,
          'error',
          'Exception: ' || SQLERRM
        );
    END;
  END IF;

  -- ส่งผลลัพธ์กลับ (แก้ไขให้ชัดเจนขึ้น)
  RETURN json_build_object(
    'success', true,
    'message', 'บันทึกการสแกน RFID สำเร็จ',
    'student_id', v_student_id,
    'student_name', v_student_name,
    'driver_name', COALESCE(v_driver_name, 'ไม่ระบุ'),
    'record_id', v_record_id,
    'scan_id', v_scan_id,
    'status_id', v_status_id,
    'line_notified', COALESCE(line_notified, false),
    'line_user_id', v_line_user_id,
    'scan_time', NOW() AT TIME ZONE 'Asia/Bangkok',
    'location_type', p_location_type,
    'trip_phase', v_trip_phase,
    'boarding_status', 'boarded',
    'rfid_code', p_rfid_code
  );

EXCEPTION
  WHEN OTHERS THEN
    -- บันทึก error log
    INSERT INTO notification_logs (
      student_id, 
      driver_id, 
      notification_type, 
      message, 
      status,
      error_message
    ) VALUES (
      COALESCE(v_student_id, 'unknown'), 
      p_driver_id, 
      'rfid_scan_error',
      'RFID Scan Error for code: ' || p_rfid_code,
      'error',
      'SQLSTATE: ' || SQLSTATE || ', Error: ' || SQLERRM
    );
    
    RETURN json_build_object(
      'success', false,
      'error', 'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM,
      'sqlstate', SQLSTATE,
      'rfid_code', p_rfid_code,
      'debug_info', 'Function updated with improved error handling'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ให้สิทธิ์ในการเรียกใช้ function
GRANT EXECUTE ON FUNCTION record_rfid_scan TO anon, authenticated;

-- สร้าง RPC endpoint
-- ใช้ผ่าน: POST /rest/v1/rpc/record_rfid_scan