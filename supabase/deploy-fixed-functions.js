import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployFixedFunctions() {
  console.log('🚀 กำลัง deploy ฟังก์ชัน SQL ที่แก้ไขแล้ว...\n');

  try {
    // อ่านไฟล์ฟังก์ชันที่แก้ไขแล้ว
    const functionFile = path.join(__dirname, 'final-record-rfid-scan.sql');
    
    if (!fs.existsSync(functionFile)) {
      console.error('❌ ไม่พบไฟล์ final-record-rfid-scan.sql');
      return;
    }

    const sqlContent = fs.readFileSync(functionFile, 'utf8');
    console.log('📄 อ่านไฟล์ final-record-rfid-scan.sql เรียบร้อย');
    
    // รันคำสั่ง SQL
    console.log('🔄 กำลัง deploy ฟังก์ชัน record_rfid_scan...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('❌ Error deploying function:', error.message);
      
      // ลองใช้วิธีอื่น - รันผ่าน SQL query
      console.log('\n🔄 ลองใช้วิธีอื่น...');
      const { error: directError } = await supabase
        .from('_temp_sql_execution')
        .select('*')
        .limit(1);
        
      if (directError && directError.message.includes('does not exist')) {
        console.log('⚠️ ไม่สามารถ deploy ผ่าน API ได้');
        console.log('\n📋 วิธีแก้ไข:');
        console.log('1. เข้าไปที่ Supabase Dashboard > SQL Editor');
        console.log('2. คัดลอกและรันคำสั่ง SQL จากไฟล์ final-record-rfid-scan.sql');
        console.log('3. หรือคัดลอกฟังก์ชันด้านล่างนี้:\n');
        
        // แสดงเนื้อหาฟังก์ชัน
        console.log('--- คัดลอกฟังก์ชันนี้ไปรันใน SQL Editor ---');
        console.log(sqlContent);
        console.log('--- จบฟังก์ชัน ---\n');
      }
    } else {
      console.log('✅ Deploy ฟังก์ชัน record_rfid_scan สำเร็จ!');
    }

    // ทดสอบฟังก์ชันที่ deploy แล้ว
    console.log('\n🧪 ทดสอบฟังก์ชันที่ deploy แล้ว...');
    const testData = {
      p_rfid_code: 'F3C9DC34',
      p_driver_id: 1,
      p_latitude: 13.7563,
      p_longitude: 100.5018,
      p_location_type: 'go'
    };

    console.log('📝 ข้อมูลทดสอบ:', testData);
    const { data: testResult, error: testError } = await supabase.rpc('record_rfid_scan', testData);

    if (testError) {
      console.log('❌ Test Error:', testError.message);
      
      if (testError.message.includes('event_local_date')) {
        console.log('\n⚠️ ยังมีปัญหา event_local_date อยู่!');
        console.log('💡 แนะนำ: ตรวจสอบว่าฟังก์ชันได้รับการอัปเดตแล้วหรือไม่');
      }
    } else {
      console.log('✅ ทดสอบสำเร็จ:', JSON.stringify(testResult, null, 2));
      
      if (testResult && testResult.success) {
        console.log('\n🎉 ฟังก์ชันทำงานได้ปกติแล้ว!');
        console.log(`👤 นักเรียน: ${testResult.student_name || 'ไม่ระบุชื่อ'} (ID: ${testResult.student_id})`);
        console.log(`🚌 คนขับ: ${testResult.driver_id}`);
        console.log(`📍 ทิศทาง: ${testResult.location_type}`);
        console.log(`🔖 RFID Code: ${testResult.rfid_code}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

deployFixedFunctions();