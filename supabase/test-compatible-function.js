require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCurrentFunction() {
  console.log('🧪 ทดสอบฟังก์ชัน record_rfid_scan ปัจจุบัน...\n');

  try {
    // ทดสอบการเรียกฟังก์ชัน
    console.log('📞 เรียกฟังก์ชัน record_rfid_scan...');
    
    const { data: result, error } = await supabase
      .rpc('record_rfid_scan', {
        p_rfid_code: 'F3C9DC34',
        p_driver_id: 1,
        p_latitude: 13.7563,
        p_longitude: 100.5018,
        p_location_type: 'go'
      });

    if (error) {
      console.error('❌ Function Error:', error.message);
      console.log('💡 ข้อผิดพลาดนี้บ่งชี้ว่าฟังก์ชันยังไม่ได้รับการอัปเดต');
      
      // ตรวจสอบว่าเป็น error เดิมหรือไม่
      if (error.message.includes('student_id') && error.message.includes('notification_logs')) {
        console.log('🔍 ยืนยัน: ปัญหาเกิดจากโครงสร้างตาราง notification_logs');
        console.log('📋 ต้องอัปเดตฟังก์ชันใน Supabase Dashboard ด้วยตนเอง');
      } else if (error.message.includes('control reached end of function')) {
        console.log('🔍 ยืนยัน: ปัญหาเกิดจากเงื่อนไข status ที่ไม่ตรงกัน');
        console.log('📋 ต้องแก้ไขเงื่อนไข rc.status ใน Supabase Dashboard');
      }
    } else {
      console.log('✅ Function Result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('🎉 ฟังก์ชันทำงานสำเร็จแล้ว!');
      } else {
        console.log('⚠️ ฟังก์ชันส่งคืนข้อผิดพลาด:', result.error);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testCurrentFunction();