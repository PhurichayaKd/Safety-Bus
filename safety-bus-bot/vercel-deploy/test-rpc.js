// ทดสอบการเรียก RPC get_driver_current_status
import { createClient } from '@supabase/supabase-js';

// ใช้ค่าจากไฟล์ .env โดยตรง
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
  console.log('🔍 Testing RPC get_driver_current_status with driver_id = 1');
  
  try {
    const { data, error } = await supabase
      .rpc('get_driver_current_status', { p_driver_id: 1 });
    
    console.log('✅ RPC Result:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
    
    if (data && data.success) {
      console.log('\n📊 Driver Info:');
      console.log('- Driver Name:', data.driver_name);
      console.log('- License Plate:', data.license_plate);
      console.log('- Phone Number:', data.phone_number || 'NOT RETURNED');
      console.log('- Trip Phase:', data.trip_phase);
      console.log('- Current Status:', data.current_status);
      console.log('- Is Active:', data.is_active);
    }
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

async function testDriverBusTable() {
  console.log('\n🔍 Testing direct query to driver_bus table');
  
  try {
    const { data, error } = await supabase
      .from('driver_bus')
      .select('*')
      .eq('driver_id', 1)
      .single();
    
    console.log('✅ Direct Query Result:');
    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);
    
  } catch (err) {
    console.error('❌ Exception:', err);
  }
}

// รันทดสอบ
testRPC().then(() => testDriverBusTable());