import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// โหลด environment variables จาก .env.local
const envPath = path.join(process.cwd(), '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCurrentFunction() {
  try {
    console.log('🔍 ทดสอบฟังก์ชัน record_rfid_scan ปัจจุบันในฐานข้อมูล...\n');

    // ตรวจสอบตาราง driver_bus
    console.log('🔍 ตรวจสอบตาราง driver_bus...');
    const { data: drivers, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name, current_status, is_active')
      .limit(3);

    if (driverError) {
      console.error('❌ ไม่สามารถเข้าถึงตาราง driver_bus:', driverError);
    } else {
      console.log('✅ ตาราง driver_bus พร้อมใช้งาน');
      console.log('ข้อมูลคนขับ:', drivers);
    }

    // ตรวจสอบ RFID cards ที่มีอยู่
    console.log('\n🔍 ตรวจสอบ RFID cards ที่มีอยู่...');
    const { data: cards, error: cardError } = await supabase
      .from('rfid_cards')
      .select('rfid_code, status, is_active')
      .eq('is_active', true)
      .limit(3);

    if (cardError) {
      console.error('❌ ไม่สามารถเข้าถึงตาราง rfid_cards:', cardError);
    } else {
      console.log('✅ ตาราง rfid_cards พร้อมใช้งาน');
      console.log('RFID cards ที่ใช้งานได้:', cards);
    }

    // ทดสอบเรียกใช้ฟังก์ชันด้วย RFID code ที่มีอยู่จริง
    const testRfidCode = 'F3C9DC34'; // RFID code ที่พบในไฟล์ทดสอบ
    const testDriverId = 1;

    console.log('\n🧪 ทดสอบเรียกใช้ฟังก์ชัน record_rfid_scan...');
    console.log(`RFID Code: ${testRfidCode}`);
    console.log(`Driver ID: ${testDriverId}`);
    
    const { data: testResult, error: testError } = await supabase
      .rpc('record_rfid_scan', {
        p_rfid_code: testRfidCode,
        p_driver_id: testDriverId,
        p_latitude: 13.7563,
        p_longitude: 100.5018,
        p_location_type: 'pickup'
      });

    if (testError) {
      console.error('❌ ข้อผิดพลาดในการทดสอบฟังก์ชัน:', testError);
      
      if (testError.message && testError.message.includes('drivers')) {
        console.log('🎯 ยืนยันแล้ว: ฟังก์ชันยังอ้างอิงตาราง "drivers" ที่ไม่มีอยู่');
        console.log('📝 จำเป็นต้องอัปเดตฟังก์ชันในฐานข้อมูล');
        return false;
      } else if (testError.message && testError.message.includes('relation') && testError.message.includes('does not exist')) {
        console.log('🎯 พบปัญหา: ตารางที่อ้างอิงไม่มีอยู่');
        console.log('ข้อความผิดพลาด:', testError.message);
        return false;
      } else {
        console.log('❓ ข้อผิดพลาดอื่น:', testError.message);
        return false;
      }
    } else {
      console.log('✅ ฟังก์ชันทำงานได้ปกติ');
      console.log('ผลลัพธ์:', JSON.stringify(testResult, null, 2));
      return true;
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    return false;
  }
}

// รันการทดสอบ
checkCurrentFunction().then(success => {
  if (success) {
    console.log('\n🎉 ฟังก์ชัน record_rfid_scan ทำงานได้ปกติแล้ว!');
    console.log('✅ ปัญหา "relation drivers does not exist" ได้รับการแก้ไขแล้ว');
  } else {
    console.log('\n❌ ยังมีปัญหาที่ต้องแก้ไข');
  }
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
});