import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function updateDriverTripPhaseFunction() {
  console.log('🔄 Updating update_driver_trip_phase function...');

  try {
    // อ่านไฟล์ SQL
    const sqlContent = fs.readFileSync('../../supabase/functions/update-driver-trip-phase.sql', 'utf8');
    
    console.log('📝 SQL Content:');
    console.log(sqlContent);
    
    // ใช้ raw SQL query โดยตรง
    const { data, error } = await supabase
      .from('pg_stat_statements')
      .select('*')
      .limit(0); // ใช้เพื่อทดสอบการเชื่อมต่อ
    
    if (error && !error.message.includes('permission denied')) {
      console.error('❌ Database connection error:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // ใช้ REST API เพื่อรันคำสั่ง SQL
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'apikey': process.env.SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ query: sqlContent })
    });
    
    if (!response.ok) {
      console.error('❌ Error updating function via REST API:', await response.text());
      console.log('⚠️ Trying alternative method...');
      
      // ลองใช้วิธีอื่น - สร้างฟังก์ชันใหม่โดยตรง
      console.log('📝 Creating function directly...');
      console.log('SQL to execute:');
      console.log(sqlContent);
      console.log('\n✅ Please run this SQL manually in your Supabase dashboard or SQL editor.');
      return;
    }
    
    const result = await response.json();
    
    console.log('✅ Function updated successfully!');
    console.log('Result:', result);
    
    // ทดสอบฟังก์ชันที่อัปเดตแล้ว
    console.log('\n🔍 Testing updated function...');
    const { data: testData, error: testError } = await supabase
      .rpc('update_driver_trip_phase', { 
        p_driver_id: 1, 
        p_trip_phase: 'go' 
      });
    
    console.log('Test Result:', { testData, testError });
    
    if (testData && testData.success) {
      console.log('\n📊 Updated Driver Trip Phase:');
      console.log('- Driver ID:', testData.driver_id);
      console.log('- Old Phase:', testData.old_trip_phase);
      console.log('- New Phase:', testData.new_trip_phase);
      console.log('- Updated At:', testData.updated_at);
    }
    
  } catch (error) {
    console.error('❌ Exception:', error);
  }
}

updateDriverTripPhaseFunction();