import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { 
  getRecentEmergencyLogs, 
  subscribeToEmergencyLogs,
  parseDetails,
  getEventTypeText,
  getTriggeredByText,
  formatDateTime,
  getEventTypeIcon,
  getEventTypeColor,
  EmergencyLog
} from '../../../src/services/emergencyService';
import { safeGoBack } from '../../../src/utils/navigationUtils';

const COLORS = {
  primary: '#007AFF',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
};

// EmergencyLog interface imported from emergencyService

interface EmergencyStats {
  totalEvents: number;
  panicButtons: number;
  sensorAlerts: number;
  driverIncapacitated: number;
  todayEvents: number;
  weekEvents: number;
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
};

const EmergencyReports: React.FC = () => {
  const [emergencyLogs, setEmergencyLogs] = useState<EmergencyLog[]>([]);
  const [stats, setStats] = useState<EmergencyStats>({
    totalEvents: 0,
    panicButtons: 0,
    sensorAlerts: 0,
    driverIncapacitated: 0,
    todayEvents: 0,
    weekEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const calculateStats = (logs: EmergencyLog[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayEvents = logs.filter((log: EmergencyLog) => 
      new Date(log.event_time) >= today
    ).length;

    const weekEvents = logs.filter((log: EmergencyLog) => 
      new Date(log.event_time) >= weekAgo
    ).length;

    const panicButtons = logs.filter((log: EmergencyLog) => 
      log.event_type === 'PANIC_BUTTON'
    ).length;

    const sensorAlerts = logs.filter((log: EmergencyLog) => 
      log.event_type === 'SENSOR_ALERT'
    ).length;

    const driverIncapacitated = logs.filter((log: EmergencyLog) => 
      log.event_type === 'DRIVER_INCAPACITATED'
    ).length;

    setStats({
      totalEvents: logs.length,
      panicButtons,
      sensorAlerts,
      driverIncapacitated,
      todayEvents,
      weekEvents,
    });
  };

  const fetchEmergencyData = async () => {
    try {
      // ใช้ฟังก์ชันจาก emergencyService แทนการเรียก Supabase โดยตรง
      const { data: logs, error } = await getRecentEmergencyLogs(1, 50); // ใช้ driver_id = 1 สำหรับตัวอย่าง

      if (error) throw error;

      const emergencyData = logs || [];
      setEmergencyLogs(emergencyData);
      calculateStats(emergencyData);
    } catch (error) {
      console.error('Error fetching emergency data:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลเหตุการณ์ฉุกเฉินได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleNewEmergency = (emergency: EmergencyLog) => {
    setEmergencyLogs(prev => {
      const updated = [emergency, ...prev];
      calculateStats(updated);
      return updated;
    });
  };

  const handleEmergencyUpdate = (emergency: EmergencyLog) => {
    setEmergencyLogs(prev => {
      const updated = prev.map(e => e.event_id === emergency.event_id ? emergency : e);
      calculateStats(updated);
      return updated;
    });
  };

  useEffect(() => {
    fetchEmergencyData();

    // เพิ่ม real-time subscription สำหรับ emergency logs
    const channel = subscribeToEmergencyLogs(
      1, // driver_id = 1 สำหรับตัวอย่าง
      handleNewEmergency,
      handleEmergencyUpdate
    );

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmergencyData();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => safeGoBack('/manage/reports')}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
          <Text style={styles.topBarTitle}>รายงานเหตุการณ์ฉุกเฉิน</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => safeGoBack('/manage/reports')}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>รายงานเหตุการณ์ฉุกเฉิน</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>ข้อมูลการแจ้งเตือนและเหตุการณ์ฉุกเฉิน</Text>
        </View>

      {/* สถิติรวม */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, shadow]}>
          <Ionicons name="alert-circle" size={24} color={COLORS.danger} />
          <Text style={styles.statNumber}>{stats.totalEvents}</Text>
          <Text style={styles.statLabel}>เหตุการณ์ทั้งหมด</Text>
        </View>
        <View style={[styles.statCard, shadow]}>
          <Ionicons name="today" size={24} color={COLORS.primary} />
          <Text style={styles.statNumber}>{stats.todayEvents}</Text>
          <Text style={styles.statLabel}>วันนี้</Text>
        </View>
        <View style={[styles.statCard, shadow]}>
          <Ionicons name="calendar" size={24} color={COLORS.success} />
          <Text style={styles.statNumber}>{stats.weekEvents}</Text>
          <Text style={styles.statLabel}>สัปดาห์นี้</Text>
        </View>
      </View>

      {/* สถิติตามประเภท */}
      <View style={[styles.card, shadow]}>
        <Text style={styles.cardTitle}>สถิติตามประเภทเหตุการณ์</Text>
        <View style={styles.typeStatsContainer}>
          <View style={styles.typeStatRow}>
            <Ionicons name="warning" size={20} color={COLORS.danger} />
            <Text style={styles.typeStatLabel}>ปุ่มฉุกเฉิน</Text>
            <Text style={styles.typeStatValue}>{stats.panicButtons}</Text>
          </View>
          <View style={styles.typeStatRow}>
            <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
            <Text style={styles.typeStatLabel}>แจ้งเตือนเซ็นเซอร์</Text>
            <Text style={styles.typeStatValue}>{stats.sensorAlerts}</Text>
          </View>
          <View style={styles.typeStatRow}>
            <Ionicons name="medical" size={20} color={COLORS.danger} />
            <Text style={styles.typeStatLabel}>คนขับไม่สามารถขับได้</Text>
            <Text style={styles.typeStatValue}>{stats.driverIncapacitated}</Text>
          </View>
        </View>
      </View>

      {/* รายการเหตุการณ์ */}
      <View style={[styles.card, shadow]}>
        <Text style={styles.cardTitle}>รายการเหตุการณ์ล่าสุด</Text>
        {emergencyLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
            <Text style={styles.emptyText}>ไม่มีเหตุการณ์ฉุกเฉิน</Text>
            <Text style={styles.emptySubtext}>ระบบทำงานปกติ</Text>
          </View>
        ) : (
          emergencyLogs.map((log) => (
            <View key={log.event_id} style={styles.logItem}>
              <View style={styles.logHeader}>
                <View style={styles.logTypeContainer}>
                  <Ionicons
                    name={getEventTypeIcon(log.event_type) as any}
                    size={20}
                    color={getEventTypeColor(log.event_type)}
                  />
                  <Text style={[styles.logType, { color: getEventTypeColor(log.event_type) }]}>
                    {getEventTypeText(log.event_type)}
                  </Text>
                </View>
                <Text style={styles.logTime}>{formatDateTime(log.event_time)}</Text>
              </View>
              <View style={styles.logDetails}>
                <Text style={styles.logDetailText}>
                  {
                    log.event_type === 'SENSOR_ALERT' && log.details
                      ? String(parseDetails(log.details))
                      : getTriggeredByText(log.triggered_by)
                  }
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...shadow,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  typeStatsContainer: {
    gap: 12,
  },
  typeStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typeStatLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginLeft: 12,
  },
  typeStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  logItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logType: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  logDetails: {
    gap: 4,
  },
  logDetailText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default EmergencyReports;