-- สร้างตาราง student_boarding_status (เวอร์ชันง่าย)
-- รันไฟล์นี้ใน Supabase SQL Editor

-- ลบตารางเก่าถ้ามี (ระวัง: จะลบข้อมูลทั้งหมด)
DROP TABLE IF EXISTS student_boarding_status CASCADE;

-- สร้างตาราง student_boarding_status
CREATE TABLE student_boarding_status (
    status_id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL,
    driver_id INTEGER NOT NULL,
    trip_date DATE NOT NULL,
    trip_phase VARCHAR(10) NOT NULL CHECK (trip_phase IN ('go', 'return')),
    boarding_status VARCHAR(20) NOT NULL CHECK (boarding_status IN ('waiting', 'boarded', 'dropped', 'absent')),
    pickup_time TIMESTAMP WITH TIME ZONE,
    dropoff_time TIMESTAMP WITH TIME ZONE,
    last_scan_id BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- เพิ่ม unique constraint (ใช้ชื่อใหม่เพื่อหลีกเลี่ยงความซ้ำซ้อน)
ALTER TABLE student_boarding_status 
ADD CONSTRAINT student_boarding_unique_daily_phase 
UNIQUE (student_id, driver_id, trip_date, trip_phase);

-- สร้าง indexes สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_sbs_student_id ON student_boarding_status(student_id);
CREATE INDEX IF NOT EXISTS idx_sbs_driver_id ON student_boarding_status(driver_id);
CREATE INDEX IF NOT EXISTS idx_sbs_trip_date ON student_boarding_status(trip_date);
CREATE INDEX IF NOT EXISTS idx_sbs_trip_phase ON student_boarding_status(trip_phase);
CREATE INDEX IF NOT EXISTS idx_sbs_boarding_status ON student_boarding_status(boarding_status);

-- สร้าง trigger สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_student_boarding_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ลบ trigger เก่าถ้ามี
DROP TRIGGER IF EXISTS trigger_update_student_boarding_status_updated_at ON student_boarding_status;

-- สร้าง trigger ใหม่
CREATE TRIGGER trigger_update_student_boarding_status_updated_at
    BEFORE UPDATE ON student_boarding_status
    FOR EACH ROW
    EXECUTE FUNCTION update_student_boarding_status_updated_at();

-- แสดงข้อมูลตารางที่สร้างเสร็จแล้ว
SELECT 
    'student_boarding_status table created successfully!' as message,
    COUNT(*) as initial_record_count
FROM student_boarding_status;

-- แสดงโครงสร้างตาราง
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'student_boarding_status' 
ORDER BY ordinal_position;