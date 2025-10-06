const { createClient } = require('@supabase/supabase-js');

// ตั้งค่า Supabase client
const supabaseUrl = 'https://ixqjqhqjqjqjqjqjqjqj.supabase.co'; // แทนที่ด้วย URL จริง
const supabaseKey = 'your-anon-key'; // แทนที่ด้วย anon key จริง

// อ่านค่าจากไฟล์ .env หากมี
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || supabaseUrl,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || supabaseKey
);

// ฟังก์ชันทดสอบการ assign RFID card
async function testAssignRfidCard() {
  try {
    console.log('🧪 Testing RFID card assignment...');
    
    // ตรวจสอบว่ามีข้อมูลนักเรียนและบัตร RFID ในฐานข้อมูลหรือไม่
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('student_id, student_name')
      .limit(1);
    
    if (studentError) {
      console.error('❌ Error fetching students:', studentError);
      return;
    }
    
    if (!students || students.length === 0) {
      console.log('⚠️ No students found in database');
      return;
    }
    
    const { data: cards, error: cardError } = await supabase
      .from('rfid_cards')
      .select('card_id, rfid_code, status')
      .eq('status', 'available')
      .limit(1);
    
    if (cardError) {
      console.error('❌ Error fetching RFID cards:', cardError);
      return;
    }
    
    if (!cards || cards.length === 0) {
      console.log('⚠️ No available RFID cards found in database');
      return;
    }
    
    const student = students[0];
    const card = cards[0];
    
    console.log(`📝 Attempting to assign card ${card.card_id} (${card.rfid_code}) to student ${student.student_id} (${student.student_name})`);
    
    // ทดสอบการ assign โดยใช้ SQL โดยตรง
    const assignResult = await testDirectAssignment(student.student_id, card.card_id);
    
    if (assignResult.success) {
      console.log('✅ RFID assignment test passed!');
      console.log('📊 Assignment result:', assignResult);
      
      // ทดสอบการ unassign
      console.log('\n🧪 Testing RFID card unassignment...');
      const unassignResult = await testDirectUnassignment(student.student_id);
      
      if (unassignResult.success) {
        console.log('✅ RFID unassignment test passed!');
        console.log('📊 Unassignment result:', unassignResult);
      } else {
        console.log('❌ RFID unassignment test failed');
      }
    } else {
      console.log('❌ RFID assignment test failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// ฟังก์ชันทดสอบการ assign โดยใช้ SQL โดยตรง
async function testDirectAssignment(studentId, cardId) {
  try {
    // ตรวจสอบว่าบัตร RFID มีอยู่และสถานะ
    const { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .select('card_id, status')
      .eq('card_id', cardId)
      .single();

    if (cardError || !cardData) {
      throw new Error('RFID card not found');
    }

    // ตรวจสอบว่าบัตรถูกใช้งานอยู่หรือไม่
    const { data: existingAssignment, error: assignmentError } = await supabase
      .from('rfid_card_assignments')
      .select('card_id, student_id')
      .eq('card_id', cardId)
      .is('valid_to', null)
      .single();

    if (assignmentError && assignmentError.code !== 'PGRST116') {
      throw assignmentError;
    }

    if (existingAssignment) {
      throw new Error(`RFID card is already assigned to student ${existingAssignment.student_id}`);
    }

    // ตรวจสอบว่านักเรียนมีบัตร RFID อยู่แล้วหรือไม่
    const { data: studentAssignment, error: studentError } = await supabase
      .from('rfid_card_assignments')
      .select('card_id')
      .eq('student_id', studentId)
      .is('valid_to', null)
      .single();

    if (studentError && studentError.code !== 'PGRST116') {
      throw studentError;
    }

    // ถ้านักเรียนมีบัตรอยู่แล้ว ให้ยกเลิกการ assign บัตรเก่าก่อน
    if (studentAssignment) {
      await supabase
        .from('rfid_card_assignments')
        .update({ valid_to: new Date().toISOString() })
        .eq('student_id', studentId)
        .is('valid_to', null);

      // อัปเดตสถานะบัตรเก่าเป็น available
      await supabase
        .from('rfid_cards')
        .update({ status: 'available' })
        .eq('card_id', studentAssignment.card_id);
    }

    // สร้าง assignment ใหม่
    const { error: insertError } = await supabase
      .from('rfid_card_assignments')
      .insert({
        card_id: cardId,
        student_id: studentId,
        valid_from: new Date().toISOString()
      });

    if (insertError) {
      throw insertError;
    }

    // อัปเดตสถานะบัตรเป็น assigned
    const { error: updateError } = await supabase
      .from('rfid_cards')
      .update({ status: 'assigned' })
      .eq('card_id', cardId);

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      message: 'RFID card assigned successfully',
      card_id: cardId,
      student_id: studentId,
      assigned_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to assign RFID card:', error);
    return { success: false, error: error.message };
  }
}

// ฟังก์ชันทดสอบการ unassign โดยใช้ SQL โดยตรง
async function testDirectUnassignment(studentId) {
  try {
    let query = supabase
      .from('rfid_card_assignments')
      .select('card_id, student_id')
      .is('valid_to', null)
      .eq('student_id', studentId);

    const { data: assignments, error: selectError } = await query;

    if (selectError) {
      throw selectError;
    }

    if (!assignments || assignments.length === 0) {
      throw new Error('No active RFID assignment found');
    }

    // ยกเลิกการ assign โดยการตั้งค่า valid_to
    const currentTime = new Date().toISOString();
    
    const { error: updateError } = await supabase
      .from('rfid_card_assignments')
      .update({ valid_to: currentTime })
      .is('valid_to', null)
      .eq('student_id', studentId);

    if (updateError) {
      throw updateError;
    }

    // อัปเดตสถานะบัตรเป็น available
    for (const assignment of assignments) {
      await supabase
        .from('rfid_cards')
        .update({ status: 'available' })
        .eq('card_id', assignment.card_id);
    }

    return {
      success: true,
      message: 'RFID card unassigned successfully',
      unassigned_assignments: assignments,
      unassigned_at: currentTime
    };

  } catch (error) {
    console.error('Failed to unassign RFID card:', error);
    return { success: false, error: error.message };
  }
}

// รันการทดสอบ
console.log('🚀 Starting RFID function tests...\n');
testAssignRfidCard()
  .then(() => {
    console.log('\n✨ All tests completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });