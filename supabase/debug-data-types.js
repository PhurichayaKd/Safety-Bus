require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDataTypes() {
  console.log('🔍 ตรวจสอบ data types ของตารางที่เกี่ยวข้อง...\n');

  try {
    // ตรวจสอบข้อมูลจาก rfid_cards
    console.log('📋 ตรวจสอบตาราง rfid_cards:');
    const { data: rfidCards, error: rfidError } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('rfid_code', 'F3C9DC34')
      .limit(1);

    if (rfidError) {
      console.log('❌ Error rfid_cards:', rfidError.message);
    } else if (rfidCards && rfidCards.length > 0) {
      const card = rfidCards[0];
      console.log('✅ พบบัตร RFID:');
      Object.entries(card).forEach(([key, value]) => {
        console.log(`   ${key}: ${value} (${typeof value})`);
      });
    } else {
      console.log('⚠️ ไม่พบบัตร RFID F3C9DC34');
    }

    // ตรวจสอบข้อมูลจาก rfid_card_assignments
    console.log('\n📋 ตรวจสอบตาราง rfid_card_assignments:');
    const { data: assignments, error: assignError } = await supabase
      .from('rfid_card_assignments')
      .select('*')
      .eq('is_active', true)
      .limit(3);

    if (assignError) {
      console.log('❌ Error rfid_card_assignments:', assignError.message);
    } else if (assignments && assignments.length > 0) {
      console.log('✅ ข้อมูล assignments:');
      assignments.forEach((assignment, index) => {
        console.log(`\n--- Assignment ${index + 1} ---`);
        Object.entries(assignment).forEach(([key, value]) => {
          console.log(`   ${key}: ${value} (${typeof value})`);
        });
      });
    } else {
      console.log('⚠️ ไม่พบ assignments ที่ active');
    }

    // ตรวจสอบข้อมูลจาก students
    console.log('\n📋 ตรวจสอบตาราง students:');
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('*')
      .limit(2);

    if (studentError) {
      console.log('❌ Error students:', studentError.message);
    } else if (students && students.length > 0) {
      console.log('✅ ข้อมูล students:');
      students.forEach((student, index) => {
        console.log(`\n--- Student ${index + 1} ---`);
        Object.entries(student).forEach(([key, value]) => {
          console.log(`   ${key}: ${value} (${typeof value})`);
        });
      });
    }

    // ลองทำ JOIN แบบง่าย ๆ เพื่อดู error
    console.log('\n🔍 ทดสอบ JOIN query:');
    const { data: joinData, error: joinError } = await supabase
      .from('rfid_cards')
      .select(`
        *,
        rfid_card_assignments!inner(*)
      `)
      .eq('rfid_code', 'F3C9DC34')
      .eq('rfid_card_assignments.is_active', true);

    if (joinError) {
      console.log('❌ Error JOIN:', joinError.message);
    } else {
      console.log('✅ JOIN สำเร็จ:', joinData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

debugDataTypes();