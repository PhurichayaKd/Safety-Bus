require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFinalFunction() {
  console.log('🧪 ทดสอบฟังก์ชัน record_rfid_scan เวอร์ชันที่แก้ไขตามโครงสร้างตารางจริง...\n');

  try {
    // ทดสอบด้วย RFID code ที่ผู้ใช้ระบุ
    const testData = {
      p_rfid_code: 'F3C9DC34',
      p_driver_id: 1,
      p_latitude: 13.7563,
      p_longitude: 100.5018,
      p_location_type: 'go'
    };

    console.log('📝 ข้อมูลทดสอบ:', testData);
    console.log('\n🔄 เรียกใช้ฟังก์ชัน record_rfid_scan...');

    const { data, error } = await supabase.rpc('record_rfid_scan', testData);

    if (error) {
      console.log('❌ Error:', error.message);
      
      if (error.message.includes('recipient_type')) {
        console.log('\n🔍 ปัญหา: คอลัมน์ recipient_type ไม่มีในตาราง notification_logs');
        console.log('💡 แก้ไขแล้ว: ฟังก์ชันใหม่ใช้เฉพาะคอลัมน์ที่มีจริงในตาราง');
      } else if (error.message.includes('metadata')) {
        console.log('\n🔍 ปัญหา: คอลัมน์ metadata ไม่มีในตาราง notification_logs');
        console.log('💡 แก้ไขแล้ว: ใช้ error_details แทน metadata');
      } else if (error.message.includes('event_local_date')) {
        console.log('\n⚠️ ยังมีปัญหา event_local_date!');
        console.log('💡 แก้ไขแล้ว: ไม่ส่งค่า event_local_date ในคำสั่ง INSERT');
      } else if (error.message.includes('event_type_check')) {
        console.log('\n⚠️ ปัญหา event_type constraint!');
        console.log('💡 แก้ไขแล้ว: ใช้ event_type เป็น pickup ตาม constraint');
      } else if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('\n⚠️ ฟังก์ชันยังไม่ได้รับการอัปเดต!');
        console.log('\n📋 วิธีแก้ไข:');
        console.log('1. เข้าไปที่ Supabase Dashboard > SQL Editor');
        console.log('2. คัดลอกและรันฟังก์ชันจากไฟล์ final-fixed-function.sql');
        console.log('3. หรือคัดลอกฟังก์ชันด้านล่างนี้และรันใน SQL Editor:');
        console.log('\n--- ฟังก์ชันที่แก้ไขแล้ว ---');
        console.log('CREATE OR REPLACE FUNCTION record_rfid_scan(');
        console.log('    p_rfid_code VARCHAR,');
        console.log('    p_driver_id INTEGER,');
        console.log('    p_latitude DECIMAL DEFAULT NULL,');
        console.log('    p_longitude DECIMAL DEFAULT NULL,');
        console.log('    p_location_type VARCHAR DEFAULT \'go\'');
        console.log(') RETURNS JSON ...');
        console.log('--- ดูรายละเอียดเต็มในไฟล์ final-fixed-function.sql ---\n');
      } else {
        console.log('⚠️ Error อื่น:', error.message);
      }
      
      console.log('💡 แนะนำ: อัปเดตฟังก์ชันใน Supabase Dashboard ด้วยไฟล์ final-fixed-function.sql');
    } else {
      console.log('✅ ผลลัพธ์:', JSON.stringify(data, null, 2));
      
      if (data && data.success) {
        console.log('\n🎉 การสแกน RFID สำเร็จ!');
        console.log(`👤 นักเรียน: ${data.student_name || 'ไม่ระบุชื่อ'} (ID: ${data.student_id})`);
        console.log(`🚌 คนขับ: ${testData.p_driver_id}`);
        console.log(`📍 ทิศทาง: ${data.location_type}`);
        console.log(`🔖 RFID Code: ${data.rfid_code}`);
        console.log(`📝 Record ID: ${data.record_id}`);
        console.log(`⏰ เวลา: ${data.scan_time}`);
        
        // ตรวจสอบข้อมูลที่บันทึกใน pickup_dropoff
        console.log('\n🔍 ตรวจสอบข้อมูลที่บันทึกใน pickup_dropoff...');
        const { data: pickupData, error: pickupError } = await supabase
          .from('pickup_dropoff')
          .select('*')
          .eq('record_id', data.record_id);

        if (pickupData && pickupData.length > 0) {
          const record = pickupData[0];
          console.log('📋 ข้อมูลที่บันทึก:');
          console.log(`   Record ID: ${record.record_id}`);
          console.log(`   Student ID: ${record.student_id}`);
          console.log(`   Driver ID: ${record.driver_id}`);
          console.log(`   Event Type: ${record.event_type}`);
          console.log(`   Location Type: ${record.location_type}`);
          console.log(`   Event Time: ${record.event_time}`);
          console.log(`   GPS: ${record.gps_latitude}, ${record.gps_longitude}`);
          console.log(`   Pickup Source: ${record.pickup_source}`);
          console.log(`   Event Local Date: ${record.event_local_date}`);
        }
        
        // ตรวจสอบ notification_logs
        console.log('\n📬 ตรวจสอบ notification logs...');
        const { data: notifData, error: notifError } = await supabase
          .from('notification_logs')
          .select('*')
          .eq('notification_type', 'rfid_scan_success')
          .eq('recipient_id', testData.p_driver_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (notifData && notifData.length > 0) {
          const notif = notifData[0];
          console.log('✅ Notification log:');
          console.log(`   Message: ${notif.message}`);
          console.log(`   Status: ${notif.status}`);
          console.log(`   Created: ${notif.created_at}`);
          console.log(`   Metadata: ${JSON.stringify(notif.metadata, null, 2)}`);
        }
        
      } else {
        console.log('\n⚠️ การสแกนไม่สำเร็จ:', data.error);
      }
    }

    // ทดสอบกรณี RFID ไม่พบ
    console.log('\n🧪 ทดสอบกรณี RFID ไม่พบ...');
    const { data: notFoundData, error: notFoundError } = await supabase.rpc('record_rfid_scan', {
      p_rfid_code: 'INVALID123',
      p_driver_id: 1,
      p_latitude: 13.7563,
      p_longitude: 100.5018,
      p_location_type: 'go'
    });

    if (notFoundData) {
      console.log('📝 ผลลัพธ์ RFID ไม่พบ:', JSON.stringify(notFoundData, null, 2));
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testFinalFunction();