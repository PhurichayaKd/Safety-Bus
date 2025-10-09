const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testData = {
  driverId: 1,
  rfidCode: 'TEST123456',
  latitude: 13.7563,
  longitude: 100.5018
};

async function testDriverStatusAPI() {
  console.log('🧪 Testing Driver Status API...');
  
  try {
    // Test GET driver status
    const { data, error } = await supabase
      .from('driver_status')
      .select('*')
      .eq('driver_id', testData.driverId)
      .single();
    
    if (error) {
      console.log('⚠️  No existing driver status found, will create one');
      
      // Create initial driver status
      const { data: newStatus, error: createError } = await supabase
        .from('driver_status')
        .insert({
          driver_id: testData.driverId,
          trip_phase: 'pickup',
          current_status: 'active',
          is_active: true
        })
        .select()
        .single();
        
      if (createError) {
        console.error('❌ Error creating driver status:', createError);
        return false;
      }
      
      console.log('✅ Created initial driver status:', newStatus);
    } else {
      console.log('✅ Found existing driver status:', data);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing driver status API:', error);
    return false;
  }
}

async function testPickupPhase() {
  console.log('\n🔄 Testing PICKUP phase...');
  
  try {
    // Update driver status to pickup
    const { error: updateError } = await supabase
      .from('driver_status')
      .update({ 
        trip_phase: 'pickup',
        current_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', testData.driverId);
    
    if (updateError) {
      console.error('❌ Error updating driver status to pickup:', updateError);
      return false;
    }
    
    console.log('✅ Updated driver status to PICKUP phase');
    
    // Test RFID scan for pickup
    const { data, error } = await supabase.rpc('record_rfid_scan', {
      p_rfid_code: testData.rfidCode,
      p_driver_id: testData.driverId,
      p_latitude: testData.latitude,
      p_longitude: testData.longitude,
      p_location_type: 'pickup'
    });
    
    if (error) {
      console.error('❌ Error in pickup scan:', error);
      return false;
    }
    
    console.log('✅ Pickup scan result:', data);
    
    if (data.success) {
      console.log('🎯 Pickup phase test PASSED');
      console.log(`   Student: ${data.student_name}`);
      console.log(`   Trip Phase: ${data.trip_phase}`);
      console.log(`   Notification sent: ${data.line_notified}`);
    } else {
      console.log('⚠️  Pickup scan failed:', data.error);
    }
    
    return data.success;
  } catch (error) {
    console.error('❌ Error testing pickup phase:', error);
    return false;
  }
}

async function testDropoffPhase() {
  console.log('\n🔄 Testing DROPOFF phase...');
  
  try {
    // Update driver status to dropoff
    const { error: updateError } = await supabase
      .from('driver_status')
      .update({ 
        trip_phase: 'dropoff',
        current_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', testData.driverId);
    
    if (updateError) {
      console.error('❌ Error updating driver status to dropoff:', updateError);
      return false;
    }
    
    console.log('✅ Updated driver status to DROPOFF phase');
    
    // Test RFID scan for dropoff
    const { data, error } = await supabase.rpc('record_rfid_scan', {
      p_rfid_code: testData.rfidCode,
      p_driver_id: testData.driverId,
      p_latitude: testData.latitude,
      p_longitude: testData.longitude,
      p_location_type: 'dropoff'
    });
    
    if (error) {
      console.error('❌ Error in dropoff scan:', error);
      return false;
    }
    
    console.log('✅ Dropoff scan result:', data);
    
    if (data.success) {
      console.log('🎯 Dropoff phase test PASSED');
      console.log(`   Student: ${data.student_name}`);
      console.log(`   Trip Phase: ${data.trip_phase}`);
      console.log(`   Notification sent: ${data.line_notified}`);
    } else {
      console.log('⚠️  Dropoff scan failed:', data.error);
    }
    
    return data.success;
  } catch (error) {
    console.error('❌ Error testing dropoff phase:', error);
    return false;
  }
}

async function testDuplicateScanning() {
  console.log('\n🔄 Testing duplicate scanning prevention...');
  
  try {
    // Try to scan the same card again in the same phase
    const { data, error } = await supabase.rpc('record_rfid_scan', {
      p_rfid_code: testData.rfidCode,
      p_driver_id: testData.driverId,
      p_latitude: testData.latitude,
      p_longitude: testData.longitude,
      p_location_type: 'dropoff'
    });
    
    if (error) {
      console.error('❌ Error in duplicate scan test:', error);
      return false;
    }
    
    console.log('✅ Duplicate scan result:', data);
    
    if (!data.success && data.already_scanned) {
      console.log('🎯 Duplicate scanning prevention PASSED');
      console.log(`   Message: ${data.error}`);
      return true;
    } else {
      console.log('⚠️  Duplicate scanning prevention may not be working correctly');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing duplicate scanning:', error);
    return false;
  }
}

async function checkScanLogs() {
  console.log('\n📊 Checking scan logs...');
  
  try {
    const { data, error } = await supabase
      .from('rfid_scan_logs')
      .select('*')
      .eq('rfid_code', testData.rfidCode)
      .order('scan_timestamp', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching scan logs:', error);
      return;
    }
    
    console.log('📋 Recent scan logs:');
    data.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.scan_timestamp} - ${log.trip_phase} - ${log.location_type} - Valid: ${log.is_valid_scan}`);
    });
    
    // Check notification logs
    const { data: notifications, error: notifError } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('student_id', data[0]?.student_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!notifError && notifications.length > 0) {
      console.log('\n📱 Recent notifications:');
      notifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. ${notif.created_at} - ${notif.notification_type} - ${notif.status}`);
        console.log(`      Message: ${notif.message}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking scan logs:', error);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete test scan logs
    const { error: scanError } = await supabase
      .from('rfid_scan_logs')
      .delete()
      .eq('rfid_code', testData.rfidCode);
    
    if (scanError) {
      console.log('⚠️  Could not delete scan logs:', scanError.message);
    } else {
      console.log('✅ Deleted test scan logs');
    }
    
    // Delete test pickup_dropoff records
    const { error: pickupError } = await supabase
      .from('pickup_dropoff')
      .delete()
      .eq('rfid_code', testData.rfidCode);
    
    if (pickupError) {
      console.log('⚠️  Could not delete pickup_dropoff records:', pickupError.message);
    } else {
      console.log('✅ Deleted test pickup_dropoff records');
    }
    
    // Delete test boarding status
    const { error: boardingError } = await supabase
      .from('student_boarding_status')
      .delete()
      .eq('driver_id', testData.driverId)
      .eq('trip_date', new Date().toISOString().split('T')[0]);
    
    if (boardingError) {
      console.log('⚠️  Could not delete boarding status:', boardingError.message);
    } else {
      console.log('✅ Deleted test boarding status');
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

async function runFullTest() {
  console.log('🚀 Starting Dual-Phase Scanning System Test');
  console.log('=' .repeat(60));
  
  const results = {
    driverStatusAPI: false,
    pickupPhase: false,
    dropoffPhase: false,
    duplicatePrevention: false
  };
  
  // Test driver status API
  results.driverStatusAPI = await testDriverStatusAPI();
  
  if (results.driverStatusAPI) {
    // Clean up any existing test data first
    await cleanupTestData();
    
    // Test pickup phase
    results.pickupPhase = await testPickupPhase();
    
    // Test dropoff phase
    results.dropoffPhase = await testDropoffPhase();
    
    // Test duplicate scanning prevention
    results.duplicatePrevention = await testDuplicateScanning();
    
    // Show scan logs
    await checkScanLogs();
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY:');
  console.log('=' .repeat(60));
  console.log(`Driver Status API: ${results.driverStatusAPI ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Pickup Phase: ${results.pickupPhase ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Dropoff Phase: ${results.dropoffPhase ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Duplicate Prevention: ${results.duplicatePrevention ? '✅ PASS' : '❌ FAIL'}`);
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Dual-phase scanning system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  // Ask if user wants to clean up test data
  console.log('\n💡 Note: Test data has been left in the database for inspection.');
  console.log('   Run this script with --cleanup flag to remove test data.');
}

// Check for cleanup flag
if (process.argv.includes('--cleanup')) {
  cleanupTestData().then(() => {
    console.log('✅ Cleanup completed');
    process.exit(0);
  });
} else {
  runFullTest().then(() => {
    process.exit(0);
  });
}