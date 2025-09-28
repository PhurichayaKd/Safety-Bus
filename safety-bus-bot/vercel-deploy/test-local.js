// Test the notify-status-update function locally
import handler from './api/notify-status-update.js';

// Mock request and response objects
const mockReq = {
  method: 'POST',
  body: {
    status: 'enroute',
    timestamp: new Date().toISOString()
  }
};

const mockRes = {
  headers: {},
  statusCode: 200,
  responseData: null,
  
  setHeader(key, value) {
    this.headers[key] = value;
  },
  
  status(code) {
    this.statusCode = code;
    return this;
  },
  
  json(data) {
    this.responseData = data;
    console.log('📊 Response Status:', this.statusCode);
    console.log('📊 Response Headers:', this.headers);
    console.log('📊 Response Data:', JSON.stringify(data, null, 2));
    return this;
  },
  
  end() {
    console.log('📊 Response ended');
    return this;
  }
};

async function testLocal() {
  try {
    console.log('🧪 Testing notify-status-update function locally...');
    console.log('📤 Request:', mockReq);
    
    await handler(mockReq, mockRes);
    
    if (mockRes.statusCode === 200) {
      console.log('✅ Local test successful!');
    } else {
      console.log('❌ Local test failed!');
    }
  } catch (error) {
    console.error('❌ Error testing locally:', error);
  }
}

testLocal();