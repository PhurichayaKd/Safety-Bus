import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';
import {
  EmergencyLog,
  subscribeToEmergencyLogs,
  getUnresolvedEmergencyLogs,
  recordEmergencyResponse,
  sendLineNotification,
  getEventTypeText,
  formatDateTime
} from '../services/emergencyService';

interface EmergencyContextType {
  emergencies: EmergencyLog[];
  unreadCount: number;
  showEmergencyModal: boolean;
  currentEmergency: EmergencyLog | null;
  markAsRead: (eventId: number) => void;
  handleEmergencyResponse: (eventId: number, responseType: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL', notes?: string) => Promise<void>;
  dismissModal: () => void;
  refreshEmergencies: () => Promise<void>;
  createEmergency: (eventData: any) => Promise<void>;
  testConnection: () => Promise<boolean>;
}

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

export const useEmergency = () => {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
};

interface EmergencyProviderProps {
  children: ReactNode;
}

export const EmergencyProvider: React.FC<EmergencyProviderProps> = ({ children }) => {
  const { session } = useAuth();
  const [emergencies, setEmergencies] = useState<EmergencyLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [currentEmergency, setCurrentEmergency] = useState<EmergencyLog | null>(null);
  const [readEmergencies, setReadEmergencies] = useState<Set<number>>(new Set());

  const driverId = session?.user?.user_metadata?.driver_id;

  // โหลดข้อมูล emergency ที่ยังไม่ได้แก้ไข
  const refreshEmergencies = async () => {
    if (!driverId) return;

    try {
      const { data, error } = await getUnresolvedEmergencyLogs(driverId);
      if (error) {
        console.error('Error fetching emergencies:', error);
        return;
      }

      if (data) {
        setEmergencies(data);
        // คำนวณจำนวนที่ยังไม่ได้อ่าน
        const unread = data.filter(emergency => !readEmergencies.has(emergency.event_id));
        setUnreadCount(unread.length);
      }
    } catch (error) {
      console.error('Error refreshing emergencies:', error);
    }
  };

  // จัดการเหตุการณ์ฉุกเฉินใหม่
  const handleNewEmergency = (emergency: EmergencyLog) => {
    setEmergencies(prev => [emergency, ...prev]);
    setCurrentEmergency(emergency);
    setShowEmergencyModal(true);
    setUnreadCount(prev => prev + 1);

    // ส่งการแจ้งเตือนไปยัง LINE (ยกเว้นกรณี triggered_by เป็น student)
    if (emergency.triggered_by !== 'student') {
      sendLineNotification(emergency).catch(error => {
        console.error('Failed to send LINE notification:', error);
      });
    }

    // แสดง Alert สำหรับการแจ้งเตือนในแอป
    Alert.alert(
      '🚨 เหตุการณ์ฉุกเฉิน!',
      `${getEventTypeText(emergency.event_type)}\nเวลา: ${formatDateTime(emergency.event_time)}`,
      [
        {
          text: 'ดูรายละเอียด',
          onPress: () => {
            setCurrentEmergency(emergency);
            setShowEmergencyModal(true);
          }
        }
      ]
    );
  };

  // จัดการการอัปเดตเหตุการณ์ฉุกเฉิน
  const handleEmergencyUpdate = (emergency: EmergencyLog) => {
    setEmergencies(prev => 
      prev.map(e => e.event_id === emergency.event_id ? emergency : e)
    );

    // ถ้าเหตุการณ์ถูกแก้ไขแล้ว ให้ลบออกจากรายการ
    if (emergency.resolved) {
      setEmergencies(prev => prev.filter(e => e.event_id !== emergency.event_id));
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      if (currentEmergency?.event_id === emergency.event_id) {
        setShowEmergencyModal(false);
        setCurrentEmergency(null);
      }
    }
  };

  // ทำเครื่องหมายว่าอ่านแล้ว
  const markAsRead = (eventId: number) => {
    if (!readEmergencies.has(eventId)) {
      setReadEmergencies(prev => new Set([...prev, eventId]));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  // จัดการการตอบสนองของคนขับ
  const handleEmergencyResponse = async (
    eventId: number, 
    responseType: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL', 
    notes?: string
  ) => {
    if (!driverId) return;

    try {
      // บันทึกการตอบสนอง
      const { success, error } = await recordEmergencyResponse(eventId, responseType, driverId, notes);
      
      if (!success) {
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกการตอบสนองได้');
        return;
      }

      // ส่งการแจ้งเตือนไปยัง LINE
      const emergency = emergencies.find(e => e.event_id === eventId);
      if (emergency) {
        await sendLineNotification(emergency, responseType);
      }

      // อัปเดต UI - สำหรับ EMERGENCY ไม่ปิด modal ทันที
      if (responseType === 'EMERGENCY') {
        // ไม่ปิด modal ให้รอการยืนยันสถานการณ์กลับมาปกติ
        Alert.alert('สำเร็จ', 'ส่งสัญญาณฉุกเฉินเรียบร้อย\nกรุณายืนยันเมื่อสถานการณ์กลับมาปกติ');
      } else {
        // สำหรับ CHECKED และ CONFIRMED_NORMAL ให้ปิด modal
        setEmergencies(prev => prev.filter(e => e.event_id !== eventId));
        setUnreadCount(prev => Math.max(0, prev - 1));
        setShowEmergencyModal(false);
        setCurrentEmergency(null);

        // แสดงข้อความยืนยัน
        const message = responseType === 'CHECKED' 
          ? 'บันทึกการตรวจสอบเรียบร้อย' 
          : 'ยืนยันสถานการณ์กลับมาปกติเรียบร้อย';
        
        Alert.alert('สำเร็จ', message);
      }

    } catch (error) {
      console.error('Error handling emergency response:', error);
      Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการประมวลผล');
    }
  };

  // สร้างเหตุการณ์ฉุกเฉินใหม่
  const createEmergency = async (eventData: any) => {
    try {
      // ใช้ EmergencyService เดิมถ้ามี หรือสร้างใหม่
      const { EmergencyService } = await import('../../services/EmergencyService.js');
      await EmergencyService.createEmergencyEvent(eventData);
      
      // รีเฟรชข้อมูล
      await refreshEmergencies();
    } catch (error) {
      console.error('Error creating emergency:', error);
      throw error;
    }
  };

  // ทดสอบการเชื่อมต่อ
  const testConnection = async (): Promise<boolean> => {
    try {
      // ทดสอบการเชื่อมต่อกับ Supabase
      await refreshEmergencies();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  // ปิด Modal
  const dismissModal = () => {
    setShowEmergencyModal(false);
    setCurrentEmergency(null);
  };

  // ตั้งค่า Real-time subscription
  useEffect(() => {
    if (!driverId) return;

    // โหลดข้อมูลเริ่มต้น
    refreshEmergencies();

    // ตั้งค่า subscription
    const channel = subscribeToEmergencyLogs(
      driverId,
      handleNewEmergency,
      handleEmergencyUpdate
    );

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [driverId]);

  const value: EmergencyContextType = {
    emergencies,
    unreadCount,
    showEmergencyModal,
    currentEmergency,
    markAsRead,
    handleEmergencyResponse,
    dismissModal,
    refreshEmergencies,
    createEmergency,
    testConnection
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
};