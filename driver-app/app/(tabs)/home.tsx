// src/components/HomePage.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, TouchableOpacity, View, Pressable,
  Modal, ActivityIndicator, Platform, AccessibilityInfo, Alert, Dimensions, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/services/supabaseClient';

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const PATHS = {
  manage: '/manage',
  login: '/login',
  busForm: '/bus-form',
  reports: '/manage/reports',
  issueCard: '/manage/cards/issue',
} as const;

type BusStatus = 'enroute' | 'arrived_school' | 'waiting_return' | 'finished';

const STATUS_LABEL: Record<BusStatus, string> = {
  enroute: 'เริ่มออกเดินทาง',
  arrived_school: 'ถึงโรงเรียน',
  waiting_return: 'รอรับกลับบ้าน',
  finished: 'จบการเดินทาง',
};

/* ======= CLEAN WHITE/BLUE THEME (Professional Driver App) ======= */
const COLORS = {
  // Primary background colors - Clean white/soft theme
  bg: '#FAFBFC',              // Very light gray-white background
  bgSecondary: '#F8FAFC',     // Slightly darker white
  bgSoft: '#FFFFFF',          // Pure white for contrast
  card: '#FFFFFF',            // Pure white for main cards
  cardElevated: '#FFFFFF',    // Elevated card
  
  // Text colors with proper contrast ratios
  text: '#1E293B',            // Dark slate for primary text
  textSecondary: '#475569',   // Medium slate for secondary text
  textTertiary: '#64748B',    // Light slate for tertiary text
  textMuted: '#94A3B8',       // Very light slate for muted text
  textLight: '#FFFFFF',       // White text for dark backgrounds
  textOnPrimary: '#FFFFFF',   // White text on primary colors
  textOnSecondary: '#FFFFFF', // White text on secondary colors
  
  // Border and divider colors - Very subtle
  border: '#E2E8F0',          // Very light border
  borderLight: '#F1F5F9',     // Ultra light border
  borderSoft: '#E2E8F0',      // Soft borders
  borderDark: '#CBD5E1',      // Slightly darker borders
  divider: '#F1F5F9',
  
  // Primary brand colors - Resolution Blue
  primary: '#021C8B',         // Resolution Blue - main brand color
  primaryDark: '#010B1F',     // Darker shade for hover states
  primaryLight: '#1E40AF',    // Lighter blue for hover states
  primarySoft: '#EFF6FF',     // Very soft blue background
  primaryGradient: ['#021C8B', '#1E40AF'],
  
  // Secondary colors - New Car Blue (เปลี่ยนจากเขียวเป็นน้ำเงิน)
  secondary: '#1B52D7',       // New Car blue
  secondaryDark: '#1E40AF',   // Darker blue
  secondaryLight: '#3B82F6',  // Lighter blue
  secondarySoft: '#EFF6FF',   // Soft blue background
  
  // Accent colors - Clean grays
  accent: '#64748B',          // Clean slate gray
  accentDark: '#475569',      // Darker gray
  accentLight: '#94A3B8',     // Lighter gray
  accentSoft: '#F8FAFC',      // Soft gray background
  
  // Status colors
  success: '#10B981',         // Clean green for success
  successSoft: '#ECFDF5',     // Light green background
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  info: '#021C8B',            // Resolution Blue for info
  infoSoft: '#EFF6FF',        // Light blue background
  
  // Interactive states
  hover: '#F8FAFC',
  pressed: '#F1F5F9',
  focus: '#021C8B',           // Resolution Blue for focus
  
  // Shadow colors - Very subtle
  shadow: 'rgba(30, 41, 59, 0.04)',      // Very light shadow
  shadowMedium: 'rgba(30, 41, 59, 0.08)', // Medium shadow
  shadowDark: 'rgba(30, 41, 59, 0.12)',   // Darker shadow for elevation
  shadowElevated: 'rgba(30, 41, 59, 0.16)', // Elevated shadow
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
      accessibilityRole="button"
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

/* --------- Today progress helpers (เดิม) --------- */
function todayRangeISO() {
  const start = new Date(); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}
async function getTodayProgress() {
  const { startISO, endISO } = todayRangeISO();

  const { count: activeCount } = await supabase
    .from('students')
    .select('student_id', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: absentCount } = await supabase
    .from('pickup_dropoff')
    .select('record_id', { count: 'exact', head: true })
    .eq('event_type', 'absent')
    .gte('event_time', startISO).lt('event_time', endISO);

  const target = Math.max(0, (activeCount ?? 0) - (absentCount ?? 0));

  const { count: pickupGo } = await supabase
    .from('pickup_dropoff')
    .select('record_id', { count: 'exact', head: true })
    .eq('event_type', 'pickup')
    .eq('location_type', 'go')
    .gte('event_time', startISO).lt('event_time', endISO);

  const { count: dropGo } = await supabase
    .from('pickup_dropoff')
    .select('record_id', { count: 'exact', head: true })
    .eq('event_type', 'dropoff')
    .eq('location_type', 'go')
    .gte('event_time', startISO).lt('event_time', endISO);

  const { count: pickupRet } = await supabase
    .from('pickup_dropoff')
    .select('record_id', { count: 'exact', head: true })
    .eq('event_type', 'pickup')
    .eq('location_type', 'return')
    .gte('event_time', startISO).lt('event_time', endISO);

  const { count: dropRet } = await supabase
    .from('pickup_dropoff')
    .select('record_id', { count: 'exact', head: true })
    .eq('event_type', 'dropoff')
    .eq('location_type', 'return')
    .gte('event_time', startISO).lt('event_time', endISO);

  return {
    target,
    pickupGo: pickupGo ?? 0,
    dropGo: dropGo ?? 0,
    pickupRet: pickupRet ?? 0,
    dropRet: dropRet ?? 0,
  };
}

const HomePage = () => {
  const { signOut } = useAuth();
  const [status, setStatus] = useState<BusStatus>('enroute');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    (async () => {
      const phase = await AsyncStorage.getItem('trip_phase');
      setStatus(phase === 'return' ? 'waiting_return' : 'enroute');
    })();
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
      AccessibilityInfo.announceForAccessibility?.(`อัปเดตสถานะเป็น ${STATUS_LABEL[next]}`);
    } finally {
      setUpdating(false);
    }
  };

  const steps: BusStatus[] = ['enroute','arrived_school','waiting_return','finished'];
  const activeIndex = steps.findIndex(k => k === status);

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
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>ออนไลน์</Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="ออกจากระบบ"
            accessibilityHint="แตะเพื่อออกจากระบบและกลับไปหน้าเข้าสู่ระบบ"
          >
            <Ionicons name="log-out-outline" size={16} color={COLORS.danger} />
          </TouchableOpacity>
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
            <Text style={styles.statusLine}>{STATUS_LABEL[status]}</Text>
          </View>

          {/* Enhanced Stepper */}
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
            accessibilityRole="button"
            accessibilityLabel={updating ? 'กำลังอัปเดตสถานะ' : 'อัปเดตสถานะรถ'}
            accessibilityHint="แตะเพื่อเลือกสถานะใหม่สำหรับรถบัส"
            accessibilityState={{ disabled: updating }}
          >
            {updating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.updateText}>อัปเดตสถานะ</Text>
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
              <Text style={styles.statValue}>2.5 ชม.</Text>
              <Text style={styles.statLabel}>เวลาขับรถ</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="speedometer" size={14} color={COLORS.success} />
              </View>
              <Text style={styles.statValue}>45 กม.</Text>
              <Text style={styles.statLabel}>ระยะทาง</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIconWrap}>
                <Ionicons name="people" size={14} color={COLORS.warning} />
              </View>
              <Text style={styles.statValue}>24 คน</Text>
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
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: { elevation: 3 },
});

const shadowElevated = Platform.select({
  ios: {
    shadowColor: COLORS.shadowDark,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    width: 48,
    height: 48,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  brandText: {
    flex: 1,
  },
  appTitle: {
    fontSize: 20,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.success,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
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
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dateTimeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
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
    marginHorizontal: 20,
    marginBottom: 20,
  },
  heroSurface: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...shadowElevated,
  },
  statusHeader: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
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
    marginBottom: 24,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  updateText: {
    color: COLORS.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Quick Stats
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...shadow,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
    paddingHorizontal: 20,
    flex: 1,
  },
  menuTitle: {
    fontSize: 20,
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
    borderRadius: 12,
    padding: 16,
    width: '48%',
    aspectRatio: 1, // Makes it square
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...shadow,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sheetIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.bgSoft,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sheetText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  closeBtn: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeTxt: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
});
