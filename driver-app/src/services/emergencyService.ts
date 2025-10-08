import { supabase } from './supabaseClient';

export interface EmergencyLog {
  event_id: number;
  driver_id: number;
  event_time: string;
  event_type: 'PANIC_BUTTON' | 'SENSOR_ALERT' | 'DRIVER_INCAPACITATED' | 'SMOKE_DETECTED' | 'HIGH_TEMPERATURE' | 'MOVEMENT_DETECTED';
  triggered_by: 'sensor' | 'driver' | 'student';
  description?: string;
  location?: string;
  notes?: string;
  resolved?: boolean;
  resolved_at?: string;
  resolved_by?: number;
  status?: 'pending' | 'resolved' | 'in_progress';
}

export interface EmergencyResponse {
  event_id: number;
  response_type: 'CHECKED' | 'EMERGENCY';
  response_time: string;
  driver_id: number;
  notes?: string;
}

// ดึงข้อมูล emergency logs แบบเรียลไทม์
export const subscribeToEmergencyLogs = (
  driverId: number,
  onNewEmergency: (emergency: EmergencyLog) => void,
  onEmergencyUpdate: (emergency: EmergencyLog) => void
) => {
  const channel = supabase
    .channel('emergency-logs-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'emergency_logs',
        filter: `driver_id=eq.${driverId}`
      },
      (payload) => {
        console.log('New emergency event:', payload.new);
        onNewEmergency(payload.new as EmergencyLog);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'emergency_logs',
        filter: `driver_id=eq.${driverId}`
      },
      (payload) => {
        console.log('Emergency event updated:', payload.new);
        onEmergencyUpdate(payload.new as EmergencyLog);
      }
    )
    .subscribe();

  return channel;
};

// ดึงข้อมูล emergency logs ล่าสุด
export const getRecentEmergencyLogs = async (driverId: number, limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', driverId)
      .order('event_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data: data as EmergencyLog[], error: null };
  } catch (error) {
    console.error('Error fetching emergency logs:', error);
    return { data: null, error };
  }
};

// ดึงข้อมูล emergency logs ที่ยังไม่ได้แก้ไข
export const getUnresolvedEmergencyLogs = async (driverId: number) => {
  try {
    const { data, error } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', driverId)
      .eq('resolved', false)
      .order('event_time', { ascending: false });

    if (error) throw error;
    return { data: data as EmergencyLog[], error: null };
  } catch (error) {
    console.error('Error fetching unresolved emergency logs:', error);
    return { data: null, error };
  }
};

// บันทึกการตอบสนองของคนขับ
export const recordEmergencyResponse = async (
  eventId: number,
  responseType: 'CHECKED' | 'EMERGENCY',
  driverId: number,
  notes?: string
) => {
  try {
    // บันทึกการตอบสนอง
    const { error: responseError } = await supabase
      .from('emergency_responses')
      .insert({
        event_id: eventId,
        response_type: responseType,
        response_time: new Date().toISOString(),
        driver_id: driverId,
        notes: notes
      });

    if (responseError) throw responseError;

    // อัปเดตสถานะ emergency log
    const { error: updateError } = await supabase
      .from('emergency_logs')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: driverId
      })
      .eq('event_id', eventId);

    if (updateError) throw updateError;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error recording emergency response:', error);
    return { success: false, error };
  }
};

// ส่งการแจ้งเตือนไปยัง LINE
export const sendLineNotification = async (
  emergencyLog: EmergencyLog,
  responseType?: 'CHECKED' | 'EMERGENCY'
) => {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_LINE_NOTIFICATION_URL || 'http://localhost:3000';
    
    let message = '';
    
    if (responseType) {
      // ข้อความตอบสนองจากคนขับ
      if (responseType === 'CHECKED') {
        message = `🟢 คนขับได้ทำการตรวจสอบเหตุการณ์เรียบร้อยแล้ว\n\nเหตุการณ์: ${getEventTypeText(emergencyLog.event_type)}\nเวลา: ${formatDateTime(emergencyLog.event_time)}\nสถานะ: กลับสู่สถานการณ์ปกติ`;
      } else {
        message = `🚨 คนขับแจ้งเหตุฉุกเฉิน!\n\nเหตุการณ์: ${getEventTypeText(emergencyLog.event_type)}\nเวลา: ${formatDateTime(emergencyLog.event_time)}\n⚠️ กำลังทำการให้นักเรียนลงจากรถเพื่อความปลอดภัย`;
      }
    } else {
      // ข้อความแจ้งเตือนเหตุการณ์ใหม่ (ไม่ส่งถ้า triggered_by เป็น student)
      if (emergencyLog.triggered_by === 'student') {
        return { success: true, error: null }; // ไม่ส่งแจ้งเตือน LINE
      }
      
      message = `🚨 แจ้งเตือนเหตุการณ์ฉุกเฉิน!\n\nประเภท: ${getEventTypeText(emergencyLog.event_type)}\nแหล่งที่มา: ${getTriggeredByText(emergencyLog.triggered_by)}\nเวลา: ${formatDateTime(emergencyLog.event_time)}\nรหัสคนขับ: ${emergencyLog.driver_id}`;
      
      if (emergencyLog.description) {
        message += `\nรายละเอียด: ${emergencyLog.description}`;
      }
    }

    const response = await fetch(`${baseUrl}/api/emergency-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType: responseType ? undefined : emergencyLog.event_type,
        responseType: responseType,
        eventId: emergencyLog.event_id,
        description: emergencyLog.description,
        location: emergencyLog.location,
        notes: emergencyLog.notes,
        timestamp: emergencyLog.event_time
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error sending LINE notification:', error);
    return { success: false, error };
  }
};

// Helper functions
export const getEventTypeText = (type: string) => {
  switch (type) {
    case 'PANIC_BUTTON':
      return 'ปุ่มฉุกเฉิน';
    case 'SENSOR_ALERT':
      return 'แจ้งเตือนเซ็นเซอร์';
    case 'DRIVER_INCAPACITATED':
      return 'คนขับไม่สามารถขับได้';
    case 'SMOKE_DETECTED':
      return 'ตรวจพบควัน';
    case 'HIGH_TEMPERATURE':
      return 'อุณหภูมิสูง';
    case 'MOVEMENT_DETECTED':
      return 'ตรวจพบการเคลื่อนไหว';
    default:
      return type;
  }
};

export const getTriggeredByText = (triggeredBy: string) => {
  switch (triggeredBy) {
    case 'sensor':
      return 'เซ็นเซอร์';
    case 'driver':
      return 'คนขับ';
    case 'student':
      return 'นักเรียน';
    default:
      return triggeredBy;
  }
};

export const formatDateTime = (dateTime: string) => {
  const date = new Date(dateTime);
  return date.toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getEventTypeIcon = (type: string) => {
  switch (type) {
    case 'PANIC_BUTTON':
      return 'warning';
    case 'SENSOR_ALERT':
      return 'alert-circle';
    case 'DRIVER_INCAPACITATED':
      return 'medical';
    case 'SMOKE_DETECTED':
      return 'cloud';
    case 'HIGH_TEMPERATURE':
      return 'thermometer';
    case 'MOVEMENT_DETECTED':
      return 'walk';
    default:
      return 'alert';
  }
};

export const getEventTypeColor = (type: string) => {
  switch (type) {
    case 'PANIC_BUTTON':
    case 'DRIVER_INCAPACITATED':
    case 'SMOKE_DETECTED':
      return '#EF4444'; // red
    case 'SENSOR_ALERT':
    case 'HIGH_TEMPERATURE':
    case 'MOVEMENT_DETECTED':
      return '#F59E0B'; // amber
    default:
      return '#6B7280'; // gray
  }
};