import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkDrivers() {
  console.log('🔍 Checking drivers in database...\n');

  try {
    // ดึงข้อมูลคนขับทั้งหมด
    const { data: drivers, error } = await supabase
      .from('driver_bus')
      .select('*')
      .limit(10);

    if (error) {
      console.error('❌ Error fetching drivers:', error);
      return;
    }

    console.log(`📊 Found ${drivers.length} drivers in database:`);
    
    if (drivers.length === 0) {
      console.log('⚠️  No drivers found in database');
      console.log('\n💡 Suggestions:');
      console.log('1. Add test driver data to the database');
      console.log('2. Check if the drivers table exists');
      console.log('3. Verify database connection');
    } else {
      console.log('\n📋 Driver List:');
      drivers.forEach((driver, index) => {
        console.log(`${index + 1}. ID: ${driver.id || driver.driver_id}`);
        console.log(`   Name: ${driver.name || driver.driver_name || 'N/A'}`);
        console.log(`   Status: ${driver.status || 'N/A'}`);
        console.log(`   Created: ${driver.created_at || 'N/A'}`);
        console.log('');
      });

      // ใช้ driver แรกสำหรับทดสอบ
      const firstDriver = drivers[0];
      const driverId = firstDriver.id || firstDriver.driver_id;
      
      console.log(`🧪 Testing with driver ID: ${driverId}`);
      
      // ทดสอบส่งแจ้งเตือน
      await testNotificationWithDriver(driverId);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function testNotificationWithDriver(driverId) {
  console.log(`\n📤 Testing notification with driver ID: ${driverId}`);
  
  const testData = {
    driver_id: driverId,
    trip_phase: 'morning',
    current_status: 'start_journey',
    location: 'จุดเริ่มต้นเส้นทาง',
    notes: 'ทดสอบการส่งแจ้งเตือนจากระบบ'
  };

  try {
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
      console.log('\n✅ Notification test successful!');
      
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
      console.log('\n❌ Notification test failed!');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// รันการตรวจสอบ
checkDrivers().catch(console.error);