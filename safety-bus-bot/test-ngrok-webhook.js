// test-ngrok-webhook.js
// ทดสอบ ngrok webhook URL ใหม่

import crypto from 'crypto';

const ngrokUrl = 'https://fb4c9e2d2654.ngrok-free.app';
const channelSecret = '372a023fa2c1575676cfedd3f2d329b9';

// สร้าง signature สำหรับ LINE webhook
function createSignature(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
}

// ทดสอบ ngrok webhook
async function testNgrokWebhook() {
  console.log('🧪 ทดสอบ ngrok webhook URL');
  console.log('=' .repeat(60));
  console.log(`🔗 URL: ${ngrokUrl}/webhook`);
  console.log('');
  
  // ทดสอบ 1: GET request
  console.log('📍 ทดสอบ 1: GET request');
  try {
    const getResponse = await fetch(`${ngrokUrl}/webhook`, {
      method: 'GET',
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });
    
    console.log(`✅ GET Status: ${getResponse.status}`);
    const getResult = await getResponse.text();
    console.log(`✅ GET Response: ${getResult.substring(0, 100)}...`);
    
  } catch (error) {
    console.log(`❌ GET Error: ${error.message}`);
  }
  
  // รอสักครู่
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // ทดสอบ 2: POST request - Text message
  console.log('\n📍 ทดสอบ 2: POST request - Text message');
  
  const textEvent = {
    events: [
      {
        type: 'message',
        message: {
          type: 'text',
          text: 'เมนู'
        },
        source: {
          userId: 'U123456789abcdef'
        },
        replyToken: 'test-reply-token-ngrok'
      }
    ]
  };
  
  const body = JSON.stringify(textEvent);
  const signature = createSignature(body, channelSecret);
  
  try {
    const postResponse = await fetch(`${ngrokUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature,
        'ngrok-skip-browser-warning': 'true'
      },
      body: body
    });
    
    console.log(`✅ POST Status: ${postResponse.status}`);
    const postResult = await postResponse.json();
    console.log(`✅ POST Response:`, postResult);
    
  } catch (error) {
    console.log(`❌ POST Error: ${error.message}`);
  }
  
  console.log('\n🎯 สรุปผลการทดสอบ ngrok:');
  console.log('=' .repeat(60));
  console.log('💡 วิธีแก้ไข error 404 ใน LINE Developer Console:');
  console.log('1. คัดลอก URL: https://fb4c9e2d2654.ngrok-free.app/webhook');
  console.log('2. ไปที่ LINE Developer Console');
  console.log('3. เข้าไปที่ Messaging API tab');
  console.log('4. แก้ไข Webhook URL ให้เป็น URL ใหม่');
  console.log('5. กด Verify เพื่อทดสอบ');
  console.log('6. กด Update เพื่อบันทึก');
  console.log('');
  console.log('⚠️  หมายเหตุ: ngrok URL จะเปลี่ยนทุกครั้งที่รีสตาร์ท');
  console.log('🔄 หากต้องการ URL คงที่ ให้ใช้ ngrok paid plan');
}

testNgrokWebhook().catch(console.error);