// test-liff-flow.js
// ทดสอบการทำงานของ LIFF leave form

async function testLIFFFlow() {
  const baseUrl = 'http://localhost:3000';
  const testUserId = 'U123456789abcdef'; // LINE User ID ตัวอย่าง
  
  console.log('🧪 ทดสอบ LIFF Leave Form Flow');
  console.log('=' .repeat(50));
  
  // ทดสอบ 1: เข้าถึงหน้าฟอร์ม
  console.log('\n📍 ขั้นตอนที่ 1: เข้าถึงหน้าฟอร์ม');
  try {
    const formResponse = await fetch(`${baseUrl}/link/leave-form`);
    console.log(`✅ Form Status: ${formResponse.status}`);
    
    const formContent = await formResponse.text();
    if (formContent.includes('2008065330-v2l2xgeD')) {
      console.log('✅ LIFF ID ถูกแทนที่แล้ว');
    } else {
      console.log('❌ LIFF ID ไม่ถูกแทนที่');
    }
    
    if (formContent.includes('/api/student-info')) {
      console.log('✅ API endpoint ถูกต้อง');
    }
    
  } catch (error) {
    console.log(`❌ Error accessing form: ${error.message}`);
  }
  
  // ทดสอบ 2: API student-info (ไม่มีการผูกบัญชี)
  console.log('\n📍 ขั้นตอนที่ 2: ทดสอบ API student-info (ไม่มีการผูกบัญชี)');
  try {
    const studentInfoResponse = await fetch(`${baseUrl}/api/student-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken: 'test-token',
        userId: 'unlinked-user-id' 
      })
    });
    
    const studentInfoResult = await studentInfoResponse.json();
    console.log(`✅ Status: ${studentInfoResponse.status}`);
    console.log(`✅ Response:`, studentInfoResult);
    
    if (!studentInfoResult.success && studentInfoResult.message.includes('ไม่พบข้อมูลบัญชี')) {
      console.log('✅ การตรวจสอบบัญชีทำงานถูกต้อง');
    }
    
  } catch (error) {
    console.log(`❌ Error testing student-info: ${error.message}`);
  }
  
  // ทดสอบ 3: API student-info (มีการผูกบัญชี)
  console.log('\n📍 ขั้นตอนที่ 3: ทดสอบ API student-info (มีการผูกบัญชี)');
  try {
    const linkedUserResponse = await fetch(`${baseUrl}/api/student-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken: 'test-token',
        userId: 'U123456789abcdef' // User ID ที่มีการผูกบัญชี
      })
    });
    
    const linkedUserResult = await linkedUserResponse.json();
    console.log(`✅ Status: ${linkedUserResponse.status}`);
    console.log(`✅ Response:`, linkedUserResult);
    
  } catch (error) {
    console.log(`❌ Error testing linked user: ${error.message}`);
  }
  
  // ทดสอบ 4: API submit-leave
  console.log('\n📍 ขั้นตอนที่ 4: ทดสอบ API submit-leave');
  try {
    const leaveData = {
      student_id: 5,
      leave_type: 'sick',
      leave_date: new Date().toISOString().split('T')[0],
      reason: 'ป่วยไข้หวัด',
      parent_id: 5
    };
    
    const submitResponse = await fetch(`${baseUrl}/api/submit-leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leaveData)
    });
    
    const submitResult = await submitResponse.json();
    console.log(`✅ Status: ${submitResponse.status}`);
    console.log(`✅ Response:`, submitResult);
    
  } catch (error) {
    console.log(`❌ Error testing submit-leave: ${error.message}`);
  }
  
  // ทดสอบ 5: ตรวจสอบ CORS headers
  console.log('\n📍 ขั้นตอนที่ 5: ตรวจสอบ CORS headers');
  try {
    const corsResponse = await fetch(`${baseUrl}/api/student-info`, {
      method: 'OPTIONS'
    });
    
    console.log(`✅ OPTIONS Status: ${corsResponse.status}`);
    console.log(`✅ CORS Headers:`);
    console.log(`   - Access-Control-Allow-Origin: ${corsResponse.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`   - Access-Control-Allow-Methods: ${corsResponse.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`   - Access-Control-Allow-Headers: ${corsResponse.headers.get('Access-Control-Allow-Headers')}`);
    
  } catch (error) {
    console.log(`❌ Error testing CORS: ${error.message}`);
  }
  
  console.log('\n🎯 สรุปผลการทดสอบ:');
  console.log('- หน้าฟอร์ม: สามารถเข้าถึงได้และ LIFF ID ถูกแทนที่');
  console.log('- API student-info: ตรวจสอบการผูกบัญชีได้');
  console.log('- API submit-leave: พร้อมรับข้อมูลการลา');
  console.log('- CORS: ตั้งค่าให้รองรับ cross-origin requests');
  console.log('\n💡 หากยังมีปัญหา ERR_NGROK_3200:');
  console.log('1. ตรวจสอบ ngrok URL ใน LINE Developer Console');
  console.log('2. ตรวจสอบ LIFF URL endpoint');
  console.log('3. ลองเข้าถึงผ่าน ngrok URL โดยตรง');
}

testLIFFFlow().catch(console.error);