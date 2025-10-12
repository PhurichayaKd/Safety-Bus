import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

console.log('🔍 Checking Database Table Structure');
console.log('='.repeat(60));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ตรวจสอบโครงสร้างตาราง student_line_links
console.log('📋 Checking student_line_links table structure...');
try {
  const { data: studentData, error: studentError } = await supabase
    .from('student_line_links')
    .select('*')
    .limit(1);

  if (studentError) {
    console.log('❌ Error:', studentError.message);
  } else {
    console.log('✅ student_line_links table found');
    if (studentData && studentData.length > 0) {
      console.log('📊 Available columns:', Object.keys(studentData[0]));
      console.log('📄 Sample data:', studentData[0]);
    } else {
      console.log('📄 No data found in table');
    }
  }
} catch (error) {
  console.log('❌ Error checking student_line_links:', error.message);
}

console.log('\n' + '='.repeat(60));

// ตรวจสอบโครงสร้างตาราง parent_line_links
console.log('📋 Checking parent_line_links table structure...');
try {
  const { data: parentData, error: parentError } = await supabase
    .from('parent_line_links')
    .select('*')
    .limit(1);

  if (parentError) {
    console.log('❌ Error:', parentError.message);
  } else {
    console.log('✅ parent_line_links table found');
    if (parentData && parentData.length > 0) {
      console.log('📊 Available columns:', Object.keys(parentData[0]));
      console.log('📄 Sample data:', parentData[0]);
    } else {
      console.log('📄 No data found in table');
    }
  }
} catch (error) {
  console.log('❌ Error checking parent_line_links:', error.message);
}

console.log('\n' + '='.repeat(60));

// ตรวจสอบข้อมูลนักเรียนที่ผูกบัญชี LINE (ใช้ columns ที่มีอยู่จริง)
console.log('👥 Checking actual linked students data...');
try {
  const { data: studentLinks, error: studentError } = await supabase
    .from('student_line_links')
    .select('*')
    .not('line_user_id', 'is', null)
    .neq('line_user_id', '');

  if (studentError) {
    console.log('❌ Error fetching student links:', studentError.message);
  } else {
    console.log(`✅ Found ${studentLinks.length} linked students:`);
    studentLinks.forEach((student, index) => {
      console.log(`   ${index + 1}.`, student);
    });
  }
} catch (error) {
  console.log('❌ Error checking student links:', error.message);
}

console.log('\n' + '='.repeat(60));

// ตรวจสอบข้อมูลผู้ปกครองที่ผูกบัญชี LINE (ใช้ columns ที่มีอยู่จริง)
console.log('👨‍👩‍👧‍👦 Checking actual linked parents data...');
try {
  const { data: parentLinks, error: parentError } = await supabase
    .from('parent_line_links')
    .select('*')
    .not('line_user_id', 'is', null)
    .neq('line_user_id', '');

  if (parentError) {
    console.log('❌ Error fetching parent links:', parentError.message);
  } else {
    console.log(`✅ Found ${parentLinks.length} linked parents:`);
    parentLinks.forEach((parent, index) => {
      console.log(`   ${index + 1}.`, parent);
    });
  }
} catch (error) {
  console.log('❌ Error checking parent links:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('🏁 Table Structure Check Complete!');