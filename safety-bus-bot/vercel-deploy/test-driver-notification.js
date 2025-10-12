import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDriverNotification() {
  console.log('🧪 Testing Driver Status Notification...\n');

  // ตรวจสอบการตั้งค่า environment variables
  console.log('📋 Environment Variables Check:');
  console.log('- LINE_CHANNEL_ACCESS_TOKEN:', process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ Set' : '❌ Not set');
  console.log('- LINE_CHANNEL_SECRET:', process.env.LINE_CHANNEL_SECRET ? '✅ Set' : '❌ Not set');
  
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set');
  console.log('');

  // ข้อมูลทดสอบ
  const testData = {
    driver_id: 'test-driver-001',
    trip_phase: 'morning',
    current_status: 'start_journey',
    location: 'จุดเริ่มต้นเส้นทาง',
    notes: 'ทดสอบการส่งแจ้งเตือนจากระบบ'
  };

  console.log('📤 Test Data:');
  console.log(JSON.stringify(testData, null, 2));
  console.log('');

  try {
    // เรียก API endpoint
    const response = await fetch('http://localhost:3000/api/driver-status-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('📡 API Response Status:', response.status);
    
    const responseData = await response.json();
    console.log('📋 API Response Data:');
    console.log(JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log('\n✅ Driver notification test completed successfully!');
      
      // แสดงผลการส่งแจ้งเตือน
      if (responseData.notification_results) {
        console.log('\n📊 Notification Results:');
        responseData.notification_results.forEach((result, index) => {
          console.log(`${index + 1}. ${result.type}: ${result.status}`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        });
      }
    } else {
      console.log('\n❌ Driver notification test failed!');
      console.log('Error:', responseData.error || 'Unknown error');
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestion: Make sure the server is running on http://localhost:3000');
      console.log('   Run: node server-with-webhook.js');
    }
  }
}

// รันการทดสอบ
testDriverNotification().catch(console.error);