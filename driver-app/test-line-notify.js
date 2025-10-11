// test-line-notify.js
// ไฟล์ทดสอบการส่งข้อความ LINE Notify

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ฟังก์ชันทดสอบการส่ง LINE notification
async function testLineNotification() {
  console.log('🧪 ทดสอบการส่ง LINE Notification');
  console.log('=====================================');

  try {
    // ทดสอบเรียกใช้ฟังก์ชัน send_line_notification
    const testMessage = `🧪 ทดสอบระบบแจ้งเตือน
🚨 เหตุการณ์: ทดสอบระบบ
⏰ เวลา: ${new Date().toLocaleString('th-TH')}
📍 สถานที่: ทดสอบ
✅ ระบบทำงานปกติ`;

    console.log('📤 กำลังส่งข้อความทดสอบ...');
    
    const { data, error } = await supabase.rpc('send_line_notification', {
      p_line_user_id: 'Uab3ef44e1dfaa1e269f44c5e97dcd7ba', // LINE User ID ที่มีอยู่จริง
      p_message: testMessage
    });

    if (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error);
      return false;
    }

    console.log('✅ ผลลัพธ์:', data);
    
    if (data && data.success) {
      console.log('🎉 ส่งข้อความ LINE สำเร็จ!');
    } else {
      console.log('⚠️ ส่งข้อความไม่สำเร็จ:', data.error);
    }

    return data && data.success;

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
    return false;
  }
}

// ฟังก์ชันตรวจสอบ notification logs
async function checkNotificationLogs() {
  console.log('\n📊 ตรวจสอบ Notification Logs');
  console.log('=====================================');

  try {
    const { data, error } = await supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('📝 ไม่พบ notification logs');
      return;
    }

    console.log(`📋 พบ ${data.length} รายการล่าสุด:`);
    data.forEach((log, index) => {
      console.log(`\n${index + 1}. ID: ${log.id}`);
      console.log(`   📧 Type: ${log.notification_type}`);
      console.log(`   👤 Recipient: ${log.recipient_id}`);
      console.log(`   📊 Status: ${log.status}`);
      console.log(`   🕐 Created: ${new Date(log.created_at).toLocaleString('th-TH')}`);
      if (log.error_details) {
        console.log(`   ❌ Error: ${JSON.stringify(log.error_details, null, 2)}`);
      }
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ logs:', error);
  }
}

// ฟังก์ชันทดสอบการส่งข้อความเหตุฉุกเฉิน
async function testEmergencyNotification() {
  console.log('\n🚨 ทดสอบการส่งข้อความเหตุฉุกเฉิน');
  console.log('=====================================');

  try {
    // สร้างข้อมูลเหตุฉุกเฉินจำลอง
    const emergencyData = {
      event_type: 'PANIC_BUTTON',
      triggered_by: 'student',
      details: JSON.stringify({
        student_id: 'STD001',
        seat_number: 5,
        panic_button_location: 'ข้างหน้าต่าง',
        location: 'ถนนสุขุมวิท กม.15'
      }),
      status: 'pending'
    };

    // สร้างข้อความแจ้งเตือน
    const message = `🚨 แจ้งเตือนเหตุฉุกเฉิน 🚨

⚠️ ประเภท: ปุ่มฉุกเฉิน
👤 ผู้แจ้ง: นักเรียน
📍 รายละเอียด: ${emergencyData.details}
⏰ เวลา: ${new Date().toLocaleString('th-TH')}
📊 สถานะ: รอดำเนินการ

🚨 กรุณาตรวจสอบและดำเนินการทันที`;

    console.log('📤 กำลังส่งข้อความเหตุฉุกเฉิน...');
    
    const { data, error } = await supabase.rpc('send_line_notification', {
      p_line_user_id: 'Uab3ef44e1dfaa1e269f44c5e97dcd7ba',
      p_message: message
    });

    if (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error);
      return false;
    }

    console.log('✅ ผลลัพธ์:', data);
    return data && data.success;

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
    return false;
  }
}

// ฟังก์ชันหลัก
async function main() {
  const command = process.argv[2] || 'basic';

  switch (command) {
    case 'basic':
      await testLineNotification();
      break;
    case 'emergency':
      await testEmergencyNotification();
      break;
    case 'logs':
      await checkNotificationLogs();
      break;
    case 'all':
      await testLineNotification();
      await testEmergencyNotification();
      await checkNotificationLogs();
      break;
    default:
      console.log('📖 วิธีใช้งาน:');
      console.log('  node test-line-notify.js basic     - ทดสอบพื้นฐาน');
      console.log('  node test-line-notify.js emergency - ทดสอบข้อความเหตุฉุกเฉิน');
      console.log('  node test-line-notify.js logs      - ตรวจสอบ logs');
      console.log('  node test-line-notify.js all       - ทดสอบทั้งหมด');
      break;
  }
}

// รันโปรแกรม
main().catch(console.error);