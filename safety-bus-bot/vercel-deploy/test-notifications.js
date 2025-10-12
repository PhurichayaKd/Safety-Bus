import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// ข้อมูลทดสอบ
const testScenarios = [
  {
    name: 'นักเรียนขึ้นรถ (รับ)',
    data: {
      student_id: 100017,
      status: 'onboard',
      driver_id: 1,
      location: 'หน้าบ้านนักเรียน',
      phase: 'pickup'
    }
  },
  {
    name: 'นักเรียนลงรถ (ส่งถึงโรงเรียน)',
    data: {
      student_id: 100017,
      status: 'offboard',
      driver_id: 1,
      location: 'โรงเรียน',
      phase: 'pickup'
    }
  },
  {
    name: 'นักเรียนขึ้นรถ (กลับ)',
    data: {
      student_id: 100017,
      status: 'onboard',
      driver_id: 1,
      location: 'โรงเรียน',
      phase: 'dropoff'
    }
  },
  {
    name: 'นักเรียนลงรถ (ส่งถึงบ้าน)',
    data: {
      student_id: 100017,
      status: 'offboard',
      driver_id: 1,
      location: 'หน้าบ้านนักเรียน',
      phase: 'dropoff'
    }
  },
  {
    name: 'นักเรียนแจ้งลา',
    data: {
      student_id: 100017,
      status: 'absent',
      driver_id: 1,
      location: 'หน้าบ้านนักเรียน',
      phase: 'pickup',
      notes: 'นักเรียนป่วย ไม่สามารถไปโรงเรียนได้'
    }
  },
  {
    name: 'รถหยุดรอนักเรียน',
    data: {
      student_id: 100017,
      status: 'stop',
      driver_id: 1,
      location: 'หน้าบ้านนักเรียน',
      phase: 'pickup'
    }
  }
];

async function testNotification(scenario) {
  console.log(`\n🧪 ทดสอบ: ${scenario.name}`);
  console.log('📋 ข้อมูลที่ส่ง:', JSON.stringify(scenario.data, null, 2));
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/student-status-notification`,
      scenario.data,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ สถานะ:', response.status);
    console.log('📤 ผลลัพธ์:', JSON.stringify(response.data, null, 2));
    
    // รอ 2 วินาทีก่อนทดสอบครั้งต่อไป
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.response?.data || error.message);
  }
}

async function runAllTests() {
  console.log('🚀 เริ่มทดสอบการส่งแจ้งเตือน LINE');
  console.log('=' .repeat(50));
  
  for (const scenario of testScenarios) {
    await testNotification(scenario);
  }
  
  console.log('\n🏁 ทดสอบเสร็จสิ้น');
  console.log('=' .repeat(50));
}

// เรียกใช้การทดสอบ
runAllTests().catch(console.error);