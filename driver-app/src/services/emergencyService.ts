import { supabase } from './supabaseClient';
import { sendEmergencyLineNotification } from './lineNotificationService';

export interface EmergencyLog {
  event_id: number;
  driver_id: number;
  event_time: string;
  event_type: 'PANIC_BUTTON' | 'SENSOR_ALERT' | 'DRIVER_INCAPACITATED' | 'SMOKE_DETECTED' | 'HIGH_TEMPERATURE' | 'MOVEMENT_DETECTED';
  triggered_by: 'sensor' | 'driver' | 'student';
  sensor_type?: 'PIR' | 'SMOKE_HEAT' | 'TEMPERATURE' | 'MOTION' | 'SMOKE' | string; // เพิ่ม sensor_type property
  description?: string;
  location?: string;
  notes?: string;
  resolved?: boolean;
  resolved_at?: string;
  resolved_by?: number;
  status?: 'pending' | 'checked' | 'emergency_confirmed' | 'resolved';
  details?: string | object; // เพิ่มฟิลด์ details สำหรับข้อมูลเซ็นเซอร์ (รองรับทั้ง string และ object)
  driver_response_type?: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL';
  driver_response_time?: string;
  driver_response_notes?: string;
}

export interface EmergencyResponse {
  response_id?: number;
  event_id: number;
  driver_id: number;
  response_type: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL';
  response_time: string;
  notes?: string;
  created_at?: string;
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
      .is('driver_response_type', null)
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
  responseType: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL',
  driverId: number,
  notes?: string
) => {
  try {
    // บันทึกการตอบสนอง
    const { data: responseData, error: responseError } = await supabase
      .from('emergency_responses')
      .insert({
        event_id: eventId,
        driver_id: driverId,
        response_type: responseType,
        response_time: new Date().toISOString(),
        notes: notes
      })
      .select()
      .single();

    if (responseError) throw responseError;

    // อัปเดต driver_response_type ในตาราง emergency_logs
    const { error: updateError } = await supabase
      .from('emergency_logs')
      .update({
        driver_response_type: responseType,
        driver_response_time: new Date().toISOString(),
        driver_response_notes: notes || (responseType === 'CHECKED' 
          ? 'คนขับตรวจสอบแล้ว' 
          : responseType === 'EMERGENCY' 
            ? 'คนขับยืนยันเหตุฉุกเฉิน' 
            : 'คนขับยืนยันสถานการณ์กลับสู่ปกติ')
      })
      .eq('event_id', eventId);

    if (updateError) {
      console.error('Error updating emergency log:', updateError);
      // ไม่ให้ error ของการอัปเดต emergency log ทำให้การบันทึกการตอบสนองล้มเหลว
    }

    // ส่ง LINE notification สำหรับ EMERGENCY และ CONFIRMED_NORMAL
    if (responseType === 'EMERGENCY' || responseType === 'CONFIRMED_NORMAL') {
      try {
        // ดึงข้อมูล emergency log
        const { data: emergencyData, error: emergencyError } = await supabase
          .from('emergency_logs')
          .select('*')
          .eq('event_id', eventId)
          .single();

        if (!emergencyError && emergencyData) {
          await sendEmergencyLineNotification(emergencyData, responseType, driverId);
        }
      } catch (notificationError) {
        console.error('Error sending LINE notification:', notificationError);
        // ไม่ให้ error ของการส่ง notification ทำให้การบันทึกการตอบสนองล้มเหลว
      }
    }

    return { success: true, error: null, data: responseData };
  } catch (error) {
    console.error('Error recording emergency response:', error);
    return { success: false, error };
  }
};

// ส่งการแจ้งเตือนไปยัง LINE
export const sendLineNotification = async (
  emergencyLog: EmergencyLog,
  responseType?: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL'
) => {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_LINE_NOTIFICATION_URL || 'http://localhost:3000';
    
    let message = '';
    
    if (responseType) {
      // ข้อความตอบสนองจากคนขับ
      if (responseType === 'CHECKED') {
        message = `🟢 คนขับได้ทำการตรวจสอบเหตุการณ์เรียบร้อยแล้ว\n\nเหตุการณ์: ${getEventTypeText(emergencyLog.event_type)}\nเวลา: ${formatDateTime(emergencyLog.event_time)}\nสถานะ: ไม่พบสิ่งผิดปกติ`;
      } else if (responseType === 'EMERGENCY') {
        // สร้างข้อความตามรายละเอียดเซ็นเซอร์
        const sensorDetails = getSensorDetailsMessage(emergencyLog.details);
        message = `🚨 คนขับยืนยันเป็นเหตุฉุกเฉิน!\n\n${sensorDetails}\n⚠️ กำลังทำการให้นักเรียนลงจากรถเพื่อความปลอดภัย\nเวลา: ${formatDateTime(emergencyLog.event_time)}`;
      } else if (responseType === 'CONFIRMED_NORMAL') {
        message = `✅ คนขับยืนยันสถานการณ์กลับมาสู่ปกติแล้ว\n\nเหตุการณ์: ${getEventTypeText(emergencyLog.event_type)}\nเวลา: ${formatDateTime(emergencyLog.event_time)}\nสถานะ: สิ้นสุดการแจ้งเตือน`;
      }
    } else {
      // ข้อความแจ้งเตือนเหตุการณ์ใหม่ (ไม่ส่งถ้า triggered_by เป็น student)
      if (emergencyLog.triggered_by === 'student') {
        return { success: true, error: null }; // ไม่ส่งแจ้งเตือน LINE สำหรับปุ่มฉุกเฉินนักเรียน
      }
      
      message = `🚨 แจ้งเตือนเหตุการณ์ฉุกเฉิน!\n\nประเภท: ${getEventTypeText(emergencyLog.event_type)}\nเวลา: ${formatDateTime(emergencyLog.event_time)}\nรหัสคนขับ: ${emergencyLog.driver_id}`;
      
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
        message: message,
        eventType: responseType ? undefined : emergencyLog.event_type,
        responseType: responseType,
        eventId: emergencyLog.event_id,
        description: emergencyLog.description,
        location: emergencyLog.location,
        notes: emergencyLog.notes,
        timestamp: emergencyLog.event_time,
        details: emergencyLog.details
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

const getSensorDetailsMessage = (details: any): string => {
  if (!details) return 'เซ็นเซอร์บนรถตรวจพบความผิดปกติ';
  
  try {
    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
    const sensors = [];
    
    if (detailsObj.temperature && detailsObj.temperature > 40) {
      sensors.push('ตรวจพบความร้อนสูง');
    }
    
    if (detailsObj.smoke && detailsObj.smoke > 50) {
      sensors.push('ตรวจพบควันจำนวนมาก');
    }
    
    if (detailsObj.gas && detailsObj.gas > 30) {
      sensors.push('ตรวจพบแก๊สรั่ว');
    }
    
    if (sensors.length === 0) {
      return 'เซ็นเซอร์บนรถตรวจพบความผิดปกติ';
    }
    
    const sensorText = sensors.join(' และ ');
    return `เซ็นเซอร์บนรถ ${sensorText} คนขับยืนยันเป็นเหตุฉุกเฉิน`;
  } catch (error) {
    return 'เซ็นเซอร์บนรถตรวจพบความผิดปกติ คนขับยืนยันเป็นเหตุฉุกเฉิน';
  }
};

// ฟังก์ชันสำหรับแปลง details JSON เป็นข้อความที่อ่านง่าย
export const parseDetails = (details: any): string => {
  if (!details) return '';
  
  // ถ้า details เป็น object แล้ว ให้จัดการโดยตรง
  if (typeof details === 'object' && details !== null) {
    try {
      if (details.source && details.message) {
        return `เซ็นเซอร์: ${details.source} - ${details.message}`;
      }
      if (details.source) {
        return `เซ็นเซอร์: ${details.source}`;
      }
      if (details.message) {
        return `ข้อความ: ${details.message}`;
      }
      // ถ้ามี object แต่ไม่มี source หรือ message ให้แสดงเป็น JSON string
      return JSON.stringify(details);
    } catch {
      return 'ข้อมูลเซ็นเซอร์';
    }
  }
  
  // ถ้า details เป็น string ให้พยายาม parse
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      if (parsed.source && parsed.message) {
        return `เซ็นเซอร์: ${parsed.source} - ${parsed.message}`;
      }
      if (parsed.source) {
        return `เซ็นเซอร์: ${parsed.source}`;
      }
      if (parsed.message) {
        return `ข้อความ: ${parsed.message}`;
      }
      // ถ้ามี object แต่ไม่มี source หรือ message ให้แสดงเป็น JSON string
      return JSON.stringify(parsed);
    } catch {
      // ถ้า parse ไม่ได้ ให้ return string ตามที่ได้รับมา
      return String(details);
    }
  }
  
  // สำหรับกรณีอื่นๆ ให้แปลงเป็น string
  return String(details);
};

// ฟังก์ชันสำหรับแสดงผู้แจ้งที่รองรับข้อมูลเซ็นเซอร์
export const getSourceText = (emergency: EmergencyLog): string => {
  // ถ้าเป็นการแจ้งเตือนเซ็นเซอร์และมี details ให้แสดงข้อมูลจาก details
  if (['SENSOR_ALERT', 'SMOKE_DETECTED', 'HIGH_TEMPERATURE', 'MOVEMENT_DETECTED'].includes(emergency.event_type) && emergency.details) {
    return parseDetails(emergency.details);
  }
  // ถ้าไม่ใช่ให้แสดงข้อมูลปกติ
  return getTriggeredByText(emergency.triggered_by);
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