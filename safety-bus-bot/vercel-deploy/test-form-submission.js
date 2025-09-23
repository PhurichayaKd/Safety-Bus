// Test script to simulate form submission from LINE
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabase = createClient(
  'https://ugkxolufzlnvjsvtpxhp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE'
);

// Test function to simulate getting student info by LINE ID
async function testGetStudentInfo(lineUserId) {
  console.log('Testing getStudentInfo for LINE ID:', lineUserId);
  
  try {
    // Check parent_line_links table
    const { data: parentLink, error: parentError } = await supabase
      .from('parent_line_links')
      .select('parent_id')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (parentLink && !parentError) {
      console.log('Found parent link:', parentLink);
      
      // Get student info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('student_id, student_name, grade, link_code')
        .eq('parent_id', parentLink.parent_id)
        .single();
      
      if (student && !studentError) {
        console.log('Student found:', student);
        return {
          success: true,
          student: {
            id: student.student_id,
            name: student.student_name,
            class: student.grade,
            link_code: student.link_code,
            line_user_id: lineUserId
          }
        };
      } else {
        console.log('Student error:', studentError);
        return { success: false, message: 'Student not found' };
      }
    } else {
      console.log('Parent link error:', parentError);
      return { success: false, message: 'Parent link not found' };
    }
  } catch (error) {
    console.error('Error in testGetStudentInfo:', error);
    return { success: false, message: error.message };
  }
}

// Test function to simulate submitting leave request
async function testSubmitLeave(studentId, studentName, leaveDates, leaveType = 'personal') {
  console.log('Testing submitLeave:', { studentId, studentName, leaveDates, leaveType });
  
  try {
    // Insert leave requests
    const insertPromises = leaveDates.map(date => 
      supabase.from('leave_requests').insert({
        student_id: studentId,
        leave_date: date,
        leave_type: leaveType,
        status: 'approved',
        created_at: new Date().toISOString()
      })
    );
    
    const results = await Promise.all(insertPromises);
    
    // Check for errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Insert errors:', errors);
      return { success: false, message: 'Failed to insert leave requests' };
    }
    
    console.log('Leave requests inserted successfully');
    return { success: true, message: 'Leave requests submitted successfully' };
    
  } catch (error) {
    console.error('Error in testSubmitLeave:', error);
    return { success: false, message: error.message };
  }
}

// Main test function
async function runTests() {
  console.log('=== Starting Form Submission Tests ===\n');
  
  // Test 1: Get student info
  console.log('Test 1: Getting student info for test-user-123');
  const studentResult = await testGetStudentInfo('test-user-123');
  console.log('Result:', studentResult);
  console.log('');
  
  if (studentResult.success) {
    // Test 2: Submit leave request
    console.log('Test 2: Submitting leave request');
    const leaveResult = await testSubmitLeave(
      studentResult.student.id,
      studentResult.student.name,
      ['2025-01-15', '2025-01-16'],
      'sick'
    );
    console.log('Result:', leaveResult);
    console.log('');
    
    // Test 3: Verify data was inserted
    console.log('Test 3: Verifying inserted data');
    const { data: insertedData, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('student_id', studentResult.student.id)
      .in('leave_date', ['2025-01-15', '2025-01-16'])
      .order('created_at', { ascending: false })
      .limit(2);
    
    if (error) {
      console.error('Verification error:', error);
    } else {
      console.log('Inserted data:', insertedData);
    }
  }
  
  console.log('\n=== Tests Completed ===');
}

// Run the tests
runTests().catch(console.error);