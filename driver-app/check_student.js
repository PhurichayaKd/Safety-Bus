const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStudent100021() {
  console.log('=== ตรวจสอบข้อมูลนักเรียนรหัส 100021 ===\n');

  try {
    // 1. ตรวจสอบข้อมูลนักเรียนในตาราง students
    console.log('1. ข้อมูลนักเรียนในตาราง students:');
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', 100021);

    if (studentError) {
      console.error('Error:', studentError);
    } else {
      console.log(JSON.stringify(studentData, null, 2));
    }

    // 2. ตรวจสอบการกำหนด route
    console.log('\n2. การกำหนด route ของนักเรียน:');
    const { data: routeData, error: routeError } = await supabase
      .from('route_students')
      .select(`
        *,
        routes (
          route_id,
          route_name
        )
      `)
      .eq('student_id', 100021);

    if (routeError) {
      console.error('Error:', routeError);
    } else {
      console.log(JSON.stringify(routeData, null, 2));
    }

    // 3. ตรวจสอบ RFID card assignments
    console.log('\n3. RFID card assignments:');
    const { data: rfidData, error: rfidError } = await supabase
      .from('rfid_card_assignments')
      .select(`
        *,
        rfid_cards (
          card_id,
          rfid_code,
          status,
          is_active
        )
      `)
      .eq('student_id', 100021);

    if (rfidError) {
      console.error('Error:', rfidError);
    } else {
      console.log(JSON.stringify(rfidData, null, 2));
    }

    // 4. ตรวจสอบใบลาในวันนี้
    console.log('\n4. ใบลาในวันนี้:');
    const today = new Date().toISOString().split('T')[0];
    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('student_id', 100021)
      .eq('leave_date', today);

    if (leaveError) {
      console.error('Error:', leaveError);
    } else {
      console.log(JSON.stringify(leaveData, null, 2));
    }

    // 5. ตรวจสอบ driver ที่มี route เดียวกัน
    console.log('\n5. Driver ที่มี route เดียวกัน:');
    if (routeData && routeData.length > 0) {
      const routeId = routeData[0].route_id;
      const { data: driverData, error: driverError } = await supabase
        .from('driver_bus')
        .select('*')
        .eq('route_id', routeId);

      if (driverError) {
        console.error('Error:', driverError);
      } else {
        console.log(JSON.stringify(driverData, null, 2));
      }
    } else {
      console.log('ไม่พบการกำหนด route');
    }

    // 6. ทดสอบ query เดียวกับที่ใช้ในแอป
    console.log('\n6. ทดสอบ query เดียวกับที่ใช้ในแอป:');
    const { data: appQueryData, error: appQueryError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        home_latitude,
        home_longitude,
        student_phone,
        is_active,
        status,
        rfid_card_assignments (
          card_id,
          is_active,
          valid_to,
          rfid_cards (
            rfid_code
          )
        )
      `)
      .eq('is_active', true)
      .in('student_id', [
        (await supabase
          .from('route_students')
          .select('student_id')
          .eq('route_id', routeData && routeData.length > 0 ? routeData[0].route_id : 1)
        ).data?.map(r => r.student_id) || []
      ]);

    if (appQueryError) {
      console.error('Error:', appQueryError);
    } else {
      console.log(JSON.stringify(appQueryData, null, 2));
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkStudent100021();