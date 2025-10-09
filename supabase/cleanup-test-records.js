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

async function cleanupTestRecords() {
  console.log('🧹 ลบ records ทดสอบเก่า...\n');

  try {
    // ลบ records ของนักเรียน 100014 ในวันนี้
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📅 ลบ records ของนักเรียน 100014 ในวันที่ ${today}...`);
    
    const { data, error } = await supabase
      .from('pickup_dropoff')
      .delete()
      .eq('student_id', 100014)
      .gte('event_time', today + 'T00:00:00Z')
      .lt('event_time', today + 'T23:59:59Z');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ ลบ records เก่าสำเร็จ');
    console.log('🎯 พร้อมทดสอบการสแกน RFID ใหม่แล้ว!');

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

cleanupTestRecords();