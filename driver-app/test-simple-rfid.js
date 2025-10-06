const { createClient } = require('@supabase/supabase-js');

// อ่านค่าจากไฟล์ .env
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// ฟังก์ชันทดสอบการอ่านข้อมูล RFID assignment
async function testReadRfidAssignments() {
  try {
    console.log('🔍 Testing read RFID assignments...');
    
    // อ่านข้อมูล assignment ที่มีอยู่
    const { data: assignments, error } = await supabase
      .from('rfid_card_assignments')
      .select(`
        card_id,
        student_id,
        valid_from,
        valid_to,
        assigned_by,
        is_active,
        rfid_cards (
          rfid_code,
          status
        ),
        students (
          student_name
        )
      `)
      .is('valid_to', null)
      .limit(5);

    if (error) {
      console.error('❌ Error reading assignments:', error);
      return false;
    }

    console.log('✅ Successfully read RFID assignments:');
    assignments.forEach((assignment, index) => {
      console.log(`${index + 1}. Student: ${assignment.students?.student_name || 'Unknown'}`);
      console.log(`   Card ID: ${assignment.card_id}, RFID: ${assignment.rfid_cards?.rfid_code || 'Unknown'}`);
      console.log(`   Status: ${assignment.rfid_cards?.status || 'Unknown'}`);
      console.log(`   Assigned: ${assignment.valid_from}`);
      console.log('');
    });

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// ฟังก์ชันทดสอบการค้นหาบัตร RFID ที่ว่าง
async function testFindAvailableCards() {
  try {
    console.log('🔍 Testing find available RFID cards...');
    
    const { data: availableCards, error } = await supabase
      .from('rfid_cards')
      .select('card_id, rfid_code, status')
      .eq('status', 'available')
      .limit(3);

    if (error) {
      console.error('❌ Error finding available cards:', error);
      return false;
    }

    console.log('✅ Available RFID cards:');
    if (availableCards.length === 0) {
      console.log('   No available cards found');
    } else {
      availableCards.forEach((card, index) => {
        console.log(`${index + 1}. Card ID: ${card.card_id}, RFID: ${card.rfid_code}, Status: ${card.status}`);
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// ฟังก์ชันทดสอบการค้นหานักเรียนที่ไม่มีบัตร RFID
async function testFindStudentsWithoutRfid() {
  try {
    console.log('🔍 Testing find students without RFID...');
    
    // ค้นหานักเรียนที่ไม่มีการ assign บัตร RFID ที่ active
    const { data: studentsWithoutRfid, error } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade
      `)
      .not('student_id', 'in', 
        supabase
          .from('rfid_card_assignments')
          .select('student_id')
          .is('valid_to', null)
      )
      .eq('is_active', true)
      .limit(3);

    if (error) {
      console.error('❌ Error finding students without RFID:', error);
      return false;
    }

    console.log('✅ Students without RFID cards:');
    if (studentsWithoutRfid.length === 0) {
      console.log('   All active students have RFID cards assigned');
    } else {
      studentsWithoutRfid.forEach((student, index) => {
        console.log(`${index + 1}. ID: ${student.student_id}, Name: ${student.student_name}, Grade: ${student.grade}`);
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// ฟังก์ชันทดสอบการตรวจสอบ RFID assignment ของนักเรียน
async function testCheckStudentRfidAssignment(studentId) {
  try {
    console.log(`🔍 Testing check RFID assignment for student ${studentId}...`);
    
    const { data: assignment, error } = await supabase
      .from('rfid_card_assignments')
      .select(`
        card_id,
        valid_from,
        rfid_cards (
          rfid_code,
          status
        )
      `)
      .eq('student_id', studentId)
      .is('valid_to', null)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error checking assignment:', error);
      return false;
    }

    if (!assignment) {
      console.log('✅ Student has no active RFID assignment');
    } else {
      console.log('✅ Student has active RFID assignment:');
      console.log(`   Card ID: ${assignment.card_id}`);
      console.log(`   RFID Code: ${assignment.rfid_cards?.rfid_code}`);
      console.log(`   Card Status: ${assignment.rfid_cards?.status}`);
      console.log(`   Assigned Since: ${assignment.valid_from}`);
    }

    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// รันการทดสอบทั้งหมด
async function runAllTests() {
  console.log('🚀 Starting RFID system tests...\n');

  const tests = [
    testReadRfidAssignments,
    testFindAvailableCards,
    testFindStudentsWithoutRfid,
    () => testCheckStudentRfidAssignment(100011) // ทดสอบกับนักเรียน ID ที่มีอยู่
  ];

  let passedTests = 0;
  
  for (let i = 0; i < tests.length; i++) {
    const testResult = await tests[i]();
    if (testResult) {
      passedTests++;
    }
    console.log('─'.repeat(50));
  }

  console.log(`\n✨ Tests completed: ${passedTests}/${tests.length} passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! RFID system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please check the errors above.');
  }
}

// รันการทดสอบ
runAllTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });