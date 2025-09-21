// test-headers.js
// ทดสอบ headers ที่ server ส่งกลับ

async function testHeaders() {
  const url = 'http://localhost:3000/link/leave-form';
  
  console.log('🔍 ทดสอบ Headers ที่ Server ส่งกลับ');
  console.log('=' .repeat(50));
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    console.log(`\n📊 Status: ${response.status}`);
    console.log('\n📋 Headers:');
    
    // แสดง headers ทั้งหมด
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    // ตรวจสอบ headers ที่สำคัญ
    console.log('\n🎯 การตรวจสอบ Headers สำคัญ:');
    
    const corsOrigin = response.headers.get('access-control-allow-origin');
    if (corsOrigin) {
      console.log(`✅ CORS Origin: ${corsOrigin}`);
    } else {
      console.log('❌ ไม่พบ CORS Origin header');
    }
    
    const ngrokSkip = response.headers.get('ngrok-skip-browser-warning');
    if (ngrokSkip) {
      console.log(`✅ Ngrok Skip Warning: ${ngrokSkip}`);
    } else {
      console.log('❌ ไม่พบ ngrok-skip-browser-warning header');
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType) {
      console.log(`✅ Content Type: ${contentType}`);
    }
    
    console.log('\n🎉 สรุป:');
    if (ngrokSkip === 'true') {
      console.log('✅ ngrok-skip-browser-warning header ถูกเพิ่มแล้ว');
      console.log('✅ ปัญหา ERR_NGROK_3200 ควรได้รับการแก้ไขแล้ว');
    } else {
      console.log('❌ ngrok-skip-browser-warning header ยังไม่ถูกเพิ่ม');
      console.log('💡 ตรวจสอบ middleware ใน server/index.js');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testHeaders().catch(console.error);