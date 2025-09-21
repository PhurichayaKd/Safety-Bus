// test-ngrok-access.js
// ทดสอบการเข้าถึง LIFF form ผ่าน ngrok URL

async function testNgrokAccess() {
  // URL ที่ต้องทดสอบ (ให้ user แก้ไข ngrok URL)
  const ngrokUrl = 'https://your-ngrok-url.ngrok-free.app'; // แก้ไข URL นี้
  const localUrl = 'http://localhost:3000';
  
  console.log('🌐 ทดสอบการเข้าถึง LIFF form ผ่าน ngrok');
  console.log('=' .repeat(60));
  
  // ทดสอบ 1: เข้าถึงหน้าฟอร์มผ่าน localhost
  console.log('\n📍 ทดสอบ 1: เข้าถึงผ่าน localhost');
  try {
    const localResponse = await fetch(`${localUrl}/link/leave-form`);
    console.log(`✅ Local Status: ${localResponse.status}`);
    
    if (localResponse.ok) {
      console.log('✅ localhost ทำงานปกติ');
    }
  } catch (error) {
    console.log(`❌ Local Error: ${error.message}`);
  }
  
  // ทดสอบ 2: เข้าถึงหน้าฟอร์มผ่าน ngrok (ไม่มี header)
  console.log('\n📍 ทดสอบ 2: เข้าถึงผ่าน ngrok (ไม่มี header)');
  try {
    const ngrokResponse = await fetch(`${ngrokUrl}/link/leave-form`);
    console.log(`Status: ${ngrokResponse.status}`);
    
    if (ngrokResponse.status === 200) {
      console.log('✅ ngrok ทำงานปกติ');
    } else {
      console.log(`❌ ngrok Error: ${ngrokResponse.status}`);
      const errorText = await ngrokResponse.text();
      if (errorText.includes('ERR_NGROK_3200')) {
        console.log('🔍 พบ ERR_NGROK_3200 - ต้องใช้ ngrok-skip-browser-warning header');
      }
    }
  } catch (error) {
    console.log(`❌ Ngrok Error: ${error.message}`);
  }
  
  // ทดสอบ 3: เข้าถึงผ่าน ngrok พร้อม header
  console.log('\n📍 ทดสอบ 3: เข้าถึงผ่าน ngrok (มี ngrok-skip-browser-warning header)');
  try {
    const ngrokWithHeaderResponse = await fetch(`${ngrokUrl}/link/leave-form`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    console.log(`Status: ${ngrokWithHeaderResponse.status}`);
    
    if (ngrokWithHeaderResponse.ok) {
      console.log('✅ ngrok ทำงานปกติเมื่อมี header');
      
      const content = await ngrokWithHeaderResponse.text();
      if (content.includes('2008065330-v2l2xgeD')) {
        console.log('✅ LIFF ID ถูกแทนที่แล้ว');
      }
    }
  } catch (error) {
    console.log(`❌ Ngrok with header Error: ${error.message}`);
  }
  
  // ทดสอบ 4: ทดสอบ API ผ่าน ngrok
  console.log('\n📍 ทดสอบ 4: ทดสอบ API ผ่าน ngrok');
  try {
    const apiResponse = await fetch(`${ngrokUrl}/api/student-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        idToken: 'test-token',
        userId: 'test-user'
      })
    });
    
    console.log(`API Status: ${apiResponse.status}`);
    
    if (apiResponse.ok) {
      const apiResult = await apiResponse.json();
      console.log('✅ API ทำงานผ่าน ngrok');
      console.log('Response:', apiResult);
    }
  } catch (error) {
    console.log(`❌ API Error: ${error.message}`);
  }
  
  console.log('\n🎯 คำแนะนำการแก้ไข:');
  console.log('1. แก้ไข ngrokUrl ในไฟล์นี้ให้ตรงกับ URL ที่ ngrok แสดง');
  console.log('2. ตรวจสอบว่า LIFF URL ใน LINE Developer Console ตรงกับ ngrok URL');
  console.log('3. หาก ERR_NGROK_3200 ยังคงเกิดขึ้น ให้เพิ่ม middleware ใน Express:');
  console.log('   app.use((req, res, next) => {');
  console.log('     res.header("ngrok-skip-browser-warning", "true");');
  console.log('     next();');
  console.log('   });');
  console.log('\n📝 หมายเหตุ: แก้ไข ngrokUrl ในบรรทัดที่ 6 ก่อนรันสคริปต์');
}

// ตรวจสอบว่ามีการส่ง ngrok URL เป็น argument หรือไม่
const ngrokUrl = process.argv[2];
if (ngrokUrl) {
  console.log(`🔗 ใช้ ngrok URL: ${ngrokUrl}`);
  testNgrokAccess().catch(console.error);
} else {
  console.log('❌ กรุณาระบุ ngrok URL');
  console.log('การใช้งาน: node test-ngrok-access.js https://your-ngrok-url.ngrok-free.app');
  console.log('\nหรือแก้ไข ngrokUrl ในไฟล์ test-ngrok-access.js');
}