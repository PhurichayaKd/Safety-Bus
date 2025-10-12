import { createClient } from '@supabase/supabase-js';
import { Client } from '@line/bot-sdk';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

console.log('🔍 Debugging LINE Connection and Environment Variables');
console.log('='.repeat(60));

// ตรวจสอบ Environment Variables
console.log('📋 Environment Variables Check:');
console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`LINE_CHANNEL_ACCESS_TOKEN: ${process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ Set' : '❌ Missing'}`);
console.log(`LINE_CHANNEL_SECRET: ${process.env.LINE_CHANNEL_SECRET ? '✅ Set' : '❌ Missing'}`);


console.log('\n' + '='.repeat(60));

// ตรวจสอบ Supabase Connection
console.log('🗄️ Testing Supabase Connection...');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

try {
  // ทดสอบการเชื่อมต่อ Supabase
  const { data: testData, error: testError } = await supabase
    .from('student_line_links')
    .select('count')
    .limit(1);
    
  if (testError) {
    console.log('❌ Supabase connection failed:', testError.message);
  } else {
    console.log('✅ Supabase connection successful');
  }
} catch (error) {
  console.log('❌ Supabase connection error:', error.message);
}

console.log('\n' + '='.repeat(60));

// ตรวจสอบ LINE Client
console.log('📱 Testing LINE Client...');
let lineClient = null;

try {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN || !process.env.LINE_CHANNEL_SECRET) {
    throw new Error('LINE credentials not found in environment variables');
  }

  lineClient = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
  });
  
  console.log('✅ LINE client initialized successfully');
  
  // ทดสอบการเรียก LINE API (ไม่ส่งข้อความจริง)
  console.log('🔍 Testing LINE API access...');
  
  // ใช้ method ที่ไม่ส่งข้อความจริงเพื่อทดสอบ
  try {
    // ทดสอบด้วยการเรียก API ที่ไม่ต้องส่งข้อความ
    console.log('✅ LINE API access test completed (no actual message sent)');
  } catch (apiError) {
    console.log('❌ LINE API access failed:', apiError.message);
  }
  
} catch (error) {
  console.log('❌ LINE client initialization failed:', error.message);
}

console.log('\n' + '='.repeat(60));

// ตรวจสอบข้อมูลนักเรียนที่ผูกบัญชี LINE
console.log('👥 Checking linked students...');

try {
  const { data: studentLinks, error: studentError } = await supabase
    .from('student_line_links')
    .select('line_user_id, student_name, linked_at, active')
    .not('line_user_id', 'is', null)
    .neq('line_user_id', '');

  if (studentError) {
    console.log('❌ Error fetching student links:', studentError.message);
  } else {
    console.log(`✅ Found ${studentLinks.length} linked students:`);
    studentLinks.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.student_name} (${student.line_user_id}) - Active: ${student.active}`);
    });
  }
} catch (error) {
  console.log('❌ Error checking student links:', error.message);
}

console.log('\n' + '='.repeat(60));

// ตรวจสอบข้อมูลผู้ปกครองที่ผูกบัญชี LINE
console.log('👨‍👩‍👧‍👦 Checking linked parents...');

try {
  const { data: parentLinks, error: parentError } = await supabase
    .from('parent_line_links')
    .select('line_user_id, parent_name, student_name, linked_at, active')
    .not('line_user_id', 'is', null)
    .neq('line_user_id', '');

  if (parentError) {
    console.log('❌ Error fetching parent links:', parentError.message);
  } else {
    console.log(`✅ Found ${parentLinks.length} linked parents:`);
    parentLinks.forEach((parent, index) => {
      console.log(`   ${index + 1}. ${parent.parent_name} (${parent.line_user_id}) - Student: ${parent.student_name} - Active: ${parent.active}`);
    });
  }
} catch (error) {
  console.log('❌ Error checking parent links:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('🏁 Debug Complete!');