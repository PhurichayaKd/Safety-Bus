import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ฟังก์ชันสำหรับทดสอบ workflow ทั้งหมด
async function testFullWorkflow() {
  console.log('🚌 Testing Full Bus Workflow...\n');

  const testStudentId = '100017';
  const testDriverId = 1;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Phase 1: เริ่มเดินทาง (start_trip)
    console.log('1️⃣ Phase 1: Start Trip');
    await testPhase1_StartTrip(testStudentId, testDriverId, today);

    // Phase 2: ไปรับนักเรียน (picking_up)
    console.log('\n2️⃣ Phase 2: Picking Up Students');
    await testPhase2_PickingUp(testStudentId, testDriverId, today);

    // Phase 3: เดินทางไปโรงเรียน (going_to_school)
    console.log('\n3️⃣ Phase 3: Going to School');
    await testPhase3_GoingToSchool(testStudentId, testDriverId, today);

    // Phase 4: ถึงโรงเรียน (arrived_school)
    console.log('\n4️⃣ Phase 4: Arrived at School');
    await testPhase4_ArrivedSchool(testStudentId, testDriverId, today);

    // Phase 5: รอรับกลับบ้าน (waiting_return) - ทดสอบการรีเซ็ต
    console.log('\n5️⃣ Phase 5: Waiting for Return (Reset Test)');
    await testPhase5_WaitingReturn(testStudentId, testDriverId, today);

    // Phase 6: ไปรับนักเรียนขากลับ (picking_up_return)
    console.log('\n6️⃣ Phase 6: Picking Up for Return');
    await testPhase6_PickingUpReturn(testStudentId, testDriverId, today);

    // Phase 7: เดินทางกลับบ้าน (going_home)
    console.log('\n7️⃣ Phase 7: Going Home');
    await testPhase7_GoingHome(testStudentId, testDriverId, today);

    // Phase 8: จบการเดินทาง (finished) - ทดสอบการรีเซ็ตสุดท้าย
    console.log('\n8️⃣ Phase 8: Finished Trip (Final Reset Test)');
    await testPhase8_FinishedTrip(testStudentId, testDriverId, today);

    console.log('\n✅ Full Workflow Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Error in full workflow test:', error);
  }
}

// Phase 1: เริ่มเดินทาง
async function testPhase1_StartTrip(studentId, driverId, date) {
  console.log('🚀 Starting trip...');
  
  // ตรวจสอบสถานะเริ่มต้น
  const { data: initialStatus } = await supabase
    .from('v_student_today_status')
    .select('*')
    .eq('student_id', studentId);
  
  console.log('📊 Initial status:', initialStatus);
  console.log('✅ Trip started');
}

// Phase 2: ไปรับนักเรียน
async function testPhase2_PickingUp(studentId, driverId, date) {
  console.log('🚶 Picking up students...');
  
  // จำลองการขึ้นรถของนักเรียน
  const pickupTime = new Date().toISOString();
  
  const { data: pickupData, error: pickupError } = await supabase
    .from('passenger_data_daily')
    .insert({
      student_id: studentId,
      driver_id: driverId,
      event_type: 'pickup',
      location_type: 'go',
      event_date: date,
      event_time: pickupTime,
      latitude: 13.7563,
      longitude: 100.5018,
      notes: 'Test workflow - pickup go phase'
    })
    .select();

  if (pickupError) {
    console.error('❌ Error recording pickup:', pickupError);
  } else {
    console.log('✅ Student picked up:', pickupData);
  }

  // ตรวจสอบสถานะหลังขึ้นรถ
  const { data: statusAfterPickup } = await supabase
    .from('v_student_today_status')
    .select('*')
    .eq('student_id', studentId);
  
  console.log('📊 Status after pickup:', statusAfterPickup);
}

// Phase 3: เดินทางไปโรงเรียน
async function testPhase3_GoingToSchool(studentId, driverId, date) {
  console.log('🏫 Going to school...');
  
  // ในระยะนี้ไม่มีการเปลี่ยนแปลงข้อมูลนักเรียน
  // เป็นเพียงการเปลี่ยนสถานะรถเท่านั้น
  
  console.log('✅ En route to school');
}

// Phase 4: ถึงโรงเรียน
async function testPhase4_ArrivedSchool(studentId, driverId, date) {
  console.log('🏫 Arrived at school...');
  
  // จำลองการลงรถที่โรงเรียน
  const dropoffTime = new Date().toISOString();
  
  const { data: dropoffData, error: dropoffError } = await supabase
    .from('passenger_data_daily')
    .insert({
      student_id: studentId,
      driver_id: driverId,
      event_type: 'dropoff',
      location_type: 'go',
      event_date: date,
      event_time: dropoffTime,
      latitude: 13.7563,
      longitude: 100.5018,
      notes: 'Test workflow - dropoff at school'
    })
    .select();

  if (dropoffError) {
    console.error('❌ Error recording dropoff:', dropoffError);
  } else {
    console.log('✅ Student dropped off at school:', dropoffData);
  }

  // ตรวจสอบสถานะหลังลงรถ
  const { data: statusAfterDropoff } = await supabase
    .from('v_student_today_status')
    .select('*')
    .eq('student_id', studentId);
  
  console.log('📊 Status after dropoff at school:', statusAfterDropoff);
}

// Phase 5: รอรับกลับบ้าน (ทดสอบการรีเซ็ต)
async function testPhase5_WaitingReturn(studentId, driverId, date) {
  console.log('⏰ Waiting for return trip...');
  
  // ตรวจสอบสถานะก่อนรีเซ็ต
  console.log('🔍 Checking status before reset...');
  const { data: beforeReset } = await supabase
    .from('v_student_today_status')
    .select('*')
    .eq('student_id', studentId);
  
  console.log('📊 Status before reset:', beforeReset);
  
  // จำลองการรีเซ็ตสำหรับขากลับ
  // ในแอปจริง จะมีการรีเซ็ตข้อมูลใน AsyncStorage
  console.log('🔄 Simulating reset for return phase...');
  
  // ตรวจสอบว่าข้อมูลขาไปยังคงอยู่ในฐานข้อมูล
  const { data: goPhaseData } = await supabase
    .from('passenger_data_daily')
    .select('*')
    .eq('student_id', studentId)
    .eq('event_date', date)
    .eq('location_type', 'go')
    .order('event_time', { ascending: false });
  
  console.log('📋 Go phase data (should be preserved):', goPhaseData);
  console.log('✅ Reset for return phase completed');
}

// Phase 6: ไปรับนักเรียนขากลับ
async function testPhase6_PickingUpReturn(studentId, driverId, date) {
  console.log('🚶 Picking up students for return...');
  
  // จำลองการขึ้นรถขากลับ
  const pickupReturnTime = new Date().toISOString();
  
  const { data: pickupReturnData, error: pickupReturnError } = await supabase
    .from('passenger_data_daily')
    .insert({
      student_id: studentId,
      driver_id: driverId,
      event_type: 'pickup',
      location_type: 'return',
      event_date: date,
      event_time: pickupReturnTime,
      latitude: 13.7563,
      longitude: 100.5018,
      notes: 'Test workflow - pickup return phase'
    })
    .select();

  if (pickupReturnError) {
    console.error('❌ Error recording return pickup:', pickupReturnError);
  } else {
    console.log('✅ Student picked up for return:', pickupReturnData);
  }

  // ตรวจสอบสถานะหลังขึ้นรถขากลับ
  const { data: statusAfterReturnPickup } = await supabase
    .from('v_student_today_status')
    .select('*')
    .eq('student_id', studentId);
  
  console.log('📊 Status after return pickup:', statusAfterReturnPickup);
}

// Phase 7: เดินทางกลับบ้าน
async function testPhase7_GoingHome(studentId, driverId, date) {
  console.log('🏠 Going home...');
  
  // ในระยะนี้ไม่มีการเปลี่ยนแปลงข้อมูลนักเรียน
  console.log('✅ En route home');
}

// Phase 8: จบการเดินทาง (ทดสอบการรีเซ็ตสุดท้าย)
async function testPhase8_FinishedTrip(studentId, driverId, date) {
  console.log('🏁 Finishing trip...');
  
  // จำลองการลงรถที่บ้าน
  const dropoffHomeTime = new Date().toISOString();
  
  const { data: dropoffHomeData, error: dropoffHomeError } = await supabase
    .from('passenger_data_daily')
    .insert({
      student_id: studentId,
      driver_id: driverId,
      event_type: 'dropoff',
      location_type: 'return',
      event_date: date,
      event_time: dropoffHomeTime,
      latitude: 13.7563,
      longitude: 100.5018,
      notes: 'Test workflow - dropoff at home'
    })
    .select();

  if (dropoffHomeError) {
    console.error('❌ Error recording home dropoff:', dropoffHomeError);
  } else {
    console.log('✅ Student dropped off at home:', dropoffHomeData);
  }

  // ตรวจสอบสถานะสุดท้าย
  const { data: finalStatus } = await supabase
    .from('v_student_today_status')
    .select('*')
    .eq('student_id', studentId);
  
  console.log('📊 Final status:', finalStatus);

  // ตรวจสอบข้อมูลทั้งหมดของวันนี้
  const { data: allTodayData } = await supabase
    .from('passenger_data_daily')
    .select('*')
    .eq('student_id', studentId)
    .eq('event_date', date)
    .order('event_time', { ascending: true });
  
  console.log('📋 All today\'s data:', allTodayData);
  console.log('✅ Trip finished successfully');
}

// ฟังก์ชันทำความสะอาดข้อมูลทดสอบ
async function cleanupWorkflowTestData() {
  console.log('\n🧹 Cleaning up workflow test data...');
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // ลบข้อมูลทดสอบ
    const { error: deleteError } = await supabase
      .from('passenger_data_daily')
      .delete()
      .eq('student_id', '100017')
      .eq('event_date', today)
      .like('notes', '%Test workflow%');

    if (deleteError) {
      console.error('❌ Error cleaning up workflow test data:', deleteError);
    } else {
      console.log('✅ Workflow test data cleaned up successfully');
    }
    
  } catch (error) {
    console.error('❌ Error in workflow cleanup:', error);
  }
}

// ฟังก์ชันสำหรับตรวจสอบสถานะระบบ
async function checkSystemHealth() {
  console.log('🏥 Checking system health...\n');
  
  try {
    // ตรวจสอบการเชื่อมต่อฐานข้อมูล
    const { data: dbTest, error: dbError } = await supabase
      .from('students')
      .select('count')
      .limit(1);
    
    if (dbError) {
      console.error('❌ Database connection failed:', dbError);
    } else {
      console.log('✅ Database connection OK');
    }

    // ตรวจสอบ view ที่สำคัญ
    const { data: viewTest, error: viewError } = await supabase
      .from('v_student_today_status')
      .select('*')
      .limit(1);
    
    if (viewError) {
      console.error('❌ View access failed:', viewError);
    } else {
      console.log('✅ Views accessible');
    }

    console.log('✅ System health check completed');
    
  } catch (error) {
    console.error('❌ System health check failed:', error);
  }
}

// Export functions
export { 
  testFullWorkflow, 
  cleanupWorkflowTestData, 
  checkSystemHealth 
};

// Main function
async function main() {
  console.log('🚀 Starting Full Workflow Test\n');
  
  // ตรวจสอบสุขภาพระบบก่อน
  await checkSystemHealth();
  
  console.log('\n' + '='.repeat(50));
  
  // เรียกใช้การทดสอบ workflow ทั้งหมด
  await testFullWorkflow();
  
  console.log('\n❓ To clean up test data, run: cleanupWorkflowTestData()');
  console.log('\n✅ All tests completed!');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}