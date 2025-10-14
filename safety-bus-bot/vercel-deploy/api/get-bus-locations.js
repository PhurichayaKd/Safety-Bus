// API endpoint สำหรับดึงข้อมูลตำแหน่งรถบัสทั้งหมด
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn('⚠️ Supabase configuration missing');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
}

/**
 * ดึงข้อมูลตำแหน่งรถบัสทั้งหมด
 * @returns {Object} ข้อมูลตำแหน่งรถบัสทั้งหมด
 */
async function getAllBusLocations() {
  try {
    // ดึงข้อมูลรถบัสจากตาราง driver_bus
    const { data: driverBuses, error: busError } = await supabase
      .from('driver_bus')
      .select(`
        driver_id,
        license_plate,
        driver_name,
        route_id,
        home_latitude,
        home_longitude,
        school_latitude,
        school_longitude,
        is_active,
        trip_phase,
        current_status
      `)
      .eq('is_active', true)
      .order('license_plate', { ascending: true });

    if (busError) {
      throw busError;
    }

    // ดึงข้อมูลตำแหน่งปัจจุบันจาก live_driver_locations
    const { data: liveLocations, error: locationError } = await supabase
      .from('live_driver_locations')
      .select('driver_id, latitude, longitude, last_updated');

    if (locationError) {
      console.warn('Warning: Could not fetch live locations:', locationError.message);
    }

    // ดึงข้อมูลนักเรียนที่อยู่บนรถแต่ละคัน
    const busesWithStudents = await Promise.all(
      (driverBuses || []).map(async (bus) => {
        try {
          // ดึงจำนวนนักเรียนที่อยู่บนรถจากตาราง student_boarding_status
          const { data: students, error: studentError } = await supabase
            .from('student_boarding_status')
            .select(`
              student_id,
              boarding_status,
              students (
                student_name
              )
            `)
            .eq('driver_id', bus.driver_id)
            .eq('trip_date', new Date().toISOString().split('T')[0])
            .in('boarding_status', ['boarded', 'picked_up']);

          if (studentError) {
            console.warn(`Warning: Could not fetch students for driver ${bus.driver_id}:`, studentError.message);
          }

          // ดึงตำแหน่งปัจจุบันจาก live_driver_locations หรือใช้ข้อมูลจาก driver_bus
          const currentLocation = liveLocations?.find(loc => loc.driver_id === bus.driver_id) || null;
          
          return {
            bus_id: bus.driver_id, // ใช้ driver_id เป็น bus_id
            license_plate: bus.license_plate,
            driver_name: bus.driver_name,
            route_id: bus.route_id,
            // ตำแหน่งปัจจุบัน (จาก live_driver_locations หรือ fallback เป็น null)
            current_latitude: currentLocation?.latitude || null,
            current_longitude: currentLocation?.longitude || null,
            last_location_update: currentLocation?.last_updated || null,
            // ตำแหน่งบ้านและโรงเรียน (จาก driver_bus)
            home_latitude: bus.home_latitude,
            home_longitude: bus.home_longitude,
            school_latitude: bus.school_latitude,
            school_longitude: bus.school_longitude,
            status: bus.is_active ? 'active' : 'inactive',
            current_status: bus.current_status,
            trip_phase: bus.trip_phase,
            current_students: (students || []).map(s => ({
              student_id: s.student_id,
              student_name: s.students?.student_name,
              boarding_status: s.boarding_status
            })),
            student_count: (students || []).length
          };
        } catch (error) {
          console.warn(`Warning: Error processing driver ${bus.driver_id}:`, error.message);
          return {
            bus_id: bus.driver_id,
            license_plate: bus.license_plate,
            driver_name: bus.driver_name,
            route_id: bus.route_id,
            current_latitude: null,
            current_longitude: null,
            last_location_update: null,
            home_latitude: bus.home_latitude,
            home_longitude: bus.home_longitude,
            school_latitude: bus.school_latitude,
            school_longitude: bus.school_longitude,
            status: bus.is_active ? 'active' : 'inactive',
            current_status: bus.current_status,
            trip_phase: bus.trip_phase,
            current_students: [],
            student_count: 0
          };
        }
      })
    );

    return {
      success: true,
      buses: busesWithStudents,
      total_buses: busesWithStudents.length,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error fetching bus locations:', error);
    return {
      success: false,
      error: error.message,
      buses: [],
      total_buses: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * ดึงข้อมูลตำแหน่งรถบัสเฉพาะคัน
 * @param {number} driverId - ID ของคนขับ (ใช้เป็น bus_id)
 * @returns {Object} ข้อมูลตำแหน่งรถบัส
 */
async function getBusLocationById(driverId) {
  try {
    const { data: bus, error: busError } = await supabase
      .from('driver_bus')
      .select(`
        driver_id,
        license_plate,
        driver_name,
        route_id,
        home_latitude,
        home_longitude,
        school_latitude,
        school_longitude,
        is_active,
        trip_phase,
        current_status,
        live_driver_locations (
          latitude,
          longitude,
          last_updated
        )
      `)
      .eq('driver_id', driverId)
      .single();

    if (busError) {
      throw busError;
    }

    if (!bus) {
      return {
        success: false,
        error: 'Bus not found',
        timestamp: new Date().toISOString()
      };
    }

    // ดึงข้อมูลนักเรียนที่อยู่บนรถจากตาราง student_boarding_status
    const { data: students, error: studentError } = await supabase
      .from('student_boarding_status')
      .select(`
        student_id,
        boarding_status,
        students (
          student_name
        )
      `)
      .eq('driver_id', driverId)
      .eq('trip_date', new Date().toISOString().split('T')[0])
      .in('boarding_status', ['boarded', 'picked_up']);

    if (studentError) {
      console.warn(`Warning: Could not fetch students for driver ${driverId}:`, studentError.message);
    }

    // ดึงตำแหน่งปัจจุบันจาก live_driver_locations
    const currentLocation = bus.live_driver_locations?.[0] || null;

    return {
      success: true,
      bus: {
        bus_id: bus.driver_id,
        license_plate: bus.license_plate,
        driver_name: bus.driver_name,
        route_id: bus.route_id,
        // ตำแหน่งปัจจุบัน (จาก live_driver_locations)
        current_latitude: currentLocation?.latitude || null,
        current_longitude: currentLocation?.longitude || null,
        last_location_update: currentLocation?.last_updated || null,
        // ตำแหน่งบ้านและโรงเรียน (จาก driver_bus)
        home_latitude: bus.home_latitude,
        home_longitude: bus.home_longitude,
        school_latitude: bus.school_latitude,
        school_longitude: bus.school_longitude,
        status: bus.is_active ? 'active' : 'inactive',
        current_status: bus.current_status,
        trip_phase: bus.trip_phase,
        current_students: (students || []).map(s => ({
          student_id: s.student_id,
          student_name: s.students?.student_name,
          boarding_status: s.boarding_status
        })),
        student_count: (students || []).length
      },
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error fetching bus location:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Main API handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available',
      timestamp: new Date().toISOString()
    });
  }

  try {
    if (req.method === 'GET') {
      const busId = req.query.bus_id;
      
      if (busId) {
        // ดึงข้อมูลรถบัสเฉพาะคัน
        const busIdNum = parseInt(busId);
        if (isNaN(busIdNum)) {
          return res.status(400).json({
            success: false,
            error: 'bus_id must be a number',
            timestamp: new Date().toISOString()
          });
        }
        
        const result = await getBusLocationById(busIdNum);
        return res.status(result.success ? 200 : 404).json(result);
      } else {
        // ดึงข้อมูลรถบัสทั้งหมด
        const result = await getAllBusLocations();
        return res.status(200).json(result);
      }

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Only GET requests are supported.',
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message,
      timestamp: new Date().toISOString()
    });
  }
}