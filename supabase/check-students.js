// สคริปต์ตรวจสอบข้อมูลนักเรียนในฐานข้อมูล
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkStudents() {
  console.log('🔍 Checking students in database...');
  
  try {
    // ดึงข้อมูลนักเรียน 5 คนแรก
    const { data: students, error } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        parent_id
      `)
      .limit(5);

    if (error) {
      console.error('❌ Error fetching students:', error);
      return;
    }

    if (!students || students.length === 0) {
      console.log('📭 No students found in database');
      return;
    }

    console.log(`📊 Found ${students.length} students:`);
    students.forEach((student, index) => {
      console.log(`${index + 1}. ID: ${student.student_id}, Name: ${student.student_name}, Grade: ${student.grade}, Parent ID: ${student.parent_id}`);
    });

    // ตรวจสอบ LINE links สำหรับนักเรียนคนแรก
    if (students.length > 0) {
      const firstStudent = students[0];
      console.log(`\n🔗 Checking LINE links for student: ${firstStudent.student_name} (${firstStudent.student_id})`);
      
      // ตรวจสอบ student LINE link
      const { data: studentLink, error: studentLinkError } = await supabase
        .from('student_line_links')
        .select('line_user_id, line_display_id, active')
        .eq('student_id', firstStudent.student_id);

      if (!studentLinkError && studentLink && studentLink.length > 0) {
        console.log('👨‍🎓 Student LINE links:', studentLink);
      } else {
        console.log('👨‍🎓 No student LINE links found');
      }

      // ตรวจสอบ parent LINE link
      const { data: parentLinks, error: parentLinkError } = await supabase
        .from('parent_line_links')
        .select(`
          line_user_id,
          active,
          parents!inner(parent_name)
        `)
        .eq('parent_id', firstStudent.parent_id);

      if (!parentLinkError && parentLinks && parentLinks.length > 0) {
        console.log('👨‍👩‍👧‍👦 Parent LINE links:', parentLinks);
      } else {
        console.log('👨‍👩‍👧‍👦 No parent LINE links found');
      }
    }

  } catch (error) {
    console.error('🚨 Error:', error);
  }
}

// รันการตรวจสอบ
checkStudents();