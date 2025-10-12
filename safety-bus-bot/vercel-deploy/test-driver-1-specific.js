import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testDriver1() {
  console.log('🧪 Testing Driver ID = 1 Specific...\n');

  try {
    // ตรวจสอบข้อมูลคนขับ ID = 1
    console.log('📋 Checking Driver ID = 1 data...');
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('*')
      .eq('driver_id', 1)
      .single();

    if (driverError) {
      console.error('❌ Error fetching driver data:', driverError);
      return;
    }

    if (!driverData) {
      console.log('❌ Driver ID = 1 not found');
      return;
    }

    console.log('✅ Driver ID = 1 found:');
    console.log(`   Name: ${driverData.driver_name}`);
    console.log(`   Phone: ${driverData.phone_number}`);
    console.log(`   License Plate: ${driverData.license_plate}`);
    console.log(`   Current Status: ${driverData.current_status}`);
    console.log(`   Trip Phase: ${driverData.trip_phase}`);
    console.log('');

    // ตรวจสอบ LINE users ที่เชื่อมโยงแล้ว
    console.log('📱 Checking linked LINE users...');
    
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('line_user_id, student_name')
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('line_user_id, parent_name, student_name')
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    console.log(`📊 Student LINE links: ${studentLinks?.length || 0}`);
    if (studentLinks && studentLinks.length > 0) {
      studentLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.student_name}: ${link.line_user_id}`);
      });
    }

    console.log(`📊 Parent LINE links: ${parentLinks?.length || 0}`);
    if (parentLinks && parentLinks.length > 0) {
      parentLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. ${link.parent_name} (${link.student_name}): ${link.line_user_id}`);
      });
    }
    console.log('');

    // ทดสอบส่งแจ้งเตือนกับ driver_id = 1
    console.log('📤 Testing notification with driver_id = 1...');
    
    const testData = {
      driver_id: 1,
      trip_phase: 'morning',
      current_status: 'start_journey',
      location: 'จุดเริ่มต้นเส้นทาง - ทดสอบ Driver ID 1',
      notes: 'ทดสอบการส่งแจ้งเตือนเฉพาะคนขับ ID = 1'
    };

    console.log('📋 Test Data:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('');

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
      console.log('\n✅ Driver ID = 1 notification test successful!');
      
      if (responseData.notification_results) {
        console.log('\n📊 Notification Results Summary:');
        const results = responseData.notification_results;
        
        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Failed: ${failedCount}`);
        console.log(`   📱 Students notified: ${responseData.summary?.students_notified || 0}`);
        console.log(`   👨‍👩‍👧‍👦 Parents notified: ${responseData.summary?.parents_notified || 0}`);
        
        console.log('\n📋 Detailed Results:');
        results.forEach((result, index) => {
          const status = result.status === 'success' ? '✅' : '❌';
          console.log(`   ${index + 1}. ${status} ${result.type}: ${result.status}`);
          if (result.error) {
            console.log(`      Error: ${result.error}`);
          }
          if (result.studentName) {
            console.log(`      Student: ${result.studentName}`);
          }
          if (result.parentName) {
            console.log(`      Parent: ${result.parentName}`);
          }
        });
      }
    } else {
      console.log('\n❌ Driver ID = 1 notification test failed!');
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
testDriver1().catch(console.error);