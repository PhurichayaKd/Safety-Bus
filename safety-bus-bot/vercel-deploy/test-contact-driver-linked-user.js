import 'dotenv/config';
import crypto from 'crypto';
import fetch from 'node-fetch';

// ⚠️ ใส่ LINE User ID จริงของผู้ใช้ที่ผูกบัญชีแล้ว
// ใช้ User ID ของ ด.ญ ภูริชญา คำดี ที่ผูกบัญชีแล้ว
const REAL_LINKED_USER_ID = 'U4ad414fe3c0be5d251cd0029c87d050d';

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || 'your-line-channel-secret';
const WEBHOOK_URL = 'http://localhost:3000/api/webhook';

/**
 * สร้าง LINE signature สำหรับการยืนยันตัวตน
 */
function createLineSignature(body, secret) {
  return crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
}

/**
 * ทดสอบเมนูติดต่อคนขับด้วย postback event
 */
async function testContactDriverPostback() {
  console.log('🧪 Testing Contact Driver Postback with Real Linked User...');
  
  const event = {
    events: [
      {
        type: 'postback',
        replyToken: `test-reply-token-postback-${Date.now()}`,
        source: {
          userId: REAL_LINKED_USER_ID,
          type: 'user'
        },
        postback: {
          data: 'action=contact_driver'
        },
        timestamp: Date.now()
      }
    ],
    destination: 'test-destination'
  };

  const body = JSON.stringify(event);
  const signature = createLineSignature(body, LINE_CHANNEL_SECRET);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature
      },
      body: body
    });

    console.log(`📊 Postback Response Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`📄 Postback Response: ${responseText}`);
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Error testing postback:', error);
    return false;
  }
}

/**
 * ทดสอบเมนูติดต่อคนขับด้วย text message
 */
async function testContactDriverText() {
  console.log('🧪 Testing Contact Driver Text with Real Linked User...');
  
  const event = {
    events: [
      {
        type: 'message',
        replyToken: `test-reply-token-text-${Date.now()}`,
        source: {
          userId: REAL_LINKED_USER_ID,
          type: 'user'
        },
        message: {
          type: 'text',
          text: 'ติดต่อคนขับ'
        },
        timestamp: Date.now()
      }
    ],
    destination: 'test-destination'
  };

  const body = JSON.stringify(event);
  const signature = createLineSignature(body, LINE_CHANNEL_SECRET);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature
      },
      body: body
    });

    console.log(`📊 Text Response Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`📄 Text Response: ${responseText}`);
    
    return response.status === 200;
  } catch (error) {
    console.error('❌ Error testing text:', error);
    return false;
  }
}

/**
 * รันการทดสอบทั้งหมด
 */
async function runTests() {
  console.log('🚀 Starting Contact Driver Tests with Real Linked User...');
  console.log(`👤 Using User ID: ${REAL_LINKED_USER_ID} (ด.ญ ภูริชญา คำดี)`);
  
  console.log('\n--- Test 1: Postback Event ---');
  const postbackResult = await testContactDriverPostback();
  
  console.log('\n--- Test 2: Text Message Event ---');
  const textResult = await testContactDriverText();
  
  console.log('\n📋 Test Results:');
  console.log(`Postback Test: ${postbackResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Text Test: ${textResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (postbackResult && textResult) {
    console.log('\n🎉 All tests passed! Contact driver menu is working for linked users.');
  } else {
    console.log('\n⚠️ Some tests failed. Check server logs for details.');
  }
}

// รันการทดสอบ
runTests().catch(console.error);