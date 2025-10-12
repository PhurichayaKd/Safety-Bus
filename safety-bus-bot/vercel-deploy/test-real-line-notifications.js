import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testRealLineNotifications() {
  console.log('🚌 Testing Real LINE Notifications with Driver ID = 1...\n');

  try {
    // ตรวจสอบข้อมูลคนขับ ID = 1
    console.log('👨‍💼 Checking Driver ID = 1...');
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('*')
      .eq('driver_id', 1)
      .single();

    if (driverError || !driverData) {
      console.error('❌ Driver ID = 1 not found:', driverError);
      return;
    }

    console.log(`✅ Driver: ${driverData.driver_name} (${driverData.license_plate})`);
    console.log('');

    // ตรวจสอบนักเรียนที่ผูก LINE แล้ว
    console.log('📱 Checking linked students...');
    const { data: linkedStudents, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        line_user_id,
        line_display_id,
        students!inner(student_id, student_name, grade, is_active)
      `)
      .eq('active', true)
      .eq('students.is_active', true)
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    if (studentError) {
      console.error('❌ Error fetching linked students:', studentError);
      return;
    }

    console.log(`📊 Found ${linkedStudents?.length || 0} linked students:`);
    if (linkedStudents && linkedStudents.length > 0) {
      linkedStudents.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.students.student_name} (${student.students.grade})`);
        console.log(`      LINE ID: ${student.line_user_id}`);
        console.log(`      Display: ${student.line_display_id || 'N/A'}`);
      });
    }
    console.log('');

    // ทดสอบการส่งแจ้งเตือนหลายสถานการณ์
    const testScenarios = [
      {
        name: 'เริ่มออกเดินทาง (รอบเช้า)',
        data: {
          driver_id: 1,
          trip_phase: 'morning',
          current_status: 'start_journey',
          location: 'จุดเริ่มต้นเส้นทาง - ทดสอบการแจ้งเตือนจริง',
          notes: 'ทดสอบการส่งแจ้งเตือนไปยังนักเรียนที่ผูก LINE แล้ว'
        }
      },
      {
        name: 'มาถึงโรงเรียน (รอบเช้า)',
        data: {
          driver_id: 1,
          trip_phase: 'morning',
          current_status: 'arrived_school',
          location: 'โรงเรียน - ทดสอบการแจ้งเตือนจริง',
          notes: 'ทดสอบการแจ้งเตือนเมื่อมาถึงโรงเรียน'
        }
      }
    ];

    for (const scenario of testScenarios) {
      console.log(`🧪 Testing: ${scenario.name}`);
      console.log('📋 Test Data:');
      console.log(JSON.stringify(scenario.data, null, 2));
      console.log('');

      try {
        const response = await fetch('http://localhost:3000/api/driver-status-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scenario.data)
        });

        console.log(`📡 API Response Status: ${response.status}`);
        
        const responseData = await response.json();
        console.log('📋 API Response:');
        console.log(JSON.stringify(responseData, null, 2));

        if (response.ok) {
          console.log(`\n✅ ${scenario.name} - Notification sent successfully!`);
          
          if (responseData.notification_results) {
            const results = responseData.notification_results;
            const successCount = results.filter(r => r.status === 'success').length;
            const failedCount = results.filter(r => r.status === 'failed').length;
            
            console.log('\n📊 Notification Results:');
            console.log(`   ✅ Successful: ${successCount}`);
            console.log(`   ❌ Failed: ${failedCount}`);
            console.log(`   📱 Students notified: ${responseData.summary?.students_notified || 0}`);
            console.log(`   👨‍👩‍👧‍👦 Parents notified: ${responseData.summary?.parents_notified || 0}`);
            
            // แสดงรายละเอียดผลลัพธ์
            console.log('\n📋 Detailed Results:');
            results.forEach((result, index) => {
              const status = result.status === 'success' ? '✅' : '❌';
              console.log(`   ${index + 1}. ${status} ${result.type}: ${result.status}`);
              if (result.studentName) {
                console.log(`      Student: ${result.studentName}`);
              }
              if (result.parentName) {
                console.log(`      Parent: ${result.parentName}`);
              }
              if (result.error) {
                console.log(`      Error: ${result.error}`);
              }
            });
          }
        } else {
          console.log(`\n❌ ${scenario.name} - Notification failed!`);
          console.log('Error:', responseData.error || 'Unknown error');
        }

      } catch (fetchError) {
        console.error(`\n❌ ${scenario.name} - Request failed:`, fetchError.message);
      }

      console.log('\n' + '='.repeat(80) + '\n');
    }

    console.log('🎯 Real LINE Notification Testing Complete!');
    console.log(`📊 Total linked students available: ${linkedStudents?.length || 0}`);
    console.log('💡 Check your LINE app to see if notifications were received!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestion: Make sure the server is running on http://localhost:3000');
      console.log('   Run: node server-with-webhook.js');
    }
  }
}

// รันการทดสอบ
testRealLineNotifications().catch(console.error);