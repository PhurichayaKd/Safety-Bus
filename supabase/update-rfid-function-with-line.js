// อัปเดตฟังก์ชัน record_rfid_scan ให้รองรับการส่ง LINE notification
// สคริปต์นี้อ่าน SQL จากไฟล์ final-fixed-function.sql และพยายามรันผ่าน RPC หลายรูปแบบ
// พร้อมทางเลือก fallback ผ่าน HTTP API หาก RPC ไม่พร้อมใช้งาน

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// โหลดตัวแปรแวดล้อมจากโฟลเดอร์ vercel-deploy หากมี
try {
  const envPath = path.join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  } else {
    // โหลดจาก .env ในรากโปรเจ็กต์ถ้ามี
    const rootEnv = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(rootEnv)) {
      require('dotenv').config({ path: rootEnv });
    } else {
      require('dotenv').config();
    }
  }
} catch (e) {
  // ถ้าโหลด .env ไม่ได้ ก็ข้ามไป
}

const supabaseUrl = process.env.SUPABASE_URL;
// ใช้ Service Role ถ้ามี, ตกลงมาใช้ ANON KEY ถ้าไม่พบ
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ขาดค่า SUPABASE_URL หรือ KEY ใน environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ พบ' : '❌ ไม่พบ');
  console.log('SUPABASE_KEY:', supabaseKey ? '✅ พบ' : '❌ ไม่พบ');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRfidFunctionWithLine() {
  console.log('🔄 กำลังอัปเดตฟังก์ชัน record_rfid_scan ให้รองรับ LINE notification...\n');

  // อ่านไฟล์ SQL ที่แก้ไขแล้ว
  const sqlPath = path.join(__dirname, 'final-fixed-function.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error('❌ ไม่พบไฟล์:', sqlPath);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log('📄 อ่านไฟล์ final-fixed-function.sql สำเร็จ');
  console.log(`📝 ไฮไลท์การเปลี่ยนแปลง:
- เพิ่มการค้นหา LINE User ID ของนักเรียน/ผู้ปกครอง
- สร้างข้อความแจ้งเตือนไม่แสดง longitude/location
- เรียกใช้ send_line_notification และบันทึก notification_logs
`);

  // ลองเรียกหลายรูปแบบของ RPC ตามที่โปรเจกต์นี้ใช้งาน
  // 1) exec_sql ด้วยพารามิเตอร์ sql_query
  try {
    console.log('🚀 พยายามอัปเดตผ่าน RPC: exec_sql (sql_query)');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
    if (!error) {
      console.log('✅ อัปเดตฟังก์ชันสำเร็จผ่าน RPC exec_sql (sql_query)');
    } else {
      throw error;
    }
  } catch (err1) {
    console.log('⚠️ exec_sql (sql_query) ล้มเหลว:', err1?.message || err1);

    // 2) exec_sql ด้วยพารามิเตอร์ sql
    try {
      console.log('🚀 พยายามอัปเดตผ่าน RPC: exec_sql (sql)');
      const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });
      if (!error) {
        console.log('✅ อัปเดตฟังก์ชันสำเร็จผ่าน RPC exec_sql (sql)');
      } else {
        throw error;
      }
    } catch (err2) {
      console.log('⚠️ exec_sql (sql) ล้มเหลว:', err2?.message || err2);

      // 3) exec ด้วยพารามิเตอร์ sql
      try {
        console.log('🚀 พยายามอัปเดตผ่าน RPC: exec (sql)');
        const { data, error } = await supabase.rpc('exec', { sql: sqlContent });
        if (!error) {
          console.log('✅ อัปเดตฟังก์ชันสำเร็จผ่าน RPC exec (sql)');
        } else {
          throw error;
        }
      } catch (err3) {
        console.log('⚠️ exec (sql) ล้มเหลว:', err3?.message || err3);

        // 4) Fallback: ใช้ HTTP PostgREST โดยตรงไปที่ /rest/v1/rpc/exec_sql
        try {
          console.log('🌐 พยายามอัปเดตผ่าน HTTP API: /rest/v1/rpc/exec_sql');
          const payloadSqlQuery = JSON.stringify({ sql_query: sqlContent });
          const resSqlQuery = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
            },
            body: payloadSqlQuery,
          });
          if (resSqlQuery.ok) {
            const json = await resSqlQuery.json().catch(() => ({}));
            console.log('✅ อัปเดตฟังก์ชันสำเร็จผ่าน HTTP API (exec_sql)');
          } else {
            // ลอง endpoint /rest/v1/rpc/exec แทน
            console.log('🔄 ลอง HTTP API: /rest/v1/rpc/exec');
            const payloadSql = JSON.stringify({ sql: sqlContent });
            const resExec = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
              },
              body: payloadSql,
            });
            if (!resExec.ok) {
              throw new Error(`HTTP ${resExec.status} ${resExec.statusText}`);
            }
            const json2 = await resExec.json().catch(() => ({}));
            console.log('✅ อัปเดตฟังก์ชันสำเร็จผ่าน HTTP API (exec)');
          }
        } catch (httpErr) {
          console.error('❌ ไม่สามารถอัปเดตฟังก์ชันผ่านทุกวิธีได้:', httpErr?.message || httpErr);
          console.log('\n📋 วิธีแก้ไขด้วยตนเอง:');
          console.log('1) เปิด Supabase Dashboard');
          console.log('2) ไปที่ SQL Editor');
          console.log('3) คัดลอกเนื้อหาจากไฟล์ final-fixed-function.sql');
          console.log('4) รันคำสั่ง SQL เพื่ออัปเดตฟังก์ชัน');
          process.exit(1);
        }
      }
    }
  }

  console.log('\n🎉 ฟังก์ชัน record_rfid_scan ได้รับการอัปเดตให้รองรับ LINE notification แล้ว!');

  // ทดสอบเรียกฟังก์ชันแบบเบา ๆ (ใส่ค่า test ที่ไม่กระทบข้อมูลจริงมาก)
  try {
    console.log('\n🧪 ทดสอบเรียกใช้ฟังก์ชัน record_rfid_scan (จำลอง) ...');
    const { data: testData, error: testError } = await supabase.rpc('record_rfid_scan', {
      p_rfid_code: 'TEST-RFID-CODE',
      p_driver_id: 1,
      p_latitude: null,
      p_longitude: null,
      p_location_type: 'go',
    });

    if (testError) {
      console.log('⚠️ Test RPC error:', testError.message);
      console.log('💡 หมายเหตุ: ถ้า RFID นี้ไม่มีอยู่จริง ฟังก์ชันจะคืน error ซึ่งถือว่าโอเคสำหรับการทดสอบ');
    } else {
      console.log('✅ Test RPC result:', JSON.stringify(testData, null, 2));
    }
  } catch (e) {
    console.log('⚠️ ไม่สามารถทดสอบเรียกใช้ฟังก์ชันได้:', e?.message || e);
  }
}

updateRfidFunctionWithLine();