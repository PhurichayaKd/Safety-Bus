import dotenv from 'dotenv';
import path from 'path';

// โหลด environment variables
dotenv.config({ path: path.join(process.cwd(), '../safety-bus-bot/vercel-deploy/.env.local') });

const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const testLineUserId = 'Uabcb2efe95a311ba539fb52290683692'; // LINE User ID ของนักเรียน 100014

if (!lineToken) {
    console.error('❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN');
    process.exit(1);
}

async function testLineNotification() {
    console.log('📱 ทดสอบการส่งการแจ้งเตือน LINE โดยตรง...');
    console.log('🔑 LINE Token:', lineToken.substring(0, 20) + '...');
    console.log('👤 LINE User ID:', testLineUserId);
    
    const message = '🧪 ทดสอบการส่งข้อความจากระบบ RFID\n' +
                   '⏰ เวลา: ' + new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) + '\n' +
                   '✅ ระบบทำงานปกติ';

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lineToken}`
            },
            body: JSON.stringify({
                to: testLineUserId,
                messages: [{
                    type: 'text',
                    text: message
                }]
            })
        });

        console.log('📊 HTTP Status:', response.status);
        
        if (response.ok) {
            console.log('✅ ส่งการแจ้งเตือน LINE สำเร็จ!');
            console.log('📝 ข้อความที่ส่ง:', message);
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ ส่งการแจ้งเตือน LINE ล้มเหลว');
            console.error('📊 Status:', response.status);
            console.error('📄 Response:', errorText);
            return false;
        }

    } catch (error) {
        console.error('❌ ข้อผิดพลาดในการส่งการแจ้งเตือน:', error);
        return false;
    }
}

// รันการทดสอบ
testLineNotification().then(success => {
    if (success) {
        console.log('\n🎉 การทดสอบ LINE notification สำเร็จ!');
        console.log('💡 ตอนนี้สามารถทดสอบการสแกน RFID ได้แล้ว');
    } else {
        console.log('\n❌ การทดสอบ LINE notification ล้มเหลว');
        console.log('💡 ตรวจสอบ LINE access token และ User ID');
    }
    process.exit(success ? 0 : 1);
});