// Test script for leave form submission
import axios from 'axios';

const BASE_URL = 'http://localhost:3000'; // Change to your server URL

// Test data
const testData = {
  action: 'submitLeave',
  userId: 'test-user-123',
  displayName: 'Test User',
  studentInfo: {
    student_id: '123456',
    student_name: 'นักเรียนทดสอบ',
    class: 'ม.1/1',
    link_code: '123456'
  },
  leaveDates: ['2024-12-20', '2024-12-21'],
  source: 'direct'
};

async function testLeaveFormSubmission() {
  console.log('🧪 Testing Leave Form Submission');
  console.log('=====================================');
  
  try {
    console.log('📤 Sending test data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/submit-leave`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.ok) {
      console.log('🎉 Leave form submission successful!');
    } else {
      console.log('❌ Leave form submission failed:', response.data.error);
    }
    
  } catch (error) {
    console.error('💥 Error during test:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    if (error.response?.data) {
      console.log('📄 Error Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function testGetStudentInfo() {
  console.log('\n🔍 Testing Get Student Info');
  console.log('=====================================');
  
  try {
    const testGetData = {
      action: 'getStudentInfo',
      userId: 'test-user-123'
    };
    
    console.log('📤 Sending get student request:', JSON.stringify(testGetData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/submit-leave`, testGetData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('📥 Response Data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('💥 Error during get student test:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

async function testWithInvalidData() {
  console.log('\n🚫 Testing with Invalid Data');
  console.log('=====================================');
  
  const invalidTestCases = [
    {
      name: 'Missing studentInfo',
      data: {
        action: 'submitLeave',
        userId: 'test-user-123',
        leaveDates: ['2024-12-20']
      }
    },
    {
      name: 'Invalid studentInfo format',
      data: {
        action: 'submitLeave',
        userId: 'test-user-123',
        studentInfo: 'invalid-string',
        leaveDates: ['2024-12-20']
      }
    },
    {
      name: 'Missing leaveDates',
      data: {
        action: 'submitLeave',
        userId: 'test-user-123',
        studentInfo: {
          student_id: '123456',
          student_name: 'Test Student'
        }
      }
    },
    {
      name: 'Empty leaveDates array',
      data: {
        action: 'submitLeave',
        userId: 'test-user-123',
        studentInfo: {
          student_id: '123456',
          student_name: 'Test Student'
        },
        leaveDates: []
      }
    }
  ];
  
  for (const testCase of invalidTestCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    try {
      const response = await axios.post(`${BASE_URL}/api/submit-leave`, testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log('📥 Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Expected error:', error.response?.data?.error || error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Leave Form Tests');
  console.log('=====================================\n');
  
  await testGetStudentInfo();
  await testLeaveFormSubmission();
  await testWithInvalidData();
  
  console.log('\n✨ All tests completed!');
}

// Execute tests
runAllTests().catch(console.error);