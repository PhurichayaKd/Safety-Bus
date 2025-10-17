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
            description: 'ทดสอบเซ็นเซอร์ตรวจจับเหตุการณ์ฉุกเฉิน - ' + new Date().toLocaleString('th-TH'),
            location: 'ตำแหน่งทดสอบ',
            severity: 'high'
          },
          sensor_type: 'MOTION',
          sensor_data: {
            motion_detected: true,
            timestamp: new Date().toISOString()
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
    
    // ตรวจสอบว่ามีเหตุการณ์ที่ยังไม่ได้รับการแก้ไข
    const { data: unresolvedData, error: unresolvedError } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', 1)
      .is('driver_response_type', null)
      .order('created_at', { ascending: false });

    if (unresolvedError) {
      console.error('Error fetching unresolved emergencies:', unresolvedError);
    } else {
      console.log('Unresolved emergencies for driver 1:', unresolvedData.length);
      console.log('Latest unresolved:', unresolvedData[0]);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestEmergency();