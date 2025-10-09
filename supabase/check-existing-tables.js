require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingTables() {
  console.log('🔍 ตรวจสอบตารางที่มีอยู่ในฐานข้อมูล...\n');

  try {
    // ตรวจสอบตารางที่เกี่ยวข้องกับ RFID
    const tablesToCheck = [
      'rfid_scan_logs',
      'rfid_cards', 
      'rfid_card_assignments',
      'students',
      'driver_bus',
      'pickup_dropoff',
      'student_boarding_status',
      'student_line_links',
      'notification_logs'
    ];

    console.log('📋 ตรวจสอบตารางต่อไปนี้:');
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          if (error.message.includes('does not exist')) {
            console.log(`❌ ${tableName} - ไม่มีอยู่`);
          } else {
            console.log(`⚠️ ${tableName} - Error: ${error.message}`);
          }
        } else {
          console.log(`✅ ${tableName} - มีอยู่`);
          
          // แสดงโครงสร้างตาราง (ถ้ามีข้อมูล)
          if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`   📝 Columns: ${columns.join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${tableName} - Exception: ${err.message}`);
      }
    }

    // ตรวจสอบตารางทั้งหมดในฐานข้อมูล
    console.log('\n🗂️ ตรวจสอบตารางทั้งหมดในฐานข้อมูล...');
    
    try {
      const { data: allTables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (tablesError) {
        console.log('⚠️ ไม่สามารถดึงรายชื่อตารางทั้งหมดได้:', tablesError.message);
      } else if (allTables && allTables.length > 0) {
        console.log('📋 ตารางทั้งหมดในฐานข้อมูล:');
        allTables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
      }
    } catch (err) {
      console.log('⚠️ ไม่สามารถเข้าถึง information_schema ได้');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkExistingTables();