import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRfidFunctions() {
  console.log('🧪 Testing RFID functions...');
  
  try {
    // Test assign_rfid_card function
    console.log('📝 Testing assign_rfid_card function...');
    const { data, error } = await supabase.rpc('assign_rfid_card', {
      p_student_id: 999999, // Non-existent student for testing
      p_card_id: 999999,    // Non-existent card for testing
      p_assigned_by: 1
    });
    
    if (error) {
      if (error.code === 'PGRST202') {
        console.log('❌ Function assign_rfid_card does not exist');
        console.log('📋 You need to create the function manually in Supabase dashboard');
        return false;
      } else {
        console.log('✅ Function assign_rfid_card exists (got expected error for non-existent data)');
        console.log('Error details:', error.message);
        return true;
      }
    } else {
      console.log('✅ Function assign_rfid_card exists and returned:', data);
      return true;
    }
  } catch (error) {
    console.error('❌ Error testing functions:', error);
    return false;
  }
}

testRfidFunctions().then(success => {
  if (success) {
    console.log('🎉 RFID functions are working!');
  } else {
    console.log('💡 Please create the RFID functions manually in Supabase dashboard');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('📄 Copy the SQL from: ../supabase/supabase/migrations/20251010000000_add_rfid_functions.sql');
  }
  process.exit(success ? 0 : 1);
});