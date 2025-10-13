const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 Testing API Calls that are failing...\n');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'driver-app-test',
    },
  },
});

async function testEmergencyLogs() {
  console.log('📋 Testing emergency_logs query...');
  try {
    const { data, error } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', 1)
      .is('driver_response_type', null)
      .order('event_time', { ascending: false });

    if (error) {
      console.error('❌ Emergency logs error:', error);
      return false;
    }

    console.log('✅ Emergency logs query successful');
    console.log(`   Found ${data?.length || 0} records`);
    return true;
  } catch (error) {
    console.error('❌ Emergency logs exception:', error.message);
    return false;
  }
}

async function testDriverBus() {
  console.log('🚌 Testing driver_bus query...');
  try {
    const { data, error } = await supabase
      .from('driver_bus')
      .select('route_id')
      .eq('driver_id', 1);

    if (error) {
      console.error('❌ Driver bus error:', error);
      return false;
    }

    console.log('✅ Driver bus query successful');
    console.log(`   Found ${data?.length || 0} records`);
    if (data && data.length > 0) {
      console.log(`   Route ID: ${data[0].route_id}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Driver bus exception:', error.message);
    return false;
  }
}

async function testPickupDropoff() {
  console.log('📍 Testing pickup_dropoff query...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data, error } = await supabase
      .from('pickup_dropoff')
      .select('student_id,event_type,event_time,pickup_source,location_type,driver_id')
      .gte('event_time', todayISO)
      .eq('driver_id', 1)
      .order('event_time', { ascending: true });

    if (error) {
      console.error('❌ Pickup dropoff error:', error);
      return false;
    }

    console.log('✅ Pickup dropoff query successful');
    console.log(`   Found ${data?.length || 0} records`);
    return true;
  } catch (error) {
    console.error('❌ Pickup dropoff exception:', error.message);
    return false;
  }
}

async function testAllQueries() {
  console.log('🚀 Starting API tests...\n');

  const results = {
    emergencyLogs: await testEmergencyLogs(),
    driverBus: await testDriverBus(),
    pickupDropoff: await testPickupDropoff(),
  };

  console.log('\n📊 Test Results:');
  console.log('================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });

  const allPassed = Object.values(results).every(result => result);
  console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  if (!allPassed) {
    console.log('\n💡 Suggestions:');
    console.log('- Check if the database tables exist');
    console.log('- Verify column names match the schema');
    console.log('- Ensure driver_id=1 exists in the database');
    console.log('- Check RLS (Row Level Security) policies');
  }
}

testAllQueries().catch(console.error);