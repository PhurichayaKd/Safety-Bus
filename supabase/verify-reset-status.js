const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyResetStatus() {
  console.log('🔍 ตรวจสอบสถานะหลังการรีเซ็ต');
  console.log('=' .repeat(60));

  try {
    // 1. ตรวจสอบข้อมูลการขึ้น-ลงรถ
    console.log('📊 ตรวจสอบข้อมูลการขึ้น-ลงรถ...');
    const { data: boardingData, count: boardingCount } = await supabase
      .from('student_boarding_status')
      .select('*', { count: 'exact' });

    console.log(`   จำนวนข้อมูลการขึ้น-ลงรถ: ${boardingCount || 0}`);
    if (boardingData && boardingData.length > 0) {
      console.log('   ข้อมูลที่เหลือ:', boardingData);
    } else {
      console.log('   ✅ ไม่มีข้อมูลการขึ้น-ลงรถ (รีเซ็ตสำเร็จ)');
    }

    // 2. ตรวจสอบสถานะคนขับ
    console.log('\n🚌 ตรวจสอบสถานะคนขับ...');
    const { data: driverData } = await supabase
      .from('driver_bus')
      .select('driver_name, trip_phase');

    if (driverData && driverData.length > 0) {
      driverData.forEach(driver => {
        const status = driver.trip_phase === 'go' ? '✅' : '⚠️';
        console.log(`   ${status} ${driver.driver_name}: ${driver.trip_phase}`);
      });
    } else {
      console.log('   ❌ ไม่พบข้อมูลคนขับ');
    }

    // 3. ตรวจสอบข้อมูลนักเรียน
    console.log('\n👨‍🎓 ตรวจสอบข้อมูลนักเรียน...');
    const { data: studentData, count: studentCount } = await supabase
      .from('students')
      .select('student_name, status', { count: 'exact' })
      .eq('is_active', true);

    console.log(`   จำนวนนักเรียนที่ใช้งาน: ${studentCount || 0}`);
    if (studentData && studentData.length > 0) {
      studentData.forEach(student => {
        console.log(`   📚 ${student.student_name}: ${student.status || 'ไม่ระบุ'}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 การตรวจสอบเสร็จสิ้น!');
    
    if ((boardingCount || 0) === 0) {
      console.log('✅ สถานะนักเรียนถูกรีเซ็ตเรียบร้อยแล้ว');
      console.log('📱 สามารถใช้งาน Driver App ได้ปกติ');
      console.log('💡 นักเรียนทุกคนจะแสดงสถานะ "ยังไม่ขึ้นรถ"');
    } else {
      console.log('⚠️  ยังมีข้อมูลการขึ้น-ลงรถเหลืออยู่');
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
  }
}

verifyResetStatus().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});