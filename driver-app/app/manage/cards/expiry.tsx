import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
  expireCards, 
  getExpiringStudents, 
  checkAndNotifyExpiringStudents,
  expireCardsAndNotify,
  ExpiringStudent,
  ExpiredCard 
} from '../../../src/services/cardExpiryService';

export default function CardExpiryScreen() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [expiringStudents, setExpiringStudents] = useState<ExpiringStudent[]>([]);
  const [expiredToday, setExpiredToday] = useState<ExpiredCard[]>([]);
  
  const [selectedTab, setSelectedTab] = useState<'expiring' | 'expired'>('expiring');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // โหลดนักเรียนที่จะหมดอายุใน 7 วัน
      const expiring = await getExpiringStudents(7);
      setExpiringStudents(expiring);
      
      // โหลดบัตรที่หมดอายุวันนี้
      const today = await getExpiringStudents(0);
      // แปลง ExpiringStudent เป็น ExpiredCard
      const expiredCards: ExpiredCard[] = today.map(student => ({
        ...student,
        expired_at: new Date().toISOString()
      }));
      setExpiredToday(expiredCards);
      
    } catch (error) {
      console.error('Failed to load expiry data:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleExpireCards = async () => {
    Alert.alert(
      'ยืนยันการยกเลิกบัตร',
      'ต้องการยกเลิกบัตรที่หมดอายุและส่งแจ้งเตือนหรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ยืนยัน', 
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const result = await expireCardsAndNotify();
              
              Alert.alert(
                'สำเร็จ',
                `ยกเลิกบัตร ${result.expired.expired_count} ใบ\n` +
                `ส่งแจ้งเตือน ${result.notified} ข้อความ\n` +
                `ส่งไม่สำเร็จ ${result.failed} ข้อความ`
              );
              
              await loadData();
            } catch (error) {
              console.error('Failed to expire cards:', error);
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถยกเลิกบัตรได้');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleSendNotifications = async () => {
    Alert.alert(
      'ส่งแจ้งเตือน',
      'ต้องการส่งแจ้งเตือนให้นักเรียนที่จะหมดอายุพรุ่งนี้หรือไม่?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ส่ง', 
          onPress: async () => {
            try {
              setProcessing(true);
              const result = await checkAndNotifyExpiringStudents(1);
              
              Alert.alert(
                'สำเร็จ',
                `ส่งแจ้งเตือน ${result.notified} ข้อความ\n` +
                `ส่งไม่สำเร็จ ${result.failed} ข้อความ`
              );
            } catch (error) {
              console.error('Failed to send notifications:', error);
              Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถส่งแจ้งเตือนได้');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const renderExpiringStudent = ({ item }: { item: ExpiringStudent | ExpiredCard }) => (
    <View style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{item.student_name}</Text>
          <Text style={styles.studentId}>รหัส: {item.student_id}</Text>
        </View>
        <View style={[
          styles.daysBadge,
          (item.days_remaining ?? 0) <= 1 ? styles.urgentBadge : 
          (item.days_remaining ?? 0) <= 3 ? styles.warningBadge : styles.normalBadge
        ]}>
          <Text style={[
            styles.daysText,
            (item.days_remaining ?? 0) <= 1 ? styles.urgentText : 
            (item.days_remaining ?? 0) <= 3 ? styles.warningText : styles.normalText
          ]}>
            {(item.days_remaining ?? 0) === 0 ? 'วันนี้' : 
             (item.days_remaining ?? 0) === 1 ? 'พรุ่งนี้' : 
             `${item.days_remaining ?? 0} วัน`}
          </Text>
        </View>
      </View>
      
      <View style={styles.studentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>
            สิ้นสุด: {formatThaiDate(item.service_end_date)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="card-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>บัตร: {item.rfid_code}</Text>
        </View>
        {item.parent_line_id && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={16} color={COLORS.success} />
            <Text style={[styles.detailText, { color: COLORS.success }]}>
              มี Line ID
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const formatThaiDate = (dateString: string): string => {
    const date = new Date(dateString);
    const thaiMonths = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    
    return `${day} ${month} ${year}`;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(tabs)/home')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>จัดการบัตรหมดอายุ</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'expiring' && styles.activeTab]}
          onPress={() => setSelectedTab('expiring')}
        >
          <Text style={[styles.tabText, selectedTab === 'expiring' && styles.activeTabText]}>
            ใกล้หมดอายุ ({expiringStudents.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'expired' && styles.activeTab]}
          onPress={() => setSelectedTab('expired')}
        >
          <Text style={[styles.tabText, selectedTab === 'expired' && styles.activeTabText]}>
            หมดอายุวันนี้ ({expiredToday.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.notifyBtn]}
          onPress={handleSendNotifications}
          disabled={processing}
        >
          <Ionicons name="notifications-outline" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>ส่งแจ้งเตือน</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionBtn, styles.expireBtn]}
          onPress={handleExpireCards}
          disabled={processing}
        >
          <Ionicons name="close-circle-outline" size={20} color="#fff" />
          <Text style={styles.actionBtnText}>ยกเลิกบัตรหมดอายุ</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={selectedTab === 'expiring' ? expiringStudents : expiredToday}
        renderItem={renderExpiringStudent}
        keyExtractor={(item) => `${item.student_id}-${item.card_id}`}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons 
              name={selectedTab === 'expiring' ? "time-outline" : "checkmark-circle-outline"} 
              size={64} 
              color={COLORS.textTertiary} 
            />
            <Text style={styles.emptyText}>
              {selectedTab === 'expiring' 
                ? 'ไม่มีนักเรียนที่ใกล้หมดอายุ' 
                : 'ไม่มีบัตรที่หมดอายุวันนี้'}
            </Text>
          </View>
        }
      />

      {/* Processing Overlay */}
      {processing && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.overlayText}>กำลังดำเนินการ...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const COLORS = {
  bg: '#F8FAFC',
  bgSecondary: '#F1F5F9',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  primary: '#021C8B',
  primarySoft: '#EFF6FF',
  success: '#10B981',
  successSoft: '#ECFDF5',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  hover: '#F8FAFC',
};

const shadow = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 1,
};

const shadowElevated = {
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 4,
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.select({ ios: 12, android: 10 }),
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.card,
    ...shadow,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    ...shadow,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: '#fff',
  },
  
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    ...shadow,
  },
  notifyBtn: {
    backgroundColor: COLORS.primary,
  },
  expireBtn: {
    backgroundColor: COLORS.danger,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  listContainer: {
    padding: 16,
    paddingTop: 0,
  },
  
  studentCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...shadow,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  studentId: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  daysBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  urgentBadge: {
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  warningBadge: {
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  normalBadge: {
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '700',
  },
  urgentText: {
    color: COLORS.danger,
  },
  warningText: {
    color: COLORS.warning,
  },
  normalText: {
    color: COLORS.primary,
  },
  
  studentDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textTertiary,
    marginTop: 16,
    textAlign: 'center',
  },
  
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayContent: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    ...shadowElevated,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
});