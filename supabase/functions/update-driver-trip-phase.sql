-- ฟังก์ชันสำหรับอัปเดต trip_phase ของคนขับ
CREATE OR REPLACE FUNCTION public.update_driver_trip_phase(
    p_driver_id integer,
    p_trip_phase text,
    p_latitude numeric DEFAULT NULL,
    p_longitude numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
    v_old_phase text;
    v_driver_name text;
BEGIN
    -- ตรวจสอบว่า trip_phase ถูกต้อง
    IF p_trip_phase NOT IN ('pickup', 'dropoff') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid trip_phase. Must be pickup or dropoff'
        );
    END IF;

    -- ดึงข้อมูลคนขับและ trip_phase เดิม
    SELECT trip_phase, driver_name 
    INTO v_old_phase, v_driver_name
    FROM public.driver_bus 
    WHERE driver_id = p_driver_id;

    -- ตรวจสอบว่าพบคนขับหรือไม่
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Driver not found'
        );
    END IF;

    -- อัปเดต trip_phase และข้อมูลตำแหน่ง
    UPDATE public.driver_bus 
    SET 
        trip_phase = p_trip_phase,
        current_status = 'active',
        current_latitude = COALESCE(p_latitude, current_latitude),
        current_longitude = COALESCE(p_longitude, current_longitude),
        current_updated_at = now()
    WHERE driver_id = p_driver_id;

    -- สร้างผลลัพธ์
    v_result := json_build_object(
        'success', true,
        'driver_id', p_driver_id,
        'driver_name', v_driver_name,
        'old_trip_phase', v_old_phase,
        'new_trip_phase', p_trip_phase,
        'updated_at', now()
    );

    RETURN v_result;
END;
$$;