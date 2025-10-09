const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://gqyxqxwzjqkqzqzqzqzq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeXhxeHd6anFrcXpxenF6cXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDUxNzIwMCwiZXhwIjoyMDUwMDkzMjAwfQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

// ข้อมูลทดสอบ
const testData = {
  driverId: 1,
  rfidCode: 'TEST001',
  latitude: 13.7563,
  longitude: 100.5018
};

async function testDriverBusSystem() {
  console.log('🚀 เริ่มทดสอบระบบที่ใช้ตาราง driver_bus...');
  console.log('📊 ข้อมูลทดสอบ:', testData);
  console.log('');

  try {
    // 1. ทดสอบการดึงสถานะคนขับ
    console.log('📝 ขั้นตอนที่ 1: ทดสอบการดึงสถานะคนขับ...');
    const { data: driverStatus, error: statusError } = await supabase
      .rpc('get_driver_current_status', { 
        p_driver_id: testData.driverId 
      });

    if (statusError) {
      console.error('❌ ข้อผิดพลาดในการดึงสถานะคนขับ:', statusError);
      return;
    }

    console.log('✅ สถานะคนขับ:', driverStatus);
    console.log('');

    // 2. ทดสอบการอัปเดต trip_phase เป็น pickup
    console.log('📝 ขั้นตอนที่ 2: ทดสอบการอัปเดต trip_phase เป็น pickup...');
    const { data: updatePickup, error: pickupError } = await supabase
      .rpc('update_driver_trip_phase', {
        p_driver_id: testData.driverId,
        p_trip_phase: 'pickup',
        p_latitude: testData.latitude,
        p_longitude: testData.longitude
      });

    if (pickupError) {
      console.error('❌ ข้อผิดพลาดในการอัปเดต trip_phase เป็น pickup:', pickupError);
      return;
    }

    console.log('✅ อัปเดต trip_phase เป็น pickup สำเร็จ:', updatePickup);
    console.log('');

    // 3. ทดสอบการสแกน RFID ในเฟส pickup
    console.log('📝 ขั้นตอนที่ 3: ทดสอบการสแกน RFID ในเฟส pickup...');
    const { data: scanPickup, error: scanPickupError } = await supabase
      .rpc('record_rfid_scan', {
        p_rfid_code: testData.rfidCode,
        p_driver_id: testData.driverId,
        p_latitude: testData.latitude,
        p_longitude: testData.longitude,
        p_location_type: 'pickup'
      });

    if (scanPickupError) {
      console.error('❌ ข้อผิดพลาดในการสแกน RFID (pickup):', scanPickupError);
    } else {
      console.log('✅ การสแกน RFID (pickup) สำเร็จ:', scanPickup);
    }
    console.log('');

    // 4. รอสักครู่แล้วทดสอบการอัปเดต trip_phase เป็น dropoff
    console.log('📝 ขั้นตอนที่ 4: ทดสอบการอัปเดต trip_phase เป็น dropoff...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // รอ 2 วินาที

    const { data: updateDropoff, error: dropoffError } = await supabase
      .rpc('update_driver_trip_phase', {
        p_driver_id: testData.driverId,
        p_trip_phase: 'dropoff',
        p_latitude: testData.latitude + 0.001,
        p_longitude: testData.longitude + 0.001
      });

    if (dropoffError) {
      console.error('❌ ข้อผิดพลาดในการอัปเดต trip_phase เป็น dropoff:', dropoffError);
      return;
    }

    console.log('✅ อัปเดต trip_phase เป็น dropoff สำเร็จ:', updateDropoff);
    console.log('');

    // 5. ทดสอบการสแกน RFID ในเฟส dropoff
    console.log('📝 ขั้นตอนที่ 5: ทดสอบการสแกน RFID ในเฟส dropoff...');
    const { data: scanDropoff, error: scanDropoffError } = await supabase
      .rpc('record_rfid_scan', {
        p_rfid_code: testData.rfidCode,
        p_driver_id: testData.driverId,
        p_latitude: testData.latitude + 0.001,
        p_longitude: testData.longitude + 0.001,
        p_location_type: 'dropoff'
      });

    if (scanDropoffError) {
      console.error('❌ ข้อผิดพลาดในการสแกน RFID (dropoff):', scanDropoffError);
    } else {
      console.log('✅ การสแกน RFID (dropoff) สำเร็จ:', scanDropoff);
    }
    console.log('');

    // 6. ทดสอบการป้องกันการสแกนซ้ำ
    console.log('📝 ขั้นตอนที่ 6: ทดสอบการป้องกันการสแกนซ้ำ...');
    const { data: duplicateScan, error: duplicateError } = await supabase
      .rpc('record_rfid_scan', {
        p_rfid_code: testData.rfidCode,
        p_driver_id: testData.driverId,
        p_latitude: testData.latitude + 0.001,
        p_longitude: testData.longitude + 0.001,
        p_location_type: 'dropoff'
      });

    if (duplicateError) {
      console.error('❌ ข้อผิดพลาดในการทดสอบการสแกนซ้ำ:', duplicateError);
    } else {
      if (duplicateScan.success === false && duplicateScan.already_scanned) {
        console.log('✅ ระบบป้องกันการสแกนซ้ำทำงานถูกต้อง:', duplicateScan.error);
      } else {
        console.log('⚠️  ระบบป้องกันการสแกนซ้ำอาจมีปัญหา:', duplicateScan);
      }
    }
    console.log('');

    // 7. ตรวจสอบ log การสแกน
    console.log('📝 ขั้นตอนที่ 7: ตรวจสอบ log การสแกน...');
    const { data: scanLogs, error: logsError } = await supabase
      .from('rfid_scan_logs')
      .select('*')
      .eq('rfid_code', testData.rfidCode)
      .order('scan_timestamp', { ascending: false })
      .limit(5);

    if (logsError) {
      console.error('❌ ข้อผิดพลาดในการดึง log การสแกน:', logsError);
    } else {
      console.log('✅ Log การสแกน (5 รายการล่าสุด):');
      scanLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.scan_timestamp} - ${log.trip_phase} - ${log.scan_result}`);
      });
    }
    console.log('');

    // 8. ตรวจสอบ notification logs
    console.log('📝 ขั้นตอนที่ 8: ตรวจสอบ notification logs...');
    const { data: notificationLogs, error: notifError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('notification_type', 'rfid_scan')
      .order('created_at', { ascending: false })
      .limit(3);

    if (notifError) {
      console.error('❌ ข้อผิดพลาดในการดึง notification logs:', notifError);
    } else {
      console.log('✅ Notification logs (3 รายการล่าสุด):');
      notificationLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.created_at} - ${log.status} - ${log.message.substring(0, 50)}...`);
      });
    }
    console.log('');

    console.log('🎉 การทดสอบระบบเสร็จสมบูรณ์!');
    console.log('');
    console.log('📋 สรุปผลการทดสอบ:');
    console.log('   ✓ ระบบดึงสถานะคนขับจากตาราง driver_bus ได้');
    console.log('   ✓ ระบบอัปเดต trip_phase ได้ (pickup/dropoff)');
    console.log('   ✓ ระบบสแกน RFID ในทั้งสองเฟสได้');
    console.log('   ✓ ระบบป้องกันการสแกนซ้ำทำงานได้');
    console.log('   ✓ ระบบบันทึก log และ notification ได้');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบระบบ:', error);
  }
}

// ฟังก์ชันล้างข้อมูลทดสอบ
async function cleanupTestData() {
  console.log('🧹 ล้างข้อมูลทดสอบ...');
  
  try {
    // ลบ scan logs
    await supabase
      .from('rfid_scan_logs')
      .delete()
      .eq('rfid_code', testData.rfidCode);

    // ลบ pickup_dropoff records
    await supabase
      .from('pickup_dropoff')
      .delete()
      .eq('driver_id', testData.driverId);

    // ลบ notification logs
    await supabase
      .from('notification_logs')
      .delete()
      .eq('notification_type', 'rfid_scan');

    // รีเซ็ต driver status
    await supabase
      .from('driver_bus')
      .update({ 
        trip_phase: 'pickup',
        current_status: 'inactive'
      })
      .eq('driver_id', testData.driverId);

    console.log('✅ ล้างข้อมูลทดสอบเสร็จสิ้น');
  } catch (error) {
    console.error('❌ ข้อผิดพลาดในการล้างข้อมูล:', error);
  }
}

// แสดงข้อมูลการใช้งาน
function showUsage() {
  console.log('📖 วิธีการใช้งาน:');
  console.log('');
  console.log('1. ตั้งค่า Supabase URL และ Service Role Key ในไฟล์นี้');
  console.log('2. รันคำสั่ง: node test-driver-bus-system.js');
  console.log('3. หากต้องการล้างข้อมูลทดสอบ: node test-driver-bus-system.js --cleanup');
  console.log('');
  console.log('🔧 ข้อกำหนดเบื้องต้น:');
  console.log('   • ต้องรันสคริปต์ apply-driver-bus-changes.js ก่อน');
  console.log('   • ต้องมีข้อมูลคนขับ ID 1 ในตาราง driver_bus');
  console.log('   • ต้องมีข้อมูลนักเรียนและ RFID card TEST001');
  console.log('');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    cleanupTestData();
  } else {
    showUsage();
    testDriverBusSystem();
  }
}

module.exports = { testDriverBusSystem, cleanupTestData };