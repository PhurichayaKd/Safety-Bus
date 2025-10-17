import { supabase } from './supabaseClient';
import { EmergencyLog } from './emergencyService';

const API_BASE_URL = process.env.EXPO_PUBLIC_LINE_NOTIFICATION_URL || 'http://localhost:3000';
console.log('Environment variable EXPO_PUBLIC_LINE_NOTIFICATION_URL:', process.env.EXPO_PUBLIC_LINE_NOTIFICATION_URL);
console.log('Using API_BASE_URL:', API_BASE_URL);

// แปลง event type จากระบบเป็น API format
const mapEventTypeToAPI = (eventType: string): string => {
  const eventTypeMap: { [key: string]: string } = {
    'PANIC_BUTTON': 'DRIVER_PANIC',
    'SENSOR_ALERT': 'MOVEMENT_DETECTED',
    'DRIVER_INCAPACITATED': 'DRIVER_PANIC',
    'SMOKE_DETECTED': 'SMOKE_DETECTED',
    'HIGH_TEMPERATURE': 'HIGH_TEMPERATURE',
    'MOVEMENT_DETECTED': 'MOVEMENT_DETECTED'
  };
  
  return eventTypeMap[eventType] || eventType;
};

// แปลง sensor type จาก emergency log เป็น format ที่ API ต้องการ
const mapSensorTypeFromEmergency = (emergency: EmergencyLog): { sensorType?: string; originalSensorType?: string } => {
  // ถ้ามี sensor_type ในฐานข้อมูล ให้ใช้เป็น originalSensorType
  if (emergency.sensor_type) {
    let sensorType = '';
    let originalSensorType = emergency.sensor_type;
    
    // แปลง sensor_type เป็น format ที่ API ต้องการ
    switch (emergency.sensor_type) {
      case 'PIR':
        sensorType = 'motion_detected_after_trip'; // หรือ motion_detected_at_school ขึ้นอยู่กับบริบท
        break;
      case 'SMOKE_HEAT':
        sensorType = 'smoke_heat';
        break;
      case 'TEMPERATURE':
        sensorType = 'temp_only';
        break;
      default:
        sensorType = 'motion_detected_after_trip'; // default fallback
        break;
    }
    
    return { sensorType, originalSensorType };
  }
  
  // ถ้าไม่มี sensor_type ให้ดูจาก details หรือ event_type
  if (emergency.details) {
    try {
      const details = typeof emergency.details === 'string' ? JSON.parse(emergency.details) : emergency.details;
      if (details.source) {
        return { 
          sensorType: details.source,
          originalSensorType: emergency.sensor_type || 'UNKNOWN'
        };
      }
    } catch (e) {
      console.warn('Failed to parse emergency details:', e);
    }
  }
  
  // fallback ตาม event_type
  if (emergency.event_type === 'SENSOR_ALERT') {
    return { 
      sensorType: 'motion_detected_after_trip',
      originalSensorType: 'PIR'
    };
  }
  
  return {};
};

interface LineUser {
  line_user_id: string;
  user_name?: string;
  user_type?: string;
}

// ดึงรายการ LINE User ID ทั้งหมดในระบบ
export const getAllLineUsers = async (): Promise<LineUser[]> => {
  try {
    const { data, error } = await supabase
      .from('line_users')
      .select('line_user_id, user_name, user_type')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching LINE users:', error);
    return [];
  }
};

// ส่งการแจ้งเตือนฉุกเฉินไปยัง LINE users ทั้งหมด
export const sendEmergencyLineNotification = async (
  emergency: EmergencyLog,
  responseType: 'NEW_EMERGENCY' | 'EMERGENCY' | 'CONFIRMED_NORMAL' | 'CHECKED',
  driverId?: number,
  driverName?: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const apiUrl = `${API_BASE_URL}/api/emergency-notification`;
    console.log('Sending emergency LINE notification:', { 
      eventId: emergency.event_id, 
      responseType, 
      eventType: emergency.event_type,
      apiUrl: apiUrl,
      API_BASE_URL: API_BASE_URL
    });

    // ดึงข้อมูล sensor type
    const sensorInfo = mapSensorTypeFromEmergency(emergency);
    
    // เรียก emergency-notification API endpoint
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: mapEventTypeToAPI(emergency.event_type),
        responseType: responseType,
        eventId: emergency.event_id,
        emergencyLogId: emergency.event_id, // เพิ่ม emergencyLogId
        driverId: driverId || emergency.driver_id, // เพิ่ม driverId
        description: emergency.description,
        location: emergency.location,
        notes: emergency.notes,
        timestamp: emergency.event_time,
        sensorType: sensorInfo.sensorType,
        originalSensorType: sensorInfo.originalSensorType
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send emergency notification: ${response.status} - ${errorText}`);
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json();
    console.log('Emergency notification sent successfully:', result);

    // ตรวจสอบว่า API ส่งกลับ success หรือไม่
    if (result.success === false) {
      console.error('API returned failure:', result.error);
      return { success: false, error: result.error || 'API returned failure' };
    }

    // การบันทึก log ถูกจัดการโดย API แล้ว ไม่ต้องบันทึกซ้ำที่นี่

    return { 
      success: true,
      error: null
    };

  } catch (error) {
    console.error('Error sending emergency LINE notifications:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// การส่งการแจ้งเตือนและการบันทึก log ถูกจัดการโดย emergency-notification API แล้ว

export default {
  sendEmergencyLineNotification,
  getAllLineUsers,
};