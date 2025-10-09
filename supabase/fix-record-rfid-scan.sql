-- แก้ไขฟังก์ชัน record_rfid_scan เพื่อแก้ปัญหาการ SELECT ตัวแปรผิด
-- ปัญหา: v_driver_status ได้รับค่า is_active (boolean) แทน current_status (string)

DROP FUNCTION IF EXISTS record_rfid_scan(VARCHAR, INTEGER, NUMERIC, NUMERIC, VARCHAR);

CREATE OR REPLACE FUNCTION record_rfid_scan(
  p_rfid_code VARCHAR,
  p_driver_id INTEGER,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_location_type VARCHAR DEFAULT 'pickup'
) RETURNS JSON AS $$
DECLARE
  v_student_id INTEGER;
  v_line_user_id TEXT;
  v_student_name VARCHAR;
  v_driver_name VARCHAR;
  v_record_id INTEGER;
  v_scan_id BIGINT;
  v_existing_scan INTEGER;
  v_today DATE;
  v_trip_phase TEXT;
  v_status_id BIGINT;
  v_driver_trip_phase TEXT;
  v_driver_status TEXT;
  v_driver_is_active BOOLEAN;  -- เพิ่มตัวแปรใหม่สำหรับ is_active
  notification_message TEXT;
  line_result JSON;
  line_notified BOOLEAN := false;
BEGIN
  -- ตั้งค่าวันที่ปัจจุบัน (เวลาไทย)
  v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE;
  
  -- กำหนด trip_phase จาก location_type (ใช้ค่าที่ตรงกับ CHECK constraint ของตาราง)
  v_trip_phase := CASE 
    WHEN p_location_type = 'pickup' THEN 'go'
    WHEN p_location_type = 'dropoff' THEN 'back'
    WHEN p_location_type IN ('go') THEN 'go'  -- backward compatibility
    WHEN p_location_type IN ('return', 'back') THEN 'back'  -- backward compatibility
    ELSE 'go'
  END;
  
  -- ตรวจสอบสถานะคนขับจากตาราง driver_bus (แก้ไขแล้ว)
  SELECT 
    driver_name, 
    trip_phase, 
    current_status,
    is_active
  INTO v_driver_name, v_driver_trip_phase, v_driver_status, v_driver_is_active
  FROM driver_bus 
  WHERE driver_id = p_driver_id;

  -- ตรวจสอบว่าพบคนขับหรือไม่
  IF v_driver_name IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'ไม่พบข้อมูลคนขับ',
      'driver_id', p_driver_id
    );
  END IF;

  -- ตรวจสอบว่าคนขับอยู่ในสถานะที่ถูกต้องหรือไม่
  IF v_driver_status != 'active' THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'คนขับไม่อยู่ในสถานะปฏิบัติงาน',
      'driver_status', v_driver_status,
      'is_active', v_driver_is_active,
      'debug_info', 'Fixed: v_driver_status should be current_status, not is_active'
    );
  END IF;

  -- อัปเดต trip_phase ของคนขับให้ตรงกับการสแกน
  UPDATE driver_bus 
  SET 
    trip_phase = p_location_type,
    current_latitude = COALESCE(p_latitude, current_latitude),
    current_longitude = COALESCE(p_longitude, current_longitude),
    current_updated_at = NOW() AT TIME ZONE 'Asia/Bangkok'
  WHERE driver_id = p_driver_id;
  
  -- ค้นหา student_id จาก RFID code
  SELECT 
    s.student_id, 
    s.student_name
  INTO v_student_id, v_student_name
  FROM students s
  JOIN rfid_card_assignments rca ON s.student_id = rca.student_id
  JOIN rfid_cards rc ON rca.card_id = rc.card_id
  WHERE rc.rfid_code = p_rfid_code
    AND rca.is_active = true
    AND rc.is_active = true
    AND rc.status IN ('assigned', 'available')
    AND s.is_active = true
    AND (rca.valid_to IS NULL OR rca.valid_to > NOW())
  LIMIT 1;

  -- ตรวจสอบว่าพบนักเรียนหรือไม่
  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'ไม่พบนักเรียนที่ใช้บัตรนี้ หรือบัตรไม่ได้รับอนุญาต',
      'rfid_code', p_rfid_code
    );
  END IF;

  -- ตรวจสอบการสแกนซ้ำในวันเดียวกันสำหรับ trip_phase เดียวกัน
  SELECT COUNT(*)
  INTO v_existing_scan
  FROM rfid_scan_logs rsl
  WHERE rsl.student_id = v_student_id
    AND DATE(rsl.scan_time AT TIME ZONE 'Asia/Bangkok') = v_today
    AND rsl.location_type = v_trip_phase;

  -- ถ้าสแกนซ้ำ ให้ส่งกลับข้อมูลเดิม
  IF v_existing_scan > 0 THEN
    RETURN json_build_object(
      'success', true,
      'already_scanned', true,
      'student_name', v_student_name,
      'message', 'นักเรียนได้สแกนบัตรในเส้นทางนี้แล้ววันนี้',
      'trip_phase', v_trip_phase
    );
  END IF;

  -- บันทึกการสแกน RFID
  INSERT INTO rfid_scan_logs (
    student_id, 
    driver_id, 
    rfid_code,
    scan_time, 
    location_type,
    latitude, 
    longitude
  ) VALUES (
    v_student_id, 
    p_driver_id, 
    p_rfid_code,
    NOW() AT TIME ZONE 'Asia/Bangkok', 
    v_trip_phase,
    p_latitude, 
    p_longitude
  ) RETURNING scan_id INTO v_scan_id;

  -- หมายเหตุ: ใช้ 'boarded' เป็นสถานะเริ่มต้นสำหรับการสแกนทั้งหมด

  -- อัปเดตหรือเพิ่มสถานะการขึ้น-ลงรถ (ใช้โครงสร้างตารางที่ถูกต้อง)
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

  -- ค้นหา LINE User ID ของนักเรียนจากตาราง student_line_links
  SELECT line_user_id 
  INTO v_line_user_id
  FROM student_line_links
  WHERE student_id = v_student_id 
    AND active = true
  LIMIT 1;

  -- ถ้าไม่พบ LINE User ID ของนักเรียน ให้ค้นหาจากผู้ปกครอง
  IF v_line_user_id IS NULL THEN
    SELECT pll.line_user_id 
    INTO v_line_user_id
    FROM students s
    JOIN parent_line_links pll ON s.parent_id = pll.parent_id
    WHERE s.student_id = v_student_id 
      AND pll.active = true
    LIMIT 1;
  END IF;

  -- ส่งแจ้งเตือน LINE (ถ้ามี LINE User ID)
  IF v_line_user_id IS NOT NULL AND v_line_user_id != '' THEN
    -- สร้างข้อความแจ้งเตือน
    notification_message := CASE 
      WHEN v_trip_phase = 'go' THEN 
        '🚌 ' || v_student_name || ' ขึ้นรถโรงเรียนแล้ว' || E'\n' ||
        '⏰ เวลา: ' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI น.') || E'\n' ||
        '👨‍✈️ คนขับ: ' || v_driver_name || E'\n' ||
        '🛣️ เส้นทาง: รับนักเรียน'
      WHEN v_trip_phase = 'back' THEN 
        '🏠 ' || v_student_name || ' ลงรถโรงเรียนแล้ว' || E'\n' ||
        '⏰ เวลา: ' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI น.') || E'\n' ||
        '👨‍✈️ คนขับ: ' || v_driver_name || E'\n' ||
        '🛣️ เส้นทาง: ส่งนักเรียน'
      ELSE 
        '📍 ' || v_student_name || ' สแกนบัตรแล้ว' || E'\n' ||
        '⏰ เวลา: ' || TO_CHAR(NOW() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI น.') || E'\n' ||
        '👨‍✈️ คนขับ: ' || v_driver_name
    END;

    -- เรียกใช้ฟังก์ชันส่ง LINE notification
    BEGIN
      SELECT send_line_notification(v_line_user_id, notification_message) INTO line_result;
      line_notified := true;
    EXCEPTION WHEN OTHERS THEN
      line_notified := false;
      line_result := json_build_object('success', false, 'error', SQLERRM);
    END;
  END IF;

  -- ส่งผลลัพธ์กลับ
  RETURN json_build_object(
    'success', true,
    'student_name', v_student_name,
    'driver_name', v_driver_name,
    'trip_phase', v_trip_phase,
    'boarding_status', 'boarded',
    'scan_id', v_scan_id,
    'status_id', v_status_id,
    'line_notified', line_notified,
    'line_result', line_result,
    'message', 'บันทึกการสแกน RFID สำเร็จ'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false, 
    'error', 'เกิดข้อผิดพลาด: ' || SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql;