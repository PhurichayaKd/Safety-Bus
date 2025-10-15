// API สำหรับการตอบสนองของคนขับต่อเหตุการณ์ฉุกเฉินและการส่งแจ้งเตือนเหตุการณ์ฉุกเฉิน
import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// ตั้งค่า LINE Bot
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// สร้าง LINE client
let lineClient = null;
try {
  if (config.channelAccessToken && config.channelSecret) {
    lineClient = new Client(config);
    console.log('✅ LINE client initialized successfully');
  } else {
    console.warn('⚠️ LINE credentials not found');
  }
} catch (error) {
  console.error('❌ Failed to initialize LINE client:', error.message);
}

// ตั้งค่า Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.warn('⚠️ Supabase credentials not found');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
}

// ข้อความสำหรับเหตุการณ์ฉุกเฉิน
const EMERGENCY_MESSAGES = {
  DRIVER_PANIC: {
    emoji: '🚨',
    title: 'คนขับแจ้งเหตุฉุกเฉิน‼️',
    message: '🔻 สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: ไม่ทราบสาเหตุที่แน่ชัด',
    priority: 'CRITICAL',
    sendToLine: true
  },
  MOVEMENT_DETECTED: {
    emoji: '🚨',
    title: 'ตรวจพบการเคลื่อนไหวหลังจอดรถ 🗣‼️',
    message: '🔻สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด : เซ็นเซอร์(PIR) ตรวจพบการเคลื่อนไหวในรถหลังจากจอดนานแล้ว เกิน5นาที เสียงแจ้งเตือนได้ทำงานอย่างต่อเนื่อง',
    priority: 'HIGH',
    sendToLine: true
  },
  HIGH_TEMPERATURE: {
    emoji: '🚨',
    title: 'ตรวจพบการอุณหภูมิสูง 🌡‼️',
    message: '🔻สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด : เซ็นเซอร์วัดอุณหภูมิ ตรวจพบอุณหภูมิภายในรถสูง {temperature}°C คาดการเป็นอันตรายต่อนักเรียน',
    priority: 'HIGH',
    sendToLine: true
  },
  SMOKE_AND_HEAT: {
    emoji: '🚨',
    title: 'ตรวจพบการอุณหภูมิสูงและควันจำนวนมาก 🧯‼️',
    message: '🔻 สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด : เซ็นเซอร์วัดอุณหภูมิ และ เซ็นเซอร์ตรวจจับควัน ตรวจพบอุณหภูมิภายในรถสูง {temperature}°C และควันจำนวนมาก (ค่าที่ตรวจพบ: {smokeLevel}) คาดการเป็นอันตรายต่อนักเรียน',
    priority: 'CRITICAL',
    sendToLine: true
  },
  STUDENT_SWITCH: {
    emoji: '👶',
    title: 'นักเรียนกดสวิตช์',
    message: 'นักเรียนได้กดสวิตช์บนรถ (ไม่ส่งแจ้งเตือน LINE)',
    priority: 'LOW',
    sendToLine: false
  }
};

// ข้อความสำหรับการตอบสนองของคนขับ
const DRIVER_RESPONSE_MESSAGES = {
  CHECKED_ONLY: {
    emoji: '✅',
    title: 'คนขับตรวจสอบเรียบร้อย',
    message: 'คนขับได้ทำการตรวจสอบเหตุการณ์แล้ว สถานการณ์กลับสู่ปกติ',
    sendToLine: false // สำหรับปุ่มฉุกเฉินนักเรียน - ไม่ส่ง LINE
  },
  EMERGENCY_CONFIRMED: {
    emoji: '🚨',
    title: 'คนขับแจ้งเหตุฉุกเฉิน‼️',
    message: '🔻 สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: ไม่ทราบสาเหตุที่แน่ชัด',
    sendToLine: true
  },
  SITUATION_NORMAL: {
    emoji: '✅️',
    title: 'สถานการ์กลับสู่ปกติแล้ว ✅️',
    message: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว',
    sendToLine: true
  },
  // เพิ่มข้อความจาก emergency-notification.js
  CHECKED: {
    emoji: '✅',
    title: 'คนขับตรวจสอบเรียบร้อย',
    message: 'คนขับได้ทำการตรวจสอบเหตุการณ์แล้ว สถานการณ์กลับสู่ปกติ',
    sendToLine: true
  },
  EMERGENCY: {
    emoji: '🚨',
    title: 'คนขับแจ้งเหตุฉุกเฉิน',
    message: 'คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย',
    sendToLine: true
  },
  CONFIRMED_NORMAL: {
    emoji: '✅️',
    title: 'สถานการ์กลับสู่ปกติแล้ว ✅️',
    message: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว',
    sendToLine: true
  }
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // ตั้งค่า CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      // สำหรับ emergency notification
      eventType, 
      eventId, 
      description, 
      location,
      sensorType,
      temperature,
      smokeLevel,
      humidity,
      // สำหรับ driver response
      responseType,
      emergencyLogId,
      driverId,
      busId,
      isStudentEmergency = false, // ระบุว่าเป็นการตอบสนองต่อปุ่มฉุกเฉินนักเรียนหรือไม่
      // ทั่วไป
      notes,
      timestamp
    } = req.body;

    // Validate required fields
    if (!eventType && !responseType) {
      return res.status(400).json({ 
        error: 'Either eventType or responseType is required' 
      });
    }

    // ตรวจสอบการตั้งค่า LINE และ Supabase
    if (!lineClient) {
      console.error('LINE client not initialized');
      return res.status(500).json({ 
        error: 'LINE messaging service not available' 
      });
    }

    if (!supabase) {
      console.error('Supabase client not initialized');
      return res.status(500).json({ 
        error: 'Database service not available' 
      });
    }

    let messageInfo;
    let shouldSendToLine = true;
    
    // กำหนดข้อความตามประเภท
    if (eventType) {
      // เหตุการณ์ฉุกเฉิน - ตรวจสอบประเภทเซ็นเซอร์
      if (sensorType) {
        // ตรวจสอบประเภทเซ็นเซอร์และกำหนด eventType ที่เหมาะสม
        if (sensorType === 'motion_detected_after_trip' || sensorType === 'motion_detected_at_school') {
          messageInfo = EMERGENCY_MESSAGES['MOVEMENT_DETECTED'];
        } else if (sensorType === 'smoke_heat' && temperature && smokeLevel) {
          messageInfo = EMERGENCY_MESSAGES['SMOKE_AND_HEAT'];
        } else if (sensorType === 'temp_only' && temperature) {
          messageInfo = EMERGENCY_MESSAGES['HIGH_TEMPERATURE'];
        } else {
          messageInfo = EMERGENCY_MESSAGES[eventType];
        }
      } else {
        messageInfo = EMERGENCY_MESSAGES[eventType];
      }
      
      // ไม่ส่งแจ้งเตือน LINE สำหรับ STUDENT_SWITCH
      if (eventType === 'STUDENT_SWITCH') {
        shouldSendToLine = false;
      }
    } else if (responseType) {
      // การตอบสนองของคนขับ
      if (isStudentEmergency && responseType === 'CHECKED') {
        // สำหรับปุ่มฉุกเฉินนักเรียน - ใช้ CHECKED_ONLY (ไม่ส่ง LINE)
        messageInfo = DRIVER_RESPONSE_MESSAGES['CHECKED_ONLY'];
      } else {
        messageInfo = DRIVER_RESPONSE_MESSAGES[responseType];
      }
    }

    if (!messageInfo) {
      return res.status(400).json({ 
        error: 'Invalid event type or response type' 
      });
    }

    // อัปเดต shouldSendToLine ตาม messageInfo
    if (messageInfo.sendToLine !== undefined) {
      shouldSendToLine = messageInfo.sendToLine;
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
    
    // แทนที่ค่าอุณหภูมิและควันในข้อความ
    if (temperature) {
      messageText = messageText.replace('{temperature}', temperature);
    }
    if (smokeLevel) {
      messageText = messageText.replace('{smokeLevel}', smokeLevel);
    }
    
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
    } else if (emergencyLogId) {
      messageText += `\n🆔 รหัสเหตุการณ์: ${emergencyLogId}`;
    }

    // ทำความสะอาดข้อความ
    const cleanMessageText = messageText
      .replace(/[^\u0000-\u007F\u0E00-\u0E7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const lineMessage = {
      type: 'text',
      text: cleanMessageText
    };

    let notificationResults = [];

    // ส่งแจ้งเตือน LINE เฉพาะเมื่อ shouldSendToLine เป็น true
    if (shouldSendToLine) {
      try {
        // ดึงข้อมูลจาก student_line_links
        const { data: studentLinks, error: studentError } = await supabase
          .from('student_line_links')
          .select('line_user_id, student_id, line_display_id')
          .not('line_user_id', 'is', null)
          .neq('line_user_id', '')
          .eq('active', true);

        if (studentError) {
          console.error('Error fetching student links:', studentError);
        } else if (studentLinks && studentLinks.length > 0) {
          // ส่งข้อความไปยังนักเรียนทุกคน
          for (const student of studentLinks) {
            try {
              await lineClient.pushMessage(student.line_user_id, lineMessage);
              notificationResults.push({
                lineUserId: student.line_user_id,
                studentId: student.student_id,
                lineDisplayId: student.line_display_id,
                type: 'student',
                status: 'success'
              });
              console.log(`✅ Driver response sent to student ${student.student_id} (${student.line_user_id})`);
            } catch (error) {
              console.error(`❌ Failed to send to student ${student.student_id}:`, error.message);
              notificationResults.push({
                lineUserId: student.line_user_id,
                studentId: student.student_id,
                lineDisplayId: student.line_display_id,
                type: 'student',
                status: 'failed',
                error: error.message
              });
            }
          }
        }

        // ดึงข้อมูลจาก parent_line_links
        const { data: parentLinks, error: parentError } = await supabase
          .from('parent_line_links')
          .select('line_user_id, parent_id, line_display_id')
          .not('line_user_id', 'is', null)
          .neq('line_user_id', '')
          .eq('active', true);

        if (parentError) {
          console.error('Error fetching parent links:', parentError);
        } else if (parentLinks && parentLinks.length > 0) {
          // ส่งข้อความไปยังผู้ปกครองทุกคน
          for (const parent of parentLinks) {
            try {
              await lineClient.pushMessage(parent.line_user_id, lineMessage);
              notificationResults.push({
                lineUserId: parent.line_user_id,
                parentId: parent.parent_id,
                lineDisplayId: parent.line_display_id,
                type: 'parent',
                status: 'success'
              });
              console.log(`✅ Driver response sent to parent ${parent.parent_id} (${parent.line_user_id})`);
            } catch (error) {
              console.error(`❌ Failed to send to parent ${parent.parent_id}:`, error.message);
              notificationResults.push({
                lineUserId: parent.line_user_id,
                parentId: parent.parent_id,
                lineDisplayId: parent.line_display_id,
                type: 'parent',
                status: 'failed',
                error: error.message
              });
            }
          }
        }
      } catch (error) {
        console.error('Database query error:', error);
      }
    }

    // บันทึกข้อมูลลงฐานข้อมูล (เฉพาะ driver response)
    if (responseType) {
      try {
        const { data: responseData, error: responseError } = await supabase
          .from('emergency_responses')
          .insert({
            emergency_log_id: emergencyLogId,
            driver_id: driverId,
            bus_id: busId,
            response_type: responseType,
            response_message: cleanMessageText,
            notes: notes,
            is_student_emergency: isStudentEmergency,
            created_at: new Date(timestamp || Date.now()).toISOString()
          })
          .select();

        if (responseError) {
          console.error('Error saving emergency response:', responseError);
        } else {
          console.log('✅ Emergency response saved to database:', responseData);
        }
      } catch (error) {
        console.error('Database insert error:', error);
      }
    }

    // Log การส่งข้อความ
    console.log(`📤 Emergency notification/response processed:`, {
      eventType,
      responseType,
      eventId,
      emergencyLogId,
      driverId,
      busId,
      isStudentEmergency,
      shouldSendToLine,
      recipientCount: notificationResults.length,
      timestamp: currentTime
    });

    return res.status(200).json({
      success: true,
      message: shouldSendToLine ? 
        (eventType ? 'Emergency notification sent successfully' : 'Driver response sent successfully') : 
        (eventType ? 'Event logged (no LINE notification sent)' : 'Driver response logged (no LINE notification sent)'),
      eventType,
      responseType,
      eventId,
      emergencyLogId,
      driverId,
      busId,
      isStudentEmergency,
      shouldSendToLine,
      notificationResults,
      timestamp: currentTime
    });

  } catch (error) {
    console.error('❌ Emergency notification/response error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process emergency notification/response',
      details: error.message
    });
  }
}