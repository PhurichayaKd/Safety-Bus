/**
 * ไฟล์ทดสอบระบบแจ้งเตือนฉุกเฉินแบบง่าย
 * ใช้ CommonJS เพื่อให้รันได้ง่าย
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ตั้งค่า Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ Supabase configuration ใน environment variables');
  console.log('กรุณาตรวจสอบไฟล์ .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ข้อมูลทดสอบ
const TEST_DRIVER_ID = 1;

// ฟังก์ชันสร้างเหตุการณ์ทดสอบ
async function createTestEmergency() {
  console.log('\n🧪 สร้างเหตุการณ์ฉุกเฉินทดสอบ...');
  
  try {
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert({
        driver_id: TEST_DRIVER_ID,
        event_type: 'PANIC_BUTTON',
        triggered_by: 'student',
        details: JSON.stringify({
          student_id: 'STD001',
          seat_number: 5,
          panic_button_location: 'ข้างหน้าต่าง',
          location: 'ถนนสุขุมวิท กม.15'
        }),
        event_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating emergency:', error);
      return null;
    }

    console.log('✅ สร้างเหตุการณ์ฉุกเฉินสำเร็จ:', data);
    return data;
  } catch (error) {
    console.error('❌ Exception:', error.message);
    return null;
  }
}

// ฟังก์ชันจำลองการตอบสนองของคนขับ
async function simulateDriverResponse(eventId, responseType) {
  console.log(`\n📱 จำลองการตอบสนองของคนขับ: ${responseType}`);
  
  try {
    const { data, error } = await supabase
      .from('emergency_responses')
      .insert({
        event_id: eventId,
        driver_id: TEST_DRIVER_ID,
        response_type: responseType,
        response_time: new Date().toISOString(),
        notes: `ทดสอบการตอบสนอง ${responseType}`
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating response:', error);
      return false;
    }

    console.log('✅ บันทึกการตอบสนองสำเร็จ:', data);
    return true;
  } catch (error) {
    console.error('❌ Exception:', error.message);
    return false;
  }
}

// ฟังก์ชันตรวจสอบสถานะ emergency log
async function checkEmergencyStatus(eventId) {
  console.log('\n🔍 ตรวจสอบสถานะ emergency log...');
  
  try {
    const { data, error } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      console.error('❌ Error fetching emergency log:', error);
      return null;
    }

    console.log('📊 สถานะปัจจุบัน:', {
      event_id: data.event_id,
      status: data.status,
      resolved: data.resolved,
      driver_response_type: data.driver_response_type,
      driver_response_time: data.driver_response_time
    });

    return data;
  } catch (error) {
    console.error('❌ Exception:', error.message);
    return null;
  }
}

// ฟังก์ชันทดสอบหลัก
async function runTest() {
  console.log('🚀 เริ่มทดสอบระบบแจ้งเตือนฉุกเฉิน');
  console.log('=' .repeat(50));

  // 1. สร้างเหตุการณ์ฉุกเฉิน
  const emergency = await createTestEmergency();
  if (!emergency) {
    console.log('❌ ไม่สามารถสร้างเหตุการณ์ฉุกเฉินได้');
    return;
  }

  // รอสักครู่
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. ตรวจสอบสถานะเริ่มต้น
  await checkEmergencyStatus(emergency.event_id);

  // 3. ทดสอบการตอบสนอง CHECKED
  console.log('\n📋 ทดสอบการตอบสนอง: CHECKED');
  const checkedSuccess = await simulateDriverResponse(emergency.event_id, 'CHECKED');
  
  if (checkedSuccess) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await checkEmergencyStatus(emergency.event_id);
  }

  console.log('\n' + '=' .repeat(50));
  console.log('✅ การทดสอบเสร็จสิ้น');
}

// ฟังก์ชันทดสอบการตอบสนองแบบต่างๆ
async function testDifferentResponses() {
  console.log('🧪 ทดสอบการตอบสนองแบบต่างๆ');
  console.log('=' .repeat(50));

  const responseTypes = ['CHECKED', 'EMERGENCY', 'CONFIRMED_NORMAL'];

  for (const responseType of responseTypes) {
    console.log(`\n🔄 ทดสอบ response type: ${responseType}`);
    
    // สร้างเหตุการณ์ใหม่
    const emergency = await createTestEmergency();
    if (!emergency) continue;

    await new Promise(resolve => setTimeout(resolve, 500));

    // ทดสอบการตอบสนอง
    await simulateDriverResponse(emergency.event_id, responseType);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ตรวจสอบผลลัพธ์
    await checkEmergencyStatus(emergency.event_id);
    
    console.log('-' .repeat(30));
  }

  console.log('\n✅ ทดสอบการตอบสนองทุกประเภทเสร็จสิ้น');
}

// ฟังก์ชันล้างข้อมูลทดสอบ
async function cleanupTestData() {
  console.log('\n🧹 ล้างข้อมูลทดสอบ...');
  
  try {
    // ลบ emergency_responses ก่อน (เพราะมี foreign key)
    const { error: responseError } = await supabase
      .from('emergency_responses')
      .delete()
      .eq('driver_id', TEST_DRIVER_ID);

    if (responseError) {
      console.error('❌ Error deleting responses:', responseError);
    } else {
      console.log('✅ ลบ emergency_responses สำเร็จ');
    }

    // ลบ emergency_logs
    const { error: logError } = await supabase
      .from('emergency_logs')
      .delete()
      .eq('driver_id', TEST_DRIVER_ID);

    if (logError) {
      console.error('❌ Error deleting logs:', logError);
    } else {
      console.log('✅ ลบ emergency_logs สำเร็จ');
    }

  } catch (error) {
    console.error('❌ Exception during cleanup:', error.message);
  }
}

// รันการทดสอบตามคำสั่ง
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'basic':
      await runTest();
      break;
    case 'responses':
      await testDifferentResponses();
      break;
    case 'cleanup':
      await cleanupTestData();
      break;
    default:
      console.log('📖 วิธีใช้งาน:');
      console.log('  node test-emergency-simple.js basic     - ทดสอบพื้นฐาน');
      console.log('  node test-emergency-simple.js responses - ทดสอบการตอบสนองทุกประเภท');
      console.log('  node test-emergency-simple.js cleanup   - ล้างข้อมูลทดสอบ');
      break;
  }
}

// รันโปรแกรม
main().catch(console.error);