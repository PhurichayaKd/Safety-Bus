import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkPickupDropoffStructure() {
  console.log('🔍 Checking pickup_dropoff table structure...\n');

  try {
    // ดึงข้อมูลตัวอย่างเพื่อดูโครงสร้าง
    const { data, error } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching pickup_dropoff data:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ pickup_dropoff table found');
      console.log('📊 Available columns:', Object.keys(data[0]));
      console.log('📄 Sample data structure:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('📄 No data found in pickup_dropoff table');
      
      // ลองดูโครงสร้างโดยการ insert ข้อมูลทดสอบ
      console.log('\n🧪 Testing insert to see required fields...');
      
      const testData = {
        student_id: '999999',
        driver_id: 1,
        event_type: 'pickup',
        location_type: 'go',
        event_time: new Date().toISOString(),
        pickup_source: 'manual'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('pickup_dropoff')
        .insert(testData)
        .select();
      
      if (insertError) {
        console.log('❌ Insert error (shows required fields):', insertError);
      } else {
        console.log('✅ Test insert successful:', insertData);
        
        // ลบข้อมูลทดสอบ
        await supabase
          .from('pickup_dropoff')
          .delete()
          .eq('student_id', '999999');
        
        console.log('🧹 Test data cleaned up');
      }
    }

  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  }
}

// Run the check
checkPickupDropoffStructure().catch(console.error);