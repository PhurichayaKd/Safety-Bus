const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRouteAssignment() {
  console.log('=== ตรวจสอบการกำหนด Route ===\n');

  try {
    // 1. ตรวจสอบข้อมูลนักเรียนรหัส 100021 และ route assignment
    console.log('1. ข้อมูลนักเรียนรหัส 100021 และ route assignment:');
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        is_active,
        route_students (
          route_id,
          stop_order
        )
      `)
      .eq('student_id', 100021)
      .single();

    if (studentError) {
      console.error('Error:', studentError);
      return;
    }

    console.log('Student Data:', JSON.stringify(studentData, null, 2));

    // 2. ตรวจสอบข้อมูล driver และ route assignment
    console.log('\n2. ข้อมูล driver และ route assignment:');
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select(`
        driver_id,
        route_id,
        routes (
          route_name
        )
      `);

    if (driverError) {
      console.error('Error:', driverError);
      return;
    }

    console.log('Driver Data:', JSON.stringify(driverData, null, 2));

    // 3. ตรวจสอบ route ทั้งหมดในระบบ
    console.log('\n3. Route ทั้งหมดในระบบ:');
    const { data: routesData, error: routesError } = await supabase
      .from('routes')
      .select('*');

    if (routesError) {
      console.error('Error:', routesError);
      return;
    }

    console.log('All Routes:', JSON.stringify(routesData, null, 2));

    // 4. ตรวจสอบนักเรียนทั้งหมดที่มี route assignment
    console.log('\n4. นักเรียนทั้งหมดที่มี route assignment:');
    const { data: allStudentRoutes, error: allStudentRoutesError } = await supabase
      .from('route_students')
      .select(`
        student_id,
        route_id,
        stop_order,
        students (
          student_name
        )
      `)
      .order('route_id', { ascending: true })
      .order('stop_order', { ascending: true });

    if (allStudentRoutesError) {
      console.error('Error:', allStudentRoutesError);
      return;
    }

    console.log('All Student Route Assignments:', JSON.stringify(allStudentRoutes, null, 2));

    // 5. วิเคราะห์ปัญหา
    console.log('\n=== วิเคราะห์ปัญหา ===');
    
    const studentRouteId = studentData?.route_students?.[0]?.route_id;
    console.log(`นักเรียนรหัส 100021 มี route_id: ${studentRouteId || 'ไม่มี'}`);
    
    if (driverData && driverData.length > 0) {
      driverData.forEach((driver, index) => {
        console.log(`Driver ${driver.driver_id} มี route_id: ${driver.route_id}`);
        
        if (studentRouteId && driver.route_id === studentRouteId) {
          console.log(`✅ นักเรียนรหัส 100021 และ Driver ${driver.driver_id} อยู่ใน route เดียวกัน (${driver.route_id})`);
        } else if (studentRouteId) {
          console.log(`❌ นักเรียนรหัส 100021 (route ${studentRouteId}) และ Driver ${driver.driver_id} (route ${driver.route_id}) ไม่อยู่ใน route เดียวกัน`);
        } else {
          console.log(`❌ นักเรียนรหัส 100021 ไม่มีการกำหนด route`);
        }
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkRouteAssignment();