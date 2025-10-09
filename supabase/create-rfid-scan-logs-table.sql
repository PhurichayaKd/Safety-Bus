-- สร้างตาราง rfid_scan_logs สำหรับบันทึกการสแกน RFID
CREATE TABLE IF NOT EXISTS public.rfid_scan_logs (
    scan_id SERIAL PRIMARY KEY,
    rfid_code VARCHAR(50) NOT NULL,
    driver_id INTEGER,
    student_id INTEGER,
    scan_time TIMESTAMPTZ DEFAULT NOW(),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    location_type VARCHAR(20) CHECK (location_type IN ('go', 'back')),
    scan_result VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_rfid_scan_logs_rfid_code ON public.rfid_scan_logs(rfid_code);
CREATE INDEX IF NOT EXISTS idx_rfid_scan_logs_driver_id ON public.rfid_scan_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_rfid_scan_logs_scan_time ON public.rfid_scan_logs(scan_time);

-- เพิ่ม foreign key constraints (ถ้าต้องการ)
-- ALTER TABLE public.rfid_scan_logs 
-- ADD CONSTRAINT fk_rfid_scan_logs_driver 
-- FOREIGN KEY (driver_id) REFERENCES public.driver_bus(driver_id);

-- เพิ่ม RLS (Row Level Security) ถ้าต้องการ
-- ALTER TABLE public.rfid_scan_logs ENABLE ROW LEVEL SECURITY;

-- เพิ่ม trigger สำหรับ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rfid_scan_logs_updated_at 
    BEFORE UPDATE ON public.rfid_scan_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- แสดงโครงสร้างตารางที่สร้างขึ้น
-- ใช้คำสั่ง: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'rfid_scan_logs';
SELECT 'Table rfid_scan_logs created successfully' as status;