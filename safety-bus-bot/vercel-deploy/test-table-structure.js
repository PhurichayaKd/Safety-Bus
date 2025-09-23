// Test script to check table structure and test insertion
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://ugkxolufzlnvjsvtpxhp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE'
);

async function testTableStructure() {
  console.log('=== Testing Table Structure ===\n');
  
  // Test 1: Try to get existing data to see columns
  console.log('Test 1: Checking existing data in leave_requests table');
  const { data: existingData, error: selectError } = await supabase
    .from('leave_requests')
    .select('*')
    .limit(5);
  
  if (existingData && existingData.length > 0) {
    console.log('Found existing data. Table columns:', Object.keys(existingData[0]));
    console.log('Sample record:', existingData[0]);
  } else {
    console.log('No existing data found.');
    if (selectError) {
      console.log('Select error:', selectError);
    }
  }
  
  console.log('\n');
  
  // Test 2: Try inserting with minimal required fields
  console.log('Test 2: Testing insert with minimal fields');
  const { data: insertData, error: insertError } = await supabase
    .from('leave_requests')
    .insert({
      student_id: 5, // Using existing student ID
      leave_date: '2025-01-20',
      status: 'approved'
    })
    .select();
  
  if (insertError) {
    console.log('Insert error:', insertError);
  } else {
    console.log('Insert successful:', insertData);
    
    // Get the inserted record to see all columns
    if (insertData && insertData.length > 0) {
      console.log('Inserted record columns:', Object.keys(insertData[0]));
      console.log('Full inserted record:', insertData[0]);
    }
  }
  
  console.log('\n');
  
  // Test 3: Try inserting with leave_type field
  console.log('Test 3: Testing insert with leave_type field');
  const { data: insertData2, error: insertError2 } = await supabase
    .from('leave_requests')
    .insert({
      student_id: 5,
      leave_date: '2025-01-21',
      status: 'approved',
      leave_type: 'personal'
    })
    .select();
  
  if (insertError2) {
    console.log('Insert error with leave_type:', insertError2);
  } else {
    console.log('Insert with leave_type successful:', insertData2);
  }
  
  console.log('\n');
  
  // Test 4: Check what fields are actually available
  console.log('Test 4: Checking all records to understand table structure');
  const { data: allData, error: allError } = await supabase
    .from('leave_requests')
    .select('*')
    .limit(10);
  
  if (allData && allData.length > 0) {
    console.log('All available columns:', Object.keys(allData[0]));
    console.log('Recent records:');
    allData.forEach((record, index) => {
      console.log(`Record ${index + 1}:`, record);
    });
  } else {
    console.log('No data found in table');
    if (allError) {
      console.log('Error:', allError);
    }
  }
  
  console.log('\n=== Test Completed ===');
}

// Run the test
testTableStructure().catch(console.error);