-- อัปเดตตาราง emergency_logs เพื่อรองรับการเก็บข้อมูลการตอบสนองของคนขับ

-- เพิ่มฟิลด์สำหรับการตอบสนองของคนขับ
ALTER TABLE public.emergency_logs 
ADD COLUMN IF NOT EXISTS driver_response_type text CHECK (driver_response_type = ANY (ARRAY['CHECKED'::text, 'EMERGENCY'::text, 'CONFIRMED_NORMAL'::text])),
ADD COLUMN IF NOT EXISTS driver_response_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS driver_response_notes text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'checked'::text, 'emergency_confirmed'::text, 'resolved'::text])),
ADD COLUMN IF NOT EXISTS resolved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolved_by integer REFERENCES public.driver_bus(driver_id);

-- เพิ่ม index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_emergency_logs_driver_status ON public.emergency_logs(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_event_time ON public.emergency_logs(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_emergency_logs_resolved ON public.emergency_logs(resolved, driver_id);

-- อัปเดตข้อมูลเก่าให้มีสถานะเริ่มต้น
UPDATE public.emergency_logs 
SET status = 'pending', resolved = false 
WHERE status IS NULL;

-- สร้างตาราง emergency_responses สำหรับเก็บประวัติการตอบสนอง (ถ้ายังไม่มี)
CREATE TABLE IF NOT EXISTS public.emergency_responses (
  response_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id integer NOT NULL REFERENCES public.emergency_logs(event_id),
  driver_id integer NOT NULL REFERENCES public.driver_bus(driver_id),
  response_type text NOT NULL CHECK (response_type = ANY (ARRAY['CHECKED'::text, 'EMERGENCY'::text, 'CONFIRMED_NORMAL'::text])),
  response_time timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- เพิ่ม index สำหรับตาราง emergency_responses
CREATE INDEX IF NOT EXISTS idx_emergency_responses_event_id ON public.emergency_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_emergency_responses_driver_id ON public.emergency_responses(driver_id);
CREATE INDEX IF NOT EXISTS idx_emergency_responses_response_time ON public.emergency_responses(response_time DESC);

-- เปิดใช้งาน RLS (Row Level Security) สำหรับตาราง emergency_responses
ALTER TABLE public.emergency_responses ENABLE ROW LEVEL SECURITY;

-- ลบ policy เก่าก่อน (ถ้ามี) แล้วสร้างใหม่
DROP POLICY IF EXISTS "Drivers can view their own emergency responses" ON public.emergency_responses;
DROP POLICY IF EXISTS "Drivers can insert their own emergency responses" ON public.emergency_responses;

-- สร้าง policy สำหรับ emergency_responses
CREATE POLICY "Drivers can view their own emergency responses" 
ON public.emergency_responses FOR SELECT 
USING (driver_id IN (
  SELECT driver_id FROM public.driver_bus 
  WHERE auth_user_id = auth.uid()
));

CREATE POLICY "Drivers can insert their own emergency responses" 
ON public.emergency_responses FOR INSERT 
WITH CHECK (driver_id IN (
  SELECT driver_id FROM public.driver_bus 
  WHERE auth_user_id = auth.uid()
));

-- เปิดใช้งาน realtime สำหรับตาราง emergency_logs และ emergency_responses
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_responses;

-- สร้าง function สำหรับอัปเดตสถานะ emergency log เมื่อมีการตอบสนอง
CREATE OR REPLACE FUNCTION update_emergency_log_status()
RETURNS TRIGGER AS $$
BEGIN
  -- อัปเดตสถานะใน emergency_logs ตามการตอบสนอง
  UPDATE public.emergency_logs 
  SET 
    driver_response_type = NEW.response_type,
    driver_response_time = NEW.response_time,
    driver_response_notes = NEW.notes,
    status = CASE 
      WHEN NEW.response_type = 'CHECKED' THEN 'checked'
      WHEN NEW.response_type = 'EMERGENCY' THEN 'emergency_confirmed'
      WHEN NEW.response_type = 'CONFIRMED_NORMAL' THEN 'resolved'
      ELSE 'pending'
    END,
    resolved = CASE 
      WHEN NEW.response_type IN ('CHECKED', 'CONFIRMED_NORMAL') THEN true
      ELSE false
    END,
    resolved_at = CASE 
      WHEN NEW.response_type IN ('CHECKED', 'CONFIRMED_NORMAL') THEN NEW.response_time
      ELSE NULL
    END,
    resolved_by = NEW.driver_id
  WHERE event_id = NEW.event_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- สร้าง trigger สำหรับอัปเดตสถานะอัตโนมัติ
DROP TRIGGER IF EXISTS trigger_update_emergency_log_status ON public.emergency_responses;
CREATE TRIGGER trigger_update_emergency_log_status
  AFTER INSERT ON public.emergency_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_emergency_log_status();

-- เพิ่มข้อมูลตัวอย่างสำหรับทดสอบ (ถ้าต้องการ)
-- INSERT INTO public.emergency_logs (driver_id, event_type, triggered_by, details) 
-- VALUES (1, 'SENSOR_ALERT', 'sensor', '{"temperature": 85, "smoke_level": "high"}');