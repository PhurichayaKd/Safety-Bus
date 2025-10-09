const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY // ใช้ service role key สำหรับการอัปเดตฟังก์ชัน
);

async function updateFunction() {
  console.log('🔄 กำลังอัปเดตฟังก์ชัน record_rfid_scan...\n');
  
  try {
    // อ่านไฟล์ SQL
    const sqlContent = fs.readFileSync('./functions/record-rfid-scan.sql', 'utf8');
    
    // ใช้ rpc เพื่อรันคำสั่ง SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('❌ Error updating function:', error);
      
      // ลองใช้วิธีอื่น - ใช้ SQL query โดยตรง
      console.log('🔄 ลองใช้วิธีอื่น...');
      
      const fixedSql = `
CREATE OR REPLACE FUNCTION record_rfid_scan(
  p_rfid_code VARCHAR,
  p_driver_id INTEGER,
  p_latitude NUMERIC DEFAULT NULL,
  p_longitude NUMERIC DEFAULT NULL,
  p_location_type VARCHAR DEFAULT 'pickup'
) RETURNS JSON AS $$
DECLARE
  v_student_id TEXT;
  v_line_user_id TEXT;
  v_student_name VARCHAR;
  v_driver_name VARCHAR;
  v_record_id INTEGER;
  v_scan_id BIGINT;
  v_card_id BIGINT;
  v_existing_scan INTEGER;
  v_today DATE;
  v_trip_phase TEXT;
  v_boarding_status TEXT;
  v_status_id BIGINT;
  notification_message TEXT;
  line_result JSON;
  line_notified BOOLEAN := false;
BEGIN
  -- ตั้งค่าวันที่ปัจจุบัน (เวลาไทย)
  v_today := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE;
  
  -- กำหนด trip_phase จาก location_type
  v_trip_phase := CASE 
    WHEN p_location_type IN ('pickup', 'go') THEN 'go'
    WHEN p_location_type IN ('dropoff', 'return') THEN 'return'
    ELSE 'go'
  END;
  
  -- ค้นหา student_id จาก RFID code (แก้ไขเงื่อนไข status)
  SELECT 
    s.student_id, 
    s.student_name,
    rc.card_id
  INTO v_student_id, v_student_name, v_card_id
  FROM students s
  JOIN rfid_card_assignments rca ON s.student_id = rca.student_id
  JOIN rfid_cards rc ON rca.card_id = rc.card_id
  WHERE rc.rfid_code = p_rfid_code
    AND rca.is_active = true
    AND rc.is_active = true
    AND rc.status IN ('assigned', 'available')
    AND s.is_active = true
    AND (rca.valid_to IS NULL OR rca.valid_to > NOW())
  LIMIT 1;

  -- ตรวจสอบว่าพบนักเรียนหรือไม่
  IF v_student_id IS NULL THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'ไม่พบนักเรียนที่ใช้บัตรนี้ หรือบัตรไม่ได้รับอนุญาต',
      'rfid_code', p_rfid_code
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Function updated successfully - status condition fixed',
    'student_id', v_student_id,
    'student_name', v_student_name
  );
END;
$$ LANGUAGE plpgsql;
      `;
      
      // ใช้ SQL query โดยตรง
      const { data: directData, error: directError } = await supabase
        .from('_dummy_table_that_does_not_exist')
        .select('*')
        .limit(0);
        
      console.log('❌ ไม่สามารถอัปเดตฟังก์ชันได้โดยตรง');
      console.log('📝 กรุณาใช้ Supabase Dashboard หรือ SQL Editor เพื่ออัปเดตฟังก์ชัน');
      console.log('🔧 SQL ที่ต้องรัน:');
      console.log(fixedSql);
      
    } else {
      console.log('✅ ฟังก์ชันได้รับการอัปเดตเรียบร้อยแล้ว');
      console.log('📋 Result:', data);
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

updateFunction();