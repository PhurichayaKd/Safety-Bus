require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdatedFunction() {
  console.log('🧪 ทดสอบฟังก์ชัน record_rfid_scan ที่อัปเดตให้ใช้ตาราง pickup_dropoff...\n');

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
      
      if (error.message.includes('rfid_scan_logs')) {
        console.log('\n⚠️ ฟังก์ชันยังไม่ได้รับการอัปเดต!');
        console.log('\n📋 วิธีแก้ไข:');
        console.log('1. เข้าไปที่ Supabase Dashboard > SQL Editor');
        console.log('2. คัดลอกและรันคำสั่ง SQL จากไฟล์ final-record-rfid-scan.sql');
        console.log('3. หรือคัดลอกฟังก์ชันด้านล่างนี้:');
        console.log('\n--- คัดลอกฟังก์ชันนี้ไปรันใน SQL Editor ---');
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
        rca.student_id,
        rc.status,
        s.student_name
    INTO 
        v_student_id,
        v_card_status,
        v_student_name
    FROM rfid_cards rc
    LEFT JOIN rfid_card_assignments rca ON rc.card_id = rca.card_id 
        AND rca.is_active = true
        AND rca.valid_from <= v_scan_time
        AND (rca.valid_to IS NULL OR rca.valid_to >= v_scan_time)
    LEFT JOIN students s ON rca.student_id = s.student_id
    WHERE rc.rfid_code = p_rfid_code 
        AND rc.is_active = true;

    IF v_card_status IS NULL THEN
        INSERT INTO notification_logs (
            notification_type, recipient_id, message, status, error_details, created_at
        ) VALUES (
            'rfid_scan_error', p_driver_id, 'ไม่พบบัตร RFID: ' || p_rfid_code, 'failed',
            json_build_object('error', 'card_not_found', 'rfid_code', p_rfid_code), v_scan_time
        );
        RETURN json_build_object('success', false, 'error', 'ไม่พบบัตร RFID หรือบัตรไม่ได้ใช้งาน');
    END IF;

    IF v_card_status NOT IN ('assigned', 'available') THEN
        INSERT INTO notification_logs (
            notification_type, recipient_id, message, status, error_details, created_at
        ) VALUES (
            'rfid_scan_error', p_driver_id, 'บัตร RFID สถานะไม่ถูกต้อง: ' || v_card_status, 'failed',
            json_build_object('error', 'invalid_card_status', 'card_status', v_card_status), v_scan_time
        );
        RETURN json_build_object('success', false, 'error', 'สถานะบัตรไม่ถูกต้อง: ' || v_card_status);
    END IF;

    INSERT INTO pickup_dropoff (
        student_id, driver_id, event_time, event_type, gps_latitude, gps_longitude,
        last_scan_time, location_type, pickup_source, event_local_date
    ) VALUES (
        v_student_id, p_driver_id, v_scan_time, 'rfid_scan', p_latitude, p_longitude,
        v_scan_time, p_location_type, 'rfid_device', v_event_local_date
    );

    UPDATE rfid_cards SET last_seen_at = v_scan_time WHERE rfid_code = p_rfid_code;

    RETURN json_build_object(
        'success', true, 'message', 'บันทึกการสแกน RFID สำเร็จ',
        'rfid_code', p_rfid_code, 'student_id', v_student_id, 'student_name', v_student_name
    );

EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO notification_logs (
            notification_type, recipient_id, message, status, error_details, created_at
        ) VALUES (
            'rfid_scan_error', p_driver_id, 'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM, 'failed',
            json_build_object('sqlstate', SQLSTATE, 'error', SQLERRM), NOW()
        );
        RETURN json_build_object('success', false, 'error', 'เกิดข้อผิดพลาดในระบบ: ' || SQLERRM);
END;
$$;
        `);
        console.log('--- จบฟังก์ชัน ---\n');
        
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
        
        // ตรวจสอบข้อมูลใน pickup_dropoff
        console.log('\n🔍 ตรวจสอบข้อมูลที่บันทึกใน pickup_dropoff...');
        const { data: pickupData, error: pickupError } = await supabase
          .from('pickup_dropoff')
          .select('*')
          .eq('event_type', 'rfid_scan')
          .eq('driver_id', testData.p_driver_id)
          .order('event_time', { ascending: false })
          .limit(1);

        if (pickupData && pickupData.length > 0) {
          const record = pickupData[0];
          console.log('📋 ข้อมูลที่บันทึกล่าสุด:');
          console.log(`   Record ID: ${record.record_id}`);
          console.log(`   Student ID: ${record.student_id}`);
          console.log(`   Event Type: ${record.event_type}`);
          console.log(`   Location Type: ${record.location_type}`);
          console.log(`   Event Time: ${record.event_time}`);
          console.log(`   GPS: ${record.gps_latitude}, ${record.gps_longitude}`);
        }
        
      } else {
        console.log('\n⚠️ การสแกนไม่สำเร็จ:', data.error);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

testUpdatedFunction();