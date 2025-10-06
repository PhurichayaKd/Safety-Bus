// test-webhook.js - Test script to simulate LINE webhook calls
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const WEBHOOK_URL = 'https://safety-bus-liff-v4-new.vercel.app/api/webhook';
const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

// Sample LINE webhook event for menu postback
const testEvent = {
  destination: "U1234567890",
  events: [
    {
      type: "postback",
      mode: "active",
      timestamp: Date.now(),
      source: {
        type: "user",
        userId: "U1234567890abcdef"
      },
      replyToken: "test-reply-token-" + Date.now(),
      postback: {
        data: "action=main_menu"
      }
    }
  ]
};

// Generate LINE signature
function generateSignature(body, secret) {
  return crypto
    .createHmac('SHA256', secret)
    .update(body)
    .digest('base64');
}

async function testWebhook() {
  try {
    console.log('🧪 Testing webhook with URL:', WEBHOOK_URL);
    
    const body = JSON.stringify(testEvent);
    const signature = generateSignature(body, CHANNEL_SECRET);
    
    console.log('📝 Test event:', JSON.stringify(testEvent, null, 2));
    console.log('🔐 Generated signature:', signature);
    
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature,
        'User-Agent': 'LineBotWebhook/2.0'
      },
      body: body
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📊 Response body:', responseText);
    
    if (response.ok) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error);
  }
}

// Run test
testWebhook();