const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEmergency() {
  try {
    console.log('Creating test emergency...');
    
    // สร้างเหตุการณ์ฉุกเฉินทดสอบ
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert([
        {
          driver_id: 1, // ใช้ driver_id ที่มีอยู่ในระบบ
          event_type: 'SENSOR_ALERT',
          triggered_by: 'sensor',
          details: {
            source: 'temp_only',
            message: 'อุณหภูมิสูงผิดปกติ',
            original_sensor_type: 'HIGH_TEMPERATURE'
          },
          sensor_type: 'TEMPERATURE',
          sensor_data: {
            mq2_value: 150,
            mq135_value: 200,
            temperature: 45.5,
            gas_threshold: 100,
            temp_threshold: 40.0
          },
          driver_response_type: null, // ยังไม่ได้รับการตอบสนอง
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('Error creating emergency:', error);
      return;
    }

    console.log('Test emergency created successfully:', data);
    console.log('Emergency ID:', data[0]?.id);
    
    // ทดสอบการดึงข้อมูล emergency logs ที่ยังไม่ได้แก้ไข
    console.log('\nFetching unresolved emergencies...');
    const { data: unresolvedEmergencies, error: fetchError } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', 1)
      .eq('resolved', false)
      .order('event_time', { ascending: false });

    if (fetchError) {
      console.error('Error fetching unresolved emergencies:', fetchError);
    } else {
      console.log('Unresolved emergencies:', unresolvedEmergencies);
      console.log(`Found ${unresolvedEmergencies.length} unresolved emergencies`);
    }

    // ดึงข้อมูล emergency logs ทั้งหมดล่าสุด
    console.log('\nFetching recent emergency logs...');
    const { data: recentLogs, error: recentError } = await supabase
      .from('emergency_logs')
      .select('*')
      .order('event_time', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('Error fetching recent logs:', recentError);
    } else {
      console.log('Recent emergency logs:', recentLogs);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestEmergency();