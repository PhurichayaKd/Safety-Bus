-- แก้ไขปัญหา notification_logs table
-- รันไฟล์นี้ใน Supabase SQL Editor หรือ psql

-- ขั้นตอนที่ 1: ตรวจสอบว่าตารางมีอยู่หรือไม่
DO $$
BEGIN
    -- ลบ index เก่าก่อน (ถ้ามี)
    DROP INDEX IF EXISTS idx_notification_logs_type_status;
    DROP INDEX IF EXISTS idx_notification_logs_created_at;
    
    -- ลบ trigger เก่า (ถ้ามี)
    DROP TRIGGER IF EXISTS update_notification_logs_updated_at ON notification_logs;
    
    -- ลบฟังก์ชัน trigger เก่า (ถ้ามี)
    DROP FUNCTION IF EXISTS update_updated_at_column();
    
    -- ลบตารางเก่า (ถ้ามี)
    DROP TABLE IF EXISTS notification_logs CASCADE;
    
    RAISE NOTICE 'ลบข้อมูลเก่าเสร็จสิ้น';
END $$;

-- ขั้นตอนที่ 2: สร้างตารางใหม่
CREATE TABLE notification_logs (
    id BIGSERIAL PRIMARY KEY,
    notification_type VARCHAR(20) NOT NULL, -- 'line', 'sms', 'email'
    recipient_id TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'error'
    error_details JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ขั้นตอนที่ 3: สร้าง index
CREATE INDEX idx_notification_logs_type_status 
ON notification_logs(notification_type, status);

CREATE INDEX idx_notification_logs_created_at 
ON notification_logs(created_at);

-- ขั้นตอนที่ 4: สร้างฟังก์ชัน trigger สำหรับอัปเดต updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ขั้นตอนที่ 5: สร้าง trigger
CREATE TRIGGER update_notification_logs_updated_at
    BEFORE UPDATE ON notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ขั้นตอนที่ 6: ทดสอบการทำงาน
INSERT INTO notification_logs (
    notification_type, 
    recipient_id, 
    message, 
    status
) VALUES (
    'test', 
    'test_user', 
    'ทดสอบการทำงานของตาราง', 
    'sent'
);

-- แสดงผลลัพธ์
SELECT 
    'notification_logs table created successfully!' as result,
    COUNT(*) as test_records
FROM notification_logs;

-- ลบข้อมูลทดสอบ
DELETE FROM notification_logs WHERE notification_type = 'test';