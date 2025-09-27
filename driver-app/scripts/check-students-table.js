const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkStudentsTable() {
  console.log('🔍 Examining students table in detail...\n');

  try {
    // Get all students data
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .limit(5);

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return;
    }

    if (!students || students.length === 0) {
      console.log('❌ No students found in the table');
      return;
    }

    console.log('📊 Students table structure:');
    console.log('Columns found:', Object.keys(students[0]));
    console.log('');

    console.log('📝 Sample students data:');
    students.forEach((student, index) => {
      console.log(`Student ${index + 1}:`);
      console.log(JSON.stringify(student, null, 2));
      console.log('---');
    });

    // Check for location-related columns
    const firstStudent = students[0];
    const locationColumns = Object.keys(firstStudent).filter(key => 
      key.toLowerCase().includes('lat') || 
      key.toLowerCase().includes('lng') || 
      key.toLowerCase().includes('lon') ||
      key.toLowerCase().includes('geo') ||
      key.toLowerCase().includes('home') ||
      key.toLowerCase().includes('address')
    );

    console.log('🗺️ Location-related columns found:');
    if (locationColumns.length > 0) {
      locationColumns.forEach(col => {
        console.log(`  - ${col}: ${firstStudent[col]}`);
      });
    } else {
      console.log('  ❌ No location columns found');
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n📊 Total students: ${count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkStudentsTable().then(() => {
  console.log('\n✅ Students table check completed!');
}).catch(error => {
  console.error('❌ Script failed:', error);
});