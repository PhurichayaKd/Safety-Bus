import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmergency } from '../../src/contexts/EmergencyContext';
import {
  getEventTypeText,
  getEventTypeIcon,
  getEventTypeColor,
  getTriggeredByText,
  formatDateTime
} from '../../src/services/emergencyService';

const { width, height } = Dimensions.get('window');

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

const EmergencyModal: React.FC = () => {
  const { 
    showEmergencyModal, 
    currentEmergency, 
    handleEmergencyResponse, 
    dismissModal 
  } = useEmergency();
  
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [waitingForNormalConfirmation, setWaitingForNormalConfirmation] = useState(false);

  const handleResponse = async (responseType: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL') => {
    if (!currentEmergency) return;

    setIsProcessing(true);
    
    try {
      await handleEmergencyResponse(currentEmergency.event_id, responseType, notes);
      
      if (responseType === 'EMERGENCY') {
        // หลังจากกดฉุกเฉิน ให้แสดงปุ่มยืนยันสถานการณ์กลับมาปกติ
        setWaitingForNormalConfirmation(true);
      } else if (responseType === 'CONFIRMED_NORMAL') {
        // หลังจากยืนยันสถานการณ์กลับมาปกติ ให้ปิด modal
        setWaitingForNormalConfirmation(false);
        setNotes('');
        dismissModal();
      } else {
        // กรณี CHECKED ให้ปิด modal ทันที
        setNotes('');
        dismissModal();
      }
    } catch (error) {
      console.error('Error handling response:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmEmergencyResponse = (responseType: 'CHECKED' | 'EMERGENCY' | 'CONFIRMED_NORMAL') => {
    let title = '';
    let message = '';
    
    switch (responseType) {
      case 'CHECKED':
        title = 'ยืนยันการตรวจสอบ';
        message = 'คุณต้องการยืนยันว่าได้ตรวจสอบเหตุการณ์เรียบร้อยแล้วใช่หรือไม่?';
        break;
      case 'EMERGENCY':
        title = 'ยืนยันสถานการณ์ฉุกเฉิน';
        message = 'คุณต้องการแจ้งสถานการณ์ฉุกเฉินและให้นักเรียนลงจากรถใช่หรือไม่?\n\nระบบจะส่งข้อความแจ้งเตือนไปยังผู้ปกครองทุกคน';
        break;
      case 'CONFIRMED_NORMAL':
        title = 'ยืนยันสถานการณ์กลับมาปกติ';
        message = 'คุณต้องการยืนยันว่าสถานการณ์กลับมาสู่ปกติแล้วใช่หรือไม่?\n\nระบบจะส่งข้อความแจ้งผู้ปกครองว่าสิ้นสุดการแจ้งเตือน';
        break;
    }

    Alert.alert(
      title,
      message,
      [
        {
          text: 'ยกเลิก',
          style: 'cancel'
        },
        {
          text: 'ยืนยัน',
          style: responseType === 'EMERGENCY' ? 'destructive' : 'default',
          onPress: () => handleResponse(responseType)
        }
      ]
    );
  };

  if (!currentEmergency) return null;

  const eventTypeColor = getEventTypeColor(currentEmergency.event_type);
  const eventTypeIcon = getEventTypeIcon(currentEmergency.event_type);

  return (
    <Modal
      visible={showEmergencyModal}
      animationType="slide"
      transparent={true}
      onRequestClose={dismissModal}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: eventTypeColor }]}>
              <View style={styles.headerContent}>
                <Ionicons 
                  name={eventTypeIcon as any} 
                  size={32} 
                  color="#FFFFFF" 
                />
                <Text style={styles.headerTitle}>เหตุการณ์ฉุกเฉิน</Text>
              </View>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={dismissModal}
                disabled={isProcessing}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              {/* Event Type */}
              <View style={styles.eventTypeContainer}>
                <Text style={styles.eventTypeLabel}>ประเภทเหตุการณ์</Text>
                <View style={styles.eventTypeBadge}>
                  <Ionicons 
                    name={eventTypeIcon as any} 
                    size={20} 
                    color={eventTypeColor} 
                  />
                  <Text style={[styles.eventTypeText, { color: eventTypeColor }]}>
                    {getEventTypeText(currentEmergency.event_type)}
                  </Text>
                </View>
              </View>

              {/* Event Details */}
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Ionicons name="time" size={20} color={COLORS.textSecondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>เวลาเกิดเหตุ</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(currentEmergency.event_time)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons name="person" size={20} color={COLORS.textSecondary} />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>ผู้แจ้ง</Text>
                    <Text style={styles.detailValue}>
                      {getTriggeredByText(currentEmergency.triggered_by)}
                    </Text>
                  </View>
                </View>

                {currentEmergency.description && (
                  <View style={styles.detailRow}>
                    <Ionicons name="document-text" size={20} color={COLORS.textSecondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>รายละเอียด</Text>
                      <Text style={styles.detailValue}>
                        {currentEmergency.description}
                      </Text>
                    </View>
                  </View>
                )}

                {currentEmergency.location && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location" size={20} color={COLORS.textSecondary} />
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>ตำแหน่ง</Text>
                      <Text style={styles.detailValue}>
                        {currentEmergency.location}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Notes Input */}
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>หมายเหตุ (ไม่บังคับ)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="เพิ่มหมายเหตุเกี่ยวกับเหตุการณ์..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!isProcessing}
                />
              </View>

              {/* Warning Message */}
              <View style={styles.warningContainer}>
                <Ionicons name="information-circle" size={20} color={COLORS.warning} />
                <Text style={styles.warningText}>
                  {currentEmergency?.triggered_by === 'student' 
                    ? 'นักเรียนได้กดปุ่มฉุกเฉิน กรุณาตรวจสอบสถานการณ์และกดปุ่ม "ตรวจสอบแล้ว" เมื่อได้ตรวจสอบเรียบร้อยแล้ว'
                    : 'กรุณาเลือกการดำเนินการที่เหมาะสม หากเป็นเหตุการณ์ฉุกเฉินจริง ให้กดปุ่ม "ฉุกเฉิน" เพื่อให้นักเรียนลงจากรถทันที'
                  }
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            {waitingForNormalConfirmation ? (
              // แสดงปุ่มยืนยันสถานการณ์กลับมาปกติ หลังจากกดฉุกเฉิน
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmNormalButton]}
                onPress={() => confirmEmergencyResponse('CONFIRMED_NORMAL')}
                disabled={isProcessing}
              >
                <Ionicons name="checkmark-done" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>ยืนยันสถานการณ์กลับมาปกติ</Text>
              </TouchableOpacity>
            ) : currentEmergency?.triggered_by === 'student' ? (
              // กรณีนักเรียนกดปุ่มฉุกเฉิน - แสดงเฉพาะปุ่ม "ตรวจสอบแล้ว"
              <TouchableOpacity
                style={[styles.actionButton, styles.checkedButton]}
                onPress={() => confirmEmergencyResponse('CHECKED')}
                disabled={isProcessing}
              >
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>ตรวจสอบแล้ว</Text>
              </TouchableOpacity>
            ) : (
              // แสดงปุ่มตามประเภทการแจ้งเตือนปกติ (เซ็นเซอร์หรือคนขับกดปุ่มฉุกเฉิน)
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.checkedButton]}
                  onPress={() => confirmEmergencyResponse('CHECKED')}
                  disabled={isProcessing}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>ตรวจสอบแล้ว</Text>
                </TouchableOpacity>

                {/* แสดงปุ่มฉุกเฉินสำหรับกรณีที่ไม่ใช่นักเรียนกดปุ่ม */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.emergencyButton]}
                  onPress={() => confirmEmergencyResponse('EMERGENCY')}
                  disabled={isProcessing}
                >
                  <Ionicons name="warning" size={24} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>ฉุกเฉิน</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  eventTypeContainer: {
    marginBottom: 24,
  },
  eventTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  eventTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventTypeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  notesContainer: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    minHeight: 80,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkedButton: {
    backgroundColor: COLORS.success,
  },
  emergencyButton: {
    backgroundColor: COLORS.danger,
  },
  confirmNormalButton: {
    backgroundColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EmergencyModal;