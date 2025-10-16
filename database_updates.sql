-- คำสั่ง SQL สำหรับปรับปรุงฐานข้อมูลให้รองรับระบบแจ้งเตือนฉุกเฉินใหม่

-- 1. เพิ่มประเภทเซ็นเซอร์ใหม่ในตาราง emergency_logs
-- เพิ่ม event_type ใหม่สำหรับเซ็นเซอร์ต่างๆ
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

-- 2. เพิ่มฟิลด์สำหรับข้อมูลเซ็นเซอร์
ALTER TABLE public.emergency_logs 
ADD COLUMN IF NOT EXISTS sensor_type text;

ALTER TABLE public.emergency_logs 
ADD COLUMN IF NOT EXISTS sensor_data jsonb;

-- เพิ่ม constraint สำหรับ sensor_type (ตรวจสอบว่ามีอยู่แล้วหรือไม่)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'emergency_logs_sensor_type_check' 
        AND conrelid = 'public.emergency_logs'::regclass
    ) THEN
        ALTER TABLE public.emergency_logs 
        ADD CONSTRAINT emergency_logs_sensor_type_check 
        CHECK (sensor_type IS NULL OR sensor_type = ANY (ARRAY[
            'PIR'::text,
            'DHT22'::text, 
            'MQ2'::text,
            'MQ135'::text,
            'TEMPERATURE'::text,
            'SMOKE'::text,
            'MOTION'::text,
            'COMBINED'::text
        ]));
    END IF;
END $$;

-- 3. เพิ่มฟิลด์สำหรับระบุว่าเป็นเหตุการณ์จากนักเรียนหรือไม่
ALTER TABLE public.emergency_logs 
ADD COLUMN IF NOT EXISTS is_student_emergency boolean DEFAULT false;

-- 4. เพิ่ม response_type ใหม่สำหรับการตอบสนองของคนขับ
ALTER TABLE public.emergency_logs 
DROP CONSTRAINT IF EXISTS emergency_logs_driver_response_type_check;

ALTER TABLE public.emergency_logs 
ADD CONSTRAINT emergency_logs_driver_response_type_check 
CHECK (driver_response_type IS NULL OR driver_response_type = ANY (ARRAY[
    'CHECKED'::text, 
    'EMERGENCY'::text, 
    'CONFIRMED_NORMAL'::text,
    'CHECKED_ONLY'::text,
    'EMERGENCY_CONFIRMED'::text,
    'SITUATION_NORMAL'::text
]));

-- 5. อัปเดต response_type ในตาราง emergency_responses
ALTER TABLE public.emergency_responses 
DROP CONSTRAINT IF EXISTS emergency_responses_response_type_check;

ALTER TABLE public.emergency_responses 
ADD CONSTRAINT emergency_responses_response_type_check 
CHECK (response_type = ANY (ARRAY[
    'CHECKED'::text, 
    'EMERGENCY'::text, 
    'CONFIRMED_NORMAL'::text,
    'CHECKED_ONLY'::text,
    'EMERGENCY_CONFIRMED'::text,
    'SITUATION_NORMAL'::text
]));

-- 6. เพิ่มฟิลด์สำหรับระบุว่าส่ง LINE หรือไม่
ALTER TABLE public.emergency_responses 
ADD COLUMN IF NOT EXISTS line_sent boolean DEFAULT true;

-- 7. เพิ่ม index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_emergency_logs_sensor_type ON public.emergency_logs(sensor_type);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_is_student_emergency ON public.emergency_logs(is_student_emergency);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_event_type_time ON public.emergency_logs(event_type, event_time);

-- 8. เพิ่มตารางสำหรับเก็บการตั้งค่าเซ็นเซอร์ (ถ้าต้องการ)
CREATE TABLE IF NOT EXISTS public.sensor_settings (
    id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    driver_id integer NOT NULL,
    sensor_type text NOT NULL,
    threshold_value numeric,
    is_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sensor_settings_pkey PRIMARY KEY (id),
    CONSTRAINT sensor_settings_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.driver_bus(driver_id),
    CONSTRAINT sensor_settings_sensor_type_check CHECK (sensor_type = ANY (ARRAY[
        'PIR'::text,
        'DHT22'::text, 
        'MQ2'::text,
        'MQ135'::text,
        'TEMPERATURE'::text,
        'SMOKE'::text
    ]))
);

-- 9. เพิ่ม unique constraint สำหรับ sensor_settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_sensor_settings_driver_sensor 
ON public.sensor_settings(driver_id, sensor_type);

-- 10. Comment สำหรับอธิบายการใช้งาน
COMMENT ON COLUMN public.emergency_logs.sensor_type IS 'ประเภทเซ็นเซอร์ที่ตรวจพบเหตุการณ์';
COMMENT ON COLUMN public.emergency_logs.sensor_data IS 'ข้อมูลจากเซ็นเซอร์ในรูปแบบ JSON เช่น {"temperature": 45.5, "smokeLevel": 600}';
COMMENT ON COLUMN public.emergency_logs.is_student_emergency IS 'ระบุว่าเป็นเหตุการณ์ฉุกเฉินจากนักเรียนหรือไม่';
COMMENT ON COLUMN public.emergency_responses.line_sent IS 'ระบุว่าส่งข้อความ LINE แล้วหรือไม่';
COMMENT ON TABLE public.sensor_settings IS 'ตารางสำหรับเก็บการตั้งค่าเซ็นเซอร์ของแต่ละคนขับ';

-- 11. อัปเดต constraint สำหรับ trip_phase ในตาราง driver_bus ให้รองรับ 'at_school'
-- ลบ constraint เดิม
ALTER TABLE public.driver_bus 
DROP CONSTRAINT IF EXISTS driver_bus_trip_phase_check;

-- เพิ่ม constraint ใหม่ที่รองรับ 'at_school'
ALTER TABLE public.driver_bus 
ADD CONSTRAINT driver_bus_trip_phase_check 
CHECK (trip_phase = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text, 'at_school'::text]));

-- 12. อัปเดต constraint สำหรับ trip_phase ในตาราง student_boarding_status ให้รองรับ 'at_school'
-- ลบ constraint เดิม
ALTER TABLE public.student_boarding_status 
DROP CONSTRAINT IF EXISTS student_boarding_status_trip_phase_check;

-- เพิ่ม constraint ใหม่ที่รองรับ 'at_school'
ALTER TABLE public.student_boarding_status 
ADD CONSTRAINT student_boarding_status_trip_phase_check 
CHECK (trip_phase = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text, 'at_school'::text]));