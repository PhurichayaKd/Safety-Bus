import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const WEBHOOK_URL = 'http://localhost:3000/api/webhook';

// ใช้ LINE User ID จริงจากภาพที่ผู้ใช้แสดง (สมมติ)
// ในการทดสอบจริง ควรใช้ User ID ของผู้ใช้จริง
const REAL_USER_ID = 'U1234567890abcdef1234567890abcdef'; // แทนที่ด้วย User ID จริง

/**
 * สร้าง LINE signature ที่ถูกต้อง
 */
function createLineSignature(body, secret) {
  return crypto
    .createHmac('SHA256', secret)
    .update(body, 'utf8')
    .digest('base64');
}

/**
 * ทดสอบเมนูติดต่อคนขับ
 */
async function testContactDriverMenu() {
  console.log('🧪 Testing Contact Driver Menu with Real User ID...');
  console.log('👤 User ID:', REAL_USER_ID);

  // สร้าง postback event สำหรับเมนูติดต่อคนขับ
  const postbackEvent = {
    events: [
      {
        type: 'postback',
        replyToken: 'test-reply-token-' + Date.now(),
        source: {
          userId: REAL_USER_ID,
          type: 'user'
        },
        postback: {
          data: 'action=contact_driver'
        },
        timestamp: Date.now()
      }
    ]
  };

  const body = JSON.stringify(postbackEvent);
  const signature = createLineSignature(body, LINE_CHANNEL_SECRET);

  console.log('📦 Request body:', body);
  console.log('🔐 Signature:', signature);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature
      },
      body: body
    });

    console.log('📊 Response status:', response.status);
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (response.status === 200) {
      console.log('✅ Contact driver menu test successful!');
    } else {
      console.log('❌ Contact driver menu test failed!');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

/**
 * ทดสอบข้อความธรรมดา
 */
async function testTextMessage() {
  console.log('\n🧪 Testing Text Message with Real User ID...');
  console.log('👤 User ID:', REAL_USER_ID);

  // สร้าง text message event
  const textEvent = {
    events: [
      {
        type: 'message',
        replyToken: 'test-reply-token-text-' + Date.now(),
        source: {
          userId: REAL_USER_ID,
          type: 'user'
        },
        message: {
          type: 'text',
          text: 'ติดต่อคนขับ'
        },
        timestamp: Date.now()
      }
    ]
  };

  const body = JSON.stringify(textEvent);
  const signature = createLineSignature(body, LINE_CHANNEL_SECRET);

  console.log('📦 Request body:', body);
  console.log('🔐 Signature:', signature);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature
      },
      body: body
    });

    console.log('📊 Response status:', response.status);
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    if (response.status === 200) {
      console.log('✅ Text message test successful!');
    } else {
      console.log('❌ Text message test failed!');
    }

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// รันการทดสอบ
async function runTests() {
  console.log('🚀 Starting Contact Driver Tests...');
  console.log('🔧 Environment check:');
  console.log('- LINE_CHANNEL_SECRET:', !!LINE_CHANNEL_SECRET);
  console.log('- WEBHOOK_URL:', WEBHOOK_URL);
  
  if (!LINE_CHANNEL_SECRET) {
    console.error('❌ LINE_CHANNEL_SECRET not found in environment variables');
    process.exit(1);
  }

  await testContactDriverMenu();
  await new Promise(resolve => setTimeout(resolve, 2000)); // รอ 2 วินาที
  await testTextMessage();
  
  console.log('\n✅ All tests completed!');
  console.log('\n📝 Note: ในการทดสอบจริง กรุณาแทนที่ REAL_USER_ID ด้วย User ID จริงของผู้ใช้');
}

runTests().catch(console.error);