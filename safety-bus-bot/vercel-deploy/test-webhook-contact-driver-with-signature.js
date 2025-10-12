import fetch from 'node-fetch';
import crypto from 'crypto';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

function generateSignature(body, channelSecret) {
    const signature = crypto
        .createHmac('sha256', channelSecret)
        .update(body, 'utf8')
        .digest('base64');
    return signature;
}

async function testContactDriverWebhookWithSignature() {
    console.log('🧪 Testing Contact Driver via Webhook with Valid Signature...\n');
    
    // ตรวจสอบว่ามี channel secret
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
        console.log('❌ LINE_CHANNEL_SECRET not found in environment variables');
        return;
    }
    
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
        console.log('📤 Preparing webhook request...');
        console.log('Event data:', JSON.stringify(webhookEvent.events[0].postback, null, 2));
        
        // แปลง body เป็น string เพื่อคำนวณ signature
        const bodyString = JSON.stringify(webhookEvent);
        
        // คำนวณ signature ที่ถูกต้อง
        const signature = generateSignature(bodyString, channelSecret);
        console.log('🔐 Generated signature:', signature);
        
        console.log('📤 Sending webhook request...');
        const response = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Line-Signature': signature
            },
            body: bodyString
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseText = await response.text();
        console.log('📥 Response body:', responseText);
        
        if (response.ok) {
            console.log('✅ Webhook request successful!');
            console.log('🎉 Contact Driver function should have been triggered!');
        } else {
            console.log('❌ Webhook request failed');
        }
        
    } catch (error) {
        console.error('❌ Error testing webhook:', error);
    }
}

// รันการทดสอบ
testContactDriverWebhookWithSignature();

// รอให้เซิร์ฟเวอร์ประมวลผล
setTimeout(() => {
    console.log('\n🔍 Check server logs above for debug information');
    process.exit(0);
}, 2000);