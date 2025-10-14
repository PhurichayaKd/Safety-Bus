import { supabase } from './supabaseClient';
import { EmergencyLog } from './emergencyService';

const API_BASE_URL = process.env.EXPO_PUBLIC_LINE_NOTIFICATION_URL || 'http://localhost:3000';

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
        description: emergency.description,
        location: emergency.location,
        notes: emergency.notes,
        timestamp: emergency.event_time
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

    // บันทึก log การส่งการแจ้งเตือน
    try {
      await logNotificationResults(
        emergency.event_id, 
        responseType, 
        result.notificationResults?.filter((r: any) => r.status === 'success').length || 0,
        result.notificationResults?.filter((r: any) => r.status === 'failed').length || 0
      );
    } catch (logError) {
      console.warn('Failed to log notification results:', logError);
      // ไม่ให้ error ของการ log ทำให้การส่ง notification ล้มเหลว
    }

    return { 
      success: true,
      error: null
    };

  } catch (error) {
    console.error('Error sending emergency LINE notifications:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// ฟังก์ชันนี้ถูกแทนที่ด้วยการเรียก emergency-notification API โดยตรง

// บันทึก log การส่งการแจ้งเตือน
const logNotificationResults = async (
  eventId: number,
  responseType: string,
  successCount: number,
  failureCount: number
): Promise<void> => {
  try {
    await supabase
      .from('notification_logs')
      .insert({
        notification_type: 'EMERGENCY_LINE',
        recipient_id: 'ALL_USERS',
        message: `Emergency ${responseType}: ${successCount} sent, ${failureCount} failed`,
        status: failureCount === 0 ? 'SUCCESS' : 'PARTIAL_FAILURE',
        error_details: failureCount > 0 ? { failureCount, successCount } : null,
      });
  } catch (error) {
    console.error('Error logging notification results:', error);
  }
};

// Helper functions ถูกย้ายไปใช้ใน emergency-notification API แล้ว

export default {
  sendEmergencyLineNotification,
  getAllLineUsers,
};