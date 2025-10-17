// สคริปต์ทดสอบการส่งข้อความฉุกเฉินไปยัง LINE
// ใช้ built-in fetch ของ Node.js (v18+)

// ข้อมูลทดสอบ
const testData = {
  responseType: 'EMERGENCY',
  emergencyLogId: 'test_emergency_001',
  driverId: 'driver_001',
  busId: 'bus_001',
  originalEventType: 'DRIVER_PANIC',
  notes: 'ทดสอบการส่งข้อความฉุกเฉิน',
  timestamp: new Date().toISOString()
};

// URL ของ API endpoint
const API_URL = 'http://localhost:3000/api/emergency-notification';

async function testEmergencyNotification() {
  console.log('🧪 เริ่มทดสอบการส่งข้อความฉุกเฉิน...');
  console.log('📤 ข้อมูลที่ส่ง:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    
    console.log('\n📥 ผลลัพธ์จาก API:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (response.ok && result.success) {
      console.log('\n✅ การทดสอบสำเร็จ!');
      if (result.shouldSendToLine) {
        console.log('📱 ข้อความถูกส่งไปยัง LINE แล้ว');
        console.log('👥 จำนวนผู้รับ:', result.notificationResults?.length || 0);
      } else {
        console.log('⚠️ ข้อความไม่ได้ถูกส่งไปยัง LINE');
      }
    } else {
      console.log('\n❌ การทดสอบล้มเหลว!');
      console.log('Error:', result.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('\n💥 เกิดข้อผิดพลาดในการเชื่อมต่อ:', error.message);
    console.log('\n🔍 ตรวจสอบ:');
    console.log('1. safety-bus-bot server ทำงานที่ http://localhost:3000 หรือไม่');
    console.log('2. การตั้งค่า environment variables ถูกต้องหรือไม่');
  }
}

// รันการทดสอบ
testEmergencyNotification();