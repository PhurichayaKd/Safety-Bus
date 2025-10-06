import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        // Fetch driver and bus data
        const { data: drivers, error: driverError } = await supabase
            .from('driver_bus')
            .select(`
                driver_id,
                driver_name,
                license_plate,
                capacity,
                route_id,
                home_latitude,
                home_longitude,
                school_latitude,
                school_longitude,
                routes (
                    route_name,
                    start_point,
                    end_point
                )
            `)
            .order('driver_id', { ascending: true });

        if (driverError) {
            console.error('Error fetching drivers:', driverError);
            return res.status(500).json({
                success: false,
                error: 'ไม่สามารถดึงข้อมูลรถได้'
            });
        }

        // Fetch current locations separately
        const { data: locations, error: locationError } = await supabase
            .from('live_driver_locations')
            .select('driver_id, latitude, longitude, last_updated')
            .order('last_updated', { ascending: false });

        if (locationError) {
            console.error('Error fetching locations:', locationError);
            // Continue without locations rather than failing completely
        }

        // Create a map of latest locations by driver_id
        const locationMap = {};
        if (locations) {
            locations.forEach(location => {
                if (!locationMap[location.driver_id]) {
                    locationMap[location.driver_id] = location;
                }
            });
        }

        // Filter and format the data
        const formattedBuses = drivers.map(driver => {
            const currentLocation = locationMap[driver.driver_id];
            const route = driver.routes;
            
            return {
                id: driver.driver_id,
                bus_number: driver.license_plate,
                route_name: route?.route_name || 'ไม่ระบุเส้นทาง',
                driver_name: driver.driver_name,
                status: currentLocation ? 'active' : 'inactive',
                current_latitude: currentLocation?.latitude,
                current_longitude: currentLocation?.longitude,
                current_updated_at: currentLocation?.last_updated,
                has_location: !!(currentLocation?.latitude && currentLocation?.longitude),
                last_seen: currentLocation?.last_updated ? new Date(currentLocation.last_updated).toISOString() : null,
                // Additional data for home and school locations
                home_latitude: driver.home_latitude,
                home_longitude: driver.home_longitude,
                school_latitude: driver.school_latitude,
                school_longitude: driver.school_longitude,
                capacity: driver.capacity,
                route_start: route?.start_point,
                route_end: route?.end_point
            };
        });

        // Calculate statistics
        const stats = {
            total_buses: formattedBuses.length,
            active_buses: formattedBuses.filter(bus => bus.has_location).length,
            inactive_buses: formattedBuses.filter(bus => !bus.has_location).length,
            online_buses: formattedBuses.filter(bus => bus.status === 'active' && bus.has_location).length
        };

        return res.status(200).json({
            success: true,
            data: formattedBuses,
            stats: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Unexpected error:', error);
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
        });
    }
}