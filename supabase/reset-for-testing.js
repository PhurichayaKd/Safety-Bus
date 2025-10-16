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

async function resetForTesting() {
  console.log('🧪 รีเซ็ตระบบสำหรับการทดสอบ');
  console.log('=' .repeat(60));

  try {
    // 1. ลบข้อมูลซ้ำในตาราง uniq_daily_pickup_per_student
    console.log('🗑️  ลบข้อมูลในตาราง uniq_daily_pickup_per_student...');
    const { error: deleteUniqError } = await supabase
      .from('uniq_daily_pickup_per_student')
      .delete()
      .gte('student_id', 0);

    if (deleteUniqError) {
      console.error('❌ ไม่สามารถลบข้อมูล uniq_daily_pickup_per_student:', deleteUniqError);
    } else {
      console.log('✅ ลบข้อมูล uniq_daily_pickup_per_student สำเร็จ');
    }

    // 2. ลบข้อมูลในตาราง pickup_dropoff
    console.log('🗑️  ลบข้อมูลในตาราง pickup_dropoff...');
    const { error: deletePickupError } = await supabase
      .from('pickup_dropoff')
      .delete()
      .gte('student_id', 0);

    if (deletePickupError) {
      console.error('❌ ไม่สามารถลบข้อมูล pickup_dropoff:', deletePickupError);
    } else {
      console.log('✅ ลบข้อมูล pickup_dropoff สำเร็จ');
    }

    // 3. ลบข้อมูลในตาราง student_boarding_status
    console.log('🗑️  ลบข้อมูลในตาราง student_boarding_status...');
    const { error: deleteBoardingError } = await supabase
      .from('student_boarding_status')
      .delete()
      .gte('student_id', 0);

    if (deleteBoardingError) {
      console.error('❌ ไม่สามารถลบข้อมูล student_boarding_status:', deleteBoardingError);
    } else {
      console.log('✅ ลบข้อมูล student_boarding_status สำเร็จ');
    }

    // 4. ลบข้อมูลการลาวันนี้ (leave_requests)
    const today = new Date().toISOString().split('T')[0];
    console.log(`🗑️  ลบข้อมูลการลาวันนี้ (${today})...`);
    const { error: deleteLeaveError } = await supabase
      .from('leave_requests')
      .delete()
      .eq('leave_date', today);

    if (deleteLeaveError) {
      console.error('❌ ไม่สามารถลบข้อมูลการลา:', deleteLeaveError);
    } else {
      console.log('✅ ลบข้อมูลการลาวันนี้สำเร็จ');
    }

    // 5. รีเซ็ตสถานะคนขับเป็น 'go'
    console.log('🚌 รีเซ็ตสถานะคนขับเป็น "go"...');
    const { error: driverError } = await supabase
      .from('driver_bus')
      .update({ 
        trip_phase: 'go'
      })
      .neq('driver_id', 0);

    if (driverError) {
      console.error('❌ ไม่สามารถรีเซ็ตสถานะคนขับได้:', driverError);
    } else {
      console.log('✅ รีเซ็ตสถานะคนขับสำเร็จ');
    }

    // 6. สร้างข้อมูล student_boarding_status ใหม่สำหรับนักเรียนที่ active
    console.log('👥 สร้างข้อมูล boarding status ใหม่...');
    
    // ดึงข้อมูลคนขับคนแรก
    const { data: drivers, error: driversError } = await supabase
      .from('driver_bus')
      .select('driver_id')
      .limit(1);

    if (driversError || !drivers || drivers.length === 0) {
      console.error('❌ ไม่พบข้อมูลคนขับ:', driversError);
      return;
    }

    const driverId = drivers[0].driver_id;
    
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name')
      .eq('status', 'active')
      .order('student_id');

    if (studentsError) {
      console.error('❌ ไม่สามารถดึงข้อมูลนักเรียนได้:', studentsError);
      return;
    }

    if (students && students.length > 0) {
      const boardingData = students.map(student => ({
        student_id: student.student_id,
        driver_id: driverId,
        boarding_status: 'waiting',
        trip_date: today,
        trip_phase: 'go'
      }));

      const { error: insertError } = await supabase
        .from('student_boarding_status')
        .insert(boardingData);

      if (insertError) {
        console.error('❌ ไม่สามารถสร้างข้อมูล boarding status ใหม่ได้:', insertError);
      } else {
        console.log(`✅ สร้างข้อมูล boarding status ใหม่สำเร็จ (${students.length} คน)`);
        console.log('📋 รายชื่อนักเรียน:');
        students.forEach((student, index) => {
          console.log(`   ${index + 1}. ${student.student_name} (ID: ${student.student_id})`);
        });
      }
    } else {
      console.log('⚠️  ไม่พบนักเรียนที่ active');
    }

    console.log('\n🎉 รีเซ็ตระบบสำหรับการทดสอบเสร็จสิ้น!');
    console.log('📱 ตอนนี้สามารถทดสอบการขึ้น-ลงรถได้ใหม่แล้ว');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการรีเซ็ตระบบ:', error);
  }
}

// รันฟังก์ชัน
resetForTesting().then(() => {
  console.log('✅ สคริปต์รีเซ็ตเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});