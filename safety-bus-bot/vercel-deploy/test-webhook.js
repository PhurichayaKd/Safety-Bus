// test-webhook.js - Test LINE webhook locally
import crypto from 'crypto';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const channelSecret = process.env.LINE_CHANNEL_SECRET;
const webhookUrl = 'https://safety-bus-liff-v4-new.vercel.app/api/webhook';

// Sample LINE webhook payload
const testPayload = {
  destination: "U655445e2e24b9b482e133d5935d72cdc",
  events: [
    {
      type: "postback",
      postback: {
        data: "action=location"
      },
      webhookEventId: "01K768GDHTGZDJMD8R4QC0NM0F",
      deliveryContext: {
        isRedelivery: false
      },
      timestamp: Date.now(),
      source: {
        type: "user",
        userId: "U655445e2e24b9b482e133d5935d72cdc"
      },
      replyToken: "test-reply-token-12345"
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

async function testWebhook() {
  try {
    console.log('🧪 Testing LINE webhook...');
    console.log('📍 Webhook URL:', webhookUrl);
    console.log('🔑 Channel Secret exists:', !!channelSecret);
    
    const bodyString = JSON.stringify(testPayload);
    const signature = generateLineSignature(bodyString, channelSecret);
    
    console.log('📦 Payload:', bodyString);
    console.log('🔐 Generated signature:', signature);
    
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
    console.log('📊 Response status text:', response.statusText);
    
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);
    
    if (response.status === 200) {
      console.log('✅ Webhook test successful!');
    } else {
      console.log('❌ Webhook test failed!');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testWebhook();