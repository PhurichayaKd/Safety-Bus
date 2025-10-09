-- ลบ constraint เก่าที่ทำให้เกิดปัญหา duplicate key
-- constraint นี้มาจากระบบเก่าที่ใช้ตาราง student_boarding_status

-- ตรวจสอบ constraint ที่มีอยู่ในตาราง pickup_dropoff
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'pickup_dropoff'::regclass
ORDER BY conname;

-- ลบ constraint uniq_daily_pickup_per_student_phase ถ้ามีอยู่
ALTER TABLE pickup_dropoff DROP CONSTRAINT IF EXISTS uniq_daily_pickup_per_student_phase;

-- ตรวจสอบอีกครั้งหลังลบ
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'pickup_dropoff'::regclass
ORDER BY conname;

-- แสดงข้อมูลตาราง pickup_dropoff เพื่อยืนยันว่าโครงสร้างถูกต้อง
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'pickup_dropoff' 
    AND table_schema = 'public'
ORDER BY ordinal_position;