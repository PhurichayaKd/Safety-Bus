// Emergency Service สำหรับจัดการเหตุการณ์ฉุกเฉินและการแจ้งเตือน
import { supabase } from '../src/services/supabaseClient';
import LineNotificationService from './LineNotificationService';

const API_BASE_URL = 'https://safety-bus-bot-vercel-deploy.vercel.app';

export class EmergencyService {
  // ดึงข้อมูลเหตุการณ์ฉุกเฉินทั้งหมด
  static async getEmergencyLogs(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .select('*')
        .order('event_time', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching emergency logs:', error);
      throw error;
    }
  }

  // ดึงข้อมูลเหตุการณ์ฉุกเฉินที่ยังไม่ได้จัดการ
  static async getUnresolvedEmergencies() {
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .select('*')
        .eq('status', 'active')
        .order('event_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching unresolved emergencies:', error);
      throw error;
    }
  }

  // สร้างเหตุการณ์ฉุกเฉินใหม่
  static async createEmergencyEvent(eventData) {
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .insert([{
          event_type: eventData.event_type,
          triggered_by: eventData.triggered_by,
          description: eventData.description,
          location: eventData.location,
          notes: eventData.notes,
          status: 'active',
          event_time: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      // ส่งการแจ้งเตือนไปยัง LINE ผ่าน LineNotificationService
      if (eventData.triggered_by !== 'student') {
        try {
          const emergency = {
            id: data.id,
            type: data.event_type,
            details: data.description,
            location: data.location,
            created_at: data.event_time,
            bus_id: eventData.bus_id || null
          };
          
          await LineNotificationService.sendEmergencyNotification(emergency);
        } catch (lineError) {
          console.error('Failed to send LINE notification:', lineError);
          // ไม่ throw error เพื่อไม่ให้การสร้าง event ล้มเหลว
        }
      }

      return data;
    } catch (error) {
      console.error('Error creating emergency event:', error);
      throw error;
    }
  }

  // อัปเดตสถานะเหตุการณ์ฉุกเฉิน
  static async updateEmergencyStatus(eventId, status, driverResponse = null) {
    try {
      const updateData = {
        status,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null
      };

      if (driverResponse) {
        updateData.driver_response = driverResponse;
        updateData.driver_response_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('emergency_logs')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      // ส่งการตอบสนองของคนขับไปยัง LINE ผ่าน LineNotificationService
      if (driverResponse) {
        try {
          const emergency = {
            id: data.id,
            type: data.event_type,
            details: data.description,
            location: data.location,
            created_at: data.event_time,
            bus_id: data.bus_id || null
          };
          
          await LineNotificationService.sendResponseNotification(emergency, driverResponse);
        } catch (lineError) {
          console.error('Failed to send driver response to LINE:', lineError);
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating emergency status:', error);
      throw error;
    }
  }

  // ส่งการแจ้งเตือนไปยัง LINE (ถ้าจำเป็น)
  static async sendLineNotification(eventData) {
    try {
      console.log('Sending LINE notification:', eventData);
      
      const response = await fetch(`${API_BASE_URL}/api/emergency-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: eventData.event_type,
          eventId: eventData.id,
          description: eventData.description,
          location: eventData.location,
          notes: eventData.notes,
          timestamp: eventData.event_time
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send LINE notification');
      }
      
      console.log('LINE notification sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending LINE notification:', error);
      throw error;
    }
  }

  // ส่งการตอบสนองของคนขับไปยัง LINE
  static async sendDriverResponse(responseType, eventId, additionalData = {}) {
    try {
      console.log('Sending driver response to LINE:', { responseType, eventId });
      
      const response = await fetch(`${API_BASE_URL}/api/emergency-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          responseType,
          eventId,
          ...additionalData,
          timestamp: new Date().toISOString()
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to send driver response');
      }
      
      console.log('Driver response sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending driver response:', error);
      throw error;
    }
  }

  // ติดตามการเปลี่ยนแปลงแบบเรียลไทม์
  static subscribeToEmergencyUpdates(callback) {
    const subscription = supabase
      .channel('emergency_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emergency_logs'
        },
        (payload) => {
          console.log('Emergency log change detected:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  }

  // ยกเลิกการติดตาม
  static unsubscribeFromEmergencyUpdates(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }

  // ตรวจสอบการเชื่อมต่อ
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('emergency_logs')
        .select('count')
        .limit(1);

      if (error) throw error;
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: error.message };
    }
  }

  // ฟังก์ชันช่วยสำหรับแปลงประเภทเหตุการณ์เป็นข้อความ
  static getEventTypeDisplayName(eventType) {
    const eventTypes = {
      'DRIVER_PANIC': 'คนขับกดปุ่มฉุกเฉิน',
      'SMOKE_DETECTED': 'ตรวจพบควัน',
      'HIGH_TEMPERATURE': 'อุณหภูมิสูงผิดปกติ',
      'MOVEMENT_DETECTED': 'ตรวจพบการเคลื่อนไหว',
      'STUDENT_SWITCH': 'นักเรียนกดสวิตช์'
    };
    return eventTypes[eventType] || eventType;
  }

  // ฟังก์ชันช่วยสำหรับแปลงสถานะเป็นข้อความ
  static getStatusDisplayName(status) {
    const statuses = {
      'active': 'กำลังดำเนินการ',
      'resolved': 'จัดการเรียบร้อย',
      'emergency': 'เหตุฉุกเฉิน'
    };
    return statuses[status] || status;
  }

  // ฟังก์ชันช่วยสำหรับแปลงการตอบสนองเป็นข้อความ
  static getResponseDisplayName(response) {
    const responses = {
      'CHECKED': 'ตรวจสอบเรียบร้อย',
      'EMERGENCY': 'แจ้งเหตุฉุกเฉิน'
    };
    return responses[response] || response;
  }
}