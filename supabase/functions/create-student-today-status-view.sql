-- สร้าง view สำหรับดูสถานะนักเรียนในวันนี้
CREATE OR REPLACE VIEW v_student_today_status AS
SELECT 
  student_id,
  last_event_time,
  last_event_type,
  last_location_type,
  driver_id,
  trip_phase
FROM (
  SELECT 
    pd.student_id,
    pd.event_time as last_event_time,
    pd.event_type as last_event_type,
    pd.location_type as last_location_type,
    pd.driver_id,
    pd.trip_phase,
    ROW_NUMBER() OVER (
      PARTITION BY pd.student_id 
      ORDER BY pd.event_time DESC
    ) as rn
  FROM pickup_dropoff pd
  WHERE pd.event_time >= timezone('Asia/Bangkok', CURRENT_DATE::timestamp)
    AND pd.event_time < timezone('Asia/Bangkok', (CURRENT_DATE + INTERVAL '1 day')::timestamp)
) ranked_events
WHERE rn = 1;

-- สร้าง function สำหรับดึงสถานะนักเรียนในวันนี้
CREATE OR REPLACE FUNCTION get_student_today_status(p_student_id INTEGER DEFAULT NULL)
RETURNS TABLE (
  student_id INTEGER,
  last_event_time TIMESTAMPTZ,
  last_event_type TEXT,
  last_location_type TEXT,
  driver_id INTEGER,
  trip_phase TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.student_id,
    v.last_event_time,
    v.last_event_type,
    v.last_location_type,
    v.driver_id,
    v.trip_phase
  FROM v_student_today_status v
  WHERE (p_student_id IS NULL OR v.student_id = p_student_id);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON v_student_today_status TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_student_today_status TO anon, authenticated;