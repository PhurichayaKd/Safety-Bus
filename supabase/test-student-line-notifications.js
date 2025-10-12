import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// โหลด environment variables
dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testStudentLineNotifications() {
  console.log('🚌 Testing Student LINE Notifications System...\n');

  try {
    // ตรวจสอบการตั้งค่า environment variables
    console.log('🔧 Checking environment variables...');
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }
    console.log('✅ Environment variables loaded\n');

    // ตรวจสอบข้อมูลคนขับ
    console.log('👨‍💼 Checking driver data...');
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
    console.log(`   Status: ${driverData.current_status}`);
    console.log(`   Trip Phase: ${driverData.trip_phase}\n`);

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
        console.log(`      Student ID: ${student.students.student_id}`);
        console.log(`      LINE ID: ${student.line_user_id}`);
      });
    } else {
      console.log('⚠️  No linked students found. Cannot test notifications.');
      return;
    }
    console.log('');

    // ตรวจสอบผู้ปกครองที่ผูก LINE แล้ว
    console.log('👨‍👩‍👧‍👦 Checking linked parents...');
    const { data: linkedParents, error: parentError } = await supabase
      .from('parent_line_links')
      .select(`
        link_id,
        parent_id,
        line_user_id,
        line_display_id,
        active
      `)
      .eq('active', true)
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    if (parentError) {
      console.error('❌ Error fetching linked parents:', parentError);
    } else {
      console.log(`📊 Found ${linkedParents?.length || 0} linked parents:`);
      if (linkedParents && linkedParents.length > 0) {
        linkedParents.forEach((parent, index) => {
          console.log(`   ${index + 1}. Parent ID: ${parent.parent_id}`);
          console.log(`      LINE ID: ${parent.line_user_id}`);
          console.log(`      Display ID: ${parent.line_display_id || 'N/A'}`);
        });
      }
    }
    console.log('');

    // เลือกนักเรียนคนแรกสำหรับทดสอบ
    const testStudent = linkedStudents[0];
    const studentId = testStudent.students.student_id;
    const studentName = testStudent.students.student_name;

    console.log(`🎯 Testing with student: ${studentName} (ID: ${studentId})\n`);

    // ทดสอบสถานการณ์ต่างๆ
    const testScenarios = [
      {
        name: 'นักเรียนขึ้นรถ (รอบเช้า)',
        data: {
          student_id: studentId,
          status: 'onboard',
          driver_id: 1,
          location: 'จุดรับนักเรียน - ทดสอบ',
          notes: 'ทดสอบการส่งแจ้งเตือนเมื่อนักเรียนขึ้นรถ',
          phase: 'pickup'
        }
      },
      {
        name: 'นักเรียนลงรถที่โรงเรียน',
        data: {
          student_id: studentId,
          status: 'offboard',
          driver_id: 1,
          location: 'โรงเรียน - ทดสอบ',
          notes: 'ทดสอบการส่งแจ้งเตือนเมื่อนักเรียนลงรถที่โรงเรียน',
          phase: 'pickup'
        }
      },
      {
        name: 'นักเรียนขึ้นรถ (รอบบ่าย)',
        data: {
          student_id: studentId,
          status: 'onboard',
          driver_id: 1,
          location: 'โรงเรียน - ทดสอบ',
          notes: 'ทดสอบการส่งแจ้งเตือนเมื่อนักเรียนขึ้นรถรอบบ่าย',
          phase: 'dropoff'
        }
      },
      {
        name: 'นักเรียนลงรถที่บ้าน',
        data: {
          student_id: studentId,
          status: 'offboard',
          driver_id: 1,
          location: 'จุดส่งนักเรียน - ทดสอบ',
          notes: 'ทดสอบการส่งแจ้งเตือนเมื่อนักเรียนลงรถที่บ้าน',
          phase: 'dropoff'
        }
      }
    ];

    // ตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่หรือไม่
    console.log('🌐 Checking server status...');
    try {
      const healthCheck = await fetch('http://localhost:3000/api/health');
      if (healthCheck.ok) {
        console.log('✅ Server is running on http://localhost:3000\n');
      } else {
        console.log('⚠️  Server responded but may have issues\n');
      }
    } catch (error) {
      console.error('❌ Server is not running on http://localhost:3000');
      console.log('💡 Please start the server with: node server-with-webhook.js\n');
      return;
    }

    // รันการทดสอบแต่ละสถานการณ์
    for (let i = 0; i < testScenarios.length; i++) {
      const scenario = testScenarios[i];
      console.log(`🧪 Test ${i + 1}/${testScenarios.length}: ${scenario.name}`);
      console.log('📋 Request Data:');
      console.log(JSON.stringify(scenario.data, null, 2));
      console.log('');

      try {
        const response = await fetch('http://localhost:3000/api/student-status-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(scenario.data)
        });

        console.log(`📡 Response Status: ${response.status}`);
        
        const responseData = await response.json();
        console.log('📋 Response Data:');
        console.log(JSON.stringify(responseData, null, 2));

        if (response.ok && responseData.success) {
          console.log(`\n✅ ${scenario.name} - SUCCESS!`);
          
          if (responseData.summary) {
            console.log('\n📊 Notification Summary:');
            console.log(`   📱 Student notified: ${responseData.summary.student_notified ? 'Yes' : 'No'}`);
            console.log(`   👨‍👩‍👧‍👦 Parents notified: ${responseData.summary.parents_notified || 0}`);
            console.log(`   ✅ Total sent: ${responseData.summary.total_sent || 0}`);
            console.log(`   ❌ Total failed: ${responseData.summary.total_failed || 0}`);
          }

          if (responseData.notification_results && responseData.notification_results.length > 0) {
            console.log('\n📋 Detailed Results:');
            responseData.notification_results.forEach((result, index) => {
              const status = result.status === 'success' ? '✅' : '❌';
              const type = result.type === 'student' ? '👨‍🎓' : '👨‍👩‍👧‍👦';
              console.log(`   ${index + 1}. ${status} ${type} ${result.type.toUpperCase()}: ${result.status}`);
              
              if (result.studentName) {
                console.log(`      Name: ${result.studentName}`);
              }
              if (result.parentName) {
                console.log(`      Parent: ${result.parentName}`);
              }
              if (result.lineUserId) {
                console.log(`      LINE ID: ${result.lineUserId}`);
              }
              if (result.error) {
                console.log(`      Error: ${result.error}`);
              }
            });
          }
        } else {
          console.log(`\n❌ ${scenario.name} - FAILED!`);
          console.log('Error:', responseData.error || 'Unknown error');
        }

      } catch (fetchError) {
        console.error(`\n❌ ${scenario.name} - Request failed:`, fetchError.message);
      }

      console.log('\n' + '='.repeat(80) + '\n');

      // รอ 2 วินาทีก่อนทดสอบครั้งต่อไป
      if (i < testScenarios.length - 1) {
        console.log('⏳ Waiting 2 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('🎯 Student LINE Notification Testing Complete!');
    console.log(`📊 Total scenarios tested: ${testScenarios.length}`);
    console.log(`👨‍🎓 Test student: ${studentName} (${studentId})`);
    console.log('💡 Check your LINE app to see if notifications were received!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// รันการทดสอบ
testStudentLineNotifications().catch(console.error);