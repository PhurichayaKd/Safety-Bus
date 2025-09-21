import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log('🔍 ตรวจสอบตารางในฐานข้อมูล...');
  
  try {
    // ตรวจสอบตาราง parent_line_links
    console.log('\n📋 ตรวจสอบตาราง parent_line_links:');
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .limit(1);
    
    if (parentError) {
      console.log('❌ ตาราง parent_line_links:', parentError.message);
    } else {
      console.log('✅ ตาราง parent_line_links: มีอยู่');
      console.log('📊 จำนวนข้อมูล:', parentLinks?.length || 0);
    }
    
    // ตรวจสอบตาราง student_line_links
    console.log('\n📋 ตรวจสอบตาราง student_line_links:');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .limit(1);
    
    if (studentError) {
      console.log('❌ ตาราง student_line_links:', studentError.message);
    } else {
      console.log('✅ ตาราง student_line_links: มีอยู่');
      console.log('📊 จำนวนข้อมูล:', studentLinks?.length || 0);
    }
    
    // ตรวจสอบตาราง students
    console.log('\n📋 ตรวจสอบตาราง students:');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name, parent_id')
      .limit(5);
    
    if (studentsError) {
      console.log('❌ ตาราง students:', studentsError.message);
    } else {
      console.log('✅ ตาราง students: มีอยู่');
      console.log('📊 ตัวอย่างข้อมูล:', students);
    }
    
    // ตรวจสอบตาราง parents
    console.log('\n📋 ตรวจสอบตาราง parents:');
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('parent_id, parent_name, parent_phone')
      .limit(5);
    
    if (parentsError) {
      console.log('❌ ตาราง parents:', parentsError.message);
    } else {
      console.log('✅ ตาราง parents: มีอยู่');
      console.log('📊 ตัวอย่างข้อมูล:', parents);
    }
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error);
  }
}

checkTables();