import { createClient } from '@supabase/supabase-js';

// Supabase configuration - ใช้ข้อมูลจริงจากไฟล์ .env
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEmergency() {
  try {
    console.log('Creating test emergency event...');
    
    const testEmergency = {
      event_type: 'PANIC_BUTTON',
      triggered_by: 'driver',
      driver_id: 1, // ใช้ driver_id ที่มีอยู่จริงในระบบ
      details: {
        description: 'Test emergency for popup testing',
        location: 'Test Location',
        latitude: 13.7563,
        longitude: 100.5018,
        severity: 'high'
      },
      status: 'pending'
    };

    const { data, error } = await supabase
      .from('emergency_logs')
      .insert([testEmergency])
      .select();

    if (error) {
      console.error('Error creating emergency:', error);
      return;
    }

    console.log('Test emergency created successfully:', data);
    console.log('Check your driver app for popup notification!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
createTestEmergency();