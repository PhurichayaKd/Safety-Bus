const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://gqyxqxwzjqkqzqzqzqzq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxeXhxeHd6anFrcXpxenF6cXpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDUxNzIwMCwiZXhwIjoyMDUwMDkzMjAwfQ.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyDriverBusChanges() {
  console.log('🚀 เริ่มปรับปรุงระบบให้ใช้ตาราง driver_bus แทน driver_status...');

  try {
    // 1. อ่านและรัน SQL สำหรับปรับปรุงตาราง driver_bus
    console.log('📝 ขั้นตอนที่ 1: ปรับปรุงตาราง driver_bus...');
    const modifyDriverBusSQL = fs.readFileSync(
      path.join(__dirname, 'modify-driver-bus-table.sql'), 
      'utf8'
    );
    
    const { error: modifyError } = await supabase.rpc('exec_sql', { 
      sql: modifyDriverBusSQL 
    });
    
    if (modifyError) {
      console.error('❌ ข้อผิดพลาดในการปรับปรุงตาราง driver_bus:', modifyError);
      return;
    }
    console.log('✅ ปรับปรุงตาราง driver_bus สำเร็จ');

    // 2. สร้างฟังก์ชัน update_driver_trip_phase
    console.log('📝 ขั้นตอนที่ 2: สร้างฟังก์ชัน update_driver_trip_phase...');
    const updateTripPhaseSQL = fs.readFileSync(
      path.join(__dirname, 'functions', 'update-driver-trip-phase.sql'), 
      'utf8'
    );
    
    const { error: updateError } = await supabase.rpc('exec_sql', { 
      sql: updateTripPhaseSQL 
    });
    
    if (updateError) {
      console.error('❌ ข้อผิดพลาดในการสร้างฟังก์ชัน update_driver_trip_phase:', updateError);
      return;
    }
    console.log('✅ สร้างฟังก์ชัน update_driver_trip_phase สำเร็จ');

    // 3. สร้างฟังก์ชัน get_driver_current_status
    console.log('📝 ขั้นตอนที่ 3: สร้างฟังก์ชัน get_driver_current_status...');
    const getStatusSQL = fs.readFileSync(
      path.join(__dirname, 'functions', 'get-driver-current-status.sql'), 
      'utf8'
    );
    
    const { error: getStatusError } = await supabase.rpc('exec_sql', { 
      sql: getStatusSQL 
    });
    
    if (getStatusError) {
      console.error('❌ ข้อผิดพลาดในการสร้างฟังก์ชัน get_driver_current_status:', getStatusError);
      return;
    }
    console.log('✅ สร้างฟังก์ชัน get_driver_current_status สำเร็จ');

    // 4. อัปเดตฟังก์ชัน record_rfid_scan
    console.log('📝 ขั้นตอนที่ 4: อัปเดตฟังก์ชัน record_rfid_scan...');
    const recordRfidSQL = fs.readFileSync(
      path.join(__dirname, 'functions', 'record-rfid-scan-with-driver-bus.sql'), 
      'utf8'
    );
    
    const { error: recordError } = await supabase.rpc('exec_sql', { 
      sql: recordRfidSQL 
    });
    
    if (recordError) {
      console.error('❌ ข้อผิดพลาดในการอัปเดตฟังก์ชัน record_rfid_scan:', recordError);
      return;
    }
    console.log('✅ อัปเดตฟังก์ชัน record_rfid_scan สำเร็จ');

    console.log('🎉 ปรับปรุงระบบเสร็จสมบูรณ์!');
    console.log('');
    console.log('📋 สรุปการเปลี่ยนแปลง:');
    console.log('   ✓ เพิ่มคอลัมน์ trip_phase, current_status, is_active ในตาราง driver_bus');
    console.log('   ✓ สร้างฟังก์ชัน update_driver_trip_phase');
    console.log('   ✓ สร้างฟังก์ชัน get_driver_current_status');
    console.log('   ✓ อัปเดตฟังก์ชัน record_rfid_scan ให้ใช้ตาราง driver_bus');
    console.log('');
    console.log('🔧 ตอนนี้สามารถใช้งานระบบการสแกน RFID แบบสองเฟสได้แล้ว');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการปรับปรุงระบบ:', error);
  }
}

// แสดงข้อมูลการใช้งาน
function showUsage() {
  console.log('📖 วิธีการใช้งาน:');
  console.log('');
  console.log('1. ตั้งค่า Supabase URL และ Service Role Key ในไฟล์นี้');
  console.log('2. รันคำสั่ง: node apply-driver-bus-changes.js');
  console.log('');
  console.log('🔑 API Endpoints ที่สามารถใช้งานได้:');
  console.log('   • POST /rest/v1/rpc/record_rfid_scan');
  console.log('   • POST /rest/v1/rpc/update_driver_trip_phase');
  console.log('   • POST /rest/v1/rpc/get_driver_current_status');
  console.log('');
}

if (require.main === module) {
  showUsage();
  applyDriverBusChanges();
}

module.exports = { applyDriverBusChanges };