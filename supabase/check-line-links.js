const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkLineLinks() {
  console.log('🔍 Checking student_line_links table...');
  
  // ตรวจสอบตาราง student_line_links
  const { data: studentLinks, error: studentError } = await supabase
    .from('student_line_links')
    .select('*')
    .limit(5);
    
  if (studentError) {
    console.log('❌ Student links error:', studentError.message);
  } else {
    console.log('📱 Student line links table:');
    if (studentLinks && studentLinks.length > 0) {
      console.log(`   Columns: ${Object.keys(studentLinks[0]).join(', ')}`);
      console.log('   Sample data:', studentLinks);
    } else {
      console.log('   (empty table)');
    }
  }
  
  console.log('\n🔍 Checking parent_line_links table...');
  
  // ตรวจสอบตาราง parent_line_links
  const { data: parentLinks, error: parentError } = await supabase
    .from('parent_line_links')
    .select('*')
    .limit(5);
    
  if (parentError) {
    console.log('❌ Parent links error:', parentError.message);
  } else {
    console.log('👨‍👩‍👧‍👦 Parent line links table:');
    if (parentLinks && parentLinks.length > 0) {
      console.log(`   Columns: ${Object.keys(parentLinks[0]).join(', ')}`);
      console.log('   Sample data:', parentLinks);
    } else {
      console.log('   (empty table)');
    }
  }
  
  // ตรวจสอบข้อมูลสำหรับนักเรียน 100017
  console.log('\n🔍 Checking line links for student 100017...');
  const { data: student100017Links, error: student100017Error } = await supabase
    .from('student_line_links')
    .select('*')
    .eq('student_id', 100017);
    
  if (student100017Error) {
    console.log('❌ Student 100017 links error:', student100017Error.message);
  } else {
    console.log('📱 Student 100017 line links:', student100017Links);
  }
  
  // ตรวจสอบข้อมูลสำหรับผู้ปกครอง ID 27
  console.log('\n🔍 Checking line links for parent 27...');
  const { data: parent27Links, error: parent27Error } = await supabase
    .from('parent_line_links')
    .select('*')
    .eq('parent_id', 27);
    
  if (parent27Error) {
    console.log('❌ Parent 27 links error:', parent27Error.message);
  } else {
    console.log('👨‍👩‍👧‍👦 Parent 27 line links:', parent27Links);
  }
}

checkLineLinks().catch(console.error);