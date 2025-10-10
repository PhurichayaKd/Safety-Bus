// test-line-webhook.js - Test LINE webhook endpoint
import dotenv from 'dotenv';
dotenv.config();

const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const webhookUrl = 'https://safety-bus-liff-v4-new.vercel.app/api/webhook';

async function testLineWebhook() {
  try {
    console.log('🧪 Testing LINE webhook endpoint...');
    console.log('📍 Webhook URL:', webhookUrl);
    console.log('🔑 LINE Token exists:', !!lineToken);
    
    const response = await fetch('https://api.line.me/v2/bot/channel/webhook/test', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lineToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: webhookUrl
      })
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response status text:', response.statusText);
    
    const responseText = await response.text();
    console.log('📄 Response body:', responseText);
    
    if (response.status === 200) {
      console.log('✅ LINE webhook test successful!');
    } else {
      console.log('❌ LINE webhook test failed!');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testLineWebhook();