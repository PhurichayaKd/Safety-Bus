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

async function resetForNewDay() {
  console.log('🌅 รีเซ็ตระบบสำหรับวันใหม่');
  console.log('=' .repeat(60));

  try {
    // ตรวจสอบข้อมูลปัจจุบันก่อน
    console.log('📊 ตรวจสอบข้อมูลปัจจุบัน...');
    const { data: currentData, error: currentError } = await supabase
      .from('student_boarding_status')
      .select('student_id, boarding_status, trip_date')
      .order('student_id');

    if (currentError) {
      console.log('⚠️  ไม่สามารถดึงข้อมูลปัจจุบันได้ (อาจยังไม่มีข้อมูล)');
    } else if (currentData && currentData.length > 0) {
      console.log(`📋 พบข้อมูลเก่า: ${currentData.length} รายการ`);
      console.log(`📅 วันที่เก่า: ${currentData[0].trip_date}`);
      
      const statusSummary = {};
      currentData.forEach(item => {
        statusSummary[item.boarding_status] = (statusSummary[item.boarding_status] || 0) + 1;
      });
      
      console.log('📈 สถานะเก่า:');
      Object.entries(statusSummary).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} คน`);
      });
    } else {
      console.log('📋 ไม่พบข้อมูลเก่า');
    }

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

    console.log(`\n👥 พบนักเรียน active ${students.length} คน`);

    // ล้างข้อมูลเก่าในตาราง student_boarding_status ก่อน
    console.log('\n🧹 ล้างข้อมูลเก่าทั้งหมดในตาราง student_boarding_status...');
    const { error: deleteError } = await supabase
      .from('student_boarding_status')
      .delete()
      .neq('student_id', 0); // ลบทั้งหมด

    if (deleteError) {
      console.error('❌ ไม่สามารถล้างข้อมูลเก่าได้:', deleteError);
      return;
    }

    console.log('✅ ล้างข้อมูลเก่าเสร็จสิ้น');

    // ดึงข้อมูลคนขับ
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id')
      .limit(1);

    if (driverError || !driverData || driverData.length === 0) {
      console.error('❌ ไม่สามารถดึงข้อมูลคนขับได้:', driverError);
      return;
    }

    const driverId = driverData[0].driver_id;

    // สร้างสถานะเริ่มต้นใหม่สำหรับวันใหม่
    const today = new Date().toISOString().split('T')[0]; // วันที่ปัจจุบัน YYYY-MM-DD
    console.log(`\n📅 สร้างสถานะใหม่สำหรับวันที่: ${today}`);
    console.log('📝 สร้างสถานะ "waiting" สำหรับนักเรียนทุกคน...');

    const newBoardingStatus = students.map(student => ({
      student_id: student.student_id,
      boarding_status: 'waiting',
      driver_id: driverId,
      trip_date: today,
      trip_phase: 'go'
    }));

    const { data: insertData, error: insertError } = await supabase
      .from('student_boarding_status')
      .insert(newBoardingStatus)
      .select();

    if (insertError) {
      console.error('❌ ไม่สามารถสร้างสถานะใหม่ได้:', insertError);
      return;
    }

    console.log(`✅ สร้างสถานะใหม่สำเร็จ ${insertData?.length || 0} รายการ`);

    // แสดงผลลัพธ์
    console.log('\n📋 สถานะใหม่ที่สร้างขึ้น:');
    console.log('-'.repeat(70));
    console.log('Student ID      | ชื่อ                  | สถานะ     | วันที่');
    console.log('-'.repeat(70));

    students.forEach(student => {
      console.log(`${student.student_id.toString().padEnd(15)} | ${student.student_name.padEnd(20)} | waiting   | ${today}`);
    });

    console.log('-'.repeat(70));

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
      
      if (waitingCount === students.length) {
        console.log('✅ สถานะทุกรายการถูกต้อง');
      } else {
        console.log('⚠️  จำนวนสถานะไม่ตรงกับจำนวนนักเรียน');
      }
    }

    console.log('\n🎉 รีเซ็ตระบบสำหรับวันใหม่เสร็จสิ้น!');
    console.log('============================================================');
    console.log(`📅 วันที่ใหม่: ${today}`);
    console.log(`👥 นักเรียนทั้งหมด: ${students.length} คน`);
    console.log('🟡 สถานะเริ่มต้น: waiting (รอรับ)');
    console.log('🚌 คนขับ ID:', driverId);
    console.log('🚀 Driver App พร้อมใช้งานสำหรับวันใหม่');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการรีเซ็ตระบบ:', error);
  }
}

// รันการรีเซ็ตระบบ
resetForNewDay().then(() => {
  console.log('\n✅ การรีเซ็ตระบบเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});