require('dotenv').config({ path: '../driver-app/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 ทดสอบการเชื่อมต่อ Supabase...\n');

  try {
    console.log('1️⃣ ทดสอบการเชื่อมต่อ table "driver_bus"...');
    const { data, error } = await supabase
      .from('driver_bus')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ การเชื่อมต่อล้มเหลว:', error.message);
      return false;
    } else {
      console.log('✅ การเชื่อมต่อสำเร็จ!');
      console.log('📊 ข้อมูลที่ได้รับ:', data);
      return true;
    }
  } catch (err) {
    console.log('❌ ข้อผิดพลาดในการเชื่อมต่อ:', err.message);
    return false;
  }
}

testConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 การทดสอบการเชื่อมต่อสำเร็จ! NetworkMonitor ควรทำงานได้ปกติแล้ว');
    } else {
      console.log('\n❌ การทดสอบการเชื่อมต่อล้มเหลว');
    }
  })
  .catch(console.error);