-- Supabase Function สำหรับดูสถานะการขึ้นรถของนักเรียนในเส้นทาง
CREATE OR REPLACE FUNCTION get_student_status(
  p_route_id INTEGER,
  p_location_type VARCHAR DEFAULT 'go',
  p_date DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_date DATE;
  v_result JSON;
BEGIN
  -- ตั้งค่าวันที่ (ถ้าไม่ระบุให้ใช้วันนี้)
  v_date := COALESCE(p_date, (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE);
  
  -- ดึงข้อมูลนักเรียนในเส้นทางและสถานะการขึ้นรถ
  SELECT json_agg(
    json_build_object(
      'student_id', rs.student_id,
      'student_name', s.student_name,
      'grade', s.grade,
      'stop_order', rs.stop_order,
      'home_latitude', s.home_latitude,
      'home_longitude', s.home_longitude,
      'is_on_bus', CASE WHEN pd.record_id IS NOT NULL THEN true ELSE false END,
      'scan_time', pd.event_time,
      'scan_method', pd.scan_method,
      'rfid_code', pd.rfid_code,
      'is_active', s.is_active,
      'has_leave_today', CASE WHEN lr.id IS NOT NULL THEN true ELSE false END,
      'leave_type', lr.leave_type,
      'student_phone', s.student_phone
    )
    ORDER BY rs.stop_order ASC
  )
  INTO v_result
  FROM route_students rs
  JOIN students s ON rs.student_id = s.student_id
  LEFT JOIN pickup_dropoff pd ON (
    pd.student_id = rs.student_id 
    AND pd.event_local_date = v_date
    AND pd.location_type = p_location_type
    AND pd.event_type = 'pickup'
  )
  LEFT JOIN leave_requests lr ON (
    lr.student_id = rs.student_id
    AND lr.leave_date = v_date
    AND lr.status = 'approved'
    AND lr.cancelled_at IS NULL
  )
  WHERE rs.route_id = p_route_id
    AND s.is_active = true;

  -- ส่งผลลัพธ์กลับ
  RETURN json_build_object(
    'success', true,
    'route_id', p_route_id,
    'date', v_date,
    'location_type', p_location_type,
    'students', COALESCE(v_result, '[]'::json),
    'total_students', (
      SELECT COUNT(*)
      FROM route_students rs
      JOIN students s ON rs.student_id = s.student_id
      WHERE rs.route_id = p_route_id AND s.is_active = true
    ),
    'students_on_bus', (
      SELECT COUNT(*)
      FROM route_students rs
      JOIN students s ON rs.student_id = s.student_id
      JOIN pickup_dropoff pd ON (
        pd.student_id = rs.student_id 
        AND pd.event_local_date = v_date
        AND pd.location_type = p_location_type
        AND pd.event_type = 'pickup'
      )
      WHERE rs.route_id = p_route_id AND s.is_active = true
    ),
    'students_on_leave', (
      SELECT COUNT(*)
      FROM route_students rs
      JOIN students s ON rs.student_id = s.student_id
      JOIN leave_requests lr ON (
        lr.student_id = rs.student_id
        AND lr.leave_date = v_date
        AND lr.status = 'approved'
        AND lr.cancelled_at IS NULL
      )
      WHERE rs.route_id = p_route_id AND s.is_active = true
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'เกิดข้อผิดพลาดในการดึงข้อมูล: ' || SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ให้สิทธิ์ในการเรียกใช้ function
GRANT EXECUTE ON FUNCTION get_student_status TO anon, authenticated;

-- สร้าง function สำหรับดูสถิติรวม
CREATE OR REPLACE FUNCTION get_route_summary(
  p_route_id INTEGER,
  p_date DATE DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_date DATE;
  v_go_stats JSON;
  v_return_stats JSON;
BEGIN
  v_date := COALESCE(p_date, (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE);
  
  -- สถิติเส้นทางไป
  SELECT json_build_object(
    'total', COUNT(*),
    'on_bus', COUNT(pd.record_id),
    'on_leave', COUNT(lr.id),
    'waiting', COUNT(*) - COUNT(pd.record_id) - COUNT(lr.id)
  )
  INTO v_go_stats
  FROM route_students rs
  JOIN students s ON rs.student_id = s.student_id
  LEFT JOIN pickup_dropoff pd ON (
    pd.student_id = rs.student_id 
    AND pd.event_local_date = v_date
    AND pd.location_type = 'go'
    AND pd.event_type = 'pickup'
  )
  LEFT JOIN leave_requests lr ON (
    lr.student_id = rs.student_id
    AND lr.leave_date = v_date
    AND lr.status = 'approved'
    AND lr.cancelled_at IS NULL
  )
  WHERE rs.route_id = p_route_id AND s.is_active = true;

  -- สถิติเส้นทางกลับ
  SELECT json_build_object(
    'total', COUNT(*),
    'on_bus', COUNT(pd.record_id),
    'on_leave', COUNT(lr.id),
    'waiting', COUNT(*) - COUNT(pd.record_id) - COUNT(lr.id)
  )
  INTO v_return_stats
  FROM route_students rs
  JOIN students s ON rs.student_id = s.student_id
  LEFT JOIN pickup_dropoff pd ON (
    pd.student_id = rs.student_id 
    AND pd.event_local_date = v_date
    AND pd.location_type = 'return'
    AND pd.event_type = 'pickup'
  )
  LEFT JOIN leave_requests lr ON (
    lr.student_id = rs.student_id
    AND lr.leave_date = v_date
    AND lr.status = 'approved'
    AND lr.cancelled_at IS NULL
  )
  WHERE rs.route_id = p_route_id AND s.is_active = true;

  RETURN json_build_object(
    'success', true,
    'route_id', p_route_id,
    'date', v_date,
    'go_trip', v_go_stats,
    'return_trip', v_return_stats
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'เกิดข้อผิดพลาดในการดึงสถิติ: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_route_summary TO anon, authenticated;