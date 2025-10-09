require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedCasting() {
  console.log('🧪 ทดสอบฟังก์ชัน record_rfid_scan ที่แก้ไข data type casting...\n');

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
      
      if (error.message.includes('operator does not exist')) {
        console.log('\n⚠️ ยังมีปัญหา data type casting!');
        console.log('\n📋 วิธีแก้ไข:');
        console.log('1. เข้าไปที่ Supabase Dashboard > SQL Editor');
        console.log('2. คัดลอกและรันฟังก์ชันจากไฟล์ fixed-pickup-dropoff-function.sql');
        console.log('3. หรือคัดลอกฟังก์ชันด้านล่างนี้:');
        console.log('\n--- ฟังก์ชันที่แก้ไข data type casting ---');
        
        // แสดงฟังก์ชันแบบย่อ
        console.log(`
CREATE OR REPLACE FUNCTION record_rfid_scan(
    p_rfid_code VARCHAR,
    p_driver_id INTEGER,
    p_latitude DECIMAL DEFAULT NULL,
    p_longitude DECIMAL DEFAULT NULL,
    p_location_type VARCHAR DEFAULT 'go'
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_student_id INTEGER;
    v_card_status VARCHAR;
    v_student_name VARCHAR;
    v_scan_time TIMESTAMPTZ;
    v_event_local_date DATE;
BEGIN
    v_scan_time := NOW();
    v_event_local_date := (v_scan_time AT TIME ZONE 'Asia/Bangkok')::DATE;
    
    SELECT 
        rca.student_id, rc.status, s.student_name
    INTO 
        v_student_id, v_card_status, v_student_name
    FROM rfid_cards rc
    LEFT JOIN rfid_card_assignments rca ON rc.card_id = rca.card_id 
        AND rca.is_active = true
        AND rca.valid_from <= v_scan_time
        AND (rca.valid_to IS NULL OR rca.valid_to >= v_scan_time)
    LEFT JOIN students s ON rca.student_id = s.student_id
    WHERE rc.rfid_code = p_rfid_code::VARCHAR
        AND rc.is_active = true;

    IF v_card_status IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'ไม่พบบัตร RFID หรือบัตรไม่ได้ใช้งาน');
    END IF;

    IF v_card_status NOT IN ('assigned', 'available') THEN
        RETURN json_build_object('success', false, 'error', 'สถานะบัตรไม่ถูกต้อง: ' || v_card_status);
    END IF;

    INSERT INTO pickup_dropoff (
        student_id, driver_id, event_time, event_type, gps_latitude, gps_longitude,
        last_scan_time, location_type, pickup_source, event_local_date
    ) VALUES (
        v_student_id, p_driver_id, v_scan_time, 'rfid_scan', p_latitude, p_longitude,
        v_scan_time, p_location_type::VARCHAR, 'rfid_device', v_event_local_date
    );

    UPDATE rfid_cards SET last_seen_at = v_scan_time WHERE rfid_code = p_rfid_code::VARCHAR;

    RETURN json_build_object(
        'success', true, 'message', 'บันทึกการสแกน RFID สำเร็จ',
        'rfid_code', p_rfid_code, 'student_id', v_student_id, 'student_name', v_student_name
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', 'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM);
END;
$$;
        `);
        console.log('--- จบฟังก์ชัน ---\n');
        
      } else if (error.message.includes('rfid_scan_logs')) {
        console.log('\n⚠️ ฟังก์ชันยังไม่ได้รับการอัปเดต - ยังใช้ตาราง rfid_scan_logs!');
      } else {
        console.log('⚠️ Error อื่น:', error.message);
      }
    } else {
      console.log('✅ ผลลัพธ์:', JSON.stringify(data, null, 2));
      
      if (data && data.success) {
        console.log('\n🎉 การสแกน RFID สำเร็จ!');
        console.log(`👤 นักเรียน: ${data.student_name || 'ไม่ระบุชื่อ'} (ID: ${data.student_id})`);
        console.log(`🚌 คนขับ: ${data.driver_id}`);
        console.log(`📍 ทิศทาง: ${data.location_type}`);
        console.log(`🔖 RFID Code: ${data.rfid_code}`);
        console.log(`⏰ เวลา: ${data.scan_time}`);
        
        // ตรวจสอบข้อมูลใน pickup_dropoff
        console.log('\n🔍 ตรวจสอบข้อมูลที่บันทึกใน pickup_dropoff...');
        const { data: pickupData, error: pickupError } = await supabase
          .from('pickup_dropoff')
          .select('*')
          .eq('event_type', 'rfid_scan')
          .eq('driver_id', testData.p_driver_id)
          .order('event_time', { ascending: false })
          .limit(3);

        if (pickupData && pickupData.length > 0) {
          console.log('📋 ข้อมูลการสแกน RFID ล่าสุด:');
          pickupData.forEach((record, index) => {
            console.log(`\n--- Record ${index + 1} ---`);
            console.log(`Record ID: ${record.record_id}`);
            console.log(`Student ID: ${record.student_id}`);
            console.log(`Event Type: ${record.event_type}`);
            console.log(`Location Type: ${record.location_type}`);
            console.log(`Event Time: ${record.event_time}`);
            console.log(`GPS: ${record.gps_latitude}, ${record.gps_longitude}`);
            console.log(`Pickup Source: ${record.pickup_source}`);
          });
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
        }
        
      } else {
        console.log('\n⚠️ การสแกนไม่สำเร็จ:', data.error);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testFixedCasting();