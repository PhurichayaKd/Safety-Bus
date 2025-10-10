import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEmergency } from '../src/contexts/EmergencyContext';
import LineNotificationService from '../services/LineNotificationService';

const EmergencyTestPanel = () => {
  const { createEmergency, testConnection } = useEmergency();
  const [isCreating, setIsCreating] = useState(false);
  const [isTestingLine, setIsTestingLine] = useState(false);

  const emergencyTypes = [
    {
      type: 'DRIVER_PANIC',
      title: 'คนขับกดปุ่มฉุกเฉิน',
      icon: 'alert-circle',
      color: '#FF3B30',
      triggered_by: 'driver',
      description: 'คนขับกดปุ่มฉุกเฉินบนรถ',
    },
    {
      type: 'SMOKE_DETECTED',
      title: 'ตรวจพบควัน',
      icon: 'cloud',
      color: '#FF9500',
      triggered_by: 'sensor',
      description: 'เซ็นเซอร์ตรวจพบควันในรถ',
    },
    {
      type: 'HIGH_TEMPERATURE',
      title: 'อุณหภูมิสูงผิดปกติ',
      icon: 'thermometer',
      color: '#FF3B30',
      triggered_by: 'sensor',
      description: 'ตรวจพบอุณหภูมิสูงผิดปกติในรถ',
    },
    {
      type: 'MOVEMENT_DETECTED',
      title: 'ตรวจพบการเคลื่อนไหว',
      icon: 'walk',
      color: '#007AFF',
      triggered_by: 'sensor',
      description: 'ตรวจพบการเคลื่อนไหวในรถหลังจากจอดนาน',
    },
    {
      type: 'STUDENT_SWITCH',
      title: 'นักเรียนกดสวิตช์',
      icon: 'person',
      color: '#34C759',
      triggered_by: 'student',
      description: 'นักเรียนกดสวิตช์บนรถ (ไม่ส่ง LINE)',
    },
  ];

  const handleCreateEmergency = async (emergencyType) => {
    try {
      setIsCreating(true);
      
      const eventData = {
        event_type: emergencyType.type,
        triggered_by: emergencyType.triggered_by,
        description: emergencyType.description,
        location: 'ทดสอบ - หน้าโรงเรียน',
        notes: 'สร้างจากการทดสอบระบบ',
        bus_id: 'BUS-001', // เพิ่ม bus_id สำหรับการทดสอบ
      };

      await createEmergency(eventData);
      
      Alert.alert(
        'สำเร็จ',
        `สร้างเหตุการณ์ ${emergencyType.title} เรียบร้อยแล้ว`,
        [{ text: 'ตกลง' }]
      );
    } catch (error) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        `ไม่สามารถสร้างเหตุการณ์ได้: ${error.message}`,
        [{ text: 'ตกลง' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection();
      Alert.alert(
        'ผลการทดสอบการเชื่อมต่อ',
        result.success 
          ? '✅ เชื่อมต่อฐานข้อมูลสำเร็จ' 
          : `❌ เชื่อมต่อล้มเหลว: ${result.error}`,
        [{ text: 'ตกลง' }]
      );
    } catch (error) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        `ไม่สามารถทดสอบการเชื่อมต่อได้: ${error.message}`,
        [{ text: 'ตกลง' }]
      );
    }
  };

  const handleTestLineNotification = async () => {
    try {
      setIsTestingLine(true);
      
      // ทดสอบการเชื่อมต่อ LINE Bot
      const connectionResult = await LineNotificationService.testConnection();
      
      if (!connectionResult.success) {
        Alert.alert(
          'การเชื่อมต่อ LINE ล้มเหลว',
          `❌ ${connectionResult.error}`,
          [{ text: 'ตกลง' }]
        );
        return;
      }

      // ทดสอบส่งการแจ้งเตือนตัวอย่าง
      const testEmergency = {
        id: 'TEST-001',
        type: 'DRIVER_PANIC',
        details: 'ทดสอบการส่งการแจ้งเตือนไปยัง LINE',
        location: 'ทดสอบ - หน้าโรงเรียน',
        created_at: new Date().toISOString(),
        bus_id: 'BUS-001'
      };

      const testDriverInfo = {
        name: 'คนขับทดสอบ',
        license_plate: 'BUS-001'
      };

      const notificationResult = await LineNotificationService.sendEmergencyNotification(
        testEmergency, 
        testDriverInfo
      );

      if (notificationResult.success) {
        Alert.alert(
          'ทดสอบ LINE สำเร็จ',
          '✅ ส่งการแจ้งเตือนไปยัง LINE เรียบร้อยแล้ว',
          [{ text: 'ตกลง' }]
        );
      } else {
        Alert.alert(
          'ทดสอบ LINE ล้มเหลว',
          `❌ ${notificationResult.error}`,
          [{ text: 'ตกลง' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'เกิดข้อผิดพลาด',
        `ไม่สามารถทดสอบ LINE ได้: ${error.message}`,
        [{ text: 'ตกลง' }]
      );
    } finally {
      setIsTestingLine(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flask" size={24} color="#007AFF" />
        <Text style={styles.headerTitle}>ทดสอบระบบแจ้งเตือน</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>สร้างเหตุการณ์ทดสอบ</Text>
        <Text style={styles.sectionSubtitle}>
          กดปุ่มด้านล่างเพื่อจำลองเหตุการณ์ฉุกเฉินต่างๆ
        </Text>

        {emergencyTypes.map((emergency, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.emergencyButton, { borderLeftColor: emergency.color }]}
            onPress={() => handleCreateEmergency(emergency)}
            disabled={isCreating}
          >
            <View style={styles.emergencyButtonContent}>
              <Ionicons 
                name={emergency.icon} 
                size={24} 
                color={emergency.color} 
              />
              <View style={styles.emergencyButtonText}>
                <Text style={styles.emergencyButtonTitle}>
                  {emergency.title}
                </Text>
                <Text style={styles.emergencyButtonDescription}>
                  {emergency.description}
                </Text>
                {emergency.triggered_by === 'student' && (
                  <Text style={styles.noLineNote}>
                    * ไม่ส่งแจ้งเตือน LINE
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.testConnectionButton}
          onPress={handleTestConnection}
        >
          <Ionicons name="wifi" size={20} color="white" />
          <Text style={styles.testConnectionButtonText}>
            ทดสอบการเชื่อมต่อฐานข้อมูล
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.testConnectionButton, styles.testLineButton]}
          onPress={handleTestLineNotification}
          disabled={isTestingLine}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="white" />
          <Text style={styles.testConnectionButtonText}>
            {isTestingLine ? 'กำลังทดสอบ LINE...' : 'ทดสอบการแจ้งเตือน LINE'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            เมื่อสร้างเหตุการณ์ทดสอบ ระบบจะแสดงหน้าต่างแจ้งเตือนและส่งข้อความไปยัง LINE (ยกเว้นกรณีนักเรียนกดสวิตช์)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  content: {
    padding: 16,
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  emergencyButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderLeftWidth: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  emergencyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  emergencyButtonText: {
    flex: 1,
    marginLeft: 12,
  },
  emergencyButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emergencyButtonDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  noLineNote: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  testConnectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  testLineButton: {
    backgroundColor: '#00C851', // สีเขียวสำหรับ LINE
  },
  testConnectionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976d2',
    lineHeight: 18,
    marginLeft: 8,
  },
});

export default EmergencyTestPanel;