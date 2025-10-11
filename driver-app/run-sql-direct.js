/**
 * สคริปต์สำหรับรันคำสั่ง SQL โดยตรง
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ตั้งค่า Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ Supabase configuration ใน environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDirectSQL() {
  try {
    console.log('🔧 รันคำสั่ง SQL โดยตรง...');

    // 1. เพิ่มคอลัมน์ใหม่ในตาราง emergency_logs (ถ้ายังไม่มี)
    console.log('\n1. ตรวจสอบโครงสร้างตาราง emergency_logs...');
    
    const { data: columns, error: columnError } = await supabase
      .from('emergency_logs')
      .select('*')
      .limit(1);

    if (columnError) {
      console.error('❌ Error:', columnError);
    } else {
      console.log('✅ ตาราง emergency_logs พร้อมใช้งาน');
      if (columns && columns.length > 0) {
        console.log('📋 คอลัมน์ที่มีอยู่:', Object.keys(columns[0]));
      }
    }

    // 2. สร้างตาราง emergency_responses (ถ้ายังไม่มี)
    console.log('\n2. ตรวจสอบตาราง emergency_responses...');
    
    const { data: responses, error: responseError } = await supabase
      .from('emergency_responses')
      .select('*')
      .limit(1);

    if (responseError) {
      console.log('⚠️  ตาราง emergency_responses ยังไม่มี หรือมีปัญหา:', responseError.message);
      console.log('📝 ข้อมูลนี้จะต้องสร้างผ่าน Supabase Dashboard');
    } else {
      console.log('✅ ตาราง emergency_responses พร้อมใช้งาน');
      if (responses && responses.length > 0) {
        console.log('📋 คอลัมน์ที่มีอยู่:', Object.keys(responses[0]));
      }
    }

    // 3. ทดสอบการเพิ่มข้อมูลใน emergency_responses
    console.log('\n3. ทดสอบการเพิ่มข้อมูลใน emergency_responses...');
    
    // ก่อนอื่นให้สร้าง emergency log ทดสอบ
    const { data: testEmergency, error: emergencyError } = await supabase
      .from('emergency_logs')
      .insert({
        driver_id: 1,
        event_type: 'PANIC_BUTTON',
        triggered_by: 'student',
        details: JSON.stringify({
          test: true,
          purpose: 'RLS testing'
        })
      })
      .select()
      .single();

    if (emergencyError) {
      console.error('❌ Error creating test emergency:', emergencyError);
      return;
    }

    console.log('✅ สร้าง test emergency สำเร็จ:', testEmergency.event_id);

    // ทดสอบการเพิ่ม response
    const { data: testResponse, error: responseInsertError } = await supabase
      .from('emergency_responses')
      .insert({
        event_id: testEmergency.event_id,
        driver_id: 1,
        response_type: 'CHECKED',
        response_time: new Date().toISOString(),
        notes: 'ทดสอบ RLS'
      })
      .select()
      .single();

    if (responseInsertError) {
      console.error('❌ Error creating response (RLS issue):', responseInsertError);
      console.log('💡 วิธีแก้ไข: ต้องปิด RLS หรือแก้ไข policy ผ่าน Supabase Dashboard');
      
      // ลองปิด RLS ชั่วคราว (ถ้าเป็นไปได้)
      console.log('\n🔧 ลองแก้ไขปัญหา RLS...');
      console.log('📝 คำสั่ง SQL ที่ต้องรันใน Supabase Dashboard:');
      console.log(`
-- ปิด RLS ชั่วคราว
ALTER TABLE public.emergency_responses DISABLE ROW LEVEL SECURITY;

-- หรือแก้ไข policy
DROP POLICY IF EXISTS "Drivers can insert their own emergency responses" ON public.emergency_responses;

CREATE POLICY "Allow all inserts for testing" 
ON public.emergency_responses FOR INSERT 
WITH CHECK (true);

-- เปิด RLS กลับ
ALTER TABLE public.emergency_responses ENABLE ROW LEVEL SECURITY;
      `);
    } else {
      console.log('✅ สร้าง response สำเร็จ:', testResponse);
    }

    // ลบข้อมูลทดสอบ
    console.log('\n4. ลบข้อมูลทดสอบ...');
    
    if (testResponse) {
      await supabase
        .from('emergency_responses')
        .delete()
        .eq('response_id', testResponse.response_id);
    }
    
    await supabase
      .from('emergency_logs')
      .delete()
      .eq('event_id', testEmergency.event_id);

    console.log('✅ ลบข้อมูลทดสอบเสร็จสิ้น');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

runDirectSQL();