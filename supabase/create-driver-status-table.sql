-- สร้างตาราง driver_status สำหรับเก็บสถานะปัจจุบันของคนขับ
CREATE TABLE IF NOT EXISTS driver_status (
  id BIGSERIAL PRIMARY KEY,
  driver_id INTEGER NOT NULL REFERENCES driver_bus(driver_id),
  trip_phase VARCHAR(10) NOT NULL DEFAULT 'go' CHECK (trip_phase IN ('go', 'return')),
  current_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (current_status IN ('active', 'pickup', 'dropoff', 'driving', 'break', 'offline')),
  current_latitude NUMERIC(10, 8) DEFAULT NULL,
  current_longitude NUMERIC(11, 8) DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Bangkok'),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'Asia/Bangkok'),
  
  -- Unique constraint เพื่อให้แต่ละคนขับมีสถานะเดียว
  CONSTRAINT uniq_active_driver_status UNIQUE (driver_id, is_active)
);

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_driver_status_driver_id ON driver_status(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_status_active ON driver_status(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_driver_status_trip_phase ON driver_status(trip_phase);
CREATE INDEX IF NOT EXISTS idx_driver_status_updated_at ON driver_status(updated_at);

-- สร้าง trigger สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_driver_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW() AT TIME ZONE 'Asia/Bangkok';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_driver_status_updated_at
  BEFORE UPDATE ON driver_status
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_status_updated_at();

-- ฟังก์ชันสำหรับอัปเดตสถานะคนขับ
CREATE OR REPLACE FUNCTION update_driver_trip_phase(
  p_driver_id INTEGER,
  p_trip_phase VARCHAR DEFAULT 'go',
  p_current_status VARCHAR DEFAULT 'active',
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- ตรวจสอบว่า trip_phase ถูกต้องหรือไม่
  IF p_trip_phase NOT IN ('go', 'return') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'trip_phase ต้องเป็น "go" หรือ "return" เท่านั้น',
      'driver_id', p_driver_id
    );
  END IF;

  -- ตรวจสอบว่า current_status ถูกต้องหรือไม่
  IF p_current_status NOT IN ('active', 'pickup', 'dropoff', 'driving', 'break', 'offline') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'current_status ไม่ถูกต้อง',
      'driver_id', p_driver_id
    );
  END IF;

  -- อัปเดตหรือสร้างสถานะใหม่
  INSERT INTO driver_status (
    driver_id,
    trip_phase,
    current_status,
    current_latitude,
    current_longitude,
    is_active
  ) VALUES (
    p_driver_id,
    p_trip_phase,
    p_current_status,
    p_latitude,
    p_longitude,
    true
  )
  ON CONFLICT (driver_id, is_active)
  DO UPDATE SET
    trip_phase = p_trip_phase,
    current_status = p_current_status,
    current_latitude = COALESCE(p_latitude, driver_status.current_latitude),
    current_longitude = COALESCE(p_longitude, driver_status.current_longitude),
    updated_at = NOW() AT TIME ZONE 'Asia/Bangkok';

  -- ส่งผลลัพธ์กลับ
  SELECT json_build_object(
    'success', true,
    'driver_id', driver_id,
    'trip_phase', trip_phase,
    'current_status', current_status,
    'updated_at', updated_at,
    'message', 'อัปเดตสถานะสำเร็จ'
  )
  INTO v_result
  FROM driver_status
  WHERE driver_id = p_driver_id AND is_active = true;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'เกิดข้อผิดพลาด: ' || SQLERRM,
      'driver_id', p_driver_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ฟังก์ชันสำหรับดึงสถานะปัจจุบันของคนขับ
CREATE OR REPLACE FUNCTION get_driver_current_status(
  p_driver_id INTEGER
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- ดึงสถานะปัจจุบัน
  SELECT json_build_object(
    'success', true,
    'driver_id', ds.driver_id,
    'trip_phase', ds.trip_phase,
    'current_status', ds.current_status,
    'current_latitude', ds.current_latitude,
    'current_longitude', ds.current_longitude,
    'last_updated', ds.updated_at,
    'driver_name', db.driver_name,
    'source', 'driver_status_table'
  )
  INTO v_result
  FROM driver_status ds
  JOIN driver_bus db ON ds.driver_id = db.driver_id
  WHERE ds.driver_id = p_driver_id AND ds.is_active = true;

  -- ถ้าไม่พบสถานะ ให้สร้างสถานะเริ่มต้น
  IF v_result IS NULL THEN
    -- สร้างสถานะเริ่มต้น
    INSERT INTO driver_status (
      driver_id,
      trip_phase,
      current_status,
      is_active
    ) VALUES (
      p_driver_id,
      'go',
      'active',
      true
    );

    -- ดึงข้อมูลที่เพิ่งสร้าง
    SELECT json_build_object(
      'success', true,
      'driver_id', ds.driver_id,
      'trip_phase', ds.trip_phase,
      'current_status', ds.current_status,
      'current_latitude', ds.current_latitude,
      'current_longitude', ds.current_longitude,
      'last_updated', ds.updated_at,
      'driver_name', db.driver_name,
      'source', 'default_created'
    )
    INTO v_result
    FROM driver_status ds
    JOIN driver_bus db ON ds.driver_id = db.driver_id
    WHERE ds.driver_id = p_driver_id AND ds.is_active = true;
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'เกิดข้อผิดพลาด: ' || SQLERRM,
      'driver_id', p_driver_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ให้สิทธิ์ในการเรียกใช้ functions
GRANT EXECUTE ON FUNCTION update_driver_trip_phase TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_driver_current_status TO anon, authenticated;

-- เพิ่มข้อมูลเริ่มต้นสำหรับคนขับที่มีอยู่
INSERT INTO driver_status (driver_id, trip_phase, current_status, is_active)
SELECT 
  driver_id,
  'go' as trip_phase,
  'active' as current_status,
  true as is_active
FROM driver_bus
WHERE driver_id NOT IN (SELECT driver_id FROM driver_status WHERE is_active = true)
ON CONFLICT (driver_id, is_active) DO NOTHING;

-- สร้าง comment สำหรับตาราง
COMMENT ON TABLE driver_status IS 'ตารางเก็บสถานะปัจจุบันของคนขับรถ รวมถึง trip_phase สำหรับระบบ RFID';
COMMENT ON COLUMN driver_status.trip_phase IS 'เส้นทางปัจจุบัน: go (ไป) หรือ return (กลับ)';
COMMENT ON COLUMN driver_status.current_status IS 'สถานะปัจจุบัน: active, pickup, dropoff, driving, break, offline';
COMMENT ON COLUMN driver_status.is_active IS 'สถานะการใช้งาน (ควรมีเพียงหนึ่งระเบียนที่ active=true ต่อคนขับ)';