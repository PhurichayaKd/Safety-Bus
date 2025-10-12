import crypto from 'crypto';
import fetch from 'node-fetch';

// Configuration
const WEBHOOK_URL = 'https://safety-bus-liff-v4-8rrn134nz-phurichayakds-projects.vercel.app/api/webhook';
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || 'your-channel-secret';

// Mock LINE message event
const mockEvent = {
  type: 'message',
  message: {
    type: 'text',
    text: 'ติดต่อคนขับ'
  },
  source: {
    type: 'user',
    userId: 'U1234567890abcdef1234567890abcdef'
  },
  replyToken: 'mock-reply-token-' + Date.now()
};

const requestBody = {
  events: [mockEvent]
};

// Create LINE signature
function createLineSignature(body, secret) {
  const signature = crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
  return signature;
}

async function testWebhook() {
  try {
    console.log('🧪 Testing webhook with current deployment...');
    console.log('📍 URL:', WEBHOOK_URL);
    
    const bodyString = JSON.stringify(requestBody);
    const signature = createLineSignature(bodyString, CHANNEL_SECRET);
    
    console.log('📤 Sending request...');
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature,
        'User-Agent': 'LineBotWebhook/1.0'
      },
      body: bodyString
    });
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed');
    }
    
  } catch (error) {
    console.error('💥 Error testing webhook:', error.message);
  }
}

testWebhook();