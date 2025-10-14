import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ixqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MzQ0MDAsImV4cCI6MjA1MDAxMDQwMH0.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetForNewDay() {
  try {
    console.log('🌅 เริ่มรีเซ็ตระบบสำหรับวันใหม่');
    console.log('============================================================');

    // 1. ตรวจสอบข้อมูลปัจจุบัน
    console.log('📊 ตรวจสอบข้อมูลปัจจุบัน...');
    
    const { data: currentData, error: currentError } = await supabase
      .from('student_boarding_status')
      .select('*')
      .order('student_id');

    if (currentError) {
      console.error('❌ ไม่สามารถดึงข้อมูลปัจจุบันได้:', currentError);
    } else {
      console.log(`📋 พบข้อมูล boarding status: ${currentData?.length || 0} รายการ`);
      
      if (currentData && currentData.length > 0) {
        console.log('📅 วันที่เก่า:', currentData[0].trip_date);
        
        const statusSummary = {};
        currentData.forEach(item => {
          statusSummary[item.boarding_status] = (statusSummary[item.boarding_status] || 0) + 1;
        });
        
        console.log('📈 สถานะเก่า:');
        Object.entries(statusSummary).forEach(([status, count]) => {
          console.log(`   ${status}: ${count} คน`);
        });
      }
    }

    // 2. ล้างข้อมูลเก่าทั้งหมด
    console.log('\n🧹 ล้างข้อมูล boarding status เก่าทั้งหมด...');
    
    const { error: deleteError } = await supabase
      .from('student_boarding_status')
      .delete()
      .neq('student_id', 0); // ลบทั้งหมด

    if (deleteError) {
      console.error('❌ ไม่สามารถล้างข้อมูลเก่าได้:', deleteError);
      return;
    }

    console.log('✅ ล้างข้อมูลเก่าเสร็จสิ้น');

    // 3. ดึงรายชื่อนักเรียน active
    console.log('\n👥 ดึงรายชื่อนักเรียน active...');
    
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name')
      .eq('is_active', true)
      .order('student_id');

    if (studentsError) {
      console.error('❌ ไม่สามารถดึงรายชื่อนักเรียนได้:', studentsError);
      return;
    }

    console.log(`📊 พบนักเรียน active: ${students?.length || 0} คน`);

    if (!students || students.length === 0) {
      console.log('⚠️  ไม่พบนักเรียน active');
      return;
    }

    // 4. ดึงข้อมูลคนขับ
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id')
      .limit(1);

    if (driverError || !driverData || driverData.length === 0) {
      console.error('❌ ไม่สามารถดึงข้อมูลคนขับได้:', driverError);
      return;
    }

    const driverId = driverData[0].driver_id;
    console.log(`🚌 ใช้คนขับ ID: ${driverId}`);

    // 5. สร้างสถานะเริ่มต้นใหม่สำหรับวันใหม่
    const today = new Date().toISOString().split('T')[0]; // วันที่ปัจจุบัน YYYY-MM-DD
    console.log(`\n📅 สร้างสถานะใหม่สำหรับวันที่: ${today}`);
    console.log('📝 สร้างสถานะ "waiting" สำหรับนักเรียนทุกคน...');

    const newBoardingStatus = students.map(student => ({
      student_id: student.student_id,
      boarding_status: 'waiting',
      driver_id: driverId,
      trip_date: today,
      trip_phase: 'go',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { data: insertData, error: insertError } = await supabase
      .from('student_boarding_status')
      .insert(newBoardingStatus)
      .select();

    if (insertError) {
      console.error('❌ ไม่สามารถสร้างสถานะใหม่ได้:', insertError);
      return;
    }

    console.log(`✅ สร้างสถานะใหม่สำเร็จ: ${insertData?.length || 0} รายการ`);

    // 6. แสดงผลลัพธ์
    console.log('\n📋 สถานะใหม่ที่สร้างขึ้น:');
    console.log('-'.repeat(70));
    console.log('Student ID      | ชื่อ                  | สถานะ     | วันที่');
    console.log('-'.repeat(70));

    students.forEach(student => {
      console.log(`${student.student_id.toString().padEnd(15)} | ${student.student_name.padEnd(20)} | waiting   | ${today}`);
    });

    console.log('-'.repeat(70));

    // 7. ตรวจสอบผลลัพธ์
    console.log('\n🔍 ตรวจสอบผลลัพธ์...');
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('student_boarding_status')
      .select('*')
      .eq('trip_date', today)
      .order('student_id');

    if (verifyError) {
      console.error('❌ ไม่สามารถตรวจสอบผลลัพธ์ได้:', verifyError);
    } else {
      console.log(`✅ ตรวจสอบผลลัพธ์: พบข้อมูล ${verifyData?.length || 0} รายการสำหรับวันที่ ${today}`);
      
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