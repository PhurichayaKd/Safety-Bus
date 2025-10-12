// สคริปต์ทดสอบการดึงข้อมูลนักเรียนจาก Vercel deployment
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function testVercelStudents() {
  console.log('🧪 Testing Vercel deployment students API...');
  
  const apiUrl = 'https://safety-bus-liff-v4-new.vercel.app/api/get-student';
  
  try {
    console.log('📤 Fetching student with ID 100014 from Vercel deployment...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: '100014'
      })
    });
    
    const responseText = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📋 Raw response:', responseText);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ Students data from Vercel:', JSON.stringify(result, null, 2));
        
        if (result.students && result.students.length > 0) {
          console.log(`📊 Found ${result.students.length} students in Vercel deployment`);
          result.students.forEach((student, index) => {
            console.log(`${index + 1}. ID: ${student.student_id}, Name: ${student.student_name}`);
          });
        }
      } catch (parseError) {
        console.log('❌ Failed to parse JSON response:', parseError.message);
      }
    } else {
      console.log('❌ Failed to fetch students from Vercel deployment');
    }
    
  } catch (error) {
    console.error('🚨 Error testing Vercel students:', error);
  }
}

// รันการทดสอบ
testVercelStudents();