-- แก้ไขคอลัมน์ที่ขาดหายทั้งหมดในฐานข้อมูล
-- รันไฟล์นี้เพื่อเพิ่มคอลัมน์ที่จำเป็นสำหรับระบบ RFID

-- 1. เพิ่มคอลัมน์ notification_sent ในตาราง rfid_scan_logs
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'rfid_scan_logs' 
        AND column_name = 'notification_sent'
    ) THEN
        ALTER TABLE public.rfid_scan_logs 
        ADD COLUMN notification_sent boolean DEFAULT false;
        
        RAISE NOTICE '✅ เพิ่มคอลัมน์ notification_sent ในตาราง rfid_scan_logs เรียบร้อยแล้ว';
    ELSE
        RAISE NOTICE 'ℹ️  คอลัมน์ notification_sent มีอยู่แล้วในตาราง rfid_scan_logs';
    END IF;
END $$;

-- 2. เพิ่มคอลัมน์ scan_method ในตาราง pickup_dropoff
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pickup_dropoff' 
        AND column_name = 'scan_method'
    ) THEN
        ALTER TABLE public.pickup_dropoff 
        ADD COLUMN scan_method text DEFAULT 'rfid' CHECK (scan_method IN ('rfid', 'manual', 'qr_code', 'nfc'));
        
        RAISE NOTICE '✅ เพิ่มคอลัมน์ scan_method ในตาราง pickup_dropoff เรียบร้อยแล้ว';
    ELSE
        RAISE NOTICE 'ℹ️  คอลัมน์ scan_method มีอยู่แล้วในตาราง pickup_dropoff';
    END IF;
END $$;

-- 3. อัปเดตข้อมูลเก่าให้มีค่า default
UPDATE public.rfid_scan_logs 
SET notification_sent = false 
WHERE notification_sent IS NULL;

UPDATE public.pickup_dropoff 
SET scan_method = 'rfid' 
WHERE scan_method IS NULL;

-- 4. เพิ่ม comment สำหรับคอลัมน์ใหม่
COMMENT ON COLUMN public.rfid_scan_logs.notification_sent IS 'บันทึกว่าได้ส่งการแจ้งเตือนแล้วหรือไม่';
COMMENT ON COLUMN public.pickup_dropoff.scan_method IS 'วิธีการสแกน: rfid, manual, qr_code, nfc';

-- 5. แสดงสถานะการแก้ไข
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 การแก้ไขคอลัมน์ที่ขาดหายเสร็จสิ้น!';
    RAISE NOTICE '';
    RAISE NOTICE '📋 สรุปการแก้ไข:';
    RAISE NOTICE '   ✅ rfid_scan_logs.notification_sent (boolean)';
    RAISE NOTICE '   ✅ pickup_dropoff.scan_method (text)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ระบบพร้อมใช้งานแล้ว';
END $$;