import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ใช้ค่าจากไฟล์ .env โดยตรง
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRPCFunction() {
  console.log('🔄 Updating RPC function get_driver_current_status...');

  try {
    // อ่านไฟล์ SQL
    const sqlContent = fs.readFileSync('../../supabase/functions/get-driver-current-status.sql', 'utf8');
    
    console.log('📝 SQL Content:');
    console.log(sqlContent);
    
    // ใช้ raw SQL query
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: sqlContent 
    });
    
    if (error) {
      console.error('❌ Error updating RPC function:', error);
      return;
    }
    
    console.log('✅ RPC function updated successfully!');
    console.log('Data:', data);
    
    // ทดสอบ RPC function ที่อัปเดตแล้ว
    console.log('\n🔍 Testing updated RPC function...');
    const { data: testData, error: testError } = await supabase
      .rpc('get_driver_current_status', { p_driver_id: 1 });
    
    console.log('Test Result:', { testData, testError });
    
    if (testData && testData.success) {
      console.log('\n📊 Updated Driver Info:');
      console.log('- Driver Name:', testData.driver_name);
      console.log('- Phone Number:', testData.phone_number || 'NOT RETURNED');
      console.log('- License Plate:', testData.license_plate);
      console.log('- Trip Phase:', testData.trip_phase);
      console.log('- Current Status:', testData.current_status);
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

updateRPCFunction();