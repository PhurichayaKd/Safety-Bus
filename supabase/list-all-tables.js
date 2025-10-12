const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function listAllTables() {
  console.log('🔍 Listing all tables in database...');
  
  // ลองดูตารางที่มีอยู่
  const tables = [
    'students', 'parents', 'routes',
    'drivers', 'line_users', 'user_line_links', 'notifications',
    'driver_status', 'student_status', 'line_notifications',
    'linked_users', 'line_linked_users', 'user_links',
    'rfid_scans', 'trips', 'emergency_alerts'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (!error) {
        console.log(`✅ Table '${table}' exists`);
        if (data && data.length > 0) {
          console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
        } else {
          console.log(`   (empty table)`);
        }
      } else {
        console.log(`❌ Table '${table}' not found`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' error: ${err.message}`);
    }
  }
}

listAllTables().catch(console.error);