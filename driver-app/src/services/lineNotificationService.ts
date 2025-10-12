import { supabase } from './supabaseClient';
import { EmergencyLog } from './emergencyService';

const API_BASE_URL = 'https://safety-bus-bot-vercel-deploy.vercel.app/api';

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
  responseType: 'EMERGENCY' | 'CONFIRMED_NORMAL',
  driverName?: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    // ดึงรายการ LINE users ทั้งหมด
    const lineUsers = await getAllLineUsers();
    
    if (lineUsers.length === 0) {
      console.warn('No LINE users found in system');
      return { success: false, error: 'No LINE users found' };
    }

    // สร้างข้อความแจ้งเตือน
    const message = createEmergencyMessage(emergency, responseType, driverName);
    
    // ส่งการแจ้งเตือนไปยังทุก LINE user
    const notificationPromises = lineUsers.map(user => 
      sendLineMessage(user.line_user_id, message)
    );

    const results = await Promise.allSettled(notificationPromises);
    
    // ตรวจสอบผลลัพธ์
    const successCount = results.filter(result => result.status === 'fulfilled').length;
    const failureCount = results.filter(result => result.status === 'rejected').length;

    console.log(`LINE notifications sent: ${successCount} success, ${failureCount} failed`);

    // บันทึก log การส่งการแจ้งเตือน
    await logNotificationResults(emergency.event_id, responseType, successCount, failureCount);

    return { 
      success: successCount > 0,
      error: failureCount > 0 ? `${failureCount} notifications failed` : null
    };

  } catch (error) {
    console.error('Error sending emergency LINE notifications:', error);
    return { success: false, error };
  }
};

// สร้างข้อความแจ้งเตือน
const createEmergencyMessage = (
  emergency: EmergencyLog,
  responseType: 'EMERGENCY' | 'CONFIRMED_NORMAL',
  driverName?: string
): string => {
  const eventTypeText = getEventTypeText(emergency.event_type);
  const sourceText = getSourceText(emergency);
  const timeText = formatDateTime(emergency.event_time);
  const driver = driverName || 'คนขับ';

  if (responseType === 'EMERGENCY') {
    return `🚨 แจ้งเตือนฉุกเฉิน 🚨

⚠️ ${driver}ยืนยันเป็นเหตุฉุกเฉิน

📋 รายละเอียด:
• ประเภท: ${eventTypeText}
• แหล่งที่มา: ${sourceText}
• เวลา: ${timeText}
${emergency.details ? `• รายละเอียดเพิ่มเติม: ${emergency.details}` : ''}

🚌 กรุณาติดตามสถานการณ์และเตรียมพร้อมให้ความช่วยเหลือ

⏰ ${new Date().toLocaleString('th-TH')}`;

  } else if (responseType === 'CONFIRMED_NORMAL') {
    return `✅ อัปเดตสถานการณ์

🔄 ${driver}ยืนยันสถานการณ์กลับสู่ปกติ

📋 เหตุการณ์ที่แก้ไขแล้ว:
• ประเภท: ${eventTypeText}
• แหล่งที่มา: ${sourceText}
• เวลาเกิดเหตุ: ${timeText}

🚌 สถานการณ์กลับสู่ปกติแล้ว สามารถดำเนินการต่อได้

⏰ ${new Date().toLocaleString('th-TH')}`;
  }

  return '';
};

// ส่งข้อความ LINE ไปยัง user คนเดียว
const sendLineMessage = async (lineUserId: string, message: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/send-line-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: lineUserId,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send LINE message: ${response.status} - ${errorText}`);
    }

    console.log(`LINE message sent successfully to user: ${lineUserId}`);
  } catch (error) {
    console.error(`Error sending LINE message to ${lineUserId}:`, error);
    throw error;
  }
};

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

// Helper functions (ใช้จาก emergencyService หรือสร้างใหม่)
const getEventTypeText = (eventType: string): string => {
  switch (eventType) {
    case 'PANIC_BUTTON': return 'ปุ่มฉุกเฉิน';
    case 'SENSOR_ALERT': return 'เซ็นเซอร์แจ้งเตือน';
    case 'DRIVER_INCAPACITATED': return 'คนขับไม่สามารถขับได้';
    case 'SMOKE_DETECTED': return 'ตรวจพบควัน';
    case 'HIGH_TEMPERATURE': return 'อุณหภูมิสูง';
    case 'MOVEMENT_DETECTED': return 'ตรวจพบการเคลื่อนไหว';
    default: return eventType;
  }
};

const getSourceText = (emergency: EmergencyLog): string => {
  if (emergency.triggered_by === 'student') {
    return 'นักเรียนกดปุ่ม';
  } else if (emergency.triggered_by === 'sensor') {
    if (emergency.details) {
      try {
        const details = typeof emergency.details === 'string' 
          ? JSON.parse(emergency.details) 
          : emergency.details;
        return details.sensor_name || details.location || 'เซ็นเซอร์';
      } catch {
        return typeof emergency.details === 'string' ? emergency.details : 'เซ็นเซอร์';
      }
    }
    return 'เซ็นเซอร์';
  } else if (emergency.triggered_by === 'driver') {
    return 'คนขับ';
  }
  return emergency.triggered_by;
};

const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export default {
  sendEmergencyLineNotification,
  getAllLineUsers,
};