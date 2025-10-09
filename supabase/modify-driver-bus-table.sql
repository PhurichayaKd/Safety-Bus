-- เพิ่มคอลัมน์ trip_phase และ current_status ลงในตาราง driver_bus
-- แทนการสร้างตาราง driver_status ใหม่

-- เพิ่มคอลัมน์ trip_phase
ALTER TABLE public.driver_bus 
ADD COLUMN IF NOT EXISTS trip_phase text 
CHECK (trip_phase IN ('pickup', 'dropoff')) 
DEFAULT 'pickup';

-- เพิ่มคอลัมน์ current_status
ALTER TABLE public.driver_bus 
ADD COLUMN IF NOT EXISTS current_status text 
CHECK (current_status IN ('active', 'inactive', 'break', 'emergency')) 
DEFAULT 'inactive';

-- เพิ่มคอลัมน์ is_active สำหรับการติดตาม
ALTER TABLE public.driver_bus 
ADD COLUMN IF NOT EXISTS is_active boolean 
DEFAULT true;

-- อัปเดตข้อมูลเริ่มต้นสำหรับคนขับที่มีอยู่
UPDATE public.driver_bus 
SET 
    trip_phase = 'pickup',
    current_status = 'inactive',
    is_active = true
WHERE trip_phase IS NULL OR current_status IS NULL;

-- สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_driver_bus_trip_phase ON public.driver_bus(trip_phase);
CREATE INDEX IF NOT EXISTS idx_driver_bus_current_status ON public.driver_bus(current_status);
CREATE INDEX IF NOT EXISTS idx_driver_bus_active ON public.driver_bus(is_active);

-- เพิ่ม comment อธิบายคอลัมน์ใหม่
COMMENT ON COLUMN public.driver_bus.trip_phase IS 'Current trip phase: pickup (รับนักเรียน) or dropoff (ส่งนักเรียน)';
COMMENT ON COLUMN public.driver_bus.current_status IS 'Driver current working status: active, inactive, break, emergency';
COMMENT ON COLUMN public.driver_bus.is_active IS 'Whether the driver is currently active in the system';