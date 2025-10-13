import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabaseClient';
import { 
  EmergencyLog, 
  EmergencyResponse,
  recordEmergencyResponse,
  getEventTypeText,
  getEventTypeIcon,
  getEventTypeColor,
  formatDateTime,
  parseDetails,
  getSourceText
} from '../services/emergencyService';

const { width: screenWidth } = Dimensions.get('window');

const COLORS = {
  bg: '#FAFBFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  primary: '#3B82F6',
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  shadow: 'rgba(15, 23, 42, 0.08)',
  shadowDark: 'rgba(15, 23, 42, 0.15)',
};

interface EmergencyAlertModalProps {
  visible: boolean;
  emergency: EmergencyLog | null;
  driverId: number;
  onClose: () => void;
  onResponse: (eventId: number, responseType: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL') => Promise<void>;
}

const EmergencyAlertModal: React.FC<EmergencyAlertModalProps> = ({
  visible,
  emergency,
  driverId,
  onClose,
  onResponse,
}) => {
  const [responding, setResponding] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<'initial' | 'emergency_confirmed' | 'resolved'>('initial');

  useEffect(() => {
    if (emergency) {
      // ตรวจสอบสถานะปัจจุบันของเหตุการณ์
      if (emergency.status === 'emergency_confirmed') {
        setCurrentStatus('emergency_confirmed');
      } else if (emergency.status === 'resolved') {
        setCurrentStatus('resolved');
      } else {
        setCurrentStatus('initial');
      }
    }
  }, [emergency]);

  const handleResponse = async (responseType: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL') => {
    if (!emergency) return;

    setResponding(true);
    try {
      await onResponse(emergency.event_id, responseType);
      
      if (responseType === 'EMERGENCY') {
        setCurrentStatus('emergency_confirmed');
        Alert.alert(
          'ส่งสัญญาณฉุกเฉินแล้ว',
          'ระบบได้ส่งการแจ้งเตือนไปยังผู้เกี่ยวข้องทั้งหมดแล้ว\nกรุณายืนยันเมื่อสถานการณ์กลับมาปกติ',
          [{ text: 'รับทราบ' }]
        );
      } else if (responseType === 'CONFIRMED_NORMAL') {
        setCurrentStatus('resolved');
        Alert.alert(
          'ยืนยันสถานการณ์กลับสู่ปกติ',
          'ระบบได้ส่งการแจ้งเตือนการกลับสู่ปกติไปยังผู้เกี่ยวข้องแล้ว',
          [{ text: 'รับทราบ', onPress: onClose }]
        );
      } else {
        // CHECKED - ปิด modal ทันที
        onClose();
      }
    } catch (error) {
      Alert.alert('ข้อผิดพลาด', 'ไม่สามารถบันทึกการตอบสนองได้');
    } finally {
      setResponding(false);
    }
  };

  const getAlertTitle = () => {
    if (!emergency) return '';
    
    if (emergency.triggered_by === 'student') {
      return 'ตรวจพบการกดปุ่มฉุกเฉิน';
    } else if (emergency.triggered_by === 'sensor') {
      return 'ตรวจพบจากเซ็นเซอร์';
    }
    return 'เหตุการณ์ฉุกเฉิน';
  };

  const getAlertMessage = () => {
    if (!emergency) return '';
    
    const sourceText = getSourceText(emergency);
    const eventTypeText = getEventTypeText(emergency.event_type);
    
    if (emergency.triggered_by === 'student') {
      return `มีการตรวจพบการกดปุ่มฉุกเฉินจากนักเรียน\nประเภท: ${eventTypeText}\nกรุณาทำการตรวจสอบทันที`;
    } else if (emergency.triggered_by === 'sensor') {
      return `ตรวจพบเหตุการณ์จากเซ็นเซอร์\nประเภท: ${eventTypeText}\nกรุณาตรวจสอบและดำเนินการ`;
    }
    return `เหตุการณ์: ${eventTypeText}`;
  };

  const renderButtons = () => {
    if (currentStatus === 'resolved') {
      return (
        <TouchableOpacity
          style={[styles.button, styles.successButton]}
          onPress={onClose}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.surface} />
          <Text style={[styles.buttonText, { color: COLORS.surface }]}>
            สถานการณ์กลับสู่ปกติแล้ว
          </Text>
        </TouchableOpacity>
      );
    }

    if (currentStatus === 'emergency_confirmed') {
      return (
        <TouchableOpacity
          style={[styles.button, styles.successButton]}
          onPress={() => handleResponse('CONFIRMED_NORMAL')}
          disabled={responding}
        >
          {responding ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <Ionicons name="checkmark-circle" size={20} color={COLORS.surface} />
          )}
          <Text style={[styles.buttonText, { color: COLORS.surface }]}>
            สถานการณ์กลับสู่ปกติ
          </Text>
        </TouchableOpacity>
      );
    }

    // สถานะเริ่มต้น
    if (emergency?.triggered_by === 'student') {
      return (
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handleResponse('CHECKED')}
          disabled={responding}
        >
          {responding ? (
            <ActivityIndicator size="small" color={COLORS.surface} />
          ) : (
            <Ionicons name="checkmark" size={20} color={COLORS.surface} />
          )}
          <Text style={[styles.buttonText, { color: COLORS.surface }]}>
            ตรวจสอบแล้ว
          </Text>
        </TouchableOpacity>
      );
    } else if (emergency?.triggered_by === 'sensor') {
      return (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, { flex: 1, marginRight: 8 }]}
            onPress={() => handleResponse('CHECKED')}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Ionicons name="checkmark" size={20} color={COLORS.surface} />
            )}
            <Text style={[styles.buttonText, { color: COLORS.surface }]}>
              ตรวจสอบแล้ว
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.dangerButton, { flex: 1, marginLeft: 8 }]}
            onPress={() => handleResponse('EMERGENCY')}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator size="small" color={COLORS.surface} />
            ) : (
              <Ionicons name="warning" size={20} color={COLORS.surface} />
            )}
            <Text style={[styles.buttonText, { color: COLORS.surface }]}>
              ฉุกเฉิน
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (!emergency) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={getEventTypeIcon(emergency.event_type)}
                size={32}
                color={getEventTypeColor(emergency.event_type)}
              />
            </View>
            <Text style={styles.title}>{getAlertTitle()}</Text>
            <Text style={styles.timestamp}>
              {formatDateTime(emergency.event_time)}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.message}>{getAlertMessage()}</Text>
            
            {emergency.details && (
              <View style={styles.detailsContainer}>
                <Text style={styles.detailsLabel}>รายละเอียดเพิ่มเติม:</Text>
                <Text style={styles.detailsText}>
                  {typeof emergency.details === 'string' 
                    ? emergency.details 
                    : JSON.stringify(emergency.details, null, 2)
                  }
                </Text>
              </View>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.footer}>
            {renderButtons()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: Math.min(screenWidth - 40, 400),
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.shadowDark,
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
    }),
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.dangerSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  message: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailsContainer: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  successButton: {
    backgroundColor: COLORS.success,
  },
  dangerButton: {
    backgroundColor: COLORS.danger,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EmergencyAlertModal;