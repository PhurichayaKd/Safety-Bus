import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEmergency } from '../src/contexts/EmergencyContext';
import {
  EmergencyLog,
  getRecentEmergencyLogs,
  getEventTypeText,
  getEventTypeIcon,
  getEventTypeColor,
  getTriggeredByText,
  formatDateTime,
} from '../src/services/emergencyService';

const COLORS = {
  primary: '#021C8B',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  text: '#111827',
  textSecondary: '#6B7280',
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
};

const EmergencyHistoryScreen: React.FC = () => {
  const { markAsRead } = useEmergency();
  const [emergencies, setEmergencies] = useState<EmergencyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEmergencies = async () => {
    try {
      const result = await getRecentEmergencyLogs(1, 50); // driverId = 1, limit = 50
      if (result.data) {
        setEmergencies(result.data);
      } else if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Error loading emergencies:', error);
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadEmergencies();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEmergencies();
  };

  const handleEmergencyPress = (emergency: EmergencyLog) => {
    // ทำเครื่องหมายว่าอ่านแล้ว
    markAsRead(emergency.event_id);
    
    // แสดงรายละเอียด
    Alert.alert(
      getEventTypeText(emergency.event_type),
      `เวลา: ${formatDateTime(emergency.event_time)}\n` +
      `แหล่งที่มา: ${getTriggeredByText(emergency.triggered_by)}\n` +
      `${emergency.description ? `รายละเอียด: ${emergency.description}\n` : ''}` +
      `${emergency.location ? `ตำแหน่ง: ${emergency.location}\n` : ''}` +
      `สถานะ: ${emergency.status === 'resolved' ? 'แก้ไขแล้ว' : 'รอดำเนินการ'}`,
      [{ text: 'ตกลง' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'in_progress':
        return COLORS.primary;
      default:
        return COLORS.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'แก้ไขแล้ว';
      case 'pending':
        return 'รอดำเนินการ';
      case 'in_progress':
        return 'กำลังดำเนินการ';
      default:
        return 'ไม่ทราบสถานะ';
    }
  };

  const renderEmergencyItem = ({ item }: { item: EmergencyLog }) => {
    const eventTypeColor = getEventTypeColor(item.event_type);
    const eventTypeIcon = getEventTypeIcon(item.event_type);
    const statusColor = getStatusColor(item.status || 'pending');

    return (
      <TouchableOpacity
        style={styles.emergencyItem}
        onPress={() => handleEmergencyPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.emergencyHeader}>
          <View style={styles.eventTypeContainer}>
            <View style={[styles.eventTypeIcon, { backgroundColor: eventTypeColor }]}>
              <Ionicons 
                name={eventTypeIcon as any} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.eventInfo}>
              <Text style={styles.eventTypeText}>
                {getEventTypeText(item.event_type)}
              </Text>
              <Text style={styles.eventTime}>
                {formatDateTime(item.event_time)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {getStatusText(item.status || 'pending')}
            </Text>
          </View>
        </View>

        <View style={styles.emergencyDetails}>
          <Text style={styles.triggeredBy}>
            แหล่งที่มา: {getTriggeredByText(item.triggered_by)}
          </Text>
          
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {item.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={14} color={COLORS.textSecondary} />
              <Text style={styles.location} numberOfLines={1}>
                {item.location}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.emergencyFooter}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off" size={64} color={COLORS.textSecondary} />
      <Text style={styles.emptyStateTitle}>ไม่มีการแจ้งเตือน</Text>
      <Text style={styles.emptyStateText}>
        ยังไม่มีเหตุการณ์ฉุกเฉินที่ต้องแจ้งเตือน
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ประวัติการแจ้งเตือน</Text>
          <View style={styles.placeholder} />
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
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติการแจ้งเตือน</Text>
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={handleRefresh}
        >
          <Ionicons name="refresh" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={emergencies}
        renderItem={renderEmergencyItem}
        keyExtractor={(item) => item.event_id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  refreshButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  listContainer: {
    padding: 16,
  },
  emergencyItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eventTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emergencyDetails: {
    marginBottom: 12,
  },
  triggeredBy: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  location: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
    flex: 1,
  },
  emergencyFooter: {
    alignItems: 'flex-end',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default EmergencyHistoryScreen;