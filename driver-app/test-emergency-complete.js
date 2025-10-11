/**
 * ไฟล์ทดสอบระบบแจ้งเตือนฉุกเฉินแบบครบวงจร
 * ทดสอบการทำงานของระบบตั้งแต่การสร้างเหตุการณ์ จนถึงการตอบสนองของคนขับ
 */

import { supabase } from './src/services/supabaseClient.ts';

// ข้อมูลทดสอบ
const TEST_DRIVER_ID = 1;
const TEST_BUS_ID = 1;

// ฟังก์ชันสร้างเหตุการณ์ทดสอบ
async function createTestEmergency(testCase) {
  console.log(`\n🧪 ทดสอบ: ${testCase.name}`);
  console.log(`📝 รายละเอียด: ${testCase.description}`);
  
  try {
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert({
        driver_id: TEST_DRIVER_ID,
        bus_id: TEST_BUS_ID,
        event_type: testCase.event_type,
        triggered_by: testCase.triggered_by,
        details: testCase.details,
        description: testCase.description,
        location: testCase.location || 'ทดสอบ - หน้าโรงเรียน',
        event_time: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ สร้างเหตุการณ์สำเร็จ - Event ID: ${data.event_id}`);
    console.log(`📱 ตรวจสอบแอพคนขับเพื่อดู Emergency Modal`);
    console.log(`🔔 ตรวจสอบไอคอนกระดิ่งว่าอัปเดตจำนวนแจ้งเตือน`);
    console.log(`📊 ตรวจสอบหน้า reports/emergency ว่าอัปเดตข้อมูล`);
    
    return data;
  } catch (error) {
    console.error(`❌ เกิดข้อผิดพลาด:`, error);
    return null;
  }
}

// ฟังก์ชันจำลองการตอบสนองของคนขับ
async function simulateDriverResponse(eventId, responseType, notes = '') {
  console.log(`\n🎯 จำลองการตอบสนองของคนขับ: ${responseType}`);
  
  try {
    const { data, error } = await supabase
      .from('emergency_responses')
      .insert({
        event_id: eventId,
        driver_id: TEST_DRIVER_ID,
        response_type: responseType,
        response_time: new Date().toISOString(),
        notes: notes
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ บันทึกการตอบสนองสำเร็จ`);
    console.log(`📱 ระบบควรส่งข้อความ LINE (ถ้าเป็น EMERGENCY หรือ CONFIRMED_NORMAL)`);
    
    return data;
  } catch (error) {
    console.error(`❌ เกิดข้อผิดพลาดในการบันทึกการตอบสนอง:`, error);
    return null;
  }
}

// กรณีทดสอบต่างๆ
const testCases = [
  {
    name: 'นักเรียนกดปุ่มฉุกเฉิน',
    description: 'นักเรียนกดปุ่มฉุกเฉินบนรถ',
    event_type: 'PANIC_BUTTON',
    triggered_by: 'student',
    details: JSON.stringify({
      student_id: 'STD001',
      seat_number: 5,
      panic_button_location: 'ข้างหน้าต่าง'
    }),
    location: 'ถนนสุขุมวิท กม.15'
  },
  {
    name: 'เซ็นเซอร์ตรวจพบอุณหภูมิสูง',
    description: 'เซ็นเซอร์ตรวจพบอุณหภูมิสูงผิดปกติ',
    event_type: 'SENSOR_ALERT',
    triggered_by: 'sensor',
    details: JSON.stringify({
      sensor_type: 'temperature',
      sensor_value: 85.5,
      threshold: 60.0,
      sensor_location: 'ห้องเครื่อง'
    }),
    location: 'ถนนรามคำแหง กม.8'
  },
  {
    name: 'เซ็นเซอร์ตรวจพบควัน',
    description: 'เซ็นเซอร์ตรวจพบควันจำนวนมาก',
    event_type: 'SENSOR_ALERT',
    triggered_by: 'sensor',
    details: JSON.stringify({
      sensor_type: 'smoke',
      sensor_value: 750,
      threshold: 300,
      sensor_location: 'ห้องโดยสาร'
    }),
    location: 'ถนนพระราม 4 กม.12'
  },
  {
    name: 'เซ็นเซอร์หลายตัวตรวจพบ',
    description: 'เซ็นเซอร์ตรวจพบทั้งควันและอุณหภูมิสูง',
    event_type: 'SENSOR_ALERT',
    triggered_by: 'sensor',
    details: JSON.stringify({
      sensors: [
        {
          sensor_type: 'smoke',
          sensor_value: 850,
          threshold: 300,
          sensor_location: 'ห้องโดยสาร'
        },
        {
          sensor_type: 'temperature',
          sensor_value: 92.3,
          threshold: 60.0,
          sensor_location: 'ห้องเครื่อง'
        }
      ]
    }),
    location: 'ถนนลาดพร้าว กม.25'
  }
];

// ฟังก์ชันทดสอบ Flow การตอบสนอง
async function testResponseFlow(emergency) {
  console.log(`\n🔄 ทดสอบ Flow การตอบสนอง`);
  
  if (emergency.triggered_by === 'student') {
    console.log(`📋 กรณีนักเรียนกดปุ่ม: ควรมีปุ่ม "ตรวจสอบแล้ว" เท่านั้น`);
    
    // รอ 5 วินาที แล้วจำลองการกด "ตรวจสอบแล้ว"
    await new Promise(resolve => setTimeout(resolve, 5000));
    await simulateDriverResponse(emergency.event_id, 'CHECKED', 'ตรวจสอบแล้ว ไม่พบสิ่งผิดปกติ');
    
  } else if (emergency.triggered_by === 'sensor') {
    console.log(`📋 กรณีเซ็นเซอร์: ควรมีปุ่ม "ตรวจสอบแล้ว" และ "ฉุกเฉิน"`);
    
    // รอ 3 วินาที แล้วจำลองการกด "ฉุกเฉิน"
    await new Promise(resolve => setTimeout(resolve, 3000));
    await simulateDriverResponse(emergency.event_id, 'EMERGENCY', 'ยืนยันเป็นเหตุฉุกเฉิน กำลังให้นักเรียนลงจากรถ');
    
    console.log(`⏳ รอ 5 วินาที แล้วจำลองการยืนยันสถานการณ์กลับมาปกติ...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    await simulateDriverResponse(emergency.event_id, 'CONFIRMED_NORMAL', 'สถานการณ์กลับมาปกติแล้ว นักเรียนปลอดภัย');
  }
}

// ฟังก์ชันทดสอบหลัก
async function runCompleteTest() {
  console.log('🚀 เริ่มทดสอบระบบแจ้งเตือนฉุกเฉินแบบครบวงจร');
  console.log('=' .repeat(60));
  
  try {
    // ทดสอบการเชื่อมต่อ
    console.log('🔌 ทดสอบการเชื่อมต่อ Supabase...');
    const { data, error } = await supabase
      .from('emergency_logs')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ เชื่อมต่อ Supabase สำเร็จ');
    
    // ทดสอบแต่ละกรณี
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 ทดสอบกรณีที่ ${i + 1}/${testCases.length}`);
      
      // สร้างเหตุการณ์
      const emergency = await createTestEmergency(testCase);
      if (!emergency) continue;
      
      // ทดสอบ Flow การตอบสนอง
      await testResponseFlow(emergency);
      
      // รอก่อนทดสอบกรณีถัดไป
      if (i < testCases.length - 1) {
        console.log(`\n⏳ รอ 10 วินาที ก่อนทดสอบกรณีถัดไป...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log('\n🎉 ทดสอบเสร็จสิ้น!');
    console.log('📝 สิ่งที่ควรตรวจสอบ:');
    console.log('   1. Emergency Modal แสดงขึ้นทันทีเมื่อมีเหตุการณ์');
    console.log('   2. ปุ่มใน Modal แสดงถูกต้องตาม triggered_by');
    console.log('   3. ไอคอนกระดิ่งอัปเดตจำนวนแจ้งเตือน');
    console.log('   4. หน้า reports/emergency อัปเดตข้อมูลทันที');
    console.log('   5. ข้อความ LINE ส่งไปเมื่อกด "ฉุกเฉิน" และ "ยืนยันสถานการณ์กลับมาปกติ"');
    console.log('   6. Modal ปิดเมื่อกด "ตรวจสอบแล้ว" หรือ "ยืนยันสถานการณ์กลับมาปกติ"');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// ฟังก์ชันทดสอบเฉพาะกรณี
async function testSpecificCase(caseIndex) {
  if (caseIndex < 0 || caseIndex >= testCases.length) {
    console.error('❌ หมายเลขกรณีทดสอบไม่ถูกต้อง');
    return;
  }
  
  const testCase = testCases[caseIndex];
  console.log(`🧪 ทดสอบเฉพาะกรณี: ${testCase.name}`);
  
  const emergency = await createTestEmergency(testCase);
  if (emergency) {
    await testResponseFlow(emergency);
  }
}

// ฟังก์ชันล้างข้อมูลทดสอบ
async function cleanupTestData() {
  console.log('🧹 ล้างข้อมูลทดสอบ...');
  
  try {
    // ลบ emergency responses ที่เกี่ยวข้อง
    await supabase
      .from('emergency_responses')
      .delete()
      .eq('driver_id', TEST_DRIVER_ID);
    
    // ลบ emergency logs ที่เป็นข้อมูลทดสอบ
    await supabase
      .from('emergency_logs')
      .delete()
      .eq('driver_id', TEST_DRIVER_ID)
      .like('location', '%ทดสอบ%');
    
    console.log('✅ ล้างข้อมูลทดสอบเสร็จสิ้น');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการล้างข้อมูล:', error);
  }
}

// Export functions สำหรับใช้งาน
export {
  runCompleteTest,
  testSpecificCase,
  cleanupTestData,
  testCases
};

// รันทดสอบถ้าไฟล์ถูกเรียกโดยตรง
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  
  switch (command) {
    case 'run':
      runCompleteTest();
      break;
    case 'test':
      const caseIndex = parseInt(process.argv[3]) || 0;
      testSpecificCase(caseIndex);
      break;
    case 'cleanup':
      cleanupTestData();
      break;
    default:
      console.log('📖 วิธีใช้งาน:');
      console.log('  node test-emergency-complete.js run        - ทดสอบทุกกรณี');
      console.log('  node test-emergency-complete.js test [n]   - ทดสอบกรณีที่ n (0-3)');
      console.log('  node test-emergency-complete.js cleanup    - ล้างข้อมูลทดสอบ');
      console.log('\n📋 กรณีทดสอบ:');
      testCases.forEach((testCase, index) => {
        console.log(`  ${index}: ${testCase.name}`);
      });
  }
}