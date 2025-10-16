-- คำสั่ง SQL สำหรับแก้ไขปัญหา trip_phase constraint เฉพาะ
-- ไฟล์นี้จะแก้ไขเฉพาะ constraint ที่จำเป็นสำหรับการรองรับ 'at_school'

-- ตรวจสอบ constraint ปัจจุบันในตาราง driver_bus
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.driver_bus'::regclass 
AND conname LIKE '%trip_phase%';

-- ตรวจสอบ constraint ปัจจุบันในตาราง student_boarding_status  
SELECT conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.student_boarding_status'::regclass 
AND conname LIKE '%trip_phase%';

-- แก้ไข constraint สำหรับ trip_phase ในตาราง driver_bus
-- ลบ constraint เดิม (ถ้ามี)
ALTER TABLE public.driver_bus 
DROP CONSTRAINT IF EXISTS driver_bus_trip_phase_check;

-- เพิ่ม constraint ใหม่ที่รองรับ 'at_school'
ALTER TABLE public.driver_bus 
ADD CONSTRAINT driver_bus_trip_phase_check 
CHECK (trip_phase = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text, 'at_school'::text]));

-- แก้ไข constraint สำหรับ trip_phase ในตาราง student_boarding_status
-- ลบ constraint เดิม (ถ้ามี)
ALTER TABLE public.student_boarding_status 
DROP CONSTRAINT IF EXISTS student_boarding_status_trip_phase_check;

-- เพิ่ม constraint ใหม่ที่รองรับ 'at_school'
ALTER TABLE public.student_boarding_status 
ADD CONSTRAINT student_boarding_status_trip_phase_check 
CHECK (trip_phase = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text, 'at_school'::text]));

-- ตรวจสอบ constraint หลังจากอัปเดต
SELECT 'driver_bus' as table_name, conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.driver_bus'::regclass 
AND conname LIKE '%trip_phase%'

UNION ALL

SELECT 'student_boarding_status' as table_name, conname, pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.student_boarding_status'::regclass 
AND conname LIKE '%trip_phase%';

-- ทดสอบการอัปเดต trip_phase เป็น 'at_school' (ถ้าต้องการ)
-- SELECT trip_phase FROM public.driver_bus WHERE driver_id = 1;
-- UPDATE public.driver_bus SET trip_phase = 'at_school' WHERE driver_id = 1;
-- SELECT trip_phase FROM public.driver_bus WHERE driver_id = 1;

-- แสดงข้อความยืนยัน
SELECT 'trip_phase constraint updated successfully for both tables' as status;