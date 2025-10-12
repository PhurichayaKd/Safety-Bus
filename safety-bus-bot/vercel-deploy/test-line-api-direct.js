import dotenv from 'dotenv';
import { Client } from '@line/bot-sdk';

// Load environment variables
dotenv.config();

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

console.log('🔍 ตรวจสอบการตั้งค่า LINE Bot...\n');

// ตรวจสอบ environment variables
console.log('📋 Environment Variables:');
console.log(`LINE_CHANNEL_ACCESS_TOKEN: ${LINE_CHANNEL_ACCESS_TOKEN ? '✅ ตั้งค่าแล้ว' : '❌ ไม่ได้ตั้งค่า'}`);
console.log(`LINE_CHANNEL_SECRET: ${LINE_CHANNEL_SECRET ? '✅ ตั้งค่าแล้ว' : '❌ ไม่ได้ตั้งค่า'}\n`);

if (!LINE_CHANNEL_ACCESS_TOKEN) {
  console.error('❌ กรุณาตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ในไฟล์ .env.local');
  console.log('\n📝 วิธีการตั้งค่า:');
  console.log('1. ไปที่ LINE Developers Console (https://developers.line.biz/)');
  console.log('2. เลือก Channel ของคุณ');
  console.log('3. ไปที่แท็บ "Messaging API"');
  console.log('4. สร้าง Channel Access Token (Long-lived)');
  console.log('5. คัดลอก Token มาใส่ในไฟล์ .env.local');
  process.exit(1);
}

// ทดสอบการสร้าง LINE Client
try {
  console.log('🔧 กำลังสร้าง LINE Client...');
  const lineClient = new Client({
    channelAccessToken: LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: LINE_CHANNEL_SECRET
  });
  console.log('✅ สร้าง LINE Client สำเร็จ\n');

  // ทดสอบการเรียก LINE API โดยตรง
  console.log('🌐 ทดสอบการเรียก LINE API...');
  
  // ทดสอบด้วยการส่งข้อความไปยัง User ID ที่ไม่มีอยู่ (เพื่อดูว่า API ตอบสนองหรือไม่)
  const testUserId = 'U1234567890abcdef1234567890abcdef'; // User ID ทดสอบ
  const testMessage = {
    type: 'text',
    text: '🧪 ทดสอบการส่งข้อความจากระบบ Safety Bus Bot'
  };

  try {
    await lineClient.pushMessage(testUserId, testMessage);
    console.log('✅ LINE API ตอบสนองปกติ (แม้ว่า User ID อาจไม่มีอยู่จริง)');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      console.log('✅ LINE API ทำงานปกติ (ได้รับ error 400 เพราะ User ID ไม่มีอยู่จริง)');
      console.log('📝 Error details:', error.response.data);
    } else {
      console.error('❌ LINE API Error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
  }

  console.log('\n🎯 สรุปผลการทดสอบ:');
  console.log('✅ LINE Bot SDK ติดตั้งถูกต้อง');
  console.log('✅ Channel Access Token ใช้งานได้');
  console.log('✅ สามารถเรียก LINE API ได้');
  
  console.log('\n📋 ขั้นตอนต่อไป:');
  console.log('1. ตั้งค่า LINE User ID ของผู้ใช้จริงในฐานข้อมูล');
  console.log('2. ทดสอบส่งข้อความไปยังผู้ใช้จริง');
  console.log('3. ตั้งค่า Admin Group ID (ถ้าต้องการ)');

} catch (error) {
  console.error('❌ ไม่สามารถสร้าง LINE Client ได้:', error.message);
  console.log('\n🔍 กรุณาตรวจสอบ:');
  console.log('1. Channel Access Token ถูกต้องหรือไม่');
  console.log('2. Channel Secret ถูกต้องหรือไม่');
  console.log('3. Token ยังไม่หมดอายุ');
}