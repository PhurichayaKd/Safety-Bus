const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('🔍 Checking Supabase database tables...\n');

  // List of tables to check based on the code analysis
  const tablesToCheck = [
    'students',
    'student_guardians', 
    'routes',
    'driver_bus',
    'rfid_cards',
    'rfid_card_assignments',
    'live_driver_locations',
    'student_activities',
    'emergency_logs',
    'leave_requests',
    'v_available_rfid_cards' // This appears to be a view
  ];

  for (const tableName of tablesToCheck) {
    await checkTable(tableName);
  }
}

async function checkTable(tableName) {
  try {
    console.log(`📊 Checking table: ${tableName}`);
    
    // Try to get sample data to see if table exists and what columns it has
    const { data: sampleData, error: dataError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (dataError) {
      console.log(`   ❌ Error or table doesn't exist: ${dataError.message}`);
      return;
    }

    if (!sampleData || sampleData.length === 0) {
      console.log(`   ✅ Table ${tableName} exists but is empty`);
      
      // Try to get just the structure by selecting with a false condition
      const { data: structureData, error: structureError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', -999999)
        .limit(1);
        
      if (!structureError && structureData !== null) {
        console.log(`   📋 Table structure available`);
      }
    } else {
      console.log(`   ✅ Table ${tableName} exists with data`);
      console.log(`   📝 Sample record columns:`, Object.keys(sampleData[0]));
      console.log(`   📄 Sample data:`, JSON.stringify(sampleData[0], null, 2));
    }

    // Get count of records
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`   📊 Total records: ${count}`);
    }

    console.log('');
  } catch (error) {
    console.log(`   ❌ Error checking ${tableName}:`, error.message);
    console.log('');
  }
}

// Run the check
checkTables().then(() => {
  console.log('✅ Database check completed!');
}).catch(error => {
  console.error('❌ Script failed:', error);
});