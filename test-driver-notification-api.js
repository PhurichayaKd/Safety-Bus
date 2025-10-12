// ใช้ built-in fetch ของ Node.js (v18+)
console.log('🧪 Testing Driver Status Notification API...\n');

async function testDriverNotificationAPI() {
  const API_URL = 'http://localhost:3000/api/driver-status-notification';
  
  // ข้อมูลทดสอบ
  const testData = {
    driver_id: 1, // ใช้ driver_id ที่มีอยู่ในระบบ
    trip_phase: 'go',
    current_status: 'enroute',
    location: 'ทดสอบตำแหน่ง',
    notes: 'ทดสอบการส่งแจ้งเตือนจากสคริปต์'
  };

  try {
    console.log('📤 Sending test request to:', API_URL);
    console.log('📋 Test data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ API Response Success:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.summary) {
        console.log('\n📈 Notification Summary:');
        console.log(`   - Total sent: ${result.summary.total_sent}`);
        console.log(`   - Total failed: ${result.summary.total_failed}`);
        console.log(`   - Students notified: ${result.summary.students_notified}`);
        console.log(`   - Parents notified: ${result.summary.parents_notified}`);
      }
      
      return true;
    } else {
      console.log('\n❌ API Response Error:');
      console.log(JSON.stringify(result, null, 2));
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 Request Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused - API server may not be running');
      console.log('   Please check if the server is running on http://localhost:3000');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Host not found - Check the API URL');
    }
    
    return false;
  }
}

async function testAPIHealth() {
  const HEALTH_URL = 'http://localhost:3000';
  
  try {
    console.log('🏥 Testing API server health...');
    const response = await fetch(HEALTH_URL);
    
    if (response.ok) {
      console.log('✅ API server is running');
      return true;
    } else {
      console.log(`⚠️ API server responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ API server is not accessible:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Driver Notification API Test...\n');
  
  // ทดสอบ health ของ API server ก่อน
  const serverHealthy = await testAPIHealth();
  
  if (!serverHealthy) {
    console.log('\n❌ Cannot proceed with notification test - API server is not running');
    console.log('\n💡 To fix this:');
    console.log('   1. Make sure the API server is running');
    console.log('   2. Check if it\'s running on port 3000');
    console.log('   3. Verify the server-with-webhook.js is working');
    return;
  }
  
  console.log('\n' + '='.repeat(50));
  
  // ทดสอบ driver notification API
  const notificationSuccess = await testDriverNotificationAPI();
  
  console.log('\n' + '='.repeat(50));
  
  if (notificationSuccess) {
    console.log('🎉 Driver notification API test completed successfully!');
    console.log('\n💡 If notifications were sent successfully but users didn\'t receive them:');
    console.log('   - Check LINE channel access token');
    console.log('   - Verify user LINE IDs in database');
    console.log('   - Check LINE Bot webhook settings');
  } else {
    console.log('❌ Driver notification API test failed');
    console.log('\n💡 Possible issues:');
    console.log('   - API server not running properly');
    console.log('   - Database connection issues');
    console.log('   - LINE Bot configuration problems');
    console.log('   - Missing environment variables');
  }
}

main().catch(console.error);