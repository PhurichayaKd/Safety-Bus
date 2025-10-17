import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  console.error('กรุณาตรวจสอบไฟล์ .env.local ใน safety-bus-bot/vercel-deploy/');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConstraints() {
  try {
    console.log('🔄 Checking current driver_bus data and attempting to update...');
    
    // First, let's check current data to see what trip_phase values exist
    const { data: currentData, error: dataError } = await supabase
      .from('driver_bus')
      .select('driver_id, trip_phase, driver_name')
      .limit(5);
      
    if (dataError) {
      console.error('❌ Error checking current data:', dataError);
      return;
    }
    
    console.log('📋 Current driver data:', currentData);
    
    // Try to test if 'at_school' is already supported by attempting an update
    console.log('🧪 Testing if at_school constraint is already supported...');
    
    if (currentData && currentData.length > 0) {
      const testDriverId = currentData[0].driver_id;
      const originalPhase = currentData[0].trip_phase;
      
      console.log(`🔍 Testing with driver ${testDriverId}, current phase: ${originalPhase}`);
      
      // Try to update to 'at_school' temporarily
      const { error: testUpdateError } = await supabase
        .from('driver_bus')
        .update({ trip_phase: 'at_school' })
        .eq('driver_id', testDriverId);
      
      if (testUpdateError) {
        console.error('❌ Constraint error detected:', testUpdateError.message);
        console.log('📝 This confirms the constraint needs to be updated.');
        console.log('🔧 Since we cannot directly modify constraints via Supabase client,');
        console.log('   the database administrator needs to run the following SQL:');
        console.log('');
        console.log('-- SQL to fix the constraint:');
        console.log('ALTER TABLE public.driver_bus DROP CONSTRAINT IF EXISTS driver_bus_trip_phase_check;');
        console.log('ALTER TABLE public.driver_bus ADD CONSTRAINT driver_bus_trip_phase_check');
        console.log("CHECK (trip_phase = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text, 'at_school'::text]));");
        console.log('');
        console.log('ALTER TABLE public.student_boarding_status DROP CONSTRAINT IF EXISTS student_boarding_status_trip_phase_check;');
        console.log('ALTER TABLE public.student_boarding_status ADD CONSTRAINT student_boarding_status_trip_phase_check');
        console.log("CHECK (trip_phase = ANY (ARRAY['go'::text, 'return'::text, 'unknown'::text, 'completed'::text, 'at_school'::text]));");
        
        return;
      } else {
        console.log('✅ at_school constraint is already supported!');
        
        // Restore original phase
        await supabase
          .from('driver_bus')
          .update({ trip_phase: originalPhase })
          .eq('driver_id', testDriverId);
          
        console.log(`🔄 Restored original phase: ${originalPhase}`);
      }
    }
    
    console.log('🎉 Constraint check completed successfully!');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

updateConstraints();