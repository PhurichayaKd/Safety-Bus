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

// ใช้ข้อมูล mock แทน Supabase เพื่อหลีกเลี่ยง connection errors
async function getTodayProgress() {
  // Mock data สำหรับการแสดงผล
  return {
    target: 24,
    pickupGo: 18,
    dropGo: 18,
    pickupRet: 15,
    dropRet: 15,
  };
}

// ฟังก์ชันสำหรับอัพเดตสถานะนักเรียนลงรถที่โรงเรียน
async function updateSchoolDropoffStatus() {
  try {
    const driverId = await AsyncStorage.getItem('driverId');
    if (!driverId) {
      console.error('ไม่พบ driverId');
      return;
    }

    const response = await fetch('https://safety-bus-liff-v4-new.vercel.app/api/update-school-dropoff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driverId: parseInt(driverId),
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('อัพเดตสถานะลงรถที่โรงเรียนสำเร็จ:', result.message);
      if (result.updatedStudents > 0) {
        Alert.alert(
          'อัพเดตสถานะสำเร็จ',
          `อัพเดตสถานะลงรถที่โรงเรียนสำหรับนักเรียน ${result.updatedStudents} คน`,
          [{ text: 'ตกลง' }]
        );
      }
    } else {
      console.error('เกิดข้อผิดพลาดในการอัพเดตสถานะ:', result.error);
      Alert.alert('เกิดข้อผิดพลาด', result.error || 'ไม่สามารถอัพเดตสถานะได้');
    }
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ:', error);
    Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
  }
}

const HomePage = () => {
  const { signOut } = useAuth();
  const [status, setStatus] = useState<BusStatus | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // เพิ่ม state สำหรับข้อมูลใหม่
  const [studentCount, setStudentCount] = useState<number>(24);
  const [distance, setDistance] = useState<number>(12.5);
  const [estimatedTime, setEstimatedTime] = useState<string>('25 นาที');
  const [loading, setLoading] = useState(true);

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
        if (p.pickupGo < p.target) {
          const remain = p.target - p.pickupGo;
          Alert.alert('ยังเช็กไม่ครบ', `ยังมีนักเรียนที่ยังไม่ขึ้นรถเช้าอีก ${remain} คน`);
          return;
        }
        
        // เมื่อถึงโรงเรียน ให้อัพเดตสถานะนักเรียนลงรถที่โรงเรียนทุกคน
        await updateSchoolDropoffStatus();
      }

      if (next === 'waiting_return') {
        if (p.dropGo < p.pickupGo) {
          const remain = p.pickupGo - p.dropGo;
          Alert.alert('ยังเช็กไม่ครบ', `ยังมีนักเรียนที่ยังไม่ลงรถที่โรงเรียนอีก ${remain} คน`);
          return;
        }
        await AsyncStorage.setItem('trip_phase', 'return');
      }

      if (next === 'finished') {
        if (p.dropRet < p.pickupRet) {
          const remain = p.pickupRet - p.dropRet;
          Alert.alert('ยังเช็กไม่ครบ', `ยังมีนักเรียนที่ยังไม่ลงรถถึงบ้านอีก ${remain} คน`);
          return;
        }
        await markNewDayReset();
      }

      if (next === 'enroute') {
        await markNewDayReset();
      }

      setStatus(next);
      await persistTripPhase(next);
      await AsyncStorage.setItem('current_bus_status', next);
      
      // ส่งแจ้งเตือนไปยัง LINE Bot (ยกเว้นสถานะ waiting_departure)
      if (next !== 'waiting_departure') {
        try {
          const response = await fetch('https://safety-bus-liff-v4-new.vercel.app/api/notify-status-update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: next,
              timestamp: new Date().toISOString(),
            }),
          });

          if (!response.ok) {
            console.warn('Failed to send LINE notification:', response.status);
          } else {
            console.log('LINE notification sent successfully');
          }
        } catch (error) {
          console.warn('Error sending LINE notification:', error);
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
                <Text style={styles.subtitle}>แดชบอร์ดคนขับ</Text>
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
            <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
            <Text style={styles.dateText}>{formatDate(currentDateTime)}</Text>
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
