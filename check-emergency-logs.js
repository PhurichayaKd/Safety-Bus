const { createClient } = require('@supabase/supabase-js');

// ตั้งค่า Supabase
const supabaseUrl = 'https://wnpkmkqtqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGtta3F0cWpxanFqcWpxanFqIiwicm9sZSI6ImFub25fa2V5IiwiaWF0IjoxNzI5Nzc3Mjk1LCJleHAiOjIwNDUzNTMyOTV9.Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmergencyLogs() {
  try {
    console.log('🔍 Checking emergency logs...');
    
    // ดึงข้อมูล emergency logs ทั้งหมด
    const { data: allLogs, error: allError } = await supabase
      .from('emergency_logs')
      .select('*')
      .order('event_time', { ascending: false })
      .limit(10);

    if (allError) {
      console.error('❌ Error fetching all logs:', allError);
    } else {
      console.log(`📊 Total emergency logs found: ${allLogs.length}`);
      allLogs.forEach((log, index) => {
        console.log(`${index + 1}. Event ID: ${log.event_id}, Type: ${log.event_type}, Driver: ${log.driver_id}, Status: ${log.status}, Time: ${log.event_time}`);
      });
    }

    // ดึงข้อมูล emergency logs ที่ยังไม่ได้แก้ไข
    const { data: unresolvedLogs, error: unresolvedError } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('driver_id', 1)
      .eq('resolved', false)
      .order('event_time', { ascending: false });

    if (unresolvedError) {
      console.error('❌ Error fetching unresolved logs:', unresolvedError);
    } else {
      console.log(`🚨 Unresolved emergency logs for driver 1: ${unresolvedLogs.length}`);
      unresolvedLogs.forEach((log, index) => {
        console.log(`${index + 1}. Event ID: ${log.event_id}, Type: ${log.event_type}, Status: ${log.status}, Response: ${log.driver_response_type}`);
      });
    }

    // ดึงข้อมูล emergency logs ที่เป็น SENSOR_ALERT
    const { data: sensorLogs, error: sensorError } = await supabase
      .from('emergency_logs')
      .select('*')
      .eq('event_type', 'SENSOR_ALERT')
      .order('event_time', { ascending: false })
      .limit(5);

    if (sensorError) {
      console.error('❌ Error fetching sensor logs:', sensorError);
    } else {
      console.log(`🔧 Sensor alert logs: ${sensorLogs.length}`);
      sensorLogs.forEach((log, index) => {
        console.log(`${index + 1}. Event ID: ${log.event_id}, Sensor Type: ${log.sensor_type}, Details:`, log.details);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkEmergencyLogs();