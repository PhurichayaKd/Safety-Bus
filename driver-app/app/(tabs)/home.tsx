// src/components/HomePage.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
  Modal, ActivityIndicator, Platform, AccessibilityInfo, Alert, Dimensions, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/services/supabaseClient';
import COLORS from '../colors';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const PATHS = {
  manage: '/manage',
  login: '/login',
  busForm: '/bus-form',
  reports: '/manage/reports',
  issueCard: '/manage/cards/issue',
} as const;

type BusStatus = 'waiting_departure' | 'enroute' | 'arrived_school' | 'waiting_return' | 'finished';

const STATUS_LABEL: Record<BusStatus, string> = {
  waiting_departure: 'รอออกเดินทาง',
  enroute: 'เริ่มออกเดินทาง',
  arrived_school: 'ถึงโรงเรียน',
  waiting_return: 'รอรับกลับบ้าน',
  finished: 'จบการเดินทาง',
};



function MenuCard({
  icon, label, to, disabled,
}: { icon: keyof typeof Ionicons.glyphMap; label: string; to?: string; disabled?: boolean }) {
  const onPress = async () => {
    if (disabled || !to) return;
    await Haptics.selectionAsync();
    router.push(to as any);
  };
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityHint={`แตะเพื่อเข้าสู่${label}`}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={[
        styles.menuCard,
        disabled && { opacity: 0.45 },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconWrap}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ฟังก์ชันสำหรับดึงข้อมูลสถิติจริงจาก AsyncStorage
async function getTodayProgress() {
  try {
    // ดึงข้อมูลจำนวนนักเรียนทั้งหมด
    const studentCount = await getStudentCount();
    
    // ดึงข้อมูลสถิติจาก AsyncStorage ที่ถูกอัปเดตจากหน้า passenger-list
    const statsData = await AsyncStorage.getItem('passenger_stats');
    
    if (statsData) {
      const stats = JSON.parse(statsData);
      return {
        target: studentCount,
        pickupGo: stats.pickupGo || 0,
        dropGo: stats.dropGo || 0,
        pickupRet: stats.pickupRet || 0,
        dropRet: stats.dropRet || 0,
      };
    }
    
    // ถ้าไม่มีข้อมูลใน AsyncStorage ให้ใช้ค่าเริ่มต้น
    return {
      target: studentCount,
      pickupGo: 0,
      dropGo: 0,
      pickupRet: 0,
      dropRet: 0,
    };
  } catch (error) {
    console.warn('เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ:', error);
    // ใช้ข้อมูล fallback
    return {
      target: 24,
      pickupGo: 0,
      dropGo: 0,
      pickupRet: 0,
      dropRet: 0,
    };
  }
}

// ฟังก์ชันสำหรับรีเซ็ตสถานะนักเรียนลงรถที่โรงเรียนลับรับกลับ
async function updateSchoolDropoffStatus() {
  try {
    const studentsData = await AsyncStorage.getItem('students_data');
    if (!studentsData) return;

    const students = JSON.parse(studentsData);
    
    // อัปเดตสถานะนักเรียนทุกคนให้เป็น "ลงรถที่โรงเรียน"
    const updatedStudents = students.map((student: any) => ({
      ...student,
      status_go: student.status_go === 'onboard' ? 'offboard' : student.status_go
    }));

    await AsyncStorage.setItem('students_data', JSON.stringify(updatedStudents));
    
    // อัปเดตสถิติ
    const stats = await getTodayProgress();
    const newDropGo = stats.pickupGo; // จำนวนคนที่ลงรถ = จำนวนคนที่ขึ้นรถ
    
    await AsyncStorage.setItem('passenger_stats', JSON.stringify({
      ...stats,
      dropGo: newDropGo
    }));
    
    console.log('Updated school dropoff status for all students');
  } catch (error) {
    console.warn('Error updating school dropoff status:', error);
  }
}

// ฟังก์ชันสำหรับดึง driver_id ที่ถูกต้องจาก auth_user_id
async function getMyDriverId(): Promise<number | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data } = await supabase
      .from('driver_bus')
      .select('driver_id')
      .eq('auth_user_id', user.id)
      .single();
    
    return data?.driver_id ?? null;
  } catch (error) {
    console.warn('Error getting driver_id:', error);
    return null;
  }
}

// ฟังก์ชันสำหรับรีเซ็ตสถานะนักเรียนในฐานข้อมูลเมื่อเริ่มขากลับ
async function resetStudentStatusForReturn() {
  try {
    const driverId = await getMyDriverId();
    if (!driverId) {
      console.warn('ไม่พบ driver_id สำหรับการรีเซ็ตสถานะนักเรียน');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // ไม่ต้องรีเซ็ตข้อมูลในฐานข้อมูล เพราะข้อมูลการขึ้นรถ-ลงรถจะถูกจัดการแยกตาม trip_phase
    // แค่ log ว่าเสร็จสิ้นการเตรียมพร้อมสำหรับขากลับ
    console.log('เตรียมพร้อมสำหรับขากลับเรียบร้อยแล้ว');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเตรียมพร้อมสำหรับขากลับ:', error);
  }
}

// ฟังก์ชันสำหรับรีเซ็ตสถานะนักเรียนในฐานข้อมูลเมื่อจบการเดินทาง
async function resetStudentStatusForNewDay() {
  try {
    const driverId = await getMyDriverId();
    if (!driverId) {
      console.warn('ไม่พบ driver_id สำหรับการรีเซ็ตสถานะนักเรียน');
      return;
    }

    // ไม่ต้องรีเซ็ตข้อมูลในฐานข้อมูล เพราะข้อมูลการขึ้นรถ-ลงรถจะถูกจัดการตามวันที่และ trip_phase
    // แค่ log ว่าเสร็จสิ้นการเตรียมพร้อมสำหรับวันใหม่
    console.log('เตรียมพร้อมสำหรับวันใหม่เรียบร้อยแล้ว');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเตรียมพร้อมสำหรับวันใหม่:', error);
  }
}

// ฟังก์ชันสำหรับรีเซ็ตสถิติเมื่อเปลี่ยนเป็นขากลับ
async function resetStatsForReturn() {
  try {
    // รีเซ็ตเฉพาะสถิติขากลับ แต่เก็บสถิติขาไปไว้
    const currentStats = await AsyncStorage.getItem('passenger_stats');
    let stats = {
      pickupGo: 0,
      dropGo: 0,
      pickupRet: 0,
      dropRet: 0
    };
    
    if (currentStats) {
      const parsed = JSON.parse(currentStats);
      stats = {
        pickupGo: parsed.pickupGo || 0,
        dropGo: parsed.dropGo || 0,
        pickupRet: 0, // รีเซ็ตขากลับ
        dropRet: 0    // รีเซ็ตขากลับ
      };
    }
    
    await AsyncStorage.setItem('passenger_stats', JSON.stringify(stats));
    
    // รีเซ็ตข้อมูลการขึ้นรถ-ลงรถของนักเรียนสำหรับรอบเย็น
    await resetStudentBoardingDataForReturn();
    
    console.log('รีเซ็ตสถิติและข้อมูลการขึ้นรถ-ลงรถสำหรับขากลับเรียบร้อยแล้ว');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการรีเซ็ตสถิติ:', error);
  }
}

// ฟังก์ชันสำหรับรีเซ็ตข้อมูลการขึ้นรถ-ลงรถของนักเรียนสำหรับรอบเย็น
async function resetStudentBoardingDataForReturn() {
  try {
    // สร้าง timestamp สำหรับการรีเซ็ต
    const resetTimestamp = Date.now();
    
    // บันทึก timestamp การรีเซ็ตเพื่อให้ passenger-list.tsx รู้ว่าต้องรีเฟรชข้อมูล
    await AsyncStorage.setItem('return_phase_reset_timestamp', resetTimestamp.toString());
    
    console.log('รีเซ็ตข้อมูลการขึ้นรถ-ลงรถสำหรับรอบเย็นเรียบร้อยแล้ว');
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการรีเซ็ตข้อมูลการขึ้นรถ-ลงรถ:', error);
  }
}

const HomePage = () => {
  const { signOut, session } = useAuth();
  const [status, setStatus] = useState<BusStatus | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // เพิ่ม state สำหรับข้อมูลใหม่
  const [studentCount, setStudentCount] = useState<number>(24);
  const [distance, setDistance] = useState<number>(12.5);
  const [estimatedTime, setEstimatedTime] = useState<string>('25 นาที');
  const [loading, setLoading] = useState(true);

  // เพิ่ม state สำหรับ emergency
  const [emergencyModalVisible, setEmergencyModalVisible] = useState(false);
  const [currentEmergency, setCurrentEmergency] = useState<any>(null);
  const [processingEmergency, setProcessingEmergency] = useState(false);

  useEffect(() => {
    (async () => {
      const phase = await AsyncStorage.getItem('trip_phase');
      const savedStatus = await AsyncStorage.getItem('current_bus_status');
      
      if (savedStatus) {
        setStatus(savedStatus as BusStatus);
      } else if (phase === 'return') {
        setStatus('waiting_return');
      } else {
        // เริ่มต้นด้วยค่าว่าง ให้คนขับเลือกเอง
        setStatus(null);
      }
      
      // ตรวจสอบ emergency logs
      await checkEmergencyLogs();
    })();
  }, []);

  // เพิ่ม useEffect สำหรับดึงข้อมูลจริง
  useEffect(() => {
    const loadRealData = async () => {
      setLoading(true);
      try {
        // ดึงข้อมูลจำนวนเด็ก
        const count = await getStudentCount();
        setStudentCount(count);

        // คำนวณระยะทาง
        const dist = await calculateDistance();
        setDistance(dist);

        // คำนวณเวลาคาดการณ์
        const time = calculateEstimatedTime(dist);
        setEstimatedTime(time);
      } catch (error) {
        console.warn('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRealData();
  }, []);

  // Update date and time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // เพิ่ม useEffect สำหรับตรวจสอบ emergency_logs ทุก 10 วินาที
  useEffect(() => {
    const emergencyTimer = setInterval(() => {
      checkEmergencyLogs();
    }, 10000); // ตรวจสอบทุก 10 วินาที

    return () => clearInterval(emergencyTimer);
  }, []);

  // ฟังก์ชันตรวจสอบ emergency_logs
  const checkEmergencyLogs = async () => {
    try {
      const driverId = await getMyDriverId();
      if (!driverId) return;

      const { data: emergencyLogs, error } = await supabase
        .from('emergency_logs')
        .select('*')
        .eq('triggered_by', 'driver')
        .eq('driver_id', driverId)
        .is('driver_response_type', null) // ยังไม่ได้ตอบสนอง
        .order('event_time', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking emergency logs:', error);
        return;
      }

      if (emergencyLogs && emergencyLogs.length > 0) {
        const emergency = emergencyLogs[0];
        setCurrentEmergency(emergency);
        setEmergencyModalVisible(true);
      }
    } catch (error) {
      console.error('Error in checkEmergencyLogs:', error);
    }
  };

  // ฟังก์ชันจัดการการตอบสนองเหตุฉุกเฉิน
  const handleEmergencyResponse = async (responseType: 'EMERGENCY' | 'CONFIRMED_NORMAL') => {
    if (!currentEmergency) return;

    setProcessingEmergency(true);
    try {
      // อัปเดต emergency_log
      const { error: updateError } = await supabase
        .from('emergency_logs')
        .update({
          driver_response_type: responseType,
          driver_response_time: new Date().toISOString(),
          driver_response_notes: responseType === 'EMERGENCY' 
            ? 'คนขับยืนยันเหตุฉุกเฉิน' 
            : 'คนขับยืนยันสถานการณ์กลับสู่ปกติ'
        })
        .eq('event_id', currentEmergency.event_id);

      if (updateError) {
        console.error('Error updating emergency log:', updateError);
        Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกการตอบสนองได้');
        return;
      }

      if (responseType === 'EMERGENCY') {
        // ส่งการแจ้งเตือนไปยัง LINE
        try {
          const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://safety-bus-liff-v4-new.vercel.app/api';
          const response = await fetch(`${apiBaseUrl}/emergency-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              emergency_id: currentEmergency.id,
              driver_id: currentEmergency.driver_id,
              message: 'คนขับได้ยืนยันเหตุฉุกเฉินแล้ว กำลังส่งแจ้งเตือนไปยังผู้ใช้ทุกคน',
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            console.warn('Failed to send emergency notification:', response.status);
          } else {
            console.log('Emergency notification sent successfully');
          }
        } catch (notificationError) {
          console.error('Error sending emergency notification:', notificationError);
        }

        Alert.alert(
          'ส่งสัญญาณฉุกเฉินเรียบร้อย',
          'กรุณายืนยันเมื่อสถานการณ์กลับมาปกติ',
          [{ text: 'ตกลง' }]
        );
      } else {
        Alert.alert(
          'ยืนยันสถานการณ์ปกติ',
          'บันทึกการยืนยันสถานการณ์กลับสู่ปกติเรียบร้อยแล้ว',
          [{ text: 'ตกลง' }]
        );
        setEmergencyModalVisible(false);
        setCurrentEmergency(null);
      }
    } catch (error) {
      console.error('Error handling emergency response:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถดำเนินการได้');
    } finally {
      setProcessingEmergency(false);
    }
  };

  const handleSignOut = async () => {
    await Haptics.selectionAsync();
    await signOut();
    router.replace(PATHS.login);
  };

  const persistTripPhase = async (next: BusStatus) => {
    if (next === 'waiting_return') {
      await AsyncStorage.setItem('trip_phase', 'return');
    } else if (next === 'enroute') {
      await AsyncStorage.setItem('trip_phase', 'go');
    } else {
      await AsyncStorage.removeItem('trip_phase');
    }
  };

  async function markNewDayReset() {
    const d = new Date();
    const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    await AsyncStorage.setItem('last_trip_date', ymd);
    await AsyncStorage.setItem('reset_today_flag', String(Date.now()));
  }

  const updateStatus = async (next: BusStatus) => {
    setPickerVisible(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUpdating(true);
    try {
      const p = await getTodayProgress();

      if (next === 'arrived_school') {
        // ตรวจสอบว่านักเรียนขึ้นรถครบหรือยัง
        if (p.pickupGo < p.target) {
          const remain = p.target - p.pickupGo;
          Alert.alert(
            'นักเรียนยังขึ้นรถไม่ครบ', 
            `ยังมีนักเรียนที่ยังไม่ขึ้นรถอีก ${remain} คน\n\nเมื่อถึงโรงเรียนให้คนขับกด "ลงรถ" ให้ครบก่อน ถึงจะกดอัปเดต "รอรับกลับ" ได้`,
            [{ text: 'ตกลง' }]
          );
          return;
        }
        
        // เมื่อถึงโรงเรียน ให้อัพเดตสถานะนักเรียนลงรถที่โรงเรียนทุกคน
        await updateSchoolDropoffStatus();
      }

      if (next === 'waiting_return') {
        // ตรวจสอบว่านักเรียนลงรถที่โรงเรียนครบหรือยัง
        if (p.dropGo < p.pickupGo) {
          const remain = p.pickupGo - p.dropGo;
          Alert.alert('ยังเช็กไม่ครบ', `ยังมีนักเรียนที่ยังไม่ลงรถที่โรงเรียนอีก ${remain} คน`);
          return;
        }
        
        // รีเซ็ตสถิติเมื่อเปลี่ยนเป็นขากลับ
        await resetStatsForReturn();
        await AsyncStorage.setItem('trip_phase', 'return');
        
        // รีเซ็ตสถานะนักเรียนในฐานข้อมูลสำหรับขากลับ
        await resetStudentStatusForReturn();
      }

      if (next === 'finished') {
        // ตรวจสอบว่านักเรียนลงรถครบหรือยัง (ทั้งขึ้นรถและลงรถต้องเท่ากับจำนวนทั้งหมด)
        if (p.pickupRet < p.target || p.dropRet < p.target) {
          const remainPickup = p.target - p.pickupRet;
          const remainDrop = p.target - p.dropRet;
          
          let message = '';
          if (remainPickup > 0 && remainDrop > 0) {
            message = `ยังมีนักเรียนที่ยังไม่ขึ้นรถอีก ${remainPickup} คน และยังไม่ลงรถอีก ${remainDrop} คน`;
          } else if (remainPickup > 0) {
            message = `ยังมีนักเรียนที่ยังไม่ขึ้นรถอีก ${remainPickup} คน`;
          } else if (remainDrop > 0) {
            message = `ยังมีนักเรียนที่ยังไม่ลงรถอีก ${remainDrop} คน`;
          }
          
          Alert.alert('ยังเช็กไม่ครบ', message);
          return;
        }
        await markNewDayReset();
        
        // รีเซ็ตสถานะนักเรียนในฐานข้อมูลเมื่อจบการเดินทาง
        await resetStudentStatusForNewDay();
        
        // ตั้งเวลา auto-reset หลังจาก 5 วินาที
        setTimeout(async () => {
          try {
            console.log('เริ่ม auto-reset สถานะหลังจาก 5 วินาที');
            
            // รีเซ็ตสถานะกลับเป็น waiting_departure
            setStatus('waiting_departure');
            await AsyncStorage.setItem('current_bus_status', 'waiting_departure');
            
            // อัพเดต trip_phase กลับเป็น go
            const driverId = await getMyDriverId();
            if (driverId) {
              const { error } = await supabase
                .from('driver_bus')
                .update({ trip_phase: 'go' })
                .eq('driver_id', 1);
                
              if (error) {
                console.error('เกิดข้อผิดพลาดในการรีเซ็ต trip_phase:', error);
              } else {
                console.log('รีเซ็ต trip_phase เป็น go เรียบร้อยแล้ว');
              }
            }
            
            console.log('Auto-reset สถานะเรียบร้อยแล้ว');
            AccessibilityInfo.announceForAccessibility?.('รีเซ็ตสถานะเรียบร้อยแล้ว พร้อมสำหรับวันใหม่');
          } catch (error) {
            console.error('เกิดข้อผิดพลาดในการ auto-reset:', error);
          }
        }, 5000); // 5 วินาที
      }

      if (next === 'enroute') {
        // รีเซ็ตทุกอย่างเมื่อเริ่มเดินทาง (ยกเว้นคนลา)
        await markNewDayReset();
        await resetStatsForReturn(); // รีเซ็ตสถิติด้วย
        
        // รีเซ็ตสถานะนักเรียนในฐานข้อมูลเมื่อเริ่มเดินทางใหม่
        await resetStudentStatusForNewDay();
      }

      setStatus(next);
      await persistTripPhase(next);
      await AsyncStorage.setItem('current_bus_status', next);
      
      // อัพเดต trip_phase ในตาราง driver_bus
      try {
        const driverId = await getMyDriverId();
        if (driverId) {
          let tripPhase = 'go'; // ค่าเริ่มต้น
          
          if (next === 'enroute') {
            tripPhase = 'go';
          } else if (next === 'waiting_return') {
            tripPhase = 'return';
          } else if (next === 'finished') {
            tripPhase = 'finished';
          }
          
          const { error } = await supabase
            .from('driver_bus')
            .update({ trip_phase: tripPhase })
            .eq('driver_id', 1); // ใช้เฉพาะ driver_id 1
            
          if (error) {
            console.error('เกิดข้อผิดพลาดในการอัพเดต trip_phase:', error);
          } else {
            console.log(`อัพเดต trip_phase เป็น ${tripPhase} เรียบร้อยแล้ว`);
          }
        }
      } catch (error) {
        console.error('เกิดข้อผิดพลาดในการอัพเดต trip_phase:', error);
      }
      
      // ส่งแจ้งเตือนไปยัง LINE Bot (ยกเว้นสถานะ waiting_departure)
      if (next !== 'waiting_departure') {
        try {
          const driverId = await getMyDriverId();
          if (driverId) {
            // กำหนด trip_phase ที่ถูกต้องตาม API
            const currentTripPhase = await AsyncStorage.getItem('trip_phase') || 'go';
            
            const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://safety-bus-liff-v4-new.vercel.app/api';
            console.log('🔍 API Base URL:', apiBaseUrl);
            console.log('🔍 Full API URL:', `${apiBaseUrl}/driver-status-notification`);
            const response = await fetch(`${apiBaseUrl}/driver-status-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                driver_id: driverId,
                trip_phase: currentTripPhase,
                current_status: next,
                location: 'อัปเดตจากแอปคนขับ',
                notes: `คนขับอัปเดตสถานะเป็น ${STATUS_LABEL[next]} เวลา ${new Date().toLocaleString('th-TH')}`,
                timestamp: new Date().toISOString(),
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.warn('❌ Failed to send LINE notification:', response.status, errorText);
            } else {
              console.log('✅ LINE notification sent successfully');
            }
          } else {
            console.warn('Could not get driver_id for LINE notification');
          }
        } catch (error) {
          console.error('❌ Error sending LINE notification:', error);
          if (error instanceof Error) {
            console.error('❌ Error message:', error.message);
            console.error('❌ Error stack:', error.stack);
          }
        }
      }
      
      AccessibilityInfo.announceForAccessibility?.(`อัปเดตสถานะเป็น ${STATUS_LABEL[next]}`);
    } finally {
      setUpdating(false);
    }
  };



  const steps: BusStatus[] = ['enroute','arrived_school','waiting_return','finished'];
  const activeIndex = status && status !== 'waiting_departure' ? steps.findIndex(k => k === status) : -1;

  // Format date and time for display
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    const formattedDate = date.toLocaleDateString('th-TH', options);
    // Convert Christian Era to Buddhist Era (add 543 years)
    const buddhistYear = date.getFullYear() + 543;
    return formattedDate.replace(date.getFullYear().toString(), buddhistYear.toString());
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* ENHANCED HEADER */}
        <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="bus" size={28} color={COLORS.primary} />
            </View>
            <View style={styles.brandText}>
              <Text style={styles.appTitle}>SAFETY BUS</Text>
              <View style={styles.titleRow}>
                <Text style={styles.subtitle}>
                  แดชบอร์ดคนขับ
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.8}
              accessibilityLabel="ออกจากระบบ"
              accessibilityHint="แตะเพื่อออกจากระบบและกลับไปหน้าเข้าสู่ระบบ"
            >
              <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* DATE AND TIME DISPLAY */}
      <View style={styles.dateTimeContainer}>
        <View style={styles.dateTimeCard}>
          <View style={styles.dateSection}>
            <Ionicons 
              name="calendar-outline" 
              size={14} 
              color={COLORS.primary} 
            />
            <Text style={styles.dateText}>
              {formatDate(currentDateTime)}
            </Text>
          </View>
          <View style={styles.timeSection}>
            <Ionicons name="time-outline" size={14} color={COLORS.success} />
            <Text style={styles.timeText}>{formatTime(currentDateTime)}</Text>
          </View>
        </View>
      </View>

      {/* ENHANCED STATUS CARD */}
      <View style={styles.statusCard}>
        <View style={styles.heroSurface}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>สถานะปัจจุบัน</Text>
            <Text style={styles.statusLine}>
              {status ? STATUS_LABEL[status] : 'เลือกสถานะการเดินทาง'}
            </Text>
          </View>

          {/* Enhanced Stepper - แสดงสถานะการเดินทาง 4 ขั้นตอน */}
          <View style={styles.stepperContainer}>
            <View accessible accessibilityRole="progressbar" style={styles.stepperWrap}>
              {steps.map((k, idx) => {
                const active = idx <= activeIndex;
                const isLast = idx === steps.length - 1;
                return (
                  <View key={k} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepDot,
                        active && styles.stepDotActive,
                      ]}
                    >
                      {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                      {STATUS_LABEL[k]}
                    </Text>
                    {!isLast && (
                      <View style={[styles.stepBar, idx < activeIndex && styles.stepBarActive]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.updateButton, updating && { opacity: 0.8 }]}
            activeOpacity={0.8}
            onPress={() => setPickerVisible(true)}
            disabled={updating}
            accessibilityLabel={updating ? 'กำลังอัปเดตสถานะ' : (status ? 'อัปเดตสถานะรถ' : 'เลือกสถานะรถ')}
            accessibilityHint="แตะเพื่อเลือกสถานะสำหรับรถบัส"
            accessibilityState={{ disabled: updating }}
          >
            {updating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={status ? "refresh" : "play"} size={20} color="#fff" />
                <Text style={styles.updateText}>
                  {status ? 'อัปเดตสถานะ' : 'เริ่มออกเดินทาง'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* QUICK STATS - Compact Version */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="time" size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{loading ? '...' : estimatedTime}</Text>
              <Text style={styles.statLabel}>เวลาคาดการณ์</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="speedometer" size={14} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>{loading ? '...' : `${distance} กม.`}</Text>
              <Text style={styles.statLabel}>ระยะทาง</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="people" size={14} color={COLORS.warning} />
              </View>
              <Text style={styles.statValue}>{loading ? '...' : `${studentCount} คน`}</Text>
              <Text style={styles.statLabel}>นักเรียน</Text>
            </View>
          </View>
        </View>

      {/* MENUS */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuTitle}>เมนูหลัก</Text>
          <View style={styles.menuGrid}>
            <MenuCard icon="person-outline"     label="ข้อมูลผู้ใช้"   to="/manage/students/profile" />
            <MenuCard icon="car-outline"        label="ข้อมูลคนขับ"   to="/driver-info" />
            <MenuCard icon="card-outline"       label="ออกบัตรใหม่"   to={PATHS.issueCard} />
            <MenuCard icon="document-text-outline" label="รายงาน"     to={PATHS.reports} />
          </View>
        </View>


      </ScrollView>

      {/* STATUS PICKER MODAL */}
      <Modal transparent visible={pickerVisible} animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>อัปเดตสถานะรถ</Text>
              <Text style={styles.sheetSubtitle}>เลือกสถานะที่ต้องการอัปเดต</Text>
            </View>

            <TouchableOpacity 
              style={[styles.sheetItem]} 
              activeOpacity={0.7}
              onPress={() => updateStatus('enroute')}
            >
              <View style={styles.sheetIconContainer}>
                <Ionicons name="play-circle" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.sheetText}>เริ่มออกเดินทาง</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sheetItem]} 
              activeOpacity={0.7}
              onPress={() => updateStatus('arrived_school')}
            >
              <View style={styles.sheetIconContainer}>
                <Ionicons name="school-outline" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.sheetText}>ถึงโรงเรียน</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sheetItem]} 
              activeOpacity={0.7}
              onPress={() => updateStatus('waiting_return')}
            >
              <View style={styles.sheetIconContainer}>
                <Ionicons name="time-outline" size={22} color={COLORS.warning} />
              </View>
              <Text style={styles.sheetText}>รอรับกลับบ้าน</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sheetItem]} 
              activeOpacity={0.7}
              onPress={() => updateStatus('finished')}
            >
              <View style={styles.sheetIconContainer}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.sheetText}>จบการเดินทาง</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setPickerVisible(false)} activeOpacity={0.7}>
              <Text style={styles.closeTxt}>ยกเลิก</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* EMERGENCY RESPONSE MODAL */}
      <Modal transparent visible={emergencyModalVisible} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.emergencyBackdrop}>
          <View style={styles.emergencyModal}>
            <View style={styles.emergencyHeader}>
              <View style={styles.emergencyIcon}>
                <Ionicons name="warning" size={32} color={COLORS.danger} />
              </View>
              <Text style={styles.emergencyTitle}>ตรวจพบสัญญาณฉุกเฉิน</Text>
              <Text style={styles.emergencySubtitle}>
                ระบบตรวจพบสัญญาณฉุกเฉินจากอุปกรณ์ IoT
              </Text>
              {currentEmergency && (
                <Text style={styles.emergencyTime}>
                  เวลา: {new Date(currentEmergency.created_at).toLocaleString('th-TH')}
                </Text>
              )}
            </View>

            <View style={styles.emergencyActions}>
              <TouchableOpacity
                style={[styles.emergencyButton, styles.emergencyButtonDanger]}
                onPress={() => handleEmergencyResponse('EMERGENCY')}
                disabled={processingEmergency}
                activeOpacity={0.8}
              >
                {processingEmergency ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="alert-circle" size={20} color="#fff" />
                    <Text style={styles.emergencyButtonText}>ยืนยันเหตุฉุกเฉิน</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.emergencyButton, styles.emergencyButtonNormal]}
                onPress={() => handleEmergencyResponse('CONFIRMED_NORMAL')}
                disabled={processingEmergency}
                activeOpacity={0.8}
              >
                {processingEmergency ? (
                  <ActivityIndicator color={COLORS.text} size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                    <Text style={styles.emergencyButtonTextNormal}>สถานการณ์ปกติ</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.emergencyNote}>
              กรุณาเลือกการตอบสนองที่เหมาะสม
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomePage;

/* ============================= Styles ============================= */
const shadow = Platform.select({
  ios: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  android: { elevation: 3 },
});

const shadowElevated = Platform.select({
  ios: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 6 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  
  // Enhanced Header Styles
  headerContainer: {
    backgroundColor: COLORS.card,
    paddingTop: Platform.OS === 'ios' ? 40 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...shadow,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandText: {
    flex: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.success,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  signOutButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Date Time Display
  dateTimeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  dateTimeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...shadow,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    marginLeft: 6,
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Enhanced Status Card
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  heroSurface: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...shadowElevated,
  },
  statusHeader: {
    marginBottom: 18,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusLine: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  // Enhanced Stepper
  stepperContainer: {
    marginBottom: 18,
  },
  stepperWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepDotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
  stepLabelActive: {
    color: COLORS.text,
    fontWeight: '600',
  },
  stepBar: {
    position: 'absolute',
    top: 16,
    left: '60%',
    right: '-60%',
    height: 2,
    backgroundColor: COLORS.border,
    zIndex: -1,
  },
  stepBarActive: {
    backgroundColor: COLORS.primary,
  },

  // Update Button
  updateButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  updateText: {
    color: COLORS.card,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Quick Stats
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...shadow,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },

  // Menu Section
  menuContainer: {
    paddingHorizontal: 16,
    flex: 1,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 12,
    width: '48%',
    aspectRatio: 1, // Makes it square
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...shadow,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 14,
  },



  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    maxHeight: '80%',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: 12,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sheetIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  closeBtn: {
    marginTop: 10,
    marginHorizontal: 16,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeTxt: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },

  // Emergency Modal Styles
  emergencyBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emergencyModal: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...shadowElevated,
  },
  emergencyHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emergencyIcon: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emergencyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  emergencySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  emergencyTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  emergencyActions: {
    gap: 12,
    marginBottom: 16,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  emergencyButtonDanger: {
    backgroundColor: COLORS.danger,
  },
  emergencyButtonNormal: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  emergencyButtonTextNormal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  emergencyNote: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// ฟังก์ชันสำหรับดึงจำนวนเด็กจริงจากฐานข้อมูล
async function getStudentCount() {
  try {
    // Import supabase client
    const { supabase } = await import('../../src/services/supabaseClient');
    
    // ดึงจำนวนนักเรียนทั้งหมดจากตาราง students
    const { data, error, count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.warn('ไม่สามารถดึงข้อมูลจำนวนเด็กได้:', error);
      return 24; // fallback
    }

    const studentCount = count || 0;
    console.log('ดึงข้อมูลจำนวนนักเรียนสำเร็จ:', studentCount);
    return studentCount;
  } catch (error) {
    console.warn('เกิดข้อผิดพลาดในการดึงข้อมูลจำนวนเด็ก:', error);
    return 24; // fallback
  }
}

// ฟังก์ชันสำหรับคำนวณระยะทางจากบ้านคนขับถึงโรงเรียน
async function calculateDistance() {
  try {
    const driverId = await AsyncStorage.getItem('driverId');
    if (!driverId) {
      console.log('ไม่พบ driverId, ใช้ระยะทาง mock');
      return 12.5; // ค่า default (กิโลเมตร)
    }

    // ดึงข้อมูลตำแหน่งบ้านคนขับและโรงเรียนจาก API
    const response = await fetch('https://safety-bus-liff-v4-new.vercel.app/api/calculate-distance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driverId: parseInt(driverId),
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.distance || 12.5; // ระยะทางในกิโลเมตร
    } else {
      console.warn('ไม่สามารถคำนวณระยะทางได้, ใช้ข้อมูล mock');
      return 12.5; // fallback
    }
  } catch (error) {
    console.warn('เกิดข้อผิดพลาดในการคำนวณระยะทาง:', error);
    return 12.5; // fallback
  }
}

// ฟังก์ชันสำหรับคำนวณเวลาคาดการณ์
function calculateEstimatedTime(distance: number) {
  // คำนวณเวลาโดยประมาณ
  // สมมติความเร็วเฉลี่ย 30 กม./ชม. ในเมือง และ 50 กม./ชม. นอกเมือง
  const averageSpeed = distance > 20 ? 50 : 30; // กม./ชม.
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  if (timeInMinutes < 60) {
    return `${timeInMinutes} นาที`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return minutes > 0 ? `${hours}.${Math.round(minutes/6)} ชม.` : `${hours} ชม.`;
  }
}
