// services/LineNotificationService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class LineNotificationService {
  constructor() {
    this.baseUrl = 'http://localhost:3000'; // URL ของ safety-bus-bot
    this.isEnabled = true;
  }

  /**
   * ส่งการแจ้งเตือนเหตุฉุกเฉินไปยัง LINE
   * @param {Object} emergency - ข้อมูลเหตุฉุกเฉิน
   * @param {string} driverInfo - ข้อมูลคนขับ
   */
  async sendEmergencyNotification(emergency, driverInfo = null) {
    if (!this.isEnabled) {
      console.log('LINE notifications are disabled');
      return { success: false, message: 'Notifications disabled' };
    }

    try {
      // ดึงข้อมูลคนขับจาก AsyncStorage หากไม่ได้ส่งมา
      if (!driverInfo) {
        const storedDriverInfo = await AsyncStorage.getItem('driver_info');
        driverInfo = storedDriverInfo ? JSON.parse(storedDriverInfo) : null;
      }

      // สร้างข้อความแจ้งเตือน
      const message = this.formatEmergencyMessage(emergency, driverInfo);

      // ส่งไปยัง LINE Bot API
      const response = await fetch(`${this.baseUrl}/api/send-emergency-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emergency,
          driverInfo,
          message,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        console.log('Emergency notification sent successfully:', result);
        return { success: true, data: result };
      } else {
        console.error('Failed to send emergency notification:', result);
        return { success: false, error: result.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('Error sending emergency notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ส่งการอัปเดตสถานะการตอบสนองเหตุฉุกเฉิน
   * @param {Object} emergency - ข้อมูลเหตุฉุกเฉิน
   * @param {string} response - การตอบสนอง (CHECKED, EMERGENCY)
   * @param {string} driverInfo - ข้อมูลคนขับ
   */
  async sendResponseNotification(emergency, response, driverInfo = null) {
    if (!this.isEnabled) {
      console.log('LINE notifications are disabled');
      return { success: false, message: 'Notifications disabled' };
    }

    try {
      // ดึงข้อมูลคนขับจาก AsyncStorage หากไม่ได้ส่งมา
      if (!driverInfo) {
        const storedDriverInfo = await AsyncStorage.getItem('driver_info');
        driverInfo = storedDriverInfo ? JSON.parse(storedDriverInfo) : null;
      }

      // สร้างข้อความแจ้งการตอบสนอง
      const message = this.formatResponseMessage(emergency, response, driverInfo);

      // ส่งไปยัง LINE Bot API
      const apiResponse = await fetch(`${this.baseUrl}/api/send-response-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emergency,
          response,
          driverInfo,
          message,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await apiResponse.json();

      if (apiResponse.ok) {
        console.log('Response notification sent successfully:', result);
        return { success: true, data: result };
      } else {
        console.error('Failed to send response notification:', result);
        return { success: false, error: result.error || 'Unknown error' };
      }
    } catch (error) {
      console.error('Error sending response notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * จัดรูปแบบข้อความแจ้งเตือนเหตุฉุกเฉิน
   * @param {Object} emergency - ข้อมูลเหตุฉุกเฉิน
   * @param {Object} driverInfo - ข้อมูลคนขับ
   * @returns {string} ข้อความที่จัดรูปแบบแล้ว
   */
  formatEmergencyMessage(emergency, driverInfo) {
    const emergencyTypes = {
      DRIVER_PANIC: '🚨 คนขับกดปุ่มฉุกเฉิน',
      SMOKE_DETECTED: '🔥 ตรวจพบควัน',
      FIRE_DETECTED: '🔥 ตรวจพบไฟไหม้',
      ACCIDENT: '💥 เกิดอุบัติเหตุ',
      MEDICAL_EMERGENCY: '🏥 เหตุฉุกเฉินทางการแพทย์',
      BREAKDOWN: '🔧 รถเสีย',
      SECURITY_THREAT: '⚠️ ภัยคุกคามความปลอดภัย',
    };

    const typeLabel = emergencyTypes[emergency.type] || '⚠️ เหตุฉุกเฉิน';
    const driverName = driverInfo?.name || 'ไม่ระบุ';
    const busNumber = driverInfo?.license_plate || emergency.bus_id || 'ไม่ระบุ';
    
    const time = new Date(emergency.created_at).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let message = `🚨 แจ้งเตือนเหตุฉุกเฉิน 🚨\n\n`;
    message += `${typeLabel}\n\n`;
    message += `📍 รายละเอียด:\n`;
    message += `• คนขับ: ${driverName}\n`;
    message += `• รถบัส: ${busNumber}\n`;
    message += `• เวลา: ${time}\n`;
    
    if (emergency.details) {
      message += `• รายละเอียด: ${emergency.details}\n`;
    }
    
    if (emergency.location) {
      message += `• สถานที่: ${emergency.location}\n`;
    }

    message += `\n⚠️ กรุณาตรวจสอบและดำเนินการทันที`;

    return message;
  }

  /**
   * จัดรูปแบบข้อความแจ้งการตอบสนอง
   * @param {Object} emergency - ข้อมูลเหตุฉุกเฉิน
   * @param {string} response - การตอบสนอง
   * @param {Object} driverInfo - ข้อมูลคนขับ
   * @returns {string} ข้อความที่จัดรูปแบบแล้ว
   */
  formatResponseMessage(emergency, response, driverInfo) {
    const responseTypes = {
      CHECKED: '✅ ตรวจสอบแล้ว - ปกติ',
      EMERGENCY: '🚨 ยืนยันเหตุฉุกเฉิน - ต้องการความช่วยเหลือ',
    };

    const responseLabel = responseTypes[response] || response;
    const driverName = driverInfo?.name || 'ไม่ระบุ';
    const busNumber = driverInfo?.license_plate || emergency.bus_id || 'ไม่ระบุ';
    
    const time = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    let message = `📢 อัปเดตการตอบสนองเหตุฉุกเฉิน\n\n`;
    message += `${responseLabel}\n\n`;
    message += `📍 รายละเอียด:\n`;
    message += `• คนขับ: ${driverName}\n`;
    message += `• รถบัส: ${busNumber}\n`;
    message += `• เวลาตอบสนอง: ${time}\n`;

    if (response === 'EMERGENCY') {
      message += `\n🚨 ต้องการความช่วยเหลือด่วน!`;
    } else {
      message += `\n✅ สถานการณ์ปกติ`;
    }

    return message;
  }

  /**
   * ทดสอบการเชื่อมต่อกับ LINE Bot
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/test-line-connection`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log('LINE connection test successful:', result);
        return { success: true, data: result };
      } else {
        console.error('LINE connection test failed:', result);
        return { success: false, error: result.error || 'Connection test failed' };
      }
    } catch (error) {
      console.error('Error testing LINE connection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * เปิด/ปิดการส่งการแจ้งเตือน
   * @param {boolean} enabled - เปิดหรือปิด
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`LINE notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * ตั้งค่า URL ของ LINE Bot
   * @param {string} url - URL ใหม่
   */
  setBaseUrl(url) {
    this.baseUrl = url;
    console.log(`LINE Bot URL set to: ${url}`);
  }
}

// Export singleton instance
export default new LineNotificationService();