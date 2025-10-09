require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOldConstraints() {
  try {
    console.log('=== ตรวจสอบตาราง student_boarding_status ===');
    
    // ลองเข้าถึงตาราง student_boarding_status โดยตรง
    try {
      const { data: boardingData, error: boardingError } = await supabase
        .from('student_boarding_status')
        .select('*')
        .limit(1);
      
      if (boardingError) {
        console.log('✅ ตาราง student_boarding_status ไม่มีอยู่:', boardingError.message);
      } else {
        console.log('⚠️ ตาราง student_boarding_status ยังมีอยู่! ข้อมูลตัวอย่าง:', boardingData);
      }
    } catch (err) {
      console.log('✅ ตาราง student_boarding_status ไม่มีอยู่');
    }
    
    console.log('\n=== ตรวจสอบตาราง pickup_dropoff ===');
    
    // ตรวจสอบตาราง pickup_dropoff ที่เราใช้จริง
    try {
      const { data: pickupData, error: pickupError } = await supabase
        .from('pickup_dropoff')
        .select('record_id, student_id, event_time, event_type')
        .limit(5);
      
      if (pickupError) {
        console.log('❌ ตาราง pickup_dropoff มีปัญหา:', pickupError.message);
      } else {
        console.log('✅ ตาราง pickup_dropoff ทำงานปกติ, จำนวนข้อมูล:', pickupData.length);
        if (pickupData.length > 0) {
          console.log('ข้อมูลล่าสุด:', pickupData[0]);
        }
      }
    } catch (err) {
      console.log('❌ ไม่สามารถเข้าถึงตาราง pickup_dropoff:', err.message);
    }
    
    console.log('\n=== ทดสอบการเรียกฟังก์ชัน record_rfid_scan ===');
    
    // ทดสอบเรียกฟังก์ชันโดยตรงเพื่อดูข้อผิดพลาด
    try {
      const { data: testResult, error: testError } = await supabase.rpc('record_rfid_scan', {
        p_rfid_code: 'TEST_CARD_123',
        p_driver_id: 999,
        p_latitude: 13.7563,
        p_longitude: 100.5018,
        p_location_type: 'go'
      });
      
      if (testError) {
        console.log('❌ ข้อผิดพลาดจากฟังก์ชัน:', testError.message);
        console.log('รายละเอียด:', testError);
      } else {
        console.log('✅ ฟังก์ชันทำงานได้ (แม้จะไม่พบบัตร):', testResult);
      }
    } catch (err) {
      console.log('❌ ไม่สามารถเรียกฟังก์ชันได้:', err.message);
    }
    
    console.log('\n=== ทดสอบกับบัตรจริง F3C9DC34 ===');
    
    // ทดสอบกับบัตรจริงที่มีปัญหา
    try {
      const { data: realResult, error: realError } = await supabase.rpc('record_rfid_scan', {
        p_rfid_code: 'F3C9DC34',
        p_driver_id: 1,
        p_latitude: 13.7563,
        p_longitude: 100.5018,
        p_location_type: 'go'
      });
      
      if (realError) {
        console.log('❌ ข้อผิดพลาดจากบัตรจริง:', realError.message);
        console.log('รายละเอียด:', realError);
      } else {
        console.log('✅ บัตรจริงทำงานได้:', realResult);
      }
    } catch (err) {
      console.log('❌ ไม่สามารถทดสอบบัตรจริงได้:', err.message);
    }
    
  } catch (error) {
    console.error('เกิดข้อผิดพลาด:', error.message);
  }
}

checkOldConstraints();