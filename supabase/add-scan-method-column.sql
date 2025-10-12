-- เพิ่มคอลัมน์ scan_method ในตาราง pickup_dropoff
-- คำสั่งนี้จะเพิ่มคอลัมน์ scan_method ที่ขาดหายไป

-- ตรวจสอบว่าคอลัมน์มีอยู่แล้วหรือไม่ก่อนเพิ่ม
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
        
        RAISE NOTICE 'เพิ่มคอลัมน์ scan_method ในตาราง pickup_dropoff เรียบร้อยแล้ว';
    ELSE
        RAISE NOTICE 'คอลัมน์ scan_method มีอยู่แล้วในตาราง pickup_dropoff';
    END IF;
END $$;

-- อัปเดตข้อมูลเก่าให้มีค่า default
UPDATE public.pickup_dropoff 
SET scan_method = 'rfid' 
WHERE scan_method IS NULL;

-- เพิ่ม comment สำหรับคอลัมน์
COMMENT ON COLUMN public.pickup_dropoff.scan_method IS 'วิธีการสแกน: rfid, manual, qr_code, nfc';