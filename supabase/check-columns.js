require('dotenv').config({ path: './driver-app/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  console.log('🔍 ตรวจสอบ columns ใน tables...\n');

  // ตรวจสอบ columns ใน table students
  try {
    console.log('1️⃣ ตรวจสอบ columns ใน table "students"...');
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Columns ใน students:', data.length > 0 ? Object.keys(data[0]) : 'ไม่มีข้อมูล');
    }
  } catch (err) {
    console.log('❌ ข้อผิดพลาด:', err.message);
  }

  // ตรวจสอบ columns ใน v_student_today_status
  try {
    console.log('\n2️⃣ ตรวจสอบ columns ใน view "v_student_today_status"...');
    const { data, error } = await supabase
      .from('v_student_today_status')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error:', error.message);
    } else {
      console.log('✅ Columns ใน v_student_today_status:', data.length > 0 ? Object.keys(data[0]) : 'ไม่มีข้อมูล');
    }
  } catch (err) {
    console.log('❌ ข้อผิดพลาด:', err.message);
  }

  // ลองดึงข้อมูลจาก students ด้วยวิธีต่างๆ
  console.log('\n3️⃣ ทดสอบการดึงข้อมูลจาก students...');
  
  // ลองใช้ student_id แทน id
  try {
    const { data, error } = await supabase
      .from('students')
      .select('student_id, name, class')
      .limit(3);
    
    if (error) {
      console.log('❌ Error with student_id:', error.message);
    } else {
      console.log('✅ ดึงข้อมูลด้วย student_id สำเร็จ:', data.length, 'records');
    }
  } catch (err) {
    console.log('❌ ข้อผิดพลาดกับ student_id:', err.message);
  }
}

checkColumns().catch(console.error);