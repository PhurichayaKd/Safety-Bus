const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔗 Testing Supabase Connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Present' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmergencyLogs() {
  try {
    console.log('\n📋 Testing emergency_logs table...');
    
    // Test 1: Get all emergency logs
    const { data: allLogs, error: allError } = await supabase
      .from('emergency_logs')
      .select('*')
      .limit(5);
    
    if (allError) {
      console.error('❌ Error fetching all logs:', allError);
    } else {
      console.log('✅ All logs count:', allLogs?.length || 0);
      if (allLogs?.length > 0) {
        console.log('📄 Sample log:', allLogs[0]);
      }
    }

    // Test 2: Get unresolved emergency logs (same as app)
    const { data: unresolvedLogs, error: unresolvedError } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', 1)
      .is('driver_response_type', null)
      .order('event_time', { ascending: false });
    
    if (unresolvedError) {
      console.error('❌ Error fetching unresolved logs:', unresolvedError);
    } else {
      console.log('✅ Unresolved logs count:', unresolvedLogs?.length || 0);
      if (unresolvedLogs?.length > 0) {
        console.log('📄 Sample unresolved log:', unresolvedLogs[0]);
      }
    }

    // Test 3: Test real-time subscription
    console.log('\n🔄 Testing real-time subscription...');
    const subscription = supabase
      .channel('emergency_logs_test')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'emergency_logs',
          filter: 'driver_id=eq.1'
        }, 
        (payload) => {
          console.log('📡 Real-time update:', payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    // Wait a bit then unsubscribe
    setTimeout(() => {
      supabase.removeChannel(subscription);
      console.log('📡 Subscription closed');
      process.exit(0);
    }, 3000);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

testEmergencyLogs();