const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ตั้งค่า Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY') {
  console.error('❌ กรุณาตั้งค่า environment variables:');
  console.error('   SUPABASE_URL=your_supabase_url');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('');
  console.error('หรือแก้ไขค่าในไฟล์นี้โดยตรง');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployIssueCardFunction() {
  try {
    console.log('🚀 กำลังติดตั้ง fn_issue_card function...');
    
    // อ่านไฟล์ SQL
    const sqlPath = path.join(__dirname, 'functions', 'fn_issue_card.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // รัน SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });
    
    if (error) {
      // ถ้า exec_sql ไม่มี ให้ลองใช้วิธีอื่น
      console.log('⚠️  ไม่สามารถใช้ exec_sql ได้ กำลังลองวิธีอื่น...');
      
      // ลองใช้ raw query
      const { error: rawError } = await supabase
        .from('_dummy_table_that_does_not_exist')
        .select('*')
        .limit(0);
      
      // ถ้าไม่สำเร็จ แสดงข้อความแนะนำ
      console.log('');
      console.log('📋 กรุณารันคำสั่ง SQL ต่อไปนี้ใน Supabase Dashboard:');
      console.log('   1. ไปที่ Supabase Dashboard > SQL Editor');
      console.log('   2. สร้าง query ใหม่และคัดลอกโค้ดจากไฟล์:');
      console.log(`   ${sqlPath}`);
      console.log('   3. รันคำสั่ง SQL');
      console.log('');
      console.log('หรือคัดลอกโค้ดด้านล่างนี้:');
      console.log('=' .repeat(80));
      console.log(sqlContent);
      console.log('=' .repeat(80));
      
      return false;
    }
    
    console.log('✅ ติดตั้ง fn_issue_card function สำเร็จ!');
    
    // ทดสอบว่า function ทำงานได้
    console.log('🧪 กำลังทดสอบ function...');
    
    const { data: testData, error: testError } = await supabase.rpc('fn_issue_card', {
      p_student_id: 999999, // student_id ที่ไม่มีจริง
      p_new_rfid_code: 'TEST_CARD_999',
      p_assigned_by: 1,
      p_old_card_action: 'lost'
    });
    
    if (testError) {
      console.log('⚠️  เกิดข้อผิดพลาดในการทดสอบ:', testError.message);
      console.log('   แต่ function อาจถูกสร้างสำเร็จแล้ว');
    } else {
      console.log('✅ ทดสอบ function สำเร็จ! ผลลัพธ์:', testData);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    
    // แสดงวิธีการติดตั้งด้วยตนเอง
    console.log('');
    console.log('📋 กรุณารันคำสั่ง SQL ด้วยตนเองใน Supabase Dashboard:');
    console.log('   1. ไปที่ Supabase Dashboard > SQL Editor');
    console.log('   2. สร้าง query ใหม่และคัดลอกโค้ดจากไฟล์:');
    console.log(`   ${path.join(__dirname, 'functions', 'fn_issue_card.sql')}`);
    console.log('   3. รันคำสั่ง SQL');
    
    return false;
  }
}

// ทดสอบการเชื่อมต่อ Supabase
async function testConnection() {
  try {
    console.log('🔗 กำลังทดสอบการเชื่อมต่อ Supabase...');
    
    const { data, error } = await supabase
      .from('students')
      .select('student_id')
      .limit(1);
    
    if (error) {
      console.error('❌ ไม่สามารถเชื่อมต่อ Supabase ได้:', error.message);
      return false;
    }
    
    console.log('✅ เชื่อมต่อ Supabase สำเร็จ!');
    return true;
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ:', error.message);
    return false;
  }
}

// รันสคริปต์
async function main() {
  console.log('🎯 เริ่มติดตั้ง fn_issue_card function สำหรับระบบออกบัตร RFID');
  console.log('');
  
  // ทดสอบการเชื่อมต่อก่อน
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  // ติดตั้ง function
  const success = await deployIssueCardFunction();
  
  if (success) {
    console.log('');
    console.log('🎉 ติดตั้งเสร็จสิ้น! ตอนนี้สามารถใช้งานระบบออกบัตรใหม่ได้แล้ว');
    console.log('');
    console.log('📱 การใช้งาน:');
    console.log('   1. เปิดแอพคนขับ');
    console.log('   2. ไปที่เมนู "ออกบัตร RFID"');
    console.log('   3. เลือกนักเรียนและบัตรใหม่');
    console.log('   4. เลือกสาเหตุและบันทึก');
  } else {
    console.log('');
    console.log('⚠️  กรุณาติดตั้ง function ด้วยตนเองตามคำแนะนำด้านบน');
  }
}

// รันเมื่อไฟล์ถูกเรียกโดยตรง
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { deployIssueCardFunction, testConnection };