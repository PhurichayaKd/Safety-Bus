const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkStudentsTable() {
  console.log('🔍 Checking students table structure...');
  
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log('❌ Error:', error.message);
  } else {
    console.log('📋 Students table columns:');
    if (data && data.length > 0) {
      Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
      console.log('\n📊 Sample data:', data[0]);
    }
  }
}

checkStudentsTable().catch(console.error);