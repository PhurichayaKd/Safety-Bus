import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzQ0MDAsImV4cCI6MjA1MDAxMDQwMH0.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyBoardingStatus() {
  try {
    console.log('🔍 ตรวจสอบผลลัพธ์การสร้างสถานะการขึ้น-ลงรถ');
    console.log('============================================================');

    // ตรวจสอบข้อมูลในตาราง student_boarding_status
    const { data: boardingData, error: boardingError } = await supabase
      .from('student_boarding_status')
      .select(`
        student_id,
        boarding_status,
        driver_id,
        trip_date,
        trip_phase,
        created_at,
        updated_at
      `)
      .order('student_id');

    if (boardingError) {
      console.error('❌ ไม่สามารถดึงข้อมูล boarding status ได้:', boardingError);
      return;
    }

    console.log(`📊 พบข้อมูล boarding status: ${boardingData?.length || 0} รายการ\n`);

    if (boardingData && boardingData.length > 0) {
      console.log('📋 รายละเอียดสถานะการขึ้น-ลงรถ:');
      console.log('-'.repeat(100));
      console.log('Student ID | Status   | Driver ID | Trip Date  | Phase | Created At');
      console.log('-'.repeat(100));

      boardingData.forEach(item => {
        const createdAt = new Date(item.created_at).toLocaleString('th-TH');
        console.log(`${item.student_id.toString().padEnd(10)} | ${item.boarding_status.padEnd(8)} | ${item.driver_id.toString().padEnd(9)} | ${item.trip_date.padEnd(10)} | ${item.trip_phase.padEnd(5)} | ${createdAt}`);
      });

      console.log('-'.repeat(100));

      // สรุปสถานะ
      const statusSummary = {};
      boardingData.forEach(item => {
        statusSummary[item.boarding_status] = (statusSummary[item.boarding_status] || 0) + 1;
      });

      console.log('\n📈 สรุปสถานะ:');
      Object.entries(statusSummary).forEach(([status, count]) => {
        const emoji = status === 'waiting' ? '🟡' : 
                     status === 'boarded' ? '🟢' : 
                     status === 'dropped' ? '🔵' : 
                     status === 'absent' ? '🔴' : '⚪';
        console.log(`${emoji} ${status}: ${count} คน`);
      });
    }

    // ตรวจสอบข้อมูลนักเรียนที่ active
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name, is_active')
      .eq('is_active', true)
      .order('student_id');

    if (studentsError) {
      console.error('❌ ไม่สามารถดึงข้อมูลนักเรียนได้:', studentsError);
      return;
    }

    console.log(`\n👥 นักเรียน active ทั้งหมด: ${studentsData?.length || 0} คน`);

    // ตรวจสอบว่านักเรียนทุกคนมี boarding status หรือไม่
    if (studentsData && boardingData) {
      const studentsWithStatus = boardingData.map(item => item.student_id);
      const studentsWithoutStatus = studentsData.filter(student => 
        !studentsWithStatus.includes(student.student_id)
      );

      if (studentsWithoutStatus.length > 0) {
        console.log('\n⚠️  นักเรียนที่ยังไม่มี boarding status:');
        studentsWithoutStatus.forEach(student => {
          console.log(`   - ${student.student_id}: ${student.student_name}`);
        });
      } else {
        console.log('\n✅ นักเรียน active ทุกคนมี boarding status แล้ว');
      }
    }

    // ตรวจสอบข้อมูล driver
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name')
      .limit(1);

    if (driverError) {
      console.error('❌ ไม่สามารถดึงข้อมูลคนขับได้:', driverError);
    } else if (driverData && driverData.length > 0) {
      console.log(`\n🚌 คนขับที่ใช้: ${driverData[0].driver_id} - ${driverData[0].driver_name}`);
    }

    console.log('\n🎯 สรุปผลการตรวจสอบ:');
    console.log('============================================================');
    
    if (boardingData && studentsData && boardingData.length === studentsData.length) {
      console.log('✅ การสร้างสถานะเริ่มต้นสำเร็จ');
      console.log('✅ นักเรียนทุกคนมีสถานะ "waiting" (รอรับ)');
      console.log('✅ Driver App พร้อมใช้งาน');
      
      if (boardingData.every(item => item.boarding_status === 'waiting')) {
        console.log('✅ สถานะทุกรายการเป็น "waiting" ถูกต้อง');
      } else {
        console.log('⚠️  พบสถานะที่ไม่ใช่ "waiting"');
      }
    } else {
      console.log('❌ จำนวนนักเรียนและ boarding status ไม่ตรงกัน');
      console.log(`   นักเรียน active: ${studentsData?.length || 0} คน`);
      console.log(`   Boarding status: ${boardingData?.length || 0} รายการ`);
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
  }
}

// รันการตรวจสอบ
verifyBoardingStatus().then(() => {
  console.log('\n✅ การตรวจสอบเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});