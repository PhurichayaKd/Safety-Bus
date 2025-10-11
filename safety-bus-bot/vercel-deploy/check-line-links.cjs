const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkLineLinks() {
  console.log('🔍 ตรวจสอบข้อมูลการเชื่อมโยง LINE user...\n');
  
  try {
    // ตรวจสอบ student_line_links
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('active', true);
      
    if (studentError) {
      console.error('Error fetching student links:', studentError);
      return;
    }
      
    console.log('📊 Student Line Links:');
    console.log('จำนวนรายการ:', studentLinks?.length || 0);
    if (studentLinks && studentLinks.length > 0) {
      studentLinks.forEach((link, index) => {
        console.log(`${index + 1}. Student ID: ${link.student_id}, LINE User ID: ${link.line_user_id || 'ไม่มี'}, Display ID: ${link.line_display_id || 'ไม่มี'}`);
      });
    }
    
    console.log('\n📊 Parent Line Links:');
    // ตรวจสอบ parent_line_links
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('active', true);
      
    if (parentError) {
      console.error('Error fetching parent links:', parentError);
      return;
    }
      
    console.log('จำนวนรายการ:', parentLinks?.length || 0);
    if (parentLinks && parentLinks.length > 0) {
      parentLinks.forEach((link, index) => {
        console.log(`${index + 1}. Parent ID: ${link.parent_id}, LINE User ID: ${link.line_user_id || 'ไม่มี'}, Display ID: ${link.line_display_id || 'ไม่มี'}`);
      });
    }
    
    // ตรวจสอบรายการที่มี line_display_id แต่ไม่มี line_user_id
    console.log('\n⚠️ รายการที่มี Display ID แต่ไม่มี LINE User ID:');
    const incompleteStudents = studentLinks?.filter(link => link.line_display_id && !link.line_user_id) || [];
    const incompleteParents = parentLinks?.filter(link => link.line_display_id && !link.line_user_id) || [];
    
    console.log('Students:', incompleteStudents.length);
    console.log('Parents:', incompleteParents.length);
    
    if (incompleteStudents.length > 0) {
      console.log('\nStudents ที่ยังไม่ได้ผูก LINE User ID:');
      incompleteStudents.forEach((link, index) => {
        console.log(`${index + 1}. Student ID: ${link.student_id}, Display ID: ${link.line_display_id}`);
      });
    }
    
    if (incompleteParents.length > 0) {
      console.log('\nParents ที่ยังไม่ได้ผูก LINE User ID:');
      incompleteParents.forEach((link, index) => {
        console.log(`${index + 1}. Parent ID: ${link.parent_id}, Display ID: ${link.line_display_id}`);
      });
    }
    
    // ตรวจสอบรายการที่มี line_user_id และ line_display_id ครบถ้วน
    console.log('\n✅ รายการที่ผูกบัญชีครบถ้วน:');
    const completeStudents = studentLinks?.filter(link => link.line_user_id && link.line_display_id) || [];
    const completeParents = parentLinks?.filter(link => link.line_user_id && link.line_display_id) || [];
    
    console.log('Students:', completeStudents.length);
    console.log('Parents:', completeParents.length);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLineLinks().catch(console.error);