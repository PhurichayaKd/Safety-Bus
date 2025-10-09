import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the vercel-deploy directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');

dotenv.config({ path: envPath });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRfidScan() {
  console.log('🧪 ทดสอบการสแกน RFID E398F334 สำหรับนักเรียน 100014...\n');

  try {
    // ข้อมูลการทดสอบ
    const rfidCode = 'E398F334';
    const studentId = 100014;
    const driverId = 1; // ใช้ driver ID 1 สำหรับการทดสอบ
    const eventType = 'pickup'; // ทดสอบการรับนักเรียน
    const locationType = 'go'; // เส้นทางไป
    
    console.log('📋 ข้อมูลการทดสอบ:');
    console.log(`   - RFID Code: ${rfidCode}`);
    console.log(`   - Student ID: ${studentId}`);
    console.log(`   - Driver ID: ${driverId}`);
    console.log(`   - Event Type: ${eventType}`);
    console.log(`   - Location Type: ${locationType}`);

    // 1. ตรวจสอบว่าบัตร RFID มีอยู่และ active
    console.log('\n1️⃣ ตรวจสอบบัตร RFID...');
    const { data: rfidCard, error: rfidError } = await supabase
      .from('rfid_cards')
      .select('card_id, rfid_code, status, is_active')
      .eq('rfid_code', rfidCode)
      .eq('is_active', true)
      .single();

    if (rfidError || !rfidCard) {
      console.error('❌ ไม่พบบัตร RFID หรือบัตรไม่ active:', rfidError);
      return;
    }

    console.log('✅ พบบัตร RFID:', rfidCard);

    // 2. ตรวจสอบการมอบหมายบัตร
    console.log('\n2️⃣ ตรวจสอบการมอบหมายบัตร...');
    const { data: assignment, error: assignmentError } = await supabase
      .from('rfid_card_assignments')
      .select('student_id, valid_from, valid_to, is_active')
      .eq('card_id', rfidCard.card_id)
      .eq('is_active', true)
      .single();

    if (assignmentError || !assignment) {
      console.error('❌ ไม่พบการมอบหมายบัตรที่ active:', assignmentError);
      return;
    }

    if (assignment.student_id !== studentId) {
      console.error(`❌ บัตรโยงกับนักเรียน ${assignment.student_id} ไม่ใช่ ${studentId}`);
      return;
    }

    console.log('✅ การมอบหมายบัตรถูกต้อง:', assignment);

    // 3. ตรวจสอบข้อมูลนักเรียน
    console.log('\n3️⃣ ตรวจสอบข้อมูลนักเรียน...');
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('student_id, student_name, grade, is_active, status')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .single();

    if (studentError || !student) {
      console.error('❌ ไม่พบข้อมูลนักเรียนหรือนักเรียนไม่ active:', studentError);
      return;
    }

    console.log('✅ ข้อมูลนักเรียน:', student);

    // 4. บันทึกการสแกน RFID
    console.log('\n4️⃣ บันทึกการสแกน RFID...');
    const scanData = {
      student_id: studentId,
      driver_id: driverId,
      event_type: eventType,
      location_type: locationType,
      event_time: new Date().toISOString(),
      last_scan_time: new Date().toISOString(),
      pickup_source: null,
      gps_latitude: null, // ไม่มีข้อมูล GPS ในการทดสอบ
      gps_longitude: null
    };

    const { data: scanRecord, error: scanError } = await supabase
      .from('pickup_dropoff')
      .insert(scanData)
      .select()
      .single();

    if (scanError) {
      console.error('❌ ข้อผิดพลาดในการบันทึกการสแกน:', scanError);
      return;
    }

    console.log('✅ บันทึกการสแกนสำเร็จ:', {
      record_id: scanRecord.record_id,
      event_time: scanRecord.event_time,
      event_type: scanRecord.event_type,
      location_type: scanRecord.location_type
    });

    // 5. อัปเดต last_seen_at ของบัตร RFID
    console.log('\n5️⃣ อัปเดตเวลาการใช้บัตรล่าสุด...');
    const { error: updateCardError } = await supabase
      .from('rfid_cards')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('card_id', rfidCard.card_id);

    if (updateCardError) {
      console.error('❌ ข้อผิดพลาดในการอัปเดตบัตร:', updateCardError);
    } else {
      console.log('✅ อัปเดตเวลาการใช้บัตรล่าสุดสำเร็จ');
    }

    // 6. ทดสอบการเรียกใช้ฟังก์ชัน Line notification
    console.log('\n6️⃣ ทดสอบการส่งการแจ้งเตือน Line...');
    
    try {
      // ดึงข้อมูล Line User ID ของนักเรียนหรือผู้ปกครอง
      const { data: lineData, error: lineError } = await supabase
        .from('student_line_links')
        .select('line_user_id')
        .eq('student_id', studentId)
        .eq('active', true)
        .single();

      let lineUserId = null;
      if (lineData && lineData.line_user_id) {
        lineUserId = lineData.line_user_id;
        console.log('📱 พบ Line User ID ของนักเรียน:', lineUserId);
      } else {
        // หาจากผู้ปกครอง
        const { data: parentLineData, error: parentLineError } = await supabase
          .from('student_guardians')
          .select(`
            parent_line_links!inner(line_user_id)
          `)
          .eq('student_id', studentId)
          .eq('is_primary', true)
          .eq('parent_line_links.active', true)
          .single();

        if (parentLineData && parentLineData.parent_line_links && parentLineData.parent_line_links.line_user_id) {
          lineUserId = parentLineData.parent_line_links.line_user_id;
          console.log('📱 พบ Line User ID ของผู้ปกครอง:', lineUserId);
        }
      }

      if (lineUserId) {
        // สร้างข้อความแจ้งเตือน
        const message = `🚌 แจ้งเตือนการเดินทาง
👦 นักเรียน: ${student.student_name}
📍 สถานะ: ขึ้นรถ
🕐 เวลา: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
✅ ระบบบันทึกข้อมูลเรียบร้อยแล้ว`;

        // เรียกใช้ฟังก์ชัน send_line_notification
        const { data: notificationResult, error: notificationError } = await supabase
          .rpc('send_line_notification', {
            p_line_user_id: lineUserId,
            p_message: message
          });

        if (notificationError) {
          console.error('❌ ข้อผิดพลาดในการส่งการแจ้งเตือน:', notificationError);
        } else {
          console.log('✅ ส่งการแจ้งเตือน Line สำเร็จ:', notificationResult);
        }
      } else {
        console.log('⚠️ ไม่พบ Line User ID สำหรับนักเรียนหรือผู้ปกครอง');
      }
    } catch (funcError) {
      console.error('❌ ข้อผิดพลาดในการเรียกใช้ฟังก์ชัน:', funcError);
    }

    // 7. ตรวจสอบ notification logs
    console.log('\n7️⃣ ตรวจสอบ notification logs ล่าสุด...');
    const { data: notificationLogs, error: logsError } = await supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);

    if (logsError) {
      console.error('❌ ข้อผิดพลาดในการดึง notification logs:', logsError);
    } else if (notificationLogs && notificationLogs.length > 0) {
      console.log('✅ Notification logs ล่าสุด:');
      notificationLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.notification_type} - ${log.status} - ${log.created_at}`);
        console.log(`      Recipient: ${log.recipient_id}`);
        console.log(`      Message: ${log.message.substring(0, 100)}...`);
        if (log.error_details) {
          console.log(`      Error: ${JSON.stringify(log.error_details)}`);
        }
      });
    } else {
      console.log('⚠️ ไม่พบ notification logs');
    }

    console.log('\n🎉 การทดสอบการสแกน RFID เสร็จสิ้น!');
    console.log('📋 สรุปผลการทดสอบ:');
    console.log(`   ✅ บัตร RFID ${rfidCode} ทำงานได้ปกติ`);
    console.log(`   ✅ บันทึกการสแกนสำเร็จ (Record ID: ${scanRecord.record_id})`);
    console.log(`   ✅ นักเรียน: ${student.student_name} (${student.grade})`);
    console.log(`   ✅ เหตุการณ์: ${eventType} (${locationType})`);

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

// เรียกใช้ฟังก์ชัน
testRfidScan();