/**
 * ไฟล์ทดสอบระบบแจ้งเตือนฉุกเฉินแบบพื้นฐาน (ไม่ใช้ emergency_responses)
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
async function createTestEmergency(eventType, triggeredBy, details) {
  console.log(`\n🧪 สร้างเหตุการณ์ฉุกเฉิน: ${eventType} (${triggeredBy})`);
  
  try {
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert({
        driver_id: TEST_DRIVER_ID,
        event_type: eventType,
        triggered_by: triggeredBy,
        details: JSON.stringify(details),
        event_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating emergency:', error);
      return null;
    }

    console.log('✅ สร้างเหตุการณ์ฉุกเฉินสำเร็จ:');
    console.log(`   📋 Event ID: ${data.event_id}`);
    console.log(`   🚨 Type: ${data.event_type}`);
    console.log(`   👤 Triggered by: ${data.triggered_by}`);
    console.log(`   📊 Status: ${data.status}`);
    console.log(`   ✅ Resolved: ${data.resolved}`);
    
    return data;
  } catch (error) {
    console.error('❌ Exception:', error.message);
    return null;
  }
}

// ฟังก์ชันจำลองการตอบสนองของคนขับ (อัปเดตใน emergency_logs โดยตรง)
async function simulateDriverResponse(eventId, responseType) {
  console.log(`\n📱 จำลองการตอบสนองของคนขับ: ${responseType}`);
  
  try {
    const updateData = {
      driver_response_type: responseType,
      driver_response_time: new Date().toISOString(),
      driver_response_notes: `ทดสอบการตอบสนอง ${responseType}`,
    };

    // อัปเดตสถานะตามประเภทการตอบสนอง
    switch (responseType) {
      case 'CHECKED':
        updateData.status = 'checked';
        updateData.resolved = false;
        break;
      case 'EMERGENCY':
        updateData.status = 'emergency_confirmed';
        updateData.resolved = false;
        break;
      case 'CONFIRMED_NORMAL':
        updateData.status = 'resolved';
        updateData.resolved = true;
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = TEST_DRIVER_ID;
        break;
    }

    const { data, error } = await supabase
      .from('emergency_logs')
      .update(updateData)
      .eq('event_id', eventId)
      .select()
      .single();

    if (error) {
      console.error('❌ Error updating emergency log:', error);
      return false;
    }

    console.log('✅ อัปเดตการตอบสนองสำเร็จ:');
    console.log(`   📊 Status: ${data.status}`);
    console.log(`   ✅ Resolved: ${data.resolved}`);
    console.log(`   🕐 Response time: ${data.driver_response_time}`);
    
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

    console.log('📊 สถานะปัจจุบัน:');
    console.log(`   📋 Event ID: ${data.event_id}`);
    console.log(`   🚨 Type: ${data.event_type}`);
    console.log(`   📊 Status: ${data.status}`);
    console.log(`   ✅ Resolved: ${data.resolved}`);
    console.log(`   📱 Response Type: ${data.driver_response_type || 'ยังไม่ตอบสนอง'}`);
    console.log(`   🕐 Response Time: ${data.driver_response_time || 'ยังไม่ตอบสนอง'}`);

    return data;
  } catch (error) {
    console.error('❌ Exception:', error.message);
    return null;
  }
}

// ฟังก์ชันทดสอบหลัก
async function runBasicTest() {
  console.log('🚀 เริ่มทดสอบระบบแจ้งเตือนฉุกเฉินแบบพื้นฐาน');
  console.log('=' .repeat(60));

  // 1. ทดสอบ PANIC_BUTTON
  const panicEmergency = await createTestEmergency('PANIC_BUTTON', 'student', {
    student_id: 'STD001',
    seat_number: 5,
    panic_button_location: 'ข้างหน้าต่าง',
    location: 'ถนนสุขุมวิท กม.15'
  });

  if (panicEmergency) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await checkEmergencyStatus(panicEmergency.event_id);
    
    // ทดสอบการตอบสนอง CHECKED
    await simulateDriverResponse(panicEmergency.event_id, 'CHECKED');
    await checkEmergencyStatus(panicEmergency.event_id);
    
    // ทดสอบการตอบสนอง CONFIRMED_NORMAL
    await simulateDriverResponse(panicEmergency.event_id, 'CONFIRMED_NORMAL');
    await checkEmergencyStatus(panicEmergency.event_id);
  }

  console.log('\n' + '-' .repeat(60));

  // 2. ทดสอบ SENSOR_ALERT
  const sensorEmergency = await createTestEmergency('SENSOR_ALERT', 'sensor', {
    sensor_type: 'smoke_detector',
    smoke_level: 'high',
    temperature: 85,
    location: 'ด้านหลังรถ'
  });

  if (sensorEmergency) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await checkEmergencyStatus(sensorEmergency.event_id);
    
    // ทดสอบการตอบสนอง EMERGENCY
    await simulateDriverResponse(sensorEmergency.event_id, 'EMERGENCY');
    await checkEmergencyStatus(sensorEmergency.event_id);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('✅ การทดสอบพื้นฐานเสร็จสิ้น');
}

// ฟังก์ชันทดสอบการตอบสนองแบบต่างๆ
async function testAllResponseTypes() {
  console.log('🧪 ทดสอบการตอบสนองทุกประเภท');
  console.log('=' .repeat(60));

  const responseTypes = ['CHECKED', 'EMERGENCY', 'CONFIRMED_NORMAL'];

  for (const responseType of responseTypes) {
    console.log(`\n🔄 ทดสอบ response type: ${responseType}`);
    
    // สร้างเหตุการณ์ใหม่
    const emergency = await createTestEmergency('PANIC_BUTTON', 'student', {
      test_response_type: responseType,
      test_purpose: 'response_testing'
    });
    
    if (!emergency) continue;

    await new Promise(resolve => setTimeout(resolve, 500));

    // ทดสอบการตอบสนอง
    await simulateDriverResponse(emergency.event_id, responseType);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // ตรวจสอบผลลัพธ์
    await checkEmergencyStatus(emergency.event_id);
    
    console.log('-' .repeat(40));
  }

  console.log('\n✅ ทดสอบการตอบสนองทุกประเภทเสร็จสิ้น');
}

// ฟังก์ชันแสดงสถิติ
async function showEmergencyStats() {
  console.log('\n📊 สถิติเหตุการณ์ฉุกเฉิน');
  console.log('=' .repeat(40));
  
  try {
    const { data: allEvents, error } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', TEST_DRIVER_ID)
      .order('event_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching stats:', error);
      return;
    }

    const stats = {
      total: allEvents.length,
      pending: allEvents.filter(e => e.status === 'pending').length,
      checked: allEvents.filter(e => e.status === 'checked').length,
      emergency_confirmed: allEvents.filter(e => e.status === 'emergency_confirmed').length,
      resolved: allEvents.filter(e => e.status === 'resolved').length,
      panic_buttons: allEvents.filter(e => e.event_type === 'PANIC_BUTTON').length,
      sensor_alerts: allEvents.filter(e => e.event_type === 'SENSOR_ALERT').length,
    };

    console.log(`📋 เหตุการณ์ทั้งหมด: ${stats.total}`);
    console.log(`⏳ รอดำเนินการ: ${stats.pending}`);
    console.log(`👀 ตรวจสอบแล้ว: ${stats.checked}`);
    console.log(`🚨 ยืนยันฉุกเฉิน: ${stats.emergency_confirmed}`);
    console.log(`✅ แก้ไขแล้ว: ${stats.resolved}`);
    console.log(`🔴 ปุ่มฉุกเฉิน: ${stats.panic_buttons}`);
    console.log(`📡 เซ็นเซอร์: ${stats.sensor_alerts}`);

  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

// ฟังก์ชันล้างข้อมูลทดสอบ
async function cleanupTestData() {
  console.log('\n🧹 ล้างข้อมูลทดสอบ...');
  
  try {
    const { error } = await supabase
      .from('emergency_logs')
      .delete()
      .eq('driver_id', TEST_DRIVER_ID);

    if (error) {
      console.error('❌ Error deleting test data:', error);
    } else {
      console.log('✅ ลบข้อมูลทดสอบสำเร็จ');
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
      await runBasicTest();
      break;
    case 'responses':
      await testAllResponseTypes();
      break;
    case 'stats':
      await showEmergencyStats();
      break;
    case 'cleanup':
      await cleanupTestData();
      break;
    default:
      console.log('📖 วิธีใช้งาน:');
      console.log('  node test-emergency-basic.js basic     - ทดสอบพื้นฐาน');
      console.log('  node test-emergency-basic.js responses - ทดสอบการตอบสนองทุกประเภท');
      console.log('  node test-emergency-basic.js stats     - แสดงสถิติ');
      console.log('  node test-emergency-basic.js cleanup   - ล้างข้อมูลทดสอบ');
      break;
  }
}

// รันโปรแกรม
main().catch(console.error);