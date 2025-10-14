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

async function checkStudentStatus() {
  console.log('🔍 ตรวจสอบสถานะปัจจุบันของนักเรียน');
  console.log('=' .repeat(60));

  try {
    // ตรวจสอบตาราง student_boarding_status
    const { data: boardingStatus, error: boardingError } = await supabase
      .from('student_boarding_status')
      .select('*')
      .order('student_id');

    if (boardingError) {
      console.error('❌ ไม่สามารถดึงข้อมูล student_boarding_status ได้:', boardingError);
    } else {
      console.log(`📊 พบข้อมูล boarding status ${boardingStatus?.length || 0} รายการ`);
      
      if (boardingStatus && boardingStatus.length > 0) {
        console.log('\n📋 ข้อมูล boarding status:');
        console.log('-'.repeat(80));
        console.log('Student ID\t| Status\t| Timestamp');
        console.log('-'.repeat(80));
        
        let sentCount = 0;
        let pickedUpCount = 0;
        let waitingCount = 0;
        
        boardingStatus.forEach(status => {
          console.log(`${status.student_id}\t\t| ${status.boarding_status}\t| ${status.created_at}`);
          
          if (status.boarding_status === 'dropped') sentCount++;
          else if (status.boarding_status === 'boarded') pickedUpCount++;
          else if (status.boarding_status === 'waiting') waitingCount++;
        });
        
        console.log('-'.repeat(80));
        console.log('\n📈 สรุปสถานะ boarding:');
        console.log(`🟡 waiting (รอรับ): ${waitingCount} คน`);
        console.log(`🟢 boarded (รับแล้ว): ${pickedUpCount} คน`);
        console.log(`🔵 dropped (ส่งแล้ว): ${sentCount} คน`);
        
        if (sentCount > 0) {
          console.log(`\n⚠️  พบนักเรียน ${sentCount} คนที่มีสถานะ "ส่งแล้ว" ต้องรีเซ็ตเป็น "รอรับ"`);
        }
      }
    }

    // ตรวจสอบตาราง students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name, status')
      .order('student_id');

    if (studentsError) {
      console.error('❌ ไม่สามารถดึงข้อมูล students ได้:', studentsError);
    } else {
      console.log(`\n📊 พบนักเรียนทั้งหมด ${students?.length || 0} คน`);
      
      if (students && students.length > 0) {
        console.log('\n📋 สถานะนักเรียนในตาราง students:');
        console.log('-'.repeat(60));
        console.log('Student ID\t| ชื่อ\t\t\t| Status');
        console.log('-'.repeat(60));
        
        let activeCount = 0;
        let inactiveCount = 0;
        
        students.forEach(student => {
          console.log(`${student.student_id}\t\t| ${student.student_name.padEnd(20)}\t| ${student.status}`);
          
          if (student.status === 'active') activeCount++;
          else inactiveCount++;
        });
        
        console.log('-'.repeat(60));
        console.log(`\n📈 สรุปสถานะ students: Active: ${activeCount}, Inactive: ${inactiveCount}`);
      }
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// รันการตรวจสอบ
checkStudentStatus().then(() => {
  console.log('\n✅ การตรวจสอบเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});