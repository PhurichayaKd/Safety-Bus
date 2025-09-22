import dotenv from 'dotenv';

// Load .env.local for development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

import { Client } from '@line/bot-sdk';

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Create LINE client
const lineClient = new Client(config);

/**
 * ส่งข้อความผ่าน LINE Bot
 * @param {string} to - User ID หรือ Group ID
 * @param {Object} message - ข้อความที่จะส่ง
 */
export async function sendLineMessage(to, message) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: to,
        messages: Array.isArray(message) ? message : [message]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API Error:', response.status, errorText);
      throw new Error(`LINE API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending LINE message:', error);
    throw error;
  }
}

/**
 * ตอบกลับข้อความผ่าน Reply Token
 * @param {string} replyToken - Reply token จาก webhook event
 * @param {Object} message - ข้อความที่จะตอบกลับ
 */
export async function replyLineMessage(replyToken, message) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: Array.isArray(message) ? message : [message]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE Reply API Error:', response.status, errorText);
      throw new Error(`LINE Reply API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error replying LINE message:', error);
    throw error;
  }
}

/**
 * สร้าง Rich Menu
 * @param {Object} richMenuData - ข้อมูล Rich Menu
 * @returns {string} Rich Menu ID
 */
export async function createRichMenu(richMenuData) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify(richMenuData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Create Rich Menu Error:', response.status, errorText);
      throw new Error(`Create Rich Menu Error: ${response.status}`);
    }

    const result = await response.json();
    return result.richMenuId;
  } catch (error) {
    console.error('Error creating rich menu:', error);
    throw error;
  }
}

/**
 * ผูก Rich Menu กับผู้ใช้
 * @param {string} userId - LINE User ID
 * @param {string} richMenuId - Rich Menu ID
 */
export async function linkRichMenuToUser(userId, richMenuId) {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Link Rich Menu Error:', response.status, errorText);
      throw new Error(`Link Rich Menu Error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error linking rich menu to user:', error);
    throw error;
  }
}

/**
 * ตั้งค่า Rich Menu เป็นค่าเริ่มต้น
 * @param {string} richMenuId - Rich Menu ID
 */
export async function setDefaultRichMenu(richMenuId) {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Set Default Rich Menu Error:', response.status, errorText);
      throw new Error(`Set Default Rich Menu Error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error setting default rich menu:', error);
    throw error;
  }
}

export { lineClient };