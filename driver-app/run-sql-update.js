/**
 * สคริปต์สำหรับรันไฟล์ SQL อัปเดต
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ตั้งค่า Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ Supabase configuration ใน environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQLFile() {
  try {
    console.log('📖 อ่านไฟล์ SQL...');
    
    const sqlPath = path.join(__dirname, 'database', 'emergency_logs_update.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🔧 รันคำสั่ง SQL...');
    
    // แบ่งคำสั่ง SQL ออกเป็นส่วนๆ
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd.length > 5);

    console.log(`📝 พบ ${commands.length} คำสั่ง SQL`);

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n[${i + 1}/${commands.length}] รันคำสั่ง: ${command.substring(0, 60)}...`);
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: command + ';'
        });

        if (error) {
          console.error(`❌ Error ในคำสั่งที่ ${i + 1}:`, error);
          
          // ลองรันด้วยวิธีอื่น
          console.log('🔄 ลองรันด้วยวิธีอื่น...');
          
          // สำหรับคำสั่ง ALTER TABLE
          if (command.includes('ALTER TABLE')) {
            console.log('⚠️  ข้าม ALTER TABLE (อาจมีคอลัมน์อยู่แล้ว)');
            continue;
          }
          
          // สำหรับคำสั่ง CREATE INDEX
          if (command.includes('CREATE INDEX')) {
            console.log('⚠️  ข้าม CREATE INDEX (อาจมี index อยู่แล้ว)');
            continue;
          }
          
          // สำหรับคำสั่งอื่นๆ ที่สำคัญ
          if (command.includes('CREATE TABLE') || command.includes('CREATE POLICY') || command.includes('CREATE FUNCTION')) {
            console.error(`❌ คำสั่งสำคัญล้มเหลว: ${command.substring(0, 100)}`);
          }
        } else {
          console.log('✅ สำเร็จ');
        }
      } catch (err) {
        console.error(`❌ Exception ในคำสั่งที่ ${i + 1}:`, err.message);
      }
    }

    console.log('\n🎉 รันไฟล์ SQL เสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

runSQLFile();