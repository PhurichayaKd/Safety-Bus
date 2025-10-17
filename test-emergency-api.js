const http = require('http');

// ข้อมูลทดสอบที่จำลองจากเซ็นเซอร์
const testData = {
  eventType: "HIGH_TEMPERATURE",
  description: "เซ็นเซอร์ตรวจพบอุณหภูมิสูงผิดปกติ",
  location: "รถโรงเรียน",
  sensorType: "temperature_sensor",
  temperature: 45.5,
  smokeLevel: 0,
  humidity: 65,
  originalSensorType: "TEMPERATURE"
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/emergency-notification',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Testing emergency-notification API...');
console.log('📤 Sending data:', testData);

const req = http.request(options, (res) => {
  console.log(`📊 Status: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📥 Response:', data);
    try {
      const response = JSON.parse(data);
      console.log('✅ Parsed response:', response);
    } catch (e) {
      console.log('⚠️ Could not parse response as JSON');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();