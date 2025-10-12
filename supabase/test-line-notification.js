// สคริปต์ทดสอบการส่งแจ้งเตือน LINE
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function testLineNotification() {
  console.log('🧪 Testing LINE notification API...');
  
  const apiUrl = 'http://localhost:3000/api/student-status-notification';
  
  // ข้อมูลทดสอบ (ใช้ข้อมูลนักเรียนจริงจากฐานข้อมูล)
  const testData = {
    student_id: 100014,
    status: 'onboard',
    driver_id: 1,
    location: 'หน้าโรงเรียน',
    notes: 'ทดสอบการส่งแจ้งเตือน',
    phase: 'pickup'
  };
  
  try {
    console.log('📤 Sending test notification with data:', testData);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    const responseText = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📋 Raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('📋 Parsed response data:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.log('❌ Failed to parse JSON response:', parseError.message);
      return;
    }
    
    if (response.ok) {
      console.log('✅ LINE notification test successful!');
      console.log(`📤 Total sent: ${result.summary?.total_sent || 0}`);
      console.log(`❌ Total failed: ${result.summary?.total_failed || 0}`);
      console.log(`👨‍🎓 Student notified: ${result.summary?.student_notified || false}`);
      console.log(`👨‍👩‍👧‍👦 Parents notified: ${result.summary?.parents_notified || 0}`);
    } else {
      console.log('❌ LINE notification test failed!');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('🚨 Error testing LINE notification:', error);
  }
}

// รันการทดสอบ
testLineNotification();