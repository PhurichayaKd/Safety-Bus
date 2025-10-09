const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkSpecificCard() {
  const rfidCode = 'F3C9DC34';
  
  console.log(`🔍 ตรวจสอบบัตร RFID: ${rfidCode}\n`);
  
  // 1. ตรวจสอบข้อมูลบัตร
  const { data: card, error: cardError } = await supabase
    .from('rfid_cards')
    .select('*')
    .eq('rfid_code', rfidCode)
    .single();
    
  if (cardError) {
    console.error('❌ ไม่พบบัตร:', cardError.message);
    return;
  }
  
  console.log('📋 ข้อมูลบัตร:');
  console.log(`   Card ID: ${card.card_id}`);
  console.log(`   RFID Code: ${card.rfid_code}`);
  console.log(`   Status: ${card.status}`);
  console.log(`   Is Active: ${card.is_active}`);
  console.log(`   Created: ${card.created_at}`);
  console.log('');
  
  // 2. ตรวจสอบการมอบหมาย
  const { data: assignments, error: assignError } = await supabase
    .from('rfid_card_assignments')
    .select(`
      *,
      students(student_id, student_name, is_active, status)
    `)
    .eq('card_id', card.card_id);
    
  if (assignError) {
    console.error('❌ Assignment Error:', assignError.message);
    return;
  }
  
  console.log('📋 การมอบหมายบัตร:');
  if (assignments.length === 0) {
    console.log('   ❌ ไม่มีการมอบหมายบัตรนี้');
  } else {
    assignments.forEach((assignment, index) => {
      console.log(`   Assignment ${index + 1}:`);
      console.log(`     Student ID: ${assignment.student_id}`);
      console.log(`     Student Name: ${assignment.students?.student_name || 'N/A'}`);
      console.log(`     Student Active: ${assignment.students?.is_active || 'N/A'}`);
      console.log(`     Student Status: ${assignment.students?.status || 'N/A'}`);
      console.log(`     Assignment Active: ${assignment.is_active}`);
      console.log(`     Valid From: ${assignment.valid_from}`);
      console.log(`     Valid To: ${assignment.valid_to || 'ไม่จำกัด'}`);
      console.log('');
    });
  }
  
  // 3. ทดสอบ Query ที่ใช้ในฟังก์ชัน record_rfid_scan
  console.log('🔍 ทดสอบ Query ที่ใช้ในฟังก์ชัน record_rfid_scan:');
  
  const { data: queryResult, error: queryError } = await supabase
    .from('students')
    .select(`
      student_id,
      student_name,
      is_active,
      rfid_card_assignments!inner(
        is_active,
        valid_to,
        rfid_cards!inner(
          card_id,
          rfid_code,
          is_active,
          status
        )
      )
    `)
    .eq('rfid_card_assignments.rfid_cards.rfid_code', rfidCode)
    .eq('rfid_card_assignments.is_active', true)
    .eq('rfid_card_assignments.rfid_cards.is_active', true)
    .eq('rfid_card_assignments.rfid_cards.status', 'assigned')
    .eq('is_active', true);
    
  if (queryError) {
    console.error('❌ Query Error:', queryError.message);
  } else {
    console.log('✅ Query Result (with status = assigned):', queryResult);
  }
  
  // 4. ทดสอบ Query โดยไม่มีเงื่อนไข status = 'assigned'
  console.log('\n🔍 ทดสอบ Query โดยไม่มีเงื่อนไข status = assigned:');
  
  const { data: queryResult2, error: queryError2 } = await supabase
    .from('students')
    .select(`
      student_id,
      student_name,
      is_active,
      rfid_card_assignments!inner(
        is_active,
        valid_to,
        rfid_cards!inner(
          card_id,
          rfid_code,
          is_active,
          status
        )
      )
    `)
    .eq('rfid_card_assignments.rfid_cards.rfid_code', rfidCode)
    .eq('rfid_card_assignments.is_active', true)
    .eq('rfid_card_assignments.rfid_cards.is_active', true)
    .eq('is_active', true);
    
  if (queryError2) {
    console.error('❌ Query Error:', queryError2.message);
  } else {
    console.log('✅ Query Result (without status check):', queryResult2);
  }
}

checkSpecificCard().catch(console.error);