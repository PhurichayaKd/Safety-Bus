// Test script สำหรับทดสอบระบบแจ้งเตือนสถานะคนขับ
// ใช้ fetch ที่มีใน Node.js เวอร์ชันใหม่

const API_BASE_URL = 'http://localhost:3000/api';

// ข้อมูลทดสอบ
const testData = {
  driver_id: 1, // ใช้ driver_id ที่มีอยู่ในระบบ
  test_cases: [
    {
      name: 'เริ่มออกเดินทาง',
      trip_phase: 'go',
      current_status: 'start_journey',
      location: 'จุดเริ่มต้นเส้นทาง',
      notes: 'เริ่มเส้นทางรับนักเรียน'
    },
    {
      name: 'ถึงโรงเรียน',
      trip_phase: 'go',
      current_status: 'arrived_school',
      location: 'โรงเรียน',
      notes: 'มาถึงโรงเรียนแล้ว'
    },
    {
      name: 'รอรับกลับบ้าน',
      trip_phase: 'return',
      current_status: 'waiting_return',
      location: 'โรงเรียน',
      notes: 'รอรับนักเรียนกลับบ้าน'
    },
    {
      name: 'จบการเดินทาง',
      trip_phase: 'return',
      current_status: 'finished',
      location: 'จุดสิ้นสุดเส้นทาง',
      notes: 'เสร็จสิ้นการเดินทาง'
    }
  ]
};

async function testDriverNotification(testCase) {
  try {
    console.log(`\n🧪 ทดสอบ: ${testCase.name}`);
    console.log('📤 ส่งข้อมูล:', {
      driver_id: testData.driver_id,
      trip_phase: testCase.trip_phase,
      current_status: testCase.current_status,
      location: testCase.location,
      notes: testCase.notes
    });

    const response = await fetch(`${API_BASE_URL}/driver-status-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driver_id: testData.driver_id,
        trip_phase: testCase.trip_phase,
        current_status: testCase.current_status,
        location: testCase.location,
        notes: testCase.notes
      }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📡 Raw response:', responseText.substring(0, 200) + '...');
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.log('📄 Full response:', responseText);
      return { success: false, error: 'Invalid JSON response' };
    }

    if (response.ok && result.success) {
      console.log('✅ สำเร็จ!');
      console.log('📊 สรุปผลลัพธ์:', result.summary);
      console.log('👥 ส่งไปยัง:', {
        นักเรียน: result.summary.students_notified,
        ผู้ปกครอง: result.summary.parents_notified,
        รวม: result.summary.total_sent,
        ล้มเหลว: result.summary.total_failed
      });
    } else {
      console.log('❌ ล้มเหลว:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 เริ่มทดสอบระบบแจ้งเตือนสถานะคนขับ');
  console.log('=' .repeat(50));

  for (const testCase of testData.test_cases) {
    await testDriverNotification(testCase);
    
    // รอ 2 วินาทีระหว่างการทดสอบ
    console.log('⏳ รอ 2 วินาที...');
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n🏁 เสร็จสิ้นการทดสอบทั้งหมด');
}

// เรียกใช้การทดสอบ
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testDriverNotification, runAllTests };