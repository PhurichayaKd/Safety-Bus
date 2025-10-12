import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ฟังก์ชันสำหรับทดสอบการรีเซ็ตระบบ
async function testResetSystem() {
  console.log('🔄 Testing Reset System...\n');

  try {
    // 1. ตรวจสอบสถานะปัจจุบันของนักเรียน
    console.log('1️⃣ Checking current student status...');
    const { data: currentStatus, error: statusError } = await supabase
      .from('v_student_today_status')
      .select('*')
      .eq('student_id', '100017');

    if (statusError) {
      console.error('❌ Error fetching current status:', statusError);
    } else {
      console.log('📊 Current status for student 100017:', currentStatus);
    }

    // 2. ตรวจสอบข้อมูลใน pickup_dropoff
    console.log('\n2️⃣ Checking pickup_dropoff records...');
    const today = new Date().toISOString().split('T')[0];
    const { data: pickupData, error: pickupError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .eq('student_id', '100017')
      .gte('event_time', `${today}T00:00:00`)
      .lt('event_time', `${today}T23:59:59`)
      .order('event_time', { ascending: false });

    if (pickupError) {
      console.error('❌ Error fetching pickup data:', pickupError);
    } else {
      console.log('📋 Pickup records for student 100017 today:', pickupData);
    }

    // 3. ตรวจสอบข้อมูลใน student_boarding_status
    console.log('\n3️⃣ Checking student_boarding_status records...');
    const { data: boardingStatus, error: boardingError } = await supabase
      .from('student_boarding_status')
      .select('*')
      .eq('student_id', '100017')
      .eq('trip_date', today)
      .order('updated_at', { ascending: false });

    if (boardingError) {
      console.error('❌ Error fetching boarding status:', boardingError);
    } else {
      console.log('🚌 Boarding status for student 100017 today:', boardingStatus);
    }

    // 4. ทดสอบการรีเซ็ตสำหรับขากลับ (waiting_return)
    console.log('\n4️⃣ Testing reset for return phase...');
    await testReturnPhaseReset();

    // 5. ทดสอบการรีเซ็ตสำหรับจบการเดินทาง (finished)
    console.log('\n5️⃣ Testing reset for finished trip...');
    await testFinishedTripReset();

  } catch (error) {
    console.error('❌ Error in test reset system:', error);
  }
}

// ฟังก์ชันทดสอบการรีเซ็ตสำหรับขากลับ
async function testReturnPhaseReset() {
  try {
    console.log('🔄 Simulating return phase reset...');
    
    // สร้างข้อมูลทดสอบสำหรับขาไป
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    // เพิ่มข้อมูลการขึ้นรถขาไป
    const { data: insertData, error: insertError } = await supabase
      .from('pickup_dropoff')
      .insert({
        student_id: '100017',
        driver_id: 1,
        event_type: 'pickup',
        location_type: 'go',
        event_time: now,
        pickup_latitude: 13.7563,
        pickup_longitude: 100.5018
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting test data:', insertError);
      return;
    }
    
    console.log('✅ Test pickup data inserted:', insertData);

    // ตรวจสอบว่าข้อมูลถูกเพิ่มแล้ว
    const { data: afterInsert, error: checkError } = await supabase
      .from('v_student_today_status')
      .select('*')
      .eq('student_id', '100017');

    if (checkError) {
      console.error('❌ Error checking after insert:', checkError);
    } else {
      console.log('📊 Status after insert:', afterInsert);
    }

    // จำลองการรีเซ็ตเมื่อเปลี่ยนเป็นขากลับ
    // (ในแอปจริงจะเกิดขึ้นเมื่อกด "รอรับกลับบ้าน")
    console.log('🔄 Simulating reset for return phase...');
    
    // ในระบบจริง การรีเซ็ตจะเกิดขึ้นใน AsyncStorage ของแอป
    // แต่ที่นี่เราจะตรวจสอบว่าข้อมูลในฐานข้อมูลยังคงอยู่หรือไม่
    
    console.log('✅ Return phase reset simulation completed');
    
  } catch (error) {
    console.error('❌ Error in return phase reset test:', error);
  }
}

// ฟังก์ชันทดสอบการรีเซ็ตสำหรับจบการเดินทาง
async function testFinishedTripReset() {
  try {
    console.log('🔄 Simulating finished trip reset...');
    
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();
    
    // เพิ่มข้อมูลการลงรถขากลับ
    const { data: insertData2, error: insertError2 } = await supabase
      .from('pickup_dropoff')
      .insert({
        student_id: '100017',
        driver_id: 1,
        event_type: 'dropoff',
        location_type: 'return',
        event_time: now,
        pickup_latitude: 13.7563,
        pickup_longitude: 100.5018
      })
      .select();

    if (insertError2) {
      console.error('❌ Error inserting test dropoff data:', insertError2);
      return;
    }
    
    console.log('✅ Test dropoff data inserted:', insertData2);

    // ตรวจสอบสถานะหลังจากเพิ่มข้อมูล
    const { data: finalStatus, error: finalError } = await supabase
      .from('v_student_today_status')
      .select('*')
      .eq('student_id', '100017');

    if (finalError) {
      console.error('❌ Error checking final status:', finalError);
    } else {
      console.log('📊 Final status:', finalStatus);
    }

    console.log('✅ Finished trip reset simulation completed');
    
  } catch (error) {
    console.error('❌ Error in finished trip reset test:', error);
  }
}

// ฟังก์ชันทำความสะอาดข้อมูลทดสอบ
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // ลบข้อมูลทดสอบใน pickup_dropoff
    const { error: deleteError } = await supabase
      .from('pickup_dropoff')
      .delete()
      .eq('student_id', '100017')
      .gte('event_time', `${today}T00:00:00`)
      .lt('event_time', `${today}T23:59:59`);

    if (deleteError) {
      console.error('❌ Error cleaning up test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up successfully');
    }
    
  } catch (error) {
    console.error('❌ Error in cleanup:', error);
  }
}

// เรียกใช้ฟังก์ชันทดสอบ
async function main() {
  console.log('🚀 Starting Reset System Test\n');
  
  await testResetSystem();
  
  // ถามผู้ใช้ว่าต้องการทำความสะอาดข้อมูลทดสอบหรือไม่
  console.log('\n❓ Do you want to clean up test data? (Run cleanupTestData() manually if needed)');
  
  console.log('\n✅ Reset System Test Completed');
}

// Export functions for manual use
export { testResetSystem, cleanupTestData };

// Run main function
main().catch(console.error);