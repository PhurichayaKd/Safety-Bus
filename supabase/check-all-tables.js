import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../safety-bus-bot/vercel-deploy/.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
  console.log('🔍 ตรวจสอบตารางทั้งหมดในฐานข้อมูล');
  console.log('=' .repeat(60));

  try {
    // ดึงรายชื่อตารางทั้งหมด
    const { data, error } = await supabase
      .rpc('get_table_names');

    if (error) {
      console.log('⚠️  ไม่สามารถใช้ RPC function ได้ ลองวิธีอื่น...');
      
      // ลองดึงข้อมูลจากตารางที่รู้จัก
      const tables = [
        'students',
        'parents', 
        'routes',
        'drivers',
        'driver_bus',
        'student_boarding_status',
        'student_leave_requests',
        'line_users',
        'user_line_links',
        'notifications',
        'driver_status',
        'student_status',
        'line_notifications',
        'linked_users',
        'line_linked_users',
        'user_links',
        'rfid_scans',
        'trips',
        'emergency_alerts'
      ];

      for (const tableName of tables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          if (!tableError) {
            console.log(`✅ ตาราง '${tableName}' มีอยู่`);
            
            // ดึงข้อมูลโครงสร้างตาราง
            const { data: columns } = await supabase
              .from(tableName)
              .select('*')
              .limit(0);
              
            if (columns !== null) {
              console.log(`   📊 จำนวนแถว: กำลังตรวจสอบ...`);
              
              // นับจำนวนแถว
              const { count } = await supabase
                .from(tableName)
                .select('*', { count: 'exact', head: true });
                
              console.log(`   📊 จำนวนแถว: ${count || 0}`);
            }
          } else {
            console.log(`❌ ตาราง '${tableName}' ไม่พบ: ${tableError.message}`);
          }
        } catch (err) {
          console.log(`❌ ตาราง '${tableName}' ไม่พบ: ${err.message}`);
        }
      }
    } else {
      console.log('📋 รายชื่อตารางทั้งหมด:', data);
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

checkAllTables().then(() => {
  console.log('\n✅ การตรวจสอบเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});