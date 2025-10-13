-- เพิ่มสถานะ 'completed' ใน trip_phase constraint
-- สำหรับระบบตรวจจับการเคลื่อนไหวหลังจบการเดินทาง

-- ขั้นตอนที่ 1: ตรวจสอบและลบ constraint เก่าทั้งหมดที่เป็นไปได้
DO $$
BEGIN
    -- ลบ constraint ของ driver_bus (ลองทุกชื่อที่เป็นไปได้)
    BEGIN
        ALTER TABLE public.driver_bus DROP CONSTRAINT IF EXISTS driver_bus_trip_phase_check;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.driver_bus DROP CONSTRAINT IF EXISTS driver_bus_trip_phase_check1;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.driver_bus DROP CONSTRAINT IF EXISTS check_trip_phase;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- ลบ constraint ของ student_boarding_status
    BEGIN
        ALTER TABLE public.student_boarding_status DROP CONSTRAINT IF EXISTS student_boarding_status_trip_phase_check;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.student_boarding_status DROP CONSTRAINT IF EXISTS student_boarding_status_trip_phase_check1;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- ลบ constraint ของ pickup_dropoff (location_type)
    BEGIN
        ALTER TABLE public.pickup_dropoff DROP CONSTRAINT IF EXISTS pickup_dropoff_location_type_check;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.pickup_dropoff DROP CONSTRAINT IF EXISTS pickup_dropoff_location_type_check1;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- ลบ constraint ของ rfid_scan_logs (location_type)
    BEGIN
        ALTER TABLE public.rfid_scan_logs DROP CONSTRAINT IF EXISTS rfid_scan_logs_location_type_check;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER TABLE public.rfid_scan_logs DROP CONSTRAINT IF EXISTS rfid_scan_logs_location_type_check1;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- ขั้นตอนที่ 2: เพิ่ม constraint ใหม่ที่รองรับ 'completed'

-- อัปเดต constraint ของตาราง driver_bus
ALTER TABLE public.driver_bus 
ADD CONSTRAINT driver_bus_trip_phase_check 
CHECK (trip_phase = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text]));

-- อัปเดต constraint ของตาราง student_boarding_status
ALTER TABLE public.student_boarding_status 
ADD CONSTRAINT student_boarding_status_trip_phase_check 
CHECK (trip_phase::text = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text]));

-- อัปเดต constraint ของตาราง pickup_dropoff (location_type)
ALTER TABLE public.pickup_dropoff 
ADD CONSTRAINT pickup_dropoff_location_type_check 
CHECK (location_type = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text]));

-- อัปเดต constraint ของตาราง rfid_scan_logs (location_type)
ALTER TABLE public.rfid_scan_logs 
ADD CONSTRAINT rfid_scan_logs_location_type_check 
CHECK (location_type::text = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text]));

-- เพิ่มคอมเมนต์อธิบายสถานะใหม่
COMMENT ON COLUMN public.driver_bus.trip_phase IS 'สถานะการเดินทาง: go=ขาไป, return=ขากลับ, unknown=ไม่ทราบ, completed=จบการเดินทาง (สำหรับเปิดระบบตรวจจับการเคลื่อนไหว)';

-- แสดงผลลัพธ์
SELECT 'Script executed successfully. All constraints updated to support completed status.' as result;