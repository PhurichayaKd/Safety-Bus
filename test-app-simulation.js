// ใช้ built-in fetch ของ Node.js (v18+)
console.log('🧪 Testing App Simulation - Driver Status Update...\n');

async function simulateAppStatusUpdate() {
  const API_URL = 'http://localhost:3000/api/driver-status-notification';
  
  // จำลองข้อมูลที่แอปส่งหลังจากแก้ไขแล้ว
  const appData = {
    driver_id: 1,
    trip_phase: 'go', // ใช้ 'go' หรือ 'return' ตาม AsyncStorage
    current_status: 'enroute', // สถานะปัจจุบันของรถบัส
    location: 'อัปเดตจากแอปคนขับ',
    notes: `คนขับอัปเดตสถานะเป็น เริ่มออกเดินทาง เวลา ${new Date().toLocaleString('th-TH')}`,
    timestamp: new Date().toISOString()
  };

  try {
    console.log('📱 Simulating app status update...');
    console.log('📤 Sending data to:', API_URL);
    console.log('📋 App data:', JSON.stringify(appData, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appData)
    });

    console.log('\n📊 Response Status:', response.status);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ App Simulation Success!');
      console.log('📨 API Response:', JSON.stringify(result, null, 2));
      
      if (result.summary) {
        console.log('\n📈 Notification Summary:');
        console.log(`   - Total sent: ${result.summary.total_sent}`);
        console.log(`   - Total failed: ${result.summary.total_failed}`);
        console.log(`   - Students notified: ${result.summary.students_notified}`);
        console.log(`   - Parents notified: ${result.summary.parents_notified}`);
        
        if (result.summary.total_sent > 0) {
          console.log('\n🎉 LINE notifications sent successfully!');
          console.log('   Users should receive notifications now.');
        } else {
          console.log('\n⚠️ No notifications were sent.');
          console.log('   Check if there are users linked to this driver.');
        }
      }
      
      return true;
    } else {
      console.log('\n❌ App Simulation Failed:');
      console.log('📨 Error Response:', JSON.stringify(result, null, 2));
      return false;
    }
    
  } catch (error) {
    console.error('\n💥 Request Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Connection refused - API server may not be running');
      console.log('   Please check if the server is running on http://localhost:3000');
    }
    
    return false;
  }
}

async function testMultipleStatuses() {
  console.log('🔄 Testing multiple status updates...\n');
  
  const statuses = [
    { status: 'enroute', label: 'เริ่มออกเดินทาง', trip_phase: 'go' },
    { status: 'arrived_school', label: 'ถึงโรงเรียน', trip_phase: 'go' },
    { status: 'waiting_return', label: 'รอรับกลับบ้าน', trip_phase: 'return' },
    { status: 'finished', label: 'จบการเดินทาง', trip_phase: 'return' }
  ];
  
  for (const statusInfo of statuses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚌 Testing status: ${statusInfo.label} (${statusInfo.status})`);
    console.log(`${'='.repeat(60)}`);
    
    const testData = {
      driver_id: 1,
      trip_phase: statusInfo.trip_phase,
      current_status: statusInfo.status,
      location: 'อัปเดตจากแอปคนขับ',
      notes: `คนขับอัปเดตสถานะเป็น ${statusInfo.label} เวลา ${new Date().toLocaleString('th-TH')}`,
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await fetch('http://localhost:3000/api/driver-status-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      
      if (response.ok && result.summary) {
        console.log(`✅ ${statusInfo.label}: ${result.summary.total_sent} notifications sent`);
      } else {
        console.log(`❌ ${statusInfo.label}: Failed to send notifications`);
      }
    } catch (error) {
      console.log(`💥 ${statusInfo.label}: Error - ${error.message}`);
    }
    
    // รอ 2 วินาทีก่อนทดสอบสถานะถัดไป
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

async function main() {
  console.log('🚀 Starting App Simulation Test...\n');
  
  // ทดสอบการส่งสถานะเดียว
  const singleTestSuccess = await simulateAppStatusUpdate();
  
  if (singleTestSuccess) {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 Single status test passed! Now testing multiple statuses...');
    console.log('='.repeat(80));
    
    // ทดสอบการส่งหลายสถานะ
    await testMultipleStatuses();
    
    console.log('\n' + '='.repeat(80));
    console.log('🎉 All tests completed!');
    console.log('\n💡 If users still don\'t receive notifications:');
    console.log('   1. Check LINE Bot channel access token');
    console.log('   2. Verify user LINE IDs in database');
    console.log('   3. Check if users are linked to driver_id 1');
    console.log('   4. Verify LINE Bot webhook configuration');
    console.log('='.repeat(80));
  } else {
    console.log('\n❌ Single status test failed. Please check the API server.');
  }
}

main().catch(console.error);