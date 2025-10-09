import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the vercel-deploy directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');

dotenv.config({ path: envPath });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPickupSource() {
  console.log('🔍 ตรวจสอบค่า pickup_source ที่มีอยู่ในฐานข้อมูล...\n');

  try {
    // ดูข้อมูลตัวอย่างจากตาราง pickup_dropoff
    const { data, error } = await supabase
      .from('pickup_dropoff')
      .select('pickup_source, event_type, location_type, event_time')
      .not('pickup_source', 'is', null)
      .order('event_time', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('📋 ข้อมูลตัวอย่าง pickup_dropoff:');
    data.forEach((row, index) => {
      console.log(`   ${index + 1}. pickup_source: "${row.pickup_source}" | event_type: ${row.event_type} | location_type: ${row.location_type}`);
    });

    // หาค่า pickup_source ที่ unique
    const uniqueValues = [...new Set(data.map(row => row.pickup_source))];
    console.log('\n✅ ค่า pickup_source ที่มีอยู่:');
    uniqueValues.forEach((value, index) => {
      console.log(`   ${index + 1}. "${value}"`);
    });

    // ลองใส่ค่า null
    console.log('\n🧪 ทดสอบการใส่ pickup_source เป็น null...');
    const testData = {
      student_id: 100014,
      driver_id: 1,
      event_type: 'pickup',
      location_type: 'go',
      event_time: new Date().toISOString(),
      last_scan_time: new Date().toISOString(),
      pickup_source: null,
      gps_latitude: null,
      gps_longitude: null
    };

    const { data: testResult, error: testError } = await supabase
      .from('pickup_dropoff')
      .insert(testData)
      .select()
      .single();

    if (testError) {
      console.error('❌ ข้อผิดพลาดในการทดสอบ:', testError);
    } else {
      console.log('✅ ทดสอบสำเร็จ! Record ID:', testResult.record_id);
      
      // ลบ record ทดสอบ
      await supabase
        .from('pickup_dropoff')
        .delete()
        .eq('record_id', testResult.record_id);
      console.log('🗑️ ลบ record ทดสอบแล้ว');
    }

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

checkPickupSource();