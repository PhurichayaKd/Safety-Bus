import crypto from 'crypto';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const WEBHOOK_URL = 'https://safety-bus-liff-v4-2etav9kic-phurichayakds-projects.vercel.app/api/webhook';

if (!CHANNEL_SECRET) {
  console.error('❌ Missing LINE_CHANNEL_SECRET');
  process.exit(1);
}

// สร้าง mock event สำหรับการกดเมนู "ติดต่อคนขับ"
const mockEvent = {
  type: 'message',
  message: {
    type: 'text',
    text: 'ติดต่อคนขับ'
  },
  timestamp: Date.now(),
  source: {
    type: 'user',
    userId: 'U1234567890abcdef1234567890abcdef' // Mock user ID
  },
  replyToken: 'mock-reply-token-' + Date.now(),
  mode: 'active'
};

const requestBody = {
  destination: 'mock-destination',
  events: [mockEvent]
};

const bodyString = JSON.stringify(requestBody);

// สร้าง LINE signature
function createSignature(body, secret) {
  return crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
}

const signature = createSignature(bodyString, CHANNEL_SECRET);

async function testProductionWebhook() {
  console.log('🧪 Testing production webhook...\n');
  console.log('📡 Webhook URL:', WEBHOOK_URL);
  console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));
  console.log('🔐 Signature:', signature);
  console.log('\n' + '='.repeat(50) + '\n');
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature,
        'User-Agent': 'LineBotSDK/1.0'
      },
      body: bodyString
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook call successful');
    } else {
      console.log('❌ Webhook call failed');
    }
    
  } catch (error) {
    console.error('💥 Error calling webhook:', error);
  }
}

// เรียกใช้ฟังก์ชัน
testProductionWebhook().then(() => {
  console.log('\n🏁 Test completed');
}).catch(error => {
  console.error('💥 Test failed:', error);
});