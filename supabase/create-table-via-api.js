require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createRfidScanLogsTable() {
  console.log('🔧 สร้างตาราง rfid_scan_logs...\n');

  try {
    // ลองสร้างตารางผ่าน SQL query
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.rfid_scan_logs (
          scan_id SERIAL PRIMARY KEY,
          rfid_code VARCHAR(50) NOT NULL,
          driver_id INTEGER,
          student_id INTEGER,
          scan_time TIMESTAMPTZ DEFAULT NOW(),
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          location_type VARCHAR(20) CHECK (location_type IN ('go', 'back')),
          scan_result VARCHAR(20) DEFAULT 'success',
          error_message TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    console.log('📝 กำลังสร้างตาราง...');
    
    // ลองใช้ rpc เพื่อรัน SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });

    if (error) {
      console.log('⚠️ ไม่สามารถสร้างตารางผ่าน rpc ได้:', error.message);
      
      // ลองวิธีอื่น - ใช้ Supabase REST API โดยตรง
      console.log('🔄 ลองสร้างตารางด้วยวิธีอื่น...');
      
      // ลองเข้าถึงตารางเพื่อดูว่าสร้างได้หรือไม่
      const { data: testData, error: testError } = await supabase
        .from('rfid_scan_logs')
        .select('*')
        .limit(1);

      if (testError) {
        if (testError.message.includes('does not exist')) {
          console.log('❌ ตาราง rfid_scan_logs ยังไม่มีอยู่');
          console.log('\n📋 วิธีแก้ไข:');
          console.log('1. เข้าไปที่ Supabase Dashboard');
          console.log('2. ไปที่ SQL Editor');
          console.log('3. รันคำสั่ง SQL ต่อไปนี้:');
          console.log('\n' + createTableSQL);
          console.log('\n4. หรือใช้ Table Editor เพื่อสร้างตารางใหม่ชื่อ "rfid_scan_logs"');
          
          return false;
        } else {
          console.log('⚠️ Error อื่น:', testError.message);
        }
      } else {
        console.log('✅ ตาราง rfid_scan_logs มีอยู่แล้ว!');
        return true;
      }
    } else {
      console.log('✅ สร้างตารางสำเร็จ!', data);
      return true;
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// ทดสอบการสร้างตาราง
createRfidScanLogsTable().then(success => {
  if (success) {
    console.log('\n🎉 ตาราง rfid_scan_logs พร้อมใช้งาน!');
  } else {
    console.log('\n⚠️ ต้องสร้างตารางด้วยตนเองใน Supabase Dashboard');
  }
});