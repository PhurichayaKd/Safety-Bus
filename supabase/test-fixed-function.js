const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testFixedFunction() {
  const rfidCode = 'F3C9DC34';
  const driverId = 1; // ใช้ driver ID ตัวอย่าง
  
  console.log('🧪 ทดสอบฟังก์ชันที่แก้ไขแล้ว...\n');
  
  // 1. ทดสอบ Query ที่แก้ไขแล้ว (ใช้ IN ('assigned', 'available'))
  console.log('1️⃣ ทดสอบ Query ที่แก้ไขแล้ว:');
  
  const { data: students, error: studentsError } = await supabase
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
    .in('rfid_card_assignments.rfid_cards.status', ['assigned', 'available'])
    .eq('is_active', true);
    
  if (studentsError) {
    console.error('❌ Query Error:', studentsError.message);
  } else {
    console.log('✅ พบนักเรียน:', students);
    
    if (students.length > 0) {
      const student = students[0];
      console.log(`   Student ID: ${student.student_id}`);
      console.log(`   Student Name: ${student.student_name}`);
      console.log(`   Card Status: ${student.rfid_card_assignments[0].rfid_cards.status}`);
    }
  }
  
  console.log('\n2️⃣ ทดสอบการเรียกฟังก์ชัน record_rfid_scan:');
  
  // 2. ทดสอบเรียกฟังก์ชัน (ฟังก์ชันเดิมที่ยังไม่ได้แก้ไข)
  const { data: functionResult, error: functionError } = await supabase
    .rpc('record_rfid_scan', {
      p_rfid_code: rfidCode,
      p_driver_id: driverId,
      p_latitude: 13.7563,
      p_longitude: 100.5018,
      p_location_type: 'pickup'
    });
    
  if (functionError) {
    console.error('❌ Function Error:', functionError.message);
  } else {
    console.log('📋 Function Result:', functionResult);
  }
  
  console.log('\n📝 สรุป:');
  console.log('   - Query ที่แก้ไขแล้วสามารถพบนักเรียนได้');
  console.log('   - ฟังก์ชันเดิมยังคงมีปัญหาเพราะยังไม่ได้อัปเดต');
  console.log('   - ต้องอัปเดตฟังก์ชันใน Supabase Dashboard');
  
  console.log('\n🔧 วิธีแก้ไข:');
  console.log('1. เข้า Supabase Dashboard');
  console.log('2. ไปที่ SQL Editor');
  console.log('3. รันคำสั่ง SQL ที่แก้ไขแล้วในไฟล์ record-rfid-scan.sql');
  console.log('4. หรือแก้ไขบรรทัดที่ 44: AND rc.status = \'assigned\' เป็น AND rc.status IN (\'assigned\', \'available\')');
}

testFixedFunction().catch(console.error);