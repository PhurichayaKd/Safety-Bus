// สคริปต์สำหรับตรวจสอบข้อมูล driver ในฐานข้อมูล
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// อ่าน environment variables จากไฟล์ .env.local
const envPath = './safety-bus-bot/vercel-deploy/.env.local';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkDrivers() {
  console.log('🔍 Checking drivers in database...\n');

  try {
    // ดึงข้อมูล driver ทั้งหมด
    const { data: drivers, error } = await supabase
      .from('driver_bus')
      .select('*');

    if (error) {
      console.error('❌ Error fetching drivers:', error);
      return;
    }

    console.log(`📊 Found ${drivers.length} drivers:`);
    drivers.forEach((driver, index) => {
      console.log(`   ${index + 1}. ID: ${driver.driver_id} | Name: ${driver.driver_name} | License: ${driver.license_plate}`);
    });

    if (drivers.length > 0) {
      console.log(`\n✅ Using first driver for testing: ${drivers[0].driver_id}`);
      return drivers[0].driver_id;
    } else {
      console.log('\n❌ No drivers found in database');
      return null;
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

// รันการตรวจสอบ
checkDrivers().then(driverId => {
  if (driverId) {
    console.log(`\n🔧 To test driver status notification, use driver_id: "${driverId}"`);
  }
});