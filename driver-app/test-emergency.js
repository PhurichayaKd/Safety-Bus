const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmergencyInsertion() {
  console.log('🧪 Testing emergency insertion and realtime subscription...');
  
  try {
    // ตรวจสอบว่ามี driver_id = 1 หรือไม่
    const { data: drivers, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name')
      .limit(5);
    
    if (driverError) {
      console.error('❌ Error fetching drivers:', driverError);
      return;
    }
    
    console.log('📋 Available drivers:', drivers);
    
    if (!drivers || drivers.length === 0) {
      console.error('❌ No drivers found in database');
      return;
    }
    
    const testDriverId = drivers[0].driver_id;
    console.log(`🚗 Using driver ID: ${testDriverId} (${drivers[0].driver_name})`);
    
    // สร้างเหตุการณ์ฉุกเฉินทดสอบ
    const testEmergency = {
      driver_id: testDriverId,
      event_type: 'PANIC_BUTTON',
      triggered_by: 'student',
      details: {
        test: true,
        message: 'Test emergency for realtime subscription',
        timestamp: new Date().toISOString()
      },
      event_time: new Date().toISOString()
    };
    
    console.log('📝 Inserting test emergency:', testEmergency);
    
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert([testEmergency])
      .select();
    
    if (error) {
      console.error('❌ Error inserting emergency:', error);
      return;
    }
    
    console.log('✅ Emergency inserted successfully:', data);
    
    // รอสักครู่แล้วลองอัปเดต
    setTimeout(async () => {
      console.log('🔄 Updating emergency status...');
      
      const { data: updateData, error: updateError } = await supabase
        .from('emergency_logs')
        .update({ 
          status: 'checked',
          driver_response_type: 'CHECKED',
          driver_response_time: new Date().toISOString(),
          driver_response_notes: 'Test response from script'
        })
        .eq('event_id', data[0].event_id)
        .select();
      
      if (updateError) {
        console.error('❌ Error updating emergency:', updateError);
      } else {
        console.log('✅ Emergency updated successfully:', updateData);
      }
      
      // ลบเหตุการณ์ทดสอบ
      setTimeout(async () => {
        console.log('🗑️ Cleaning up test emergency...');
        
        const { error: deleteError } = await supabase
          .from('emergency_logs')
          .delete()
          .eq('event_id', data[0].event_id);
        
        if (deleteError) {
          console.error('❌ Error deleting test emergency:', deleteError);
        } else {
          console.log('✅ Test emergency cleaned up successfully');
        }
        
        process.exit(0);
      }, 3000);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// ตั้งค่า realtime subscription เพื่อตรวจสอบ
function setupRealtimeTest() {
  console.log('🔌 Setting up realtime subscription test...');
  
  const channel = supabase
    .channel('test-emergency-logs')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'emergency_logs'
      },
      (payload) => {
        console.log('📡 Realtime event received:', {
          eventType: payload.eventType,
          table: payload.table,
          schema: payload.schema,
          new: payload.new,
          old: payload.old
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Subscription status:', status);
      
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime subscription active');
        // เริ่มทดสอบหลังจาก subscription พร้อม
        setTimeout(testEmergencyInsertion, 2000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime subscription error');
        process.exit(1);
      }
    });
}

console.log('🚀 Starting emergency realtime test...');
setupRealtimeTest();