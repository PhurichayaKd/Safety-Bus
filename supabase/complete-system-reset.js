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

async function completeSystemReset() {
  console.log('🔄 เริ่มการรีเซ็ตระบบทั้งหมดสำหรับวันใหม่');
  console.log('=' .repeat(60));

  try {
    // 1. เคลียร์ข้อมูลในตาราง student_boarding_status
    console.log('\n🗑️  เคลียร์ข้อมูล student_boarding_status...');
    const { error: clearBoardingError } = await supabase
      .from('student_boarding_status')
      .delete()
      .neq('status_id', 0); // ลบทั้งหมด

    if (clearBoardingError) {
      console.error('❌ ไม่สามารถเคลียร์ student_boarding_status:', clearBoardingError);
    } else {
      console.log('✅ เคลียร์ student_boarding_status สำเร็จ');
    }

    // 2. เคลียร์ข้อมูลในตาราง pickup_dropoff
    console.log('\n🗑️  เคลียร์ข้อมูล pickup_dropoff...');
    const { error: clearPickupError } = await supabase
      .from('pickup_dropoff')
      .delete()
      .neq('record_id', 0); // ลบทั้งหมด

    if (clearPickupError) {
      console.error('❌ ไม่สามารถเคลียร์ pickup_dropoff:', clearPickupError);
    } else {
      console.log('✅ เคลียร์ pickup_dropoff สำเร็จ');
    }

    // 3. เคลียร์ข้อมูลในตาราง rfid_scan_logs
    console.log('\n🗑️  เคลียร์ข้อมูล rfid_scan_logs...');
    const { error: clearScanError } = await supabase
      .from('rfid_scan_logs')
      .delete()
      .neq('scan_id', 0); // ลบทั้งหมด

    if (clearScanError) {
      console.error('❌ ไม่สามารถเคลียร์ rfid_scan_logs:', clearScanError);
    } else {
      console.log('✅ เคลียร์ rfid_scan_logs สำเร็จ');
    }

    // 4. รีเซ็ตสถานะ driver ในตาราง driver_bus
    console.log('\n🔄 รีเซ็ตสถานะ driver...');
    const { error: resetDriverError } = await supabase
      .from('driver_bus')
      .update({
        current_status: 'inactive',
        trip_phase: 'go',
        current_latitude: null,
        current_longitude: null,
        current_updated_at: null
      })
      .neq('driver_id', 0); // อัปเดตทั้งหมด

    if (resetDriverError) {
      console.error('❌ ไม่สามารถรีเซ็ตสถานะ driver:', resetDriverError);
    } else {
      console.log('✅ รีเซ็ตสถานะ driver สำเร็จ');
    }

    // 5. ดึงข้อมูลนักเรียน active
    console.log('\n👥 ดึงข้อมูลนักเรียน active...');
    const { data: activeStudents, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name')
      .eq('is_active', true)
      .order('student_id');

    if (studentsError) {
      console.error('❌ ไม่สามารถดึงข้อมูลนักเรียน:', studentsError);
      return;
    }

    console.log(`📊 พบนักเรียน active จำนวน ${activeStudents.length} คน`);

    // 6. ดึงข้อมูล driver
    console.log('\n🚌 ดึงข้อมูล driver...');
    const { data: drivers, error: driversError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name')
      .eq('is_active', true)
      .limit(1);

    if (driversError || !drivers || drivers.length === 0) {
      console.error('❌ ไม่พบข้อมูล driver:', driversError);
      return;
    }

    const driver = drivers[0];
    console.log(`🚌 ใช้ driver: ${driver.driver_name} (ID: ${driver.driver_id})`);

    // 7. ดึงข้อมูล route ที่มีอยู่
    console.log('\n🛣️  ดึงข้อมูล route...');
    const { data: routes, error: routesError } = await supabase
      .from('routes')
      .select('route_id')
      .limit(1);

    if (routesError || !routes || routes.length === 0) {
      console.error('❌ ไม่พบข้อมูล route:', routesError);
      return;
    }

    const routeId = routes[0].route_id;
    console.log(`🛣️  ใช้ route_id: ${routeId}`);

    // 8. สร้างสถานะเริ่มต้นสำหรับวันนี้
    console.log('\n🆕 สร้างสถานะเริ่มต้นสำหรับวันนี้...');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const initialStatuses = activeStudents.map(student => ({
      student_id: student.student_id,
      driver_id: driver.driver_id,
      trip_date: today,
      trip_phase: 'go',
      boarding_status: 'waiting',
      route_id: routeId // ใช้ route_id ที่มีอยู่
    }));

    const { error: insertError } = await supabase
      .from('student_boarding_status')
      .insert(initialStatuses);

    if (insertError) {
      console.error('❌ ไม่สามารถสร้างสถานะเริ่มต้น:', insertError);
    } else {
      console.log(`✅ สร้างสถานะเริ่มต้นสำหรับ ${activeStudents.length} คน สำเร็จ`);
    }

    // 9. ตรวจสอบผลลัพธ์
    console.log('\n📋 ตรวจสอบผลลัพธ์...');
    const { data: newStatuses, error: checkError } = await supabase
      .from('student_boarding_status')
      .select('student_id, boarding_status, trip_date')
      .eq('trip_date', today)
      .order('student_id');

    if (checkError) {
      console.error('❌ ไม่สามารถตรวจสอบผลลัพธ์:', checkError);
    } else {
      console.log('\n📊 สถานะปัจจุบัน:');
      console.log('-'.repeat(50));
      newStatuses.forEach(status => {
        console.log(`Student ${status.student_id}: ${status.boarding_status} (${status.trip_date})`);
      });
      console.log('-'.repeat(50));
    }

    console.log('\n🎉 การรีเซ็ตระบบเสร็จสมบูรณ์!');
    console.log('📱 Driver App พร้อมใช้งานสำหรับวันใหม่');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการรีเซ็ตระบบ:', error);
  }
}

completeSystemReset().then(() => {
  console.log('\n✅ สคริปต์รีเซ็ตระบบเสร็จสิ้น');
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
});