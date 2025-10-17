-- อัปเดต constraint สำหรับ event_type ในตาราง emergency_logs
ALTER TABLE public.emergency_logs 
DROP CONSTRAINT IF EXISTS emergency_logs_event_type_check;

ALTER TABLE public.emergency_logs 
ADD CONSTRAINT emergency_logs_event_type_check 
CHECK (event_type = ANY (ARRAY[
    'PANIC_BUTTON'::text, 
    'SENSOR_ALERT'::text, 
    'DRIVER_INCAPACITATED'::text,
    'DRIVER_PANIC'::text,
    'MOVEMENT_DETECTED'::text,
    'HIGH_TEMPERATURE'::text,
    'SMOKE_AND_HEAT'::text,
    'STUDENT_SWITCH'::text
]));

-- เพิ่มคอลัมน์ sensor_type และ sensor_data หากยังไม่มี
ALTER TABLE public.emergency_logs 
ADD COLUMN IF NOT EXISTS sensor_type text;

ALTER TABLE public.emergency_logs 
ADD COLUMN IF NOT EXISTS sensor_data jsonb;