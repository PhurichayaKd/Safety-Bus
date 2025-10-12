-- เพิ่มคอลัมน์ notification_sent ในตาราง rfid_scan_logs
-- คำสั่งนี้จะเพิ่มคอลัมน์ notification_sent ที่ขาดหายไป

-- ตรวจสอบว่าคอลัมน์มีอยู่แล้วหรือไม่ก่อนเพิ่ม
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
        
        RAISE NOTICE 'เพิ่มคอลัมน์ notification_sent ในตาราง rfid_scan_logs เรียบร้อยแล้ว';
    ELSE
        RAISE NOTICE 'คอลัมน์ notification_sent มีอยู่แล้วในตาราง rfid_scan_logs';
    END IF;
END $$;

-- อัปเดตข้อมูลเก่าให้มีค่า default
UPDATE public.rfid_scan_logs 
SET notification_sent = false 
WHERE notification_sent IS NULL;

-- เพิ่ม comment สำหรับคอลัมน์
COMMENT ON COLUMN public.rfid_scan_logs.notification_sent IS 'บันทึกว่าได้ส่งการแจ้งเตือนแล้วหรือไม่';