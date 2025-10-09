require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateFunction() {
  console.log('🔄 อัปเดตฟังก์ชัน record_rfid_scan ใน Supabase...\n');

  try {
    // อ่านไฟล์ SQL
    const sqlPath = path.join(__dirname, 'compatible-record-rfid-scan.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('📖 อ่านไฟล์ SQL สำเร็จ');

    // รันคำสั่ง SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    });

    if (error) {
      console.error('❌ Error updating function:', error.message);
      
      // ลองใช้วิธีอื่น
      console.log('🔄 ลองใช้วิธีอื่น...');
      
      const { data: directData, error: directError } = await supabase
        .from('pg_stat_statements')
        .select('*')
        .limit(1);

      if (directError) {
        console.log('💡 ไม่สามารถรันคำสั่ง SQL โดยตรงได้');
        console.log('📋 กรุณาคัดลอกโค้ด SQL จากไฟล์ compatible-record-rfid-scan.sql');
        console.log('📋 และรันใน Supabase Dashboard > SQL Editor');
      }
    } else {
      console.log('✅ อัปเดตฟังก์ชันสำเร็จ!');
      
      // ทดสอบฟังก์ชันใหม่
      console.log('\n🧪 ทดสอบฟังก์ชันที่อัปเดตแล้ว...');
      
      const { data: testResult, error: testError } = await supabase
        .rpc('record_rfid_scan', {
          p_rfid_code: 'F3C9DC34',
          p_driver_id: 1,
          p_latitude: 13.7563,
          p_longitude: 100.5018,
          p_location_type: 'go'
        });

      if (testError) {
        console.error('❌ Test Error:', testError.message);
      } else {
        console.log('✅ Test Result:', JSON.stringify(testResult, null, 2));
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

updateFunction();