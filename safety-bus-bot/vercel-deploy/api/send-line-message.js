// API endpoint สำหรับส่งข้อความไลน์
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, message' 
      });
    }

    // ตรวจสอบว่า Line ID ถูกต้อง
    if (!to.startsWith('U') || to.length !== 33) {
      return res.status(400).json({ 
        error: 'Invalid Line user ID format' 
      });
    }

    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!lineChannelAccessToken) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return res.status(500).json({ 
        error: 'Line messaging not configured' 
      });
    }

    // ส่งข้อความผ่าน Line Messaging API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lineChannelAccessToken}`
      },
      body: JSON.stringify({
        to: to,
        messages: [{
          type: 'text',
          text: message
        }]
      })
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error('Line API error:', errorText);
      
      // ตรวจสอบประเภทข้อผิดพลาด
      if (lineResponse.status === 400) {
        return res.status(400).json({ 
          error: 'Invalid Line user ID or message format',
          details: errorText
        });
      } else if (lineResponse.status === 403) {
        return res.status(403).json({ 
          error: 'Line API access denied - check channel access token',
          details: errorText
        });
      } else {
        return res.status(500).json({ 
          error: 'Failed to send Line message',
          details: errorText
        });
      }
    }

    // บันทึกประวัติการส่งข้อความ (ถ้าต้องการ)
    try {
      await supabase.from('line_message_logs').insert({
        recipient_line_id: to,
        message_text: message,
        message_type: 'service_notification',
        sent_at: new Date().toISOString(),
        status: 'sent'
      });
    } catch (logError) {
      // ไม่ให้ error ในการบันทึก log ทำให้การส่งข้อความล้มเหลว
      console.warn('Failed to log message:', logError);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Line message sent successfully'
    });

  } catch (error) {
    console.error('Error sending Line message:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
}