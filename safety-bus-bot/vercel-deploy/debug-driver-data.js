import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDriverData() {
  console.log('🔍 Debugging driver data...\n');
  
  try {
    // 1. ตรวจสอบข้อมูลในตาราง driver_bus
    console.log('📋 1. Checking driver_bus table:');
    const { data: driverBusData, error: driverBusError } = await supabase
      .from('driver_bus')
      .select('*')
      .order('driver_id');
    
    if (driverBusError) {
      console.error('❌ Error querying driver_bus:', driverBusError);
    } else {
      console.log('✅ driver_bus data:', JSON.stringify(driverBusData, null, 2));
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. ตรวจสอบข้อมูลคนขับ ID 1 โดยเฉพาะ
    console.log('👨‍💼 2. Checking driver ID 1 specifically:');
    const { data: driver1Data, error: driver1Error } = await supabase
      .from('driver_bus')
      .select('*')
      .eq('driver_id', 1)
      .single();
    
    if (driver1Error) {
      console.error('❌ Error querying driver ID 1:', driver1Error);
    } else {
      console.log('✅ Driver ID 1 data:', JSON.stringify(driver1Data, null, 2));
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. ทดสอบ RPC function get_driver_current_status
    console.log('🔧 3. Testing RPC function get_driver_current_status:');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_driver_current_status', { p_driver_id: 1 });
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
    } else {
      console.log('✅ RPC Result:', JSON.stringify(rpcData, null, 2));
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. ตรวจสอบตาราง drivers (ถ้ามี)
    console.log('👥 4. Checking drivers table (if exists):');
    const { data: driversData, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .order('id');
    
    if (driversError) {
      console.error('❌ Error querying drivers table:', driversError);
    } else {
      console.log('✅ drivers table data:', JSON.stringify(driversData, null, 2));
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. ตรวจสอบ RLS policies
    console.log('🔒 5. Testing RLS bypass with service role (if available):');
    // Note: This would require service role key, not anon key
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// เรียกใช้ฟังก์ชัน
debugDriverData().then(() => {
  console.log('\n🏁 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});