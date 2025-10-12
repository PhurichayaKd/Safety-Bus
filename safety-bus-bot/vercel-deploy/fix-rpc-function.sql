-- แก้ไข RPC function get_driver_current_status ให้ return phone_number
-- ต้องรันใน Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_driver_current_status(p_driver_id INTEGER)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    driver_record RECORD;
    result JSON;
BEGIN
    -- ดึงข้อมูลคนขับจากตาราง driver_bus
    SELECT 
        driver_id,
        driver_name,
        phone_number,  -- เพิ่ม phone_number
        trip_phase,
        current_status,
        is_active,
        current_latitude,
        current_longitude,
        current_updated_at,
        license_plate,
        route_id
    INTO driver_record
    FROM driver_bus
    WHERE driver_id = p_driver_id;
    
    -- ตรวจสอบว่าพบข้อมูลคนขับหรือไม่
    IF NOT FOUND THEN
        result := json_build_object(
            'success', false,
            'message', 'Driver not found'
        );
    ELSE
        result := json_build_object(
            'success', true,
            'driver_id', driver_record.driver_id,
            'driver_name', driver_record.driver_name,
            'phone_number', driver_record.phone_number,  -- เพิ่ม phone_number
            'trip_phase', driver_record.trip_phase,
            'current_status', driver_record.current_status,
            'is_active', driver_record.is_active,
            'current_latitude', driver_record.current_latitude,
            'current_longitude', driver_record.current_longitude,
            'current_updated_at', driver_record.current_updated_at,
            'license_plate', driver_record.license_plate,
            'route_id', driver_record.route_id
        );
    END IF;
    
    RETURN result;
END;
$$;