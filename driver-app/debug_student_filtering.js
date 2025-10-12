const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugStudentFiltering() {
  console.log('🔍 เริ่มการวิเคราะห์เงื่อนไขการ filter นักเรียน...\n');

  try {
    // 1. ตรวจสอบข้อมูล Driver 1
    console.log('1️⃣ ตรวจสอบข้อมูล Driver 1:');
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name, route_id')
      .eq('driver_id', 1)
      .single();

    if (driverError) {
      console.error('❌ Error fetching driver:', driverError);
      return;
    }

    console.log('✅ Driver 1 data:', driverData);
    const driverRouteId = driverData.route_id;
    console.log(`📍 Driver 1 route_id: ${driverRouteId}\n`);

    // 2. ตรวจสอบข้อมูลนักเรียน 100021 แบบละเอียด
    console.log('2️⃣ ตรวจสอบข้อมูลนักเรียน 100021 แบบละเอียด:');
    const { data: studentDetailData, error: studentDetailError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        student_phone,
        status,
        home_latitude,
        home_longitude,
        is_active,
        created_at,
        updated_at,
        parent_id,
        start_date,
        end_date
      `)
      .eq('student_id', 100021)
      .single();

    if (studentDetailError) {
      console.error('❌ Error fetching student detail:', studentDetailError);
      return;
    }

    console.log('✅ Student 100021 detail:', studentDetailData);

    // 3. ตรวจสอบ route assignment ของนักเรียน 100021
    console.log('\n3️⃣ ตรวจสอบ route assignment ของนักเรียน 100021:');
    const { data: routeAssignmentData, error: routeAssignmentError } = await supabase
      .from('route_students')
      .select('route_id, stop_order')
      .eq('student_id', 100021);

    if (routeAssignmentError) {
      console.error('❌ Error fetching route assignment:', routeAssignmentError);
    } else {
      console.log('✅ Route assignments:', routeAssignmentData);
      
      // ตรวจสอบว่ามี route assignment ที่ตรงกับ driver หรือไม่
      const matchingRoute = routeAssignmentData.find(ra => ra.route_id === driverRouteId);
      if (matchingRoute) {
        console.log(`✅ พบ route assignment ที่ตรงกัน: route_id=${matchingRoute.route_id}, stop_order=${matchingRoute.stop_order}`);
      } else {
        console.log(`❌ ไม่พบ route assignment ที่ตรงกับ driver route_id=${driverRouteId}`);
      }
    }

    // 4. ตรวจสอบ RFID card assignment
    console.log('\n4️⃣ ตรวจสอบ RFID card assignment ของนักเรียน 100021:');
    const { data: rfidData, error: rfidError } = await supabase
      .from('rfid_card_assignments')
      .select(`
        card_id,
        is_active,
        valid_from,
        valid_to,
        rfid_cards (
          rfid_code,
          status,
          is_active
        )
      `)
      .eq('student_id', 100021);

    if (rfidError) {
      console.error('❌ Error fetching RFID assignments:', rfidError);
    } else {
      console.log('✅ RFID assignments:', JSON.stringify(rfidData, null, 2));
      
      // ตรวจสอบ active RFID
      const activeRfid = rfidData.find(assignment => 
        assignment.is_active === true && assignment.valid_to === null
      );
      
      if (activeRfid) {
        console.log(`✅ พบ active RFID: ${activeRfid.rfid_cards?.rfid_code}`);
      } else {
        console.log('❌ ไม่พบ active RFID card');
      }
    }

    // 5. ตรวจสอบใบลาวันนี้
    console.log('\n5️⃣ ตรวจสอบใบลาวันนี้:');
    const today = new Date().toISOString().split('T')[0];
    const { data: leaveData, error: leaveError } = await supabase
      .from('leave_requests')
      .select('id, leave_date, status, leave_type, created_at')
      .eq('student_id', 100021)
      .eq('leave_date', today);

    if (leaveError) {
      console.error('❌ Error fetching leave requests:', leaveError);
    } else {
      console.log(`✅ Leave requests for today (${today}):`, leaveData);
      
      const approvedLeave = leaveData.find(leave => leave.status === 'approved');
      if (approvedLeave) {
        console.log('❌ นักเรียนมีใบลาที่อนุมัติแล้ววันนี้ - นี่อาจเป็นสาเหตุที่ไม่แสดง');
      } else {
        console.log('✅ ไม่มีใบลาที่อนุมัติวันนี้');
      }
    }

    // 6. ทดสอบ query แบบเดียวกับที่ใช้ในแอป
    console.log('\n6️⃣ ทดสอบ query แบบเดียวกับที่ใช้ในแอป:');
    const { data: appQueryData, error: appQueryError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        student_phone,
        status,
        home_latitude,
        home_longitude,
        primary_parent:students_parent_id_fkey ( parent_phone ),
        route_students!left (
          stop_order,
          route_id
        ),
        rfid_card_assignments!left (
          is_active,
          valid_to,
          rfid_cards (
            rfid_code
          )
        )
      `)
      .eq('is_active', true)
      .eq('student_id', 100021);

    if (appQueryError) {
      console.error('❌ Error with app query:', appQueryError);
    } else {
      console.log('✅ App query result:', JSON.stringify(appQueryData, null, 2));
      
      if (appQueryData && appQueryData.length > 0) {
        const student = appQueryData[0];
        
        // ตรวจสอบ route assignment สำหรับ driver route
        const routeAssignment = student.route_students?.find(rs => rs.route_id === driverRouteId);
        console.log(`📍 Route assignment for driver route ${driverRouteId}:`, routeAssignment);
        
        // ตรวจสอบ active RFID
        const activeRfidAssignment = student.rfid_card_assignments?.find(assignment => 
          assignment.is_active === true && assignment.valid_to === null
        );
        const rfidCode = activeRfidAssignment?.rfid_cards?.rfid_code || null;
        console.log(`🏷️ Active RFID code: ${rfidCode}`);
        
        // สรุปผลการตรวจสอบ
        console.log('\n📊 สรุปผลการตรวจสอบ:');
        console.log(`- นักเรียน is_active: ${student.is_active || 'undefined'}`);
        console.log(`- มี route assignment สำหรับ driver route: ${routeAssignment ? 'YES' : 'NO'}`);
        console.log(`- มี active RFID: ${rfidCode ? 'YES' : 'NO'}`);
        
        if (!routeAssignment) {
          console.log('❌ สาเหตุหลัก: นักเรียนไม่มี route assignment สำหรับ route ของ driver');
        } else if (!rfidCode) {
          console.log('⚠️ นักเรียนไม่มี active RFID card');
        } else {
          console.log('✅ นักเรียนควรแสดงในแอป - ตรวจสอบเงื่อนไขอื่น');
        }
      } else {
        console.log('❌ ไม่พบนักเรียนจาก app query');
      }
    }

    // 7. ตรวจสอบนักเรียนคนอื่นที่แสดงได้
    console.log('\n7️⃣ ตรวจสอบนักเรียนคนอื่นที่อยู่ใน route เดียวกัน:');
    const { data: otherStudentsData, error: otherStudentsError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        is_active,
        route_students!left (
          stop_order,
          route_id
        )
      `)
      .eq('is_active', true)
      .limit(5);

    if (otherStudentsError) {
      console.error('❌ Error fetching other students:', otherStudentsError);
    } else {
      console.log('✅ ตัวอย่างนักเรียนอื่นๆ:');
      otherStudentsData.forEach(student => {
        const hasDriverRoute = student.route_students?.some(rs => rs.route_id === driverRouteId);
        console.log(`- ${student.student_id}: ${student.student_name} (route match: ${hasDriverRoute ? 'YES' : 'NO'})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// รันการวิเคราะห์
debugStudentFiltering().then(() => {
  console.log('\n🏁 การวิเคราะห์เสร็จสิ้น');
}).catch(error => {
  console.error('❌ Script error:', error);
});