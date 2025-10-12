import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables จาก safety-bus-bot/vercel-deploy/.env.local
dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Checking driver_bus table constraints...');
console.log('='.repeat(60));

async function checkDriverBusConstraints() {
  try {
    // ตรวจสอบโครงสร้างตาราง driver_bus
    console.log('📋 Checking driver_bus table structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('driver_bus')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Error getting sample data:', sampleError.message);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('✅ Table structure (columns):');
      console.log('   Available columns:', Object.keys(sampleData[0]));
      console.log('   Sample data:', sampleData[0]);
    } else {
      console.log('📄 No data found in table');
    }

    // ทดสอบการ insert ด้วยค่า trip_phase ที่ไม่ถูกต้องเพื่อดู constraint error
    console.log('\n🧪 Testing invalid trip_phase values to see constraint error...');
    
    const invalidValues = ['pickup', 'dropoff', 'invalid_value'];
    
    for (const invalidValue of invalidValues) {
      console.log(`\n🔍 Testing trip_phase: "${invalidValue}"`);
      
      const testData = {
        driver_id: 999999, // ใช้ ID ที่ไม่น่าจะมี
        driver_name: 'TEST_DRIVER',
        phone_number: '0999999999',
        username: 'test_driver',
        trip_phase: invalidValue,
        current_status: 'active',
        is_active: true
      };

      const { error: insertError } = await supabase
        .from('driver_bus')
        .insert(testData);

      if (insertError) {
        console.log(`❌ Insert error for "${invalidValue}":`, insertError.message);
        if (insertError.message.includes('check constraint')) {
          console.log('🎯 Found check constraint violation!');
          console.log('   Error code:', insertError.code);
          console.log('   Error details:', insertError.details);
        }
      } else {
        console.log(`✅ Insert successful for "${invalidValue}" - this value is allowed`);
        
        // ลบข้อมูลทดสอบ
        await supabase
          .from('driver_bus')
          .delete()
          .eq('driver_id', 999999);
      }
    }

    // ทดสอบค่าที่น่าจะถูกต้อง
    console.log('\n🧪 Testing valid trip_phase values...');
    const validValues = ['go', 'return'];
    
    for (const validValue of validValues) {
      console.log(`\n🔍 Testing trip_phase: "${validValue}"`);
      
      const testData = {
        driver_id: 999998, // ใช้ ID ที่ไม่น่าจะมี
        driver_name: 'TEST_DRIVER_VALID',
        phone_number: '0999999998',
        username: 'test_driver_valid',
        trip_phase: validValue,
        current_status: 'active',
        is_active: true
      };

      const { error: insertError } = await supabase
        .from('driver_bus')
        .insert(testData);

      if (insertError) {
        console.log(`❌ Insert error for "${validValue}":`, insertError.message);
      } else {
        console.log(`✅ Insert successful for "${validValue}" - this value is allowed`);
        
        // ลบข้อมูลทดสอบ
        await supabase
          .from('driver_bus')
          .delete()
          .eq('driver_id', 999998);
      }
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkDriverBusConstraints();