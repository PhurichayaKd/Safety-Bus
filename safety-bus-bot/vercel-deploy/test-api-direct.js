import { createClient } from '@supabase/supabase-js';
import { Client } from '@line/bot-sdk';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

console.log('🧪 Direct API Testing with Detailed Logging');
console.log('='.repeat(60));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// เริ่มต้น LINE client
let lineClient = null;
try {
  lineClient = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
  });
  console.log('✅ LINE client initialized');
} catch (error) {
  console.log('❌ LINE client initialization failed:', error.message);
  process.exit(1);
}

// ข้อมูลทดสอบ
const testData = {
  driver_id: 1,
  trip_phase: 'morning',
  current_status: 'start_journey',
  location: 'ทดสอบการแจ้งเตือนโดยตรง',
  notes: 'ทดสอบ API โดยตรงเพื่อดู detailed logs'
};

console.log('📋 Test Data:', testData);
console.log('\n' + '='.repeat(60));

async function testDirectAPI() {
  try {
    // 1. ดึงข้อมูลคนขับ
    console.log('🚌 Fetching driver data...');
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_name, license_plate')
      .eq('driver_id', testData.driver_id)
      .single();

    if (driverError) {
      console.log('❌ Driver fetch error:', driverError.message);
      return;
    }
    
    console.log('✅ Driver data:', driverData);

    // 2. สร้างข้อความ
    const messageText = `🚌 คนขับเริ่มออกเดินทาง

คนขับได้เริ่มออกเดินทางแล้ว กรุณาเตรียมตัวให้พร้อม

👨‍✈️ คนขับ: ${driverData.driver_name}
🚌 รถเมล์: ${driverData.license_plate}
📍 ตำแหน่ง: ${testData.location}
📝 หมายเหตุ: ${testData.notes}

⏰ เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`;

    const lineMessage = {
      type: 'text',
      text: messageText
    };

    console.log('📝 Message created:', lineMessage.text.substring(0, 100) + '...');

    // 3. ดึงข้อมูลนักเรียนที่ผูกบัญชี LINE
    console.log('\n👥 Fetching student links...');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        line_user_id, 
        student_id,
        line_display_id,
        students!inner(student_name)
      `)
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    if (studentError) {
      console.log('❌ Student links error:', studentError.message);
      return;
    }

    console.log(`✅ Found ${studentLinks.length} student links:`, studentLinks);

    // 4. ส่งข้อความไปยังนักเรียน
    let notificationResults = [];
    
    if (studentLinks && studentLinks.length > 0) {
      console.log('\n📤 Sending messages to students...');
      
      for (const student of studentLinks) {
        const studentName = student.students?.student_name || student.line_display_id || 'Unknown Student';
        console.log(`\n🔄 Sending to: ${studentName} (${student.line_user_id})`);
        
        try {
          await lineClient.pushMessage(student.line_user_id, lineMessage);
          notificationResults.push({
            lineUserId: student.line_user_id,
            studentId: student.student_id,
            studentName: studentName,
            type: 'student',
            status: 'success'
          });
          console.log(`✅ SUCCESS: Message sent to ${studentName}`);
        } catch (error) {
          console.log(`❌ FAILED: Error sending to ${studentName}:`, error.message);
          notificationResults.push({
            lineUserId: student.line_user_id,
            studentId: student.student_id,
            studentName: studentName,
            type: 'student',
            status: 'failed',
            error: error.message
          });
        }
      }
    } else {
      console.log('❌ No student links found');
    }

    // 5. สรุปผลลัพธ์
    console.log('\n' + '='.repeat(60));
    console.log('📊 Final Results:');
    console.log(`Total notifications: ${notificationResults.length}`);
    console.log(`Successful: ${notificationResults.filter(r => r.status === 'success').length}`);
    console.log(`Failed: ${notificationResults.filter(r => r.status === 'failed').length}`);
    
    notificationResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.status === 'success' ? '✅' : '❌'} ${result.studentName}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

  } catch (error) {
    console.log('❌ Direct API test error:', error.message);
    console.log('Stack:', error.stack);
  }
}

// รันการทดสอบ
testDirectAPI();