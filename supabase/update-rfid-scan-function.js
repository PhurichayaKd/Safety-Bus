const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRfidScanFunction() {
  try {
    console.log('🔄 Updating record_rfid_scan function...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'functions', 'record-rfid-scan.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📖 SQL file read successfully');
    console.log('📝 SQL content length:', sqlContent.length, 'characters');
    
    // Note: Since we can't execute raw SQL directly through the client library,
    // we'll display the SQL that needs to be run in Supabase SQL Editor
    console.log('\n' + '='.repeat(80));
    console.log('📋 COPY THE FOLLOWING SQL AND RUN IT IN SUPABASE SQL EDITOR:');
    console.log('='.repeat(80));
    console.log(sqlContent);
    console.log('='.repeat(80));
    
    console.log('\n✅ Please copy the above SQL and run it in your Supabase SQL Editor');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/ugkxolufzlnvjsvtpxhp/sql');
    
  } catch (error) {
    console.error('❌ Error updating function:', error.message);
  }
}

// Run the update
updateRfidScanFunction();