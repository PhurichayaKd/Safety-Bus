-- ฟังก์ชันสำหรับดึงสถานะปัจจุบันของคนขับ
CREATE OR REPLACE FUNCTION public.get_driver_current_status(p_driver_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result json;
    v_driver_record record;
BEGIN
    -- ดึงข้อมูลคนขับ
    SELECT 
        driver_id,
        driver_name,
        trip_phase,
        current_status,
        is_active,
        current_latitude,
        current_longitude,
        current_updated_at,
        license_plate,
        route_id
    INTO v_driver_record
    FROM public.driver_bus 
    WHERE driver_id = p_driver_id;

    -- ตรวจสอบว่าพบคนขับหรือไม่
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Driver not found'
        );
    END IF;

    -- สร้างผลลัพธ์
    v_result := json_build_object(
        'success', true,
        'driver_id', v_driver_record.driver_id,
        'driver_name', v_driver_record.driver_name,
        'trip_phase', v_driver_record.trip_phase,
        'current_status', v_driver_record.current_status,
        'is_active', v_driver_record.is_active,
        'current_latitude', v_driver_record.current_latitude,
        'current_longitude', v_driver_record.current_longitude,
        'current_updated_at', v_driver_record.current_updated_at,
        'license_plate', v_driver_record.license_plate,
        'route_id', v_driver_record.route_id
    );

    RETURN v_result;
END;
$$;