require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_ANON_KEY ใน environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkViewAndTables() {
  console.log('🔍 ตรวจสอบสถานะตารางและ view...');
  
  try {
    // ตรวจสอบ view v_student_today_status
    console.log('📝 ตรวจสอบ view v_student_today_status...');
    const { data: viewData, error: viewError } = await supabase
      .from('v_student_today_status')
      .select('*')
      .limit(1);

    if (viewError) {
      console.log('❌ view v_student_today_status ไม่มีอยู่:', viewError.message);
    } else {
      console.log('✅ view v_student_today_status มีอยู่แล้ว');
      console.log('📊 ตัวอย่างข้อมูล:', viewData);
    }

    // ตรวจสอบตาราง pickup_dropoff
    console.log('\n📝 ตรวจสอบตาราง pickup_dropoff...');
    const { data: pickupData, error: pickupError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .limit(1);

    if (pickupError) {
      console.log('❌ ตาราง pickup_dropoff ไม่มีอยู่:', pickupError.message);
    } else {
      console.log('✅ ตาราง pickup_dropoff มีอยู่แล้ว');
      console.log('📊 ตัวอย่างข้อมูล:', pickupData);
    }

    // ตรวจสอบตาราง student_boarding_status
    console.log('\n📝 ตรวจสอบตาราง student_boarding_status...');
    const { data: boardingData, error: boardingError } = await supabase
      .from('student_boarding_status')
      .select('*')
      .limit(1);

    if (boardingError) {
      console.log('❌ ตาราง student_boarding_status ไม่มีอยู่:', boardingError.message);
    } else {
      console.log('✅ ตาราง student_boarding_status มีอยู่แล้ว');
      console.log('📊 ตัวอย่างข้อมูล:', boardingData);
    }

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

// เรียกใช้ฟังก์ชัน
checkViewAndTables();