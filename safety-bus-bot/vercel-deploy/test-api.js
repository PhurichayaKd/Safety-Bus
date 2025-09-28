// Simple test script to test the notify-status-update API
import fetch from 'node-fetch';

const API_URL = 'https://safety-bus-liff-v4-new.vercel.app/api/notify-status-update';

async function testAPI() {
  try {
    console.log('🧪 Testing API:', API_URL);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'enroute',
        timestamp: new Date().toISOString(),
      }),
    });

    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Headers:', Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log('📊 Response Body:', responseText);

    if (response.ok) {
      console.log('✅ API test successful!');
    } else {
      console.log('❌ API test failed!');
    }
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testAPI();