// สคริปต์ทดสอบการตั้งค่า environment variables ของ Vercel deployment
import fetch from 'node-fetch';

async function testVercelEnv() {
  console.log('🧪 Testing Vercel deployment environment...');
  
  try {
    // ทดสอบการเชื่อมต่อฐานข้อมูล
    console.log('📤 Testing database connection...');
    
    const response = await fetch('https://safety-bus-liff-v4-new.vercel.app/api/test-db', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const responseText = await response.text();
    console.log('📊 Response status:', response.status);
    console.log('📋 Raw response:', responseText);
    
    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('✅ Database connection test result:', JSON.stringify(result, null, 2));
      } catch (parseError) {
        console.log('❌ Failed to parse JSON response:', parseError.message);
      }
    } else {
      console.log('❌ Database connection test failed');
    }
    
  } catch (error) {
    console.error('🚨 Error testing Vercel environment:', error);
  }
}

// รันการทดสอบ
testVercelEnv();