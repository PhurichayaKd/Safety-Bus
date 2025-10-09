require('dotenv').config({ path: './driver-app/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 ตรวจสอบ tables ใน Supabase...\n');

  // ตรวจสอบ table drivers
  try {
    console.log('1️⃣ ตรวจสอบ table "drivers"...');
    const { data, error } = await supabase
      .from('drivers')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Table "drivers" ไม่พบ:', error.message);
    } else {
      console.log('✅ Table "drivers" พบแล้ว');
    }
  } catch (err) {
    console.log('❌ ข้อผิดพลาดในการตรวจสอบ table "drivers":', err.message);
  }

  // ตรวจสอบ tables อื่นๆ ที่น่าจะมี
  const tablesToCheck = ['students', 'student_boarding_status', 'v_student_today_status', 'rfid_cards', 'rfid_scans', 'notifications'];
  
  for (const table of tablesToCheck) {
    try {
      console.log(`\n${tablesToCheck.indexOf(table) + 2}️⃣ ตรวจสอบ table "${table}"...`);
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table "${table}" ไม่พบ:`, error.message);
      } else {
        console.log(`✅ Table "${table}" พบแล้ว`);
      }
    } catch (err) {
      console.log(`❌ ข้อผิดพลาดในการตรวจสอบ table "${table}":`, err.message);
    }
  }
}

checkTables().catch(console.error);