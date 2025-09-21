import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ฟังก์ชัน checkLinkStatus เหมือนกับในไฟล์ account-linking.js
async function checkLinkStatus(lineUserId) {
  try {
    console.log(`🔍 ตรวจสอบสถานะการเชื่อมโยงสำหรับ LINE User ID: ${lineUserId}`);
    
    // ตรวจสอบการเชื่อมโยงจาก parent_line_links
    const { data: parentLink, error: parentError } = await supabase
      .from('parent_line_links')
      .select('link_id, parent_id, linked_at, active')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();
    
    console.log('📋 Parent Link Query Result:', { parentLink, parentError });
    
    if (parentLink && !parentError) {
      // หาข้อมูลนักเรียนจาก students table โดยตรง
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('student_id, student_name, grade')
        .eq('parent_id', parentLink.parent_id)
        .single();
      
      console.log('📋 Student Query Result:', { student, studentError });
      
      if (student && !studentError) {
        return {
          isLinked: true,
          link_id: parentLink.link_id,
          parent_id: parentLink.parent_id,
          parent_name: 'ผู้ปกครอง',
          student_id: student.student_id,
          student_name: student.student_name,
          linked_at: parentLink.linked_at,
          link_type: 'parent'
        };
      }
    }
    
    // ตรวจสอบการเชื่อมโยงจาก student_line_links
    const { data: studentLink, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        link_id, student_id, linked_at, active,
        students(student_id, student_name, grade)
      `)
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();
    
    console.log('📋 Student Link Query Result:', { studentLink, studentError });
    
    if (studentLink && !studentError && studentLink.students) {
      return {
        isLinked: true,
        link_id: studentLink.link_id,
        student_id: studentLink.students.student_id,
        student_name: studentLink.students.student_name,
        linked_at: studentLink.linked_at,
        link_type: 'student'
      };
    }
    
    return {
      isLinked: false,
      error: 'ไม่พบการผูกบัญชี'
    };
    
  } catch (error) {
    console.error('Error checking link status:', error);
    return {
      isLinked: false,
      error: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ'
    };
  }
}

async function testLinkStatus() {
  // ทดสอบกับ LINE User ID ที่มีอยู่
  const testUsers = [
    'Ue1de2d9dbed6fbf37ed494f3b44bb43a', // Parent link
    'tartar-c-v', // Student link
    'nonexistent-user' // ไม่มีในระบบ
  ];
  
  for (const userId of testUsers) {
    console.log('\n' + '='.repeat(50));
    const result = await checkLinkStatus(userId);
    console.log('✅ ผลลัพธ์:', JSON.stringify(result, null, 2));
  }
}

testLinkStatus();