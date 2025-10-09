-- สร้างตาราง student_boarding_status สำหรับเก็บสถานะการขึ้นรถของนักเรียน
-- รันไฟล์นี้ใน Supabase SQL Editor

-- ลบ constraint เก่าถ้ามี (เพื่อหลีกเลี่ยงข้อผิดพลาด)
DO $$ 
BEGIN
    -- ลบ constraint ถ้ามีอยู่
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uniq_daily_pickup_per_student_phase') THEN
        ALTER TABLE student_boarding_status DROP CONSTRAINT uniq_daily_pickup_per_student_phase;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- ไม่ต้องทำอะไรถ้าตารางไม่มีอยู่
    NULL;
END $$;

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint เพื่อป้องกันการซ้ำซ้อน
    CONSTRAINT uniq_daily_pickup_per_student_phase UNIQUE (student_id, driver_id, trip_date, trip_phase)
);

-- สร้าง indexes สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX idx_student_boarding_status_student_id ON student_boarding_status(student_id);
CREATE INDEX idx_student_boarding_status_driver_id ON student_boarding_status(driver_id);
CREATE INDEX idx_student_boarding_status_trip_date ON student_boarding_status(trip_date);
CREATE INDEX idx_student_boarding_status_trip_phase ON student_boarding_status(trip_phase);
CREATE INDEX idx_student_boarding_status_boarding_status ON student_boarding_status(boarding_status);

-- สร้าง trigger สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_student_boarding_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_boarding_status_updated_at
    BEFORE UPDATE ON student_boarding_status
    FOR EACH ROW
    EXECUTE FUNCTION update_student_boarding_status_updated_at();

-- เพิ่ม foreign key constraints (ถ้าตารางที่เกี่ยวข้องมีอยู่)
-- หมายเหตุ: ปิดการใช้งาน foreign key constraints ชั่วคราวเพื่อหลีกเลี่ยงปัญหา
-- ALTER TABLE student_boarding_status 
-- ADD CONSTRAINT fk_student_boarding_status_student_id 
-- FOREIGN KEY (student_id) REFERENCES students(student_id);

-- ALTER TABLE student_boarding_status 
-- ADD CONSTRAINT fk_student_boarding_status_driver_id 
-- FOREIGN KEY (driver_id) REFERENCES driver_bus(driver_id);

-- ALTER TABLE student_boarding_status 
-- ADD CONSTRAINT fk_student_boarding_status_last_scan_id 
-- FOREIGN KEY (last_scan_id) REFERENCES rfid_scan_logs(scan_id);

-- เพิ่ม RLS (Row Level Security) ถ้าต้องการ
-- ALTER TABLE student_boarding_status ENABLE ROW LEVEL SECURITY;

-- สร้าง policy สำหรับ RLS (ตัวอย่าง)
-- CREATE POLICY "Users can view their own boarding status" ON student_boarding_status
--     FOR SELECT USING (auth.uid() = (SELECT auth_user_id FROM driver_bus WHERE driver_id = student_boarding_status.driver_id));

-- แสดงข้อมูลตารางที่สร้างเสร็จแล้ว
SELECT 
    'student_boarding_status table created successfully!' as message,
    COUNT(*) as initial_record_count
FROM student_boarding_status;