import fetch from 'node-fetch';

async function testContactDriverWebhook() {
    console.log('🧪 Testing Contact Driver via Webhook...\n');
    
    // จำลอง webhook event สำหรับเมนู "ติดต่อคนขับ"
    const webhookEvent = {
        events: [
            {
                type: 'postback',
                postback: {
                    data: 'action=contact_driver&student_id=1'
                },
                source: {
                    userId: 'test-user-id',
                    type: 'user'
                },
                timestamp: Date.now(),
                mode: 'active',
                replyToken: 'test-reply-token'
            }
        ],
        destination: 'test-destination'
    };
    
    try {
        console.log('📤 Sending webhook request...');
        console.log('Event data:', JSON.stringify(webhookEvent.events[0].postback, null, 2));
        
        const response = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Line-Signature': 'test-signature' // ในการทดสอบจริงต้องใช้ signature ที่ถูกต้อง
            },
            body: JSON.stringify(webhookEvent)
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📥 Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Webhook request successful!');
        } else {
            console.log('❌ Webhook request failed');
        }
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error);
    }
}

// รอให้เซิร์ฟเวอร์เริ่มต้นเสร็จ
setTimeout(() => {
    testContactDriverWebhook();
}, 2000);