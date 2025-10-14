import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createInitialStatus() {
  console.log('🚀 สร้างสถานะเริ่มต้นให้นักเรียนทุกคน');
  console.log('=' .repeat(60));

  try {
    // ดึงรายชื่อนักเรียนที่ active ทั้งหมด
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name')
      .eq('status', 'active')
      .order('student_id');

    if (studentsError) {
      console.error('❌ ไม่สามารถดึงข้อมูลนักเรียนได้:', studentsError);
      return;
    }

    if (!students || students.length === 0) {
      console.log('⚠️  ไม่พบนักเรียนที่ active');
      return;
    }

    console.log(`📊 พบนักเรียน active ${students.length} คน`);

    // ล้างข้อมูลเก่าในตาราง student_boarding_status ก่อน
    console.log('\n🧹 ล้างข้อมูลเก่าในตาราง student_boarding_status...');
    const { error: deleteError } = await supabase
      .from('student_boarding_status')
      .delete()
      .neq('student_id', 0); // ลบทั้งหมด

    if (deleteError) {
      console.error('❌ ไม่สามารถล้างข้อมูลเก่าได้:', deleteError);
      return;
    }

    console.log('✅ ล้างข้อมูลเก่าเสร็จสิ้น');

    // ดึงข้อมูลคนขับที่ active
    const { data: drivers, error: driversError } = await supabase
      .from('driver_bus')
      .select('driver_id')
      .eq('is_active', true)
      .limit(1);

    if (driversError || !drivers || drivers.length === 0) {
      console.error('❌ ไม่พบคนขับที่ active:', driversError);
      return;
    }

    const driverId = drivers[0].driver_id;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // สร้างสถานะเริ่มต้น "waiting" สำหรับนักเรียนทุกคน
    console.log('\n📝 สร้างสถานะเริ่มต้น "waiting" สำหรับนักเรียนทุกคน...');
    
    const initialStatuses = students.map(student => ({
      student_id: student.student_id,
      driver_id: driverId,
      trip_date: today,
      trip_phase: 'go',
      boarding_status: 'waiting'
    }));

    const { data: insertedData, error: insertError } = await supabase
      .from('student_boarding_status')
      .insert(initialStatuses)
      .select();

    if (insertError) {
      console.error('❌ ไม่สามารถสร้างสถานะเริ่มต้นได้:', insertError);
      return;
    }

    console.log(`✅ สร้างสถานะเริ่มต้นสำเร็จ ${insertedData?.length || 0} รายการ`);

    // แสดงผลลัพธ์
    console.log('\n📋 สถานะที่สร้างขึ้น:');
    console.log('-'.repeat(60));
    console.log('Student ID\t| ชื่อ\t\t\t| สถานะ');
    console.log('-'.repeat(60));

    students.forEach(student => {
      console.log(`${student.student_id}\t\t| ${student.student_name.padEnd(20)}\t| waiting`);
    });

    console.log('-'.repeat(60));
    console.log(`\n🎉 สร้างสถานะเริ่มต้นเสร็จสิ้น! นักเรียนทุกคนมีสถานะ "waiting"`);

    // ตรวจสอบผลลัพธ์
    const { data: verifyData, error: verifyError } = await supabase
      .from('student_boarding_status')
      .select('*')
      .order('student_id');

    if (verifyError) {
      console.error('❌ ไม่สามารถตรวจสอบผลลัพธ์ได้:', verifyError);
    } else {
      console.log(`\n✅ ตรวจสอบผลลัพธ์: พบข้อมูล ${verifyData?.length || 0} รายการในตาราง student_boarding_status`);
      
      const waitingCount = verifyData?.filter(item => item.boarding_status === 'waiting').length || 0;
      console.log(`🟡 นักเรียนที่มีสถานะ "waiting": ${waitingCount} คน`);
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// รันการสร้างสถานะเริ่มต้น
createInitialStatus().then(() => {
  console.log('\n✅ การสร้างสถานะเริ่มต้นเสร็จสิ้น');
  console.log('🚀 Driver App พร้อมใช้งาน - นักเรียนทุกคนจะแสดงสถานะ "waiting" (รอรับ)');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});