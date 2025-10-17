const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function insertEmergency() {
  console.log('🚨 Inserting emergency for driver_id = 1...');
  
  const testEmergency = {
    driver_id: 1,
    event_type: 'PANIC_BUTTON',
    triggered_by: 'student',
    details: {
      test: true,
      message: 'Test emergency - should trigger modal',
      timestamp: new Date().toISOString()
    },
    event_time: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('emergency_logs')
    .insert([testEmergency])
    .select();
  
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Emergency inserted:', data[0]);
    console.log('📱 Check your app for the emergency modal!');
  }
}

insertEmergency();