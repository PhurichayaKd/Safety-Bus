// test-simple-post.js - Simple POST test
import crypto from 'crypto';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const webhookUrl = 'https://safety-bus-liff-v4-new.vercel.app/api/webhook';

// Very simple test payload
const testPayload = {
  events: [
    {
      type: "message",
      message: {
        type: "text",
        text: "test"
      },
      source: {
        type: "user",
        userId: "test-user-id"
      },
      replyToken: "test-reply-token"
    }
  ]
};

// Generate LINE signature
function generateLineSignature(body, secret) {
  const hash = crypto
    .createHmac('SHA256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return hash;
}

async function testSimplePost() {
  try {
    console.log('🧪 Testing simple POST to webhook...');
    console.log('📍 Webhook URL:', webhookUrl);
    
    const bodyString = JSON.stringify(testPayload);
    const signature = generateLineSignature(bodyString, channelSecret);
    
    console.log('📦 Body length:', bodyString.length);
    console.log('📦 Body:', bodyString);
    console.log('🔐 Signature:', signature);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-line-signature': signature,
        'User-Agent': 'LineBotWebhook/2.0'
      },
      body: bodyString
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);
    
    if (response.status === 200) {
      console.log('✅ Simple POST test successful!');
    } else {
      console.log('❌ Simple POST test failed!');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testSimplePost();