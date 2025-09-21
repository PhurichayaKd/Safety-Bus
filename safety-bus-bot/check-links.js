import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkLinks() {
  console.log('🔍 ตรวจสอบข้อมูลการเชื่อมโยง...');
  
  try {
    // ตรวจสอบข้อมูลใน parent_line_links
    console.log('\n📋 ข้อมูลใน parent_line_links:');
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*');
    
    if (parentError) {
      console.log('❌ Error:', parentError.message);
    } else {
      console.log('✅ จำนวนข้อมูล:', parentLinks?.length || 0);
      parentLinks?.forEach((link, index) => {
        console.log(`${index + 1}. ID: ${link.id || link.link_id}, Parent ID: ${link.parent_id}, LINE User: ${link.line_user_id}, Active: ${link.active}`);
      });
    }
    
    // ตรวจสอบข้อมูลใน student_line_links
    console.log('\n📋 ข้อมูลใน student_line_links:');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*');
    
    if (studentError) {
      console.log('❌ Error:', studentError.message);
    } else {
      console.log('✅ จำนวนข้อมูล:', studentLinks?.length || 0);
      studentLinks?.forEach((link, index) => {
        console.log(`${index + 1}. ID: ${link.id || link.link_id}, Student ID: ${link.student_id}, LINE User: ${link.line_user_id}, Active: ${link.active}`);
      });
    }
    
    // ตรวจสอบข้อมูลใน driver_line_links
    console.log('\n📋 ข้อมูลใน driver_line_links:');
    const { data: driverLinks, error: driverError } = await supabase
      .from('driver_line_links')
      .select('*');
    
    if (driverError) {
      console.log('❌ Error:', driverError.message);
    } else {
      console.log('✅ จำนวนข้อมูล:', driverLinks?.length || 0);
      driverLinks?.forEach((link, index) => {
        console.log(`${index + 1}. ID: ${link.id}, Student ID: ${link.student_id}, LINE User: ${link.line_user_id}, Driver: ${link.driver_name}, Active: ${link.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error);
  }
}

checkLinks();