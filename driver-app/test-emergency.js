// test-emergency.js
// สคริปต์สำหรับทดสอบระบบแจ้งเตือนฉุกเฉิน

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ Supabase credentials ใน environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmergencyNotification() {
  console.log('🚨 เริ่มทดสอบระบบแจ้งเตือนฉุกเฉิน...');
  
  try {
    // สร้างข้อมูลฉุกเฉินทดสอบ
    const emergencyData = {
      driver_id: 1, // ใช้ driver_id ทดสอบ
      event_type: 'SENSOR_ALERT',
      triggered_by: 'sensor',
      description: 'ทดสอบระบบแจ้งเตือนฉุกเฉิน - ตรวจพบควันในรถ',
      location: 'ตำแหน่งทดสอบ',
      notes: 'ข้อมูลทดสอบจากสคริปต์',
      resolved: false,
      status: 'pending'
    };

    console.log('📝 กำลังเพิ่มข้อมูลฉุกเฉินใหม่...');
    console.log('ข้อมูล:', JSON.stringify(emergencyData, null, 2));

    const { data, error } = await supabase
      .from('emergency_logs')
      .insert([emergencyData])
      .select();

    if (error) {
      console.error('❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูล:', error);
      return;
    }

    console.log('✅ เพิ่มข้อมูลฉุกเฉินสำเร็จ!');
    console.log('📊 ข้อมูลที่เพิ่ม:', JSON.stringify(data, null, 2));
    
    // รอสักครู่เพื่อให้ real-time subscription ทำงาน
    console.log('⏳ รอ 3 วินาที เพื่อให้ระบบ real-time ทำงาน...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 ตรวจสอบแอพคนขับเพื่อดูการแจ้งเตือน');
    console.log('📱 หน้าต่างแจ้งเตือนควรปรากฏขึ้นในแอพ');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

async function testEmergencyResponse() {
  console.log('\n🔄 ทดสอบการตอบสนองเหตุการณ์ฉุกเฉิน...');
  
  try {
    // ดึงข้อมูลฉุกเฉินที่ยังไม่ได้แก้ไข
    const { data: emergencies, error } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('resolved', false)
      .eq('driver_id', 1)
      .order('event_time', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
      return;
    }

    if (!emergencies || emergencies.length === 0) {
      console.log('ℹ️ ไม่พบเหตุการณ์ฉุกเฉินที่ยังไม่ได้แก้ไข');
      return;
    }

    const emergency = emergencies[0];
    console.log('📋 พบเหตุการณ์ฉุกเฉิน:', emergency.event_id);
    
    // จำลองการตอบสนอง "ตรวจสอบแล้ว"
    const responseData = {
      event_id: emergency.event_id,
      response_type: 'CHECKED',
      response_time: new Date().toISOString(),
      driver_id: 1,
      notes: 'ทดสอบการตอบสนองจากสคริปต์'
    };

    console.log('📝 กำลังบันทึกการตอบสนอง...');
    
    // บันทึกการตอบสนอง (ถ้ามีตาราง emergency_responses)
    // และอัปเดตสถานะเหตุการณ์
    const { error: updateError } = await supabase
      .from('emergency_logs')
      .update({ 
        resolved: true, 
        resolved_at: new Date().toISOString(),
        resolved_by: 1,
        status: 'resolved'
      })
      .eq('event_id', emergency.event_id);

    if (updateError) {
      console.error('❌ เกิดข้อผิดพลาดในการอัปเดต:', updateError);
      return;
    }

    console.log('✅ อัปเดตสถานะเหตุการณ์สำเร็จ!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบการตอบสนอง:', error);
  }
}

async function main() {
  console.log('🚀 เริ่มต้นการทดสอบระบบแจ้งเตือนฉุกเฉิน');
  console.log('=' .repeat(50));
  
  // ทดสอบการสร้างเหตุการณ์ฉุกเฉิน
  await testEmergencyNotification();
  
  // รอสักครู่
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // ทดสอบการตอบสนอง
  await testEmergencyResponse();
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 การทดสอบเสร็จสิ้น');
  console.log('📱 ตรวจสอบแอพคนขับเพื่อดูผลลัพธ์');
}

// รันการทดสอบ
main().catch(console.error);