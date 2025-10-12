// API endpoint สำหรับส่งการแจ้งเตือนเหตุการณ์ฉุกเฉินไปยัง LINE
import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Initialize LINE Bot SDK
let lineClient = null;
try {
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    lineClient = new Client(config);
  } else {
    console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN not set - LINE messaging disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize LINE client:', error.message);
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn('⚠️ Supabase configuration missing - database operations disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
}

// Emergency event type messages
const EMERGENCY_MESSAGES = {
  DRIVER_PANIC: {
    emoji: '🚨',
    title: 'เหตุการณ์ฉุกเฉิน - คนขับกดปุ่มฉุกเฉิน',
    message: 'คนขับรถได้กดปุ่มฉุกเฉินบนรถ กรุณาติดต่อคนขับทันที',
    priority: 'CRITICAL'
  },
  SMOKE_DETECTED: {
    emoji: '💨',
    title: 'ตรวจพบควัน',
    message: 'เซ็นเซอร์ตรวจพบควันในรถ กรุณาติดต่อคนขับเพื่อตรวจสอบ',
    priority: 'HIGH'
  },
  HIGH_TEMPERATURE: {
    emoji: '🌡️',
    title: 'อุณหภูมิสูงผิดปกติ',
    message: 'ตรวจพบอุณหภูมิสูงผิดปกติในรถ กรุณาติดต่อคนขับเพื่อตรวจสอบ',
    priority: 'HIGH'
  },
  MOVEMENT_DETECTED: {
    emoji: '📳',
    title: 'ตรวจพบการเคลื่อนไหวหลังจอดรถ',
    message: 'ตรวจพบการเคลื่อนไหวในรถหลังจากจอดนาน กรุณาติดต่อคนขับเพื่อตรวจสอบ',
    priority: 'MEDIUM'
  },
  STUDENT_SWITCH: {
    emoji: '👶',
    title: 'นักเรียนกดสวิตช์',
    message: 'นักเรียนได้กดสวิตช์บนรถ (ไม่ส่งแจ้งเตือน LINE)',
    priority: 'LOW'
  }
};

// Driver response messages
const RESPONSE_MESSAGES = {
  CHECKED: {
    emoji: '✅',
    title: 'คนขับตรวจสอบเรียบร้อย',
    message: 'คนขับได้ทำการตรวจสอบเหตุการณ์แล้ว สถานการณ์กลับสู่ปกติ'
  },
  EMERGENCY: {
    emoji: '🚨',
    title: 'คนขับแจ้งเหตุฉุกเฉิน',
    message: 'คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย'
  }
};

export default async function handler(req, res) {
  // ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      eventType, 
      responseType, 
      eventId, 
      description, 
      location, 
      notes,
      timestamp 
    } = req.body;

    // Validate required fields
    if (!eventType && !responseType) {
      return res.status(400).json({ 
        error: 'Either eventType or responseType is required' 
      });
    }

    // ตรวจสอบการตั้งค่า LINE
    if (!lineClient) {
      console.error('LINE client not initialized');
      return res.status(500).json({ 
        error: 'LINE messaging service not available' 
      });
    }

    let messageInfo;
    let shouldSendToLine = true;

    // กำหนดข้อความตามประเภท
    if (eventType) {
      // เหตุการณ์ฉุกเฉิน
      messageInfo = EMERGENCY_MESSAGES[eventType];
      
      // ไม่ส่งแจ้งเตือน LINE สำหรับ STUDENT_SWITCH
      if (eventType === 'STUDENT_SWITCH') {
        shouldSendToLine = false;
      }
    } else if (responseType) {
      // การตอบสนองของคนขับ
      messageInfo = RESPONSE_MESSAGES[responseType];
    }

    if (!messageInfo) {
      return res.status(400).json({ 
        error: 'Invalid event type or response type' 
      });
    }

    // สร้างข้อความ
    const currentTime = new Date(timestamp || Date.now()).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let messageText = `${messageInfo.emoji} ${messageInfo.title}\n\n${messageInfo.message}`;
    
    if (description) {
      messageText += `\n\nรายละเอียด: ${description}`;
    }
    
    if (location) {
      messageText += `\n📍 ตำแหน่ง: ${location}`;
    }
    
    if (notes) {
      messageText += `\n📝 หมายเหตุ: ${notes}`;
    }
    
    messageText += `\n\n⏰ เวลา: ${currentTime}`;
    
    if (eventId) {
      messageText += `\n🆔 รหัสเหตุการณ์: ${eventId}`;
    }

    const lineMessage = {
      type: 'text',
      text: messageText
    };

    let notificationResults = [];

    if (shouldSendToLine) {
      // ส่งแจ้งเตือนไปยัง student_line_links และ parent_line_links
      if (supabase) {
        try {
          // ดึงข้อมูลจาก student_line_links
          const { data: studentLinks, error: studentError } = await supabase
            .from('student_line_links')
            .select('line_user_id, student_name')
            .not('line_user_id', 'is', null)
            .neq('line_user_id', '');

          if (studentError) {
            console.error('Error fetching student links:', studentError);
          } else if (studentLinks && studentLinks.length > 0) {
            // ส่งข้อความไปยังนักเรียนทุกคน
            for (const student of studentLinks) {
              try {
                await lineClient.pushMessage(student.line_user_id, lineMessage);
                notificationResults.push({
                  lineUserId: student.line_user_id,
                  studentName: student.student_name,
                  type: 'student',
                  status: 'success'
                });
                console.log(`✅ Emergency notification sent to student ${student.student_name} (${student.line_user_id})`);
              } catch (error) {
                console.error(`❌ Failed to send to student ${student.student_name}:`, error);
                notificationResults.push({
                  lineUserId: student.line_user_id,
                  studentName: student.student_name,
                  type: 'student',
                  status: 'failed',
                  error: error.message
                });
              }
            }
          } else {
            console.log('No student LINE links found');
          }

          // ดึงข้อมูลจาก parent_line_links
          const { data: parentLinks, error: parentError } = await supabase
            .from('parent_line_links')
            .select('line_user_id, parent_name, student_name')
            .not('line_user_id', 'is', null)
            .neq('line_user_id', '');

          if (parentError) {
            console.error('Error fetching parent links:', parentError);
          } else if (parentLinks && parentLinks.length > 0) {
            // ส่งข้อความไปยังผู้ปกครองทุกคน
            for (const parent of parentLinks) {
              try {
                await lineClient.pushMessage(parent.line_user_id, lineMessage);
                notificationResults.push({
                  lineUserId: parent.line_user_id,
                  parentName: parent.parent_name,
                  studentName: parent.student_name,
                  type: 'parent',
                  status: 'success'
                });
                console.log(`✅ Emergency notification sent to parent ${parent.parent_name} (${parent.line_user_id})`);
              } catch (error) {
                console.error(`❌ Failed to send to parent ${parent.parent_name}:`, error);
                notificationResults.push({
                  lineUserId: parent.line_user_id,
                  parentName: parent.parent_name,
                  studentName: parent.student_name,
                  type: 'parent',
                  status: 'failed',
                  error: error.message
                });
              }
            }
          } else {
            console.log('No parent LINE links found');
          }
        } catch (error) {
          console.error('Database query error:', error);
        }
      }


    }

    // Log การส่งข้อความ
    console.log(`📤 Emergency notification processed:`, {
      eventType,
      responseType,
      eventId,
      shouldSendToLine,
      recipientCount: notificationResults.length,
      timestamp: currentTime
    });

    return res.status(200).json({
      success: true,
      message: shouldSendToLine ? 'Emergency notification sent successfully' : 'Event logged (no LINE notification sent)',
      eventType,
      responseType,
      eventId,
      shouldSendToLine,
      notificationResults,
      timestamp: currentTime
    });

  } catch (error) {
    console.error('❌ Emergency notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send emergency notification',
      details: error.message
    });
  }
}