// test-webhook.js
// ทดสอบ webhook endpoint และการจัดการ events หลังจากแก้ไขปัญหา

import crypto from 'crypto';

const baseUrl = 'http://localhost:3000';
const channelSecret = '372a023fa2c1575676cfedd3f2d329b9';

// สร้าง signature สำหรับ LINE webhook
function createSignature(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('base64');
}

// ทดสอบ webhook endpoint
async function testWebhookFixed() {
  console.log('🧪 ทดสอบ LINE Webhook หลังจากแก้ไขปัญหา');
  console.log('=' .repeat(60));
  
  // ทดสอบ 1: Text message "เมนู"
  console.log('\n📍 ทดสอบ 1: Text message "เมนู"');
  
  const menuEvent = {
    events: [
      {
        type: 'message',
        message: {
          type: 'text',
          text: 'เมนู'
        },
        source: {
          userId: 'U123456789abcdef'
        },
        replyToken: 'test-reply-token-menu'
      }
    ]
  };
  
  const menuBody = JSON.stringify(menuEvent);
  const menuSignature = createSignature(menuBody, channelSecret);
  
  try {
    const menuResponse = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': menuSignature
      },
      body: menuBody
    });
    
    console.log(`✅ Menu Status: ${menuResponse.status}`);
    const menuResult = await menuResponse.json();
    console.log(`✅ Menu Response:`, menuResult);
    
  } catch (error) {
    console.log(`❌ Menu Error: ${error.message}`);
  }
  
  // รอสักครู่ก่อนทดสอบต่อ
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // ทดสอบ 2: Student ID input
  console.log('\n📍 ทดสอบ 2: Student ID input "246662"');
  
  const studentIdEvent = {
    events: [
      {
        type: 'message',
        message: {
          type: 'text',
          text: '246662'
        },
        source: {
          userId: 'U123456789abcdef'
        },
        replyToken: 'test-reply-token-student'
      }
    ]
  };
  
  const studentBody = JSON.stringify(studentIdEvent);
  const studentSignature = createSignature(studentBody, channelSecret);
  
  try {
    const studentResponse = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': studentSignature
      },
      body: studentBody
    });
    
    console.log(`✅ Student ID Status: ${studentResponse.status}`);
    const studentResult = await studentResponse.json();
    console.log(`✅ Student ID Response:`, studentResult);
    
  } catch (error) {
    console.log(`❌ Student ID Error: ${error.message}`);
  }
  
  // รอสักครู่ก่อนทดสอบต่อ
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // ทดสอบ 3: Postback event - main menu
  console.log('\n📍 ทดสอบ 3: Postback event - main menu');
  
  const postbackEvent = {
    events: [
      {
        type: 'postback',
        postback: {
          data: 'action=main_menu'
        },
        source: {
          userId: 'U123456789abcdef'
        },
        replyToken: 'test-reply-token-postback'
      }
    ]
  };
  
  const postbackBody = JSON.stringify(postbackEvent);
  const postbackSignature = createSignature(postbackBody, channelSecret);
  
  try {
    const postbackResponse = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': postbackSignature
      },
      body: postbackBody
    });
    
    console.log(`✅ Postback Status: ${postbackResponse.status}`);
    const postbackResult = await postbackResponse.json();
    console.log(`✅ Postback Response:`, postbackResult);
    
  } catch (error) {
    console.log(`❌ Postback Error: ${error.message}`);
  }
  
  // รอสักครู่ก่อนทดสอบต่อ
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // ทดสอบ 4: Postback event - history
  console.log('\n📍 ทดสอบ 4: Postback event - history');
  
  const historyEvent = {
    events: [
      {
        type: 'postback',
        postback: {
          data: 'action=history'
        },
        source: {
          userId: 'U123456789abcdef'
        },
        replyToken: 'test-reply-token-history'
      }
    ]
  };
  
  const historyBody = JSON.stringify(historyEvent);
  const historySignature = createSignature(historyBody, channelSecret);
  
  try {
    const historyResponse = await fetch(`${baseUrl}/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': historySignature
      },
      body: historyBody
    });
    
    console.log(`✅ History Status: ${historyResponse.status}`);
    const historyResult = await historyResponse.json();
    console.log(`✅ History Response:`, historyResult);
    
  } catch (error) {
    console.log(`❌ History Error: ${error.message}`);
  }
  
  console.log('\n🎯 สรุปผลการทดสอบหลังแก้ไข:');
  console.log('=' .repeat(60));
  console.log('✅ แก้ไขปัญหาการใช้ pushMessage แทน replyMessage');
  console.log('✅ เพิ่ม replyToken parameter ในฟังก์ชัน sendMainMenu และ sendLeaveMenu');
  console.log('✅ แก้ไขฟังก์ชัน sendMessageWithQuickReply ให้รองรับทั้ง reply และ push');
  console.log('✅ อัปเดตการเรียกใช้ฟังก์ชันในส่วนต่างๆ ให้ส่ง replyToken');
  console.log('\n💡 ขั้นตอนต่อไป:');
  console.log('1. ทดสอบใน LINE app จริง');
  console.log('2. ตรวจสอบว่า bot ตอบกลับเมื่อกดเมนูหรือพิมพ์รหัสนักเรียน');
  console.log('3. ตรวจสอบ server logs หากยังมีปัญหา');
}

testWebhookFixed().catch(console.error);