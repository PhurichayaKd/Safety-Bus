import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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

async function updateFunction() {
  try {
    console.log('🔄 อัปเดตฟังก์ชัน record_rfid_scan ให้ใช้ตาราง driver_bus...\n');

    // อ่านไฟล์ SQL ฟังก์ชันล่าสุด
    const sqlFilePath = path.join(process.cwd(), 'functions', 'record-rfid-scan-with-driver-bus.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ ไม่พบไฟล์ SQL:', sqlFilePath);
      return false;
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📖 อ่านไฟล์ SQL สำเร็จ');
    console.log('📄 ขนาดไฟล์:', sqlContent.length, 'ตัวอักษร');

    // สร้างไฟล์ SQL สำหรับ Supabase CLI
    const tempSqlFile = path.join(process.cwd(), 'temp-update-function.sql');
    
    // เพิ่มคำสั่งลบฟังก์ชันเก่าก่อน
    const fullSqlContent = `-- ลบฟังก์ชันเก่า (ถ้ามี)
DROP FUNCTION IF EXISTS record_rfid_scan(VARCHAR, INTEGER, NUMERIC, NUMERIC, VARCHAR);

-- สร้างฟังก์ชันใหม่
${sqlContent}`;

    fs.writeFileSync(tempSqlFile, fullSqlContent, 'utf8');
    console.log('📝 สร้างไฟล์ SQL ชั่วคราวสำเร็จ');

    console.log('\n🔧 กำลังอัปเดตฟังก์ชันในฐานข้อมูล...');
    console.log('📋 คำแนะนำ: ใช้คำสั่งต่อไปนี้เพื่ออัปเดตฟังก์ชัน');
    console.log('💡 supabase db push --db-url "' + supabaseUrl + '"');
    console.log('💡 หรือใช้ SQL Editor ใน Supabase Dashboard');
    
    // ทดสอบฟังก์ชันปัจจุบันก่อน
    console.log('\n🧪 ทดสอบฟังก์ชันปัจจุบัน...');
    const { data: currentTest, error: currentError } = await supabase
      .rpc('record_rfid_scan', {
        p_rfid_code: 'F3C9DC34',
        p_driver_id: 1,
        p_latitude: 13.7563,
        p_longitude: 100.5018,
        p_location_type: 'pickup'
      });

    if (currentError) {
      console.log('❌ ฟังก์ชันปัจจุบันมีปัญหา:', currentError.message);
      
      if (currentError.message.includes('drivers')) {
        console.log('🎯 ยืนยัน: ฟังก์ชันยังอ้างอิงตาราง "drivers" ที่ไม่มีอยู่');
        console.log('📝 จำเป็นต้องอัปเดตฟังก์ชันด้วยไฟล์:', tempSqlFile);
      }
    } else {
      console.log('✅ ฟังก์ชันปัจจุบันทำงานได้');
      console.log('📊 ผลลัพธ์:', JSON.stringify(currentTest, null, 2));
    }

    console.log('\n📁 ไฟล์ SQL สำหรับอัปเดต:', tempSqlFile);
    console.log('📋 เนื้อหาไฟล์:');
    console.log('─'.repeat(50));
    console.log(fullSqlContent.substring(0, 500) + '...');
    console.log('─'.repeat(50));
    
    return true;

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    return false;
  }
}

// รันการอัปเดต
updateFunction().then(success => {
  if (success) {
    console.log('\n🎯 เตรียมไฟล์สำหรับอัปเดตเสร็จสิ้น');
    console.log('📝 ขั้นตอนต่อไป: ใช้ Supabase Dashboard หรือ CLI เพื่ออัปเดตฟังก์ชัน');
  } else {
    console.log('\n❌ การเตรียมไฟล์ล้มเหลว');
  }
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
});