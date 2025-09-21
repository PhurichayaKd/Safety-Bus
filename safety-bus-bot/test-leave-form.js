// test-leave-form.js
// ใช้ built-in fetch ของ Node.js (v18+)

async function testLeaveForm() {
  const baseUrl = 'http://localhost:3000';
  const ngrokUrl = 'https://fb4c9e2d2654.ngrok-free.app';
  
  console.log('🧪 ทดสอบการเข้าถึง Leave Form');
  console.log('=' .repeat(50));
  
  // ทดสอบ localhost
  try {
    console.log('\n📍 ทดสอบ localhost:3000/link/leave-form');
    const localResponse = await fetch(`${baseUrl}/link/leave-form`);
    console.log(`✅ Status: ${localResponse.status}`);
    console.log(`✅ Content-Type: ${localResponse.headers.get('content-type')}`);
    
    const localContent = await localResponse.text();
    console.log(`✅ Content length: ${localContent.length} characters`);
    
    // ตรวจสอบว่า LIFF_ID ถูกแทนที่หรือไม่
    if (localContent.includes('{{LIFF_ID}}')) {
      console.log('❌ LIFF_ID ยังไม่ถูกแทนที่');
    } else if (localContent.includes('2008065330-v2l2xgeD')) {
      console.log('✅ LIFF_ID ถูกแทนที่แล้ว');
    } else {
      console.log('⚠️  ไม่พบ LIFF_ID ในเนื้อหา');
    }
    
  } catch (error) {
    console.log(`❌ Error accessing localhost: ${error.message}`);
  }
  
  // ทดสอบ ngrok URL
  try {
    console.log('\n📍 ทดสอบ ngrok URL /link/leave-form');
    const ngrokResponse = await fetch(`${ngrokUrl}/link/leave-form`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    console.log(`✅ Status: ${ngrokResponse.status}`);
    console.log(`✅ Content-Type: ${ngrokResponse.headers.get('content-type')}`);
    
    const ngrokContent = await ngrokResponse.text();
    console.log(`✅ Content length: ${ngrokContent.length} characters`);
    
    // ตรวจสอบว่า LIFF_ID ถูกแทนที่หรือไม่
    if (ngrokContent.includes('{{LIFF_ID}}')) {
      console.log('❌ LIFF_ID ยังไม่ถูกแทนที่');
    } else if (ngrokContent.includes('2008065330-v2l2xgeD')) {
      console.log('✅ LIFF_ID ถูกแทนที่แล้ว');
    } else {
      console.log('⚠️  ไม่พบ LIFF_ID ในเนื้อหา');
    }
    
  } catch (error) {
    console.log(`❌ Error accessing ngrok: ${error.message}`);
  }
  
  // ทดสอบ API endpoints
  console.log('\n📍 ทดสอบ API endpoints');
  try {
    const apiResponse = await fetch(`${baseUrl}/api/student-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken: 'test-token',
        userId: 'test-user' 
      })
    });
    console.log(`✅ API Status: ${apiResponse.status}`);
    const apiResult = await apiResponse.json();
    console.log(`✅ API Response:`, apiResult);
  } catch (error) {
    console.log(`❌ API Error: ${error.message}`);
  }
}

testLeaveForm().catch(console.error);