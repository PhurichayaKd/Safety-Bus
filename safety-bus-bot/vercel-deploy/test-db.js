import 'dotenv/config';
import { supabase } from './lib/db.js';

async function testDatabase() {
  console.log('🔍 Testing database connection...');
  
  try {
    // ทดสอบการเชื่อมต่อฐานข้อมูล
    const { data: tables, error: tablesError } = await supabase
      .from('students')
      .select('count')
      .limit(1);
    
    if (tablesError) {
      console.error('❌ Database connection failed:', tablesError);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // ค้นหาข้อมูลนักเรียนที่มีรหัส 246662
    console.log('\n🔍 Searching for student with code 246662...');
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('link_code', '246662')
      .single();
    
    if (studentError) {
      console.log('❌ Student not found:', studentError.message);
    } else {
      console.log('✅ Student found:', student);
    }
    
    // ค้นหาการผูกบัญชีของ LINE ID tartar-c-v
    console.log('\n🔍 Searching for LINE ID tartar-c-v...');
    
    // ตรวจสอบในตาราง student_line_links
    const { data: studentLink, error: studentLinkError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('line_user_id', 'tartar-c-v');
    
    console.log('👨‍🎓 Student links:', { studentLink, studentLinkError });
    
    // ตรวจสอบในตาราง parent_line_links
    const { data: parentLink, error: parentLinkError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('line_user_id', 'tartar-c-v');
    
    console.log('👨‍👩‍👧‍👦 Parent links:', { parentLink, parentLinkError });
    
    // ดูข้อมูลทั้งหมดในตาราง students
    console.log('\n📋 All students in database:');
    const { data: allStudents, error: allStudentsError } = await supabase
      .from('students')
      .select('student_id, student_name, link_code, student_line_id, parent_line_id')
      .limit(10);
    
    if (allStudentsError) {
      console.log('❌ Error fetching students:', allStudentsError);
    } else {
      console.log('✅ Students:', allStudents);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDatabase();