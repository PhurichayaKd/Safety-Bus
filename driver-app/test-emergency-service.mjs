import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEmergency() {
  try {
    console.log('🚨 Creating test emergency event...');
    
    // สร้างเหตุการณ์ฉุกเฉินใหม่
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert([
        {
          driver_id: 1, // ใช้ driver ID ที่มีอยู่
          event_type: 'SENSOR_ALERT', // Use valid event type from constraint
          event_time: new Date().toISOString(),
          triggered_by: 'sensor', // Required field
          sensor_type: 'PIR',
          sensor_data: {
            distance: 0.5,
            sensor_id: 'test_sensor_001',
            timestamp: new Date().toISOString()
          },
          is_student_emergency: true,
          resolved: false,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('❌ Error creating emergency:', error);
      return;
    }

    console.log('✅ Test emergency created successfully:', data);
    console.log('📱 Emergency alert should now appear in the driver app');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// เรียกใช้ฟังก์ชัน
createTestEmergency();