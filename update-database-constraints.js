const { createClient } = require('@supabase/supabase-js');

// ตั้งค่า Supabase
const supabaseUrl = 'https://wnpkmkqtqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InducGtta3F0cWpxanFqcWpxanFqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTc3NzI5NSwiZXhwIjoyMDQ1MzUzMjk1fQ.Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey-Ej3Ey';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateConstraints() {
  try {
    console.log('🔄 Updating database constraints...');
    
    // อัปเดต constraint สำหรับ event_type
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing constraint
        ALTER TABLE public.emergency_logs 
        DROP CONSTRAINT IF EXISTS emergency_logs_event_type_check;
        
        -- Add new constraint with additional event types
        ALTER TABLE public.emergency_logs 
        ADD CONSTRAINT emergency_logs_event_type_check 
        CHECK (event_type = ANY (ARRAY[
            'PANIC_BUTTON'::text, 
            'SENSOR_ALERT'::text, 
            'DRIVER_INCAPACITATED'::text,
            'DRIVER_PANIC'::text,
            'MOVEMENT_DETECTED'::text,
            'HIGH_TEMPERATURE'::text,
            'SMOKE_AND_HEAT'::text,
            'STUDENT_SWITCH'::text
        ]));
      `
    });

    if (error) {
      console.error('❌ Error updating constraints:', error);
      return;
    }

    console.log('✅ Database constraints updated successfully!');
    
    // ทดสอบการเพิ่มข้อมูลด้วย event type ใหม่
    const testData = {
      driver_id: 1,
      event_type: 'HIGH_TEMPERATURE',
      triggered_by: 'sensor',
      sensor_type: 'TEMPERATURE',
      sensor_data: {
        temperature: 45.5,
        threshold: 40.0
      },
      details: {
        source: 'temp_only',
        message: 'ทดสอบอุณหภูมิสูง'
      }
    };

    const { data: insertData, error: insertError } = await supabase
      .from('emergency_logs')
      .insert(testData)
      .select();

    if (insertError) {
      console.error('❌ Error testing insert:', insertError);
    } else {
      console.log('✅ Test insert successful:', insertData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateConstraints();