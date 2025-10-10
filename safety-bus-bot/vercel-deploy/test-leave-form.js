import https from 'https';

// Test data for leave request
const testData = {
    studentId: '12345',
    studentName: 'นักเรียนทดสอบ',
    class: 'ม.1/1',
    leaveType: 'sick',
    startDate: '2024-12-30',
    endDate: '2024-12-30',
    reason: 'ป่วยเป็นไข้',
    contactNumber: '081-234-5678',
    submittedAt: new Date().toISOString()
};

const postData = JSON.stringify(testData);

const options = {
    hostname: 'safety-bus-liff-v4-9towwjl2h-phurichayakds-projects.vercel.app',
    port: 443,
    path: '/api/submit-leave-request',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('Testing leave request API...');
console.log('Test data:', testData);
console.log('');

const req = https.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    console.log('');

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Response Body:');
        try {
            const response = JSON.parse(data);
            console.log(JSON.stringify(response, null, 2));
            
            if (response.success) {
                console.log('\n✅ Leave request test PASSED!');
                console.log('Form submission is working correctly.');
            } else {
                console.log('\n❌ Leave request test FAILED!');
                console.log('Error:', response.error);
            }
        } catch (error) {
            console.log('Raw response:', data);
            console.log('\n❌ Failed to parse JSON response');
            console.log('Parse error:', error.message);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
});

req.write(postData);
req.end();