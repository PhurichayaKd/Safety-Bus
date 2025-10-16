// API endpoint สำหรับให้ Arduino ตรวจสอบ trip_phase ปัจจุบันจากแอพคนขับ
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
 * ดึงสถานะ trip_phase ปัจจุบันของคนขับ
 * @param {number} driverId - ID ของคนขับ
 * @returns {Object} สถานะ trip_phase ปัจจุบัน
 */
async function getDriverCurrentStatus(driverId) {
  try {
    // ตรวจสอบสถานะล่าสุดจาก driver_status table (ถ้ามี)
    const { data: driverStatus, error: statusError } = await supabase
      .from('driver_status')
      .select('*')
      .eq('driver_id', driverId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (statusError && !statusError.message.includes('relation "driver_status" does not exist')) {
      throw statusError;
    }

    // ถ้ามีตาราง driver_status และมีข้อมูล
    if (driverStatus && driverStatus.length > 0) {
      const status = driverStatus[0];
      return {
        success: true,
        driver_id: driverId,
        trip_phase: status.trip_phase || 'go',
        current_status: status.current_status || 'active',
        last_updated: status.updated_at,
        source: 'driver_status_table'
      };
    }

    // ถ้าไม่มีตาราง driver_status หรือไม่มีข้อมูล ให้ดูจาก rfid_scan_logs ล่าสุด
    const { data: lastScan, error: scanError } = await supabase
      .from('rfid_scan_logs')
      .select('trip_phase, scan_timestamp, location_type')
      .eq('driver_id', driverId)
      .order('scan_timestamp', { ascending: false })
      .limit(1);

    if (scanError) {
      throw scanError;
    }

    // ถ้ามีการสแกนล่าสุด
    if (lastScan && lastScan.length > 0) {
      const scan = lastScan[0];
      return {
        success: true,
        driver_id: driverId,
        trip_phase: scan.trip_phase || 'go',
        current_status: 'active',
        last_updated: scan.scan_timestamp,
        source: 'last_scan_log'
      };
    }

    // ถ้าไม่มีข้อมูลใดๆ ให้ใช้ค่าเริ่มต้น
    return {
      success: true,
      driver_id: driverId,
      trip_phase: 'go', // ค่าเริ่มต้นเป็น 'go' (เส้นทางไป)
      current_status: 'active',
      last_updated: new Date().toISOString(),
      source: 'default'
    };

  } catch (error) {
    console.error('Error getting driver status:', error);
    return {
      success: false,
      error: error.message,
      driver_id: driverId
    };
  }
}

/**
 * อัปเดตสถานะของคนขับ
 * @param {number} driverId - ID ของคนขับ
 * @param {string} tripPhase - trip_phase ใหม่ ('go', 'return', 'at_school', 'completed')
 * @param {string} currentStatus - สถานะปัจจุบัน (เช่น 'pickup', 'dropoff', 'driving', 'arrived_school')
 * @returns {Object} ผลลัพธ์การอัปเดต
 */
async function updateDriverStatus(driverId, tripPhase, currentStatus = 'active') {
  try {
    // ตรวจสอบว่า trip_phase ถูกต้องหรือไม่
    const validTripPhases = ['go', 'return', 'unknown', 'completed', 'at_school'];
    if (!validTripPhases.includes(tripPhase)) {
      return {
        success: false,
        error: `trip_phase ต้องเป็น ${validTripPhases.join(', ')} เท่านั้น`,
        driver_id: driverId
      };
    }

    // อัปเดตในตาราง driver_bus แทน driver_status
    const { data: updateResult, error: updateError } = await supabase
      .from('driver_bus')
      .update({
        trip_phase: tripPhase,
        current_status: currentStatus,
        current_updated_at: new Date().toISOString()
      })
      .eq('driver_id', driverId)
      .select();

    if (updateError) {
      throw updateError;
    }

    // ตรวจสอบว่าอัปเดตสำเร็จหรือไม่
    if (!updateResult || updateResult.length === 0) {
      return {
        success: false,
        error: `ไม่พบคนขับ ID ${driverId} ในระบบ`,
        driver_id: driverId
      };
    }

    // บันทึกลง notification_logs เพื่อเก็บประวัติ
    try {
      const { error: logError } = await supabase
        .from('notification_logs')
        .insert({
          notification_type: 'driver_status_update',
          recipient_id: driverId.toString(),
          message: `Driver ${driverId} updated trip_phase to ${tripPhase}`,
          status: 'logged',
          driver_id: driverId,
          error_details: {
            trip_phase: tripPhase,
            current_status: currentStatus,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.warn('Warning: Could not log status update:', logError.message);
      }
    } catch (logError) {
      console.warn('Warning: Could not log status update:', logError);
    }

    return {
      success: true,
      driver_id: driverId,
      trip_phase: tripPhase,
      current_status: currentStatus,
      updated_at: new Date().toISOString(),
      message: 'สถานะอัปเดตสำเร็จ',
      updated_data: updateResult[0]
    };

  } catch (error) {
    console.error('Error updating driver status:', error);
    return {
      success: false,
      error: error.message,
      driver_id: driverId
    };
  }
}

// Main API handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!supabase) {
    return res.status(500).json({
      success: false,
      error: 'Database connection not available'
    });
  }

  try {
    if (req.method === 'GET') {
      // ดึงสถานะปัจจุบันของคนขับ
      const driverId = parseInt(req.query.driver_id);
      
      if (!driverId || isNaN(driverId)) {
        return res.status(400).json({
          success: false,
          error: 'driver_id is required and must be a number'
        });
      }

      const result = await getDriverCurrentStatus(driverId);
      return res.status(result.success ? 200 : 400).json(result);

    } else if (req.method === 'POST') {
      // อัปเดตสถานะของคนขับ
      const { driver_id, trip_phase, current_status } = req.body;
      
      if (!driver_id || !trip_phase) {
        return res.status(400).json({
          success: false,
          error: 'driver_id and trip_phase are required'
        });
      }

      const result = await updateDriverStatus(
        parseInt(driver_id), 
        trip_phase, 
        current_status
      );
      return res.status(result.success ? 200 : 400).json(result);

    } else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}