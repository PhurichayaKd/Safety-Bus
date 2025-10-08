import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmergency } from '../src/contexts/EmergencyContext';

const { width } = Dimensions.get('window');

const EmergencyModal = ({ visible, onClose }) => {
  const { currentEmergency, handleEmergencyResponse, dismissModal } = useEmergency();
  const [isResponding, setIsResponding] = useState(false);

  if (!currentEmergency) return null;

  const handleResponse = async (responseType) => {
    const confirmMessage = responseType === 'CHECKED' 
      ? 'คุณต้องการยืนยันว่าได้ตรวจสอบเหตุการณ์เรียบร้อยแล้วใช่หรือไม่?\n\nระบบจะส่งข้อความแจ้งผู้ปกครองว่าสถานการณ์กลับสู่ปกติ' 
      : 'คุณต้องการแจ้งเหตุฉุกเฉินใช่หรือไม่?\n\nระบบจะส่งข้อความแจ้งผู้ปกครองว่ากำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย';

    Alert.alert(
      'ยืนยันการตอบสนอง',
      confirmMessage,
      [
        {
          text: 'ยกเลิก',
          style: 'cancel',
        },
        {
          text: 'ยืนยัน',
          style: responseType === 'EMERGENCY' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setIsResponding(true);
              await handleEmergencyResponse(currentEmergency.id, responseType);
              
              Alert.alert(
                'สำเร็จ',
                responseType === 'CHECKED' 
                  ? 'ได้ส่งข้อความแจ้งผู้ปกครองว่าสถานการณ์กลับสู่ปกติแล้ว'
                  : 'ได้ส่งข้อความแจ้งเหตุฉุกเฉินไปยังผู้ปกครองแล้ว',
                [{ text: 'ตกลง' }]
              );
              
              if (onClose) onClose();
            } catch (error) {
              Alert.alert(
                'เกิดข้อผิดพลาด',
                'ไม่สามารถส่งการตอบสนองได้ กรุณาลองใหม่อีกครั้ง',
                [{ text: 'ตกลง' }]
              );
            } finally {
              setIsResponding(false);
            }
          },
        },
      ]
    );
  };

  const handleDismiss = () => {
    dismissModal();
    if (onClose) onClose();
  };

  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'DRIVER_PANIC':
        return 'alert-circle';
      case 'SMOKE_DETECTED':
        return 'cloud';
      case 'HIGH_TEMPERATURE':
        return 'thermometer';
      case 'MOVEMENT_DETECTED':
        return 'walk';
      case 'STUDENT_SWITCH':
        return 'person';
      default:
        return 'warning';
    }
  };

  const getEventColor = (eventType) => {
    switch (eventType) {
      case 'DRIVER_PANIC':
        return '#FF3B30';
      case 'SMOKE_DETECTED':
        return '#FF9500';
      case 'HIGH_TEMPERATURE':
        return '#FF3B30';
      case 'MOVEMENT_DETECTED':
        return '#007AFF';
      case 'STUDENT_SWITCH':
        return '#34C759';
      default:
        return '#FF9500';
    }
  };

  const getEventTitle = (eventType) => {
    switch (eventType) {
      case 'DRIVER_PANIC':
        return 'คนขับกดปุ่มฉุกเฉิน';
      case 'SMOKE_DETECTED':
        return 'ตรวจพบควัน';
      case 'HIGH_TEMPERATURE':
        return 'อุณหภูมิสูงผิดปกติ';
      case 'MOVEMENT_DETECTED':
        return 'ตรวจพบการเคลื่อนไหว';
      case 'STUDENT_SWITCH':
        return 'นักเรียนกดสวิตช์';
      default:
        return 'เหตุการณ์ฉุกเฉิน';
    }
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const eventColor = getEventColor(currentEmergency.event_type);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: eventColor }]}>
            <View style={styles.headerContent}>
              <Ionicons 
                name={getEventIcon(currentEmergency.event_type)} 
                size={32} 
                color="white" 
              />
              <Text style={styles.headerTitle}>เหตุการณ์ฉุกเฉิน</Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={handleDismiss}
              disabled={isResponding}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.eventTitle}>
              {getEventTitle(currentEmergency.event_type)}
            </Text>
            
            <Text style={styles.timestamp}>
                {formatDateTime(currentEmergency.event_time)}
              </Text>

            {currentEmergency.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>รายละเอียด:</Text>
                <Text style={styles.description}>{currentEmergency.description}</Text>
              </View>
            )}

            {currentEmergency.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={16} color="#666" />
                <Text style={styles.location}>{currentEmergency.location}</Text>
              </View>
            )}

            {currentEmergency.notes && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>หมายเหตุ:</Text>
                <Text style={styles.notes}>{currentEmergency.notes}</Text>
              </View>
            )}

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>คำแนะนำ:</Text>
              <Text style={styles.instructions}>
                กรุณาเลือกการตอบสนองที่เหมาะสม ระบบจะส่งข้อความแจ้งผู้ปกครองโดยอัตโนมัติ
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.checkedButton]}
              onPress={() => handleResponse('CHECKED')}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                  <Text style={styles.actionButtonText}>ตรวจสอบเรียบร้อย</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.emergencyButton]}
              onPress={() => handleResponse('EMERGENCY')}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="warning" size={20} color="white" />
                  <Text style={styles.actionButtonText}>ฉุกเฉิน</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 400,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  notesContainer: {
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  instructionsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instructions: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  checkedButton: {
    backgroundColor: '#34C759',
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EmergencyModal;