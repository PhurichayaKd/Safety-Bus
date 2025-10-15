// API endpoint สำหรับส่งแจ้งเตือน LINE เมื่อคนขับอัพเดตสถานะนักเรียน
import { createClient } from '@supabase/supabase-js';
import { Client } from '@line/bot-sdk';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize LINE client
let lineClient = null;
try {
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    lineClient = new Client({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    });
  }
} catch (error) {
  console.error('Failed to initialize LINE client:', error);
}

// ข้อความสำหรับสถานะต่างๆ ของนักเรียน
const STUDENT_STATUS_MESSAGES = {
  onboard: {
    emoji: '🚌🚌',
    title: 'นักเรียนขึ้นรถแล้ว',
    message: 'ขึ้นรถแล้ว'
  },
  offboard: {
    emoji: '✅✅',
    title: 'นักเรียนลงรถแล้ว',
    message: 'ลงรถแล้ว'
  },
  absent: {
    emoji: '📝',
    title: 'นักเรียนทำการแจ้งลา',
    message: 'ทำการแจ้งลาไม่ประสงค์ขึ้นรถรับส่ง คนขับยืนยันแล้ว'
  },
  stop: {
    emoji: '⏸️',
    title: 'หยุดรอนักเรียน',
    message: 'รถกำลังหยุดรอนักเรียน'
  }
};

export default async function handler(req, res) {
  console.log('🔥 Student Status Notification API called!');
  console.log('📨 Request method:', req.method);
  console.log('📋 Request body:', req.body);
  
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
      student_id, 
      status, 
      driver_id,
      location,
      notes,
      phase = 'pickup' // pickup หรือ dropoff
    } = req.body;

    // Validate required fields
    if (!student_id || !status) {
      return res.status(400).json({ 
        error: 'student_id and status are required' 
      });
    }

    // ตรวจสอบการตั้งค่า LINE
    if (!lineClient) {
      console.error('LINE client not initialized');
      return res.status(500).json({ 
        error: 'LINE messaging service not available' 
      });
    }

    // ดึงข้อมูลนักเรียน
    console.log('🔍 Querying student with ID:', student_id);
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        parent_id,
        home_latitude,
        home_longitude
      `)
      .eq('student_id', student_id)
      .single();

    console.log('📊 Student query result:', { studentData, studentError });

    if (studentError || !studentData) {
      console.log('❌ Student not found or error occurred');
      return res.status(404).json({ 
        error: 'Student not found' 
      });
    }

    // ดึงข้อมูลคนขับ (ถ้ามี)
    let driverData = null;
    if (driver_id) {
      const { data: driver, error: driverError } = await supabase
        .from('driver_bus')
        .select(`
          driver_id,
          driver_name,
          license_plate,
          phone_number
        `)
        .eq('driver_id', driver_id)
        .single();

      if (!driverError && driver) {
        driverData = driver;
      }
    }

    // กำหนดข้อความตามสถานะ
    const messageInfo = STUDENT_STATUS_MESSAGES[status] || {
      emoji: '📢',
      title: 'อัพเดตสถานะนักเรียน',
      message: `สถานะได้รับการอัพเดตเป็น ${status}`
    };

    // สร้างข้อความ
    const currentTime = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit'
    });

    // สร้างข้อความตามรูปแบบใหม่
    let messageText = '';
    
    if (status === 'onboard') {
      messageText = `🟢ขึ้นรถแล้ว🟢\n${studentData.student_name}\n\nสถานะ : เช็คขึ้นรถ โดยคนขับ`;
      if (driverData) {
        messageText += `\nคนขับ: ${driverData.driver_name}`;
      }
      messageText += `\n⏰ เวลา: ${currentTime} น.`;
    } else if (status === 'offboard') {
      messageText = `🟠ลงรถแล้ว🟠\n${studentData.student_name}\n\nสถานะ : เช็คลงรถ โดยคนขับ`;
      if (driverData) {
        messageText += `\nคนขับ: ${driverData.driver_name}`;
      }
      messageText += `\n⏰ เวลา: ${currentTime} น.`;
    } else {
      // สำหรับสถานะอื่นๆ ใช้รูปแบบเดิม
      messageText = `${messageInfo.emoji} ${studentData.student_name} ${messageInfo.message} เวลา ${currentTime} น.`;
      if (driverData) {
        messageText += ` คนขับ: ${driverData.driver_name}`;
      }
    }

    const lineMessage = {
      type: 'text',
      text: messageText
    };

    let notificationResults = [];

    // ส่งแจ้งเตือนไปยังนักเรียนคนนั้น
    try {
      const { data: studentLink, error: studentLinkError } = await supabase
        .from('student_line_links')
        .select('line_user_id, line_display_id')
        .eq('student_id', student_id)
        .eq('active', true)
        .not('line_user_id', 'is', null)
        .neq('line_user_id', '')
        .single();

      if (!studentLinkError && studentLink) {
        try {
          await lineClient.pushMessage(studentLink.line_user_id, lineMessage);
          notificationResults.push({
            lineUserId: studentLink.line_user_id,
            studentName: studentData.student_name,
            type: 'student',
            status: 'success'
          });
          console.log(`✅ Student status notification sent to student ${studentData.student_name} (${studentLink.line_user_id})`);
        } catch (error) {
          console.error(`❌ Failed to send to student ${studentData.student_name}:`, error);
          notificationResults.push({
            lineUserId: studentLink.line_user_id,
            studentName: studentData.student_name,
            type: 'student',
            status: 'failed',
            error: error.message
          });
        }
      } else {
        console.log(`No LINE link found for student ${student_id}`);
      }
    } catch (error) {
      console.error('Error fetching student LINE link:', error);
    }

    // ส่งแจ้งเตือนไปยังผู้ปกครองของนักเรียนคนนั้น
    try {
      const { data: parentLinks, error: parentLinkError } = await supabase
        .from('parent_line_links')
        .select(`
          line_user_id,
          parents!inner(parent_name)
        `)
        .eq('parent_id', studentData.parent_id)
        .eq('active', true)
        .not('line_user_id', 'is', null)
        .neq('line_user_id', '');

      if (!parentLinkError && parentLinks && parentLinks.length > 0) {
        for (const parentLink of parentLinks) {
          try {
            await lineClient.pushMessage(parentLink.line_user_id, lineMessage);
            notificationResults.push({
              lineUserId: parentLink.line_user_id,
              parentName: parentLink.parents.parent_name,
              studentName: studentData.student_name,
              type: 'parent',
              status: 'success'
            });
            console.log(`✅ Student status notification sent to parent ${parentLink.parents.parent_name} (${parentLink.line_user_id})`);
          } catch (error) {
            console.error(`❌ Failed to send to parent ${parentLink.parents.parent_name}:`, error);
            notificationResults.push({
              lineUserId: parentLink.line_user_id,
              parentName: parentLink.parents.parent_name,
              studentName: studentData.student_name,
              type: 'parent',
              status: 'failed',
              error: error.message
            });
          }
        }
      } else {
        console.log(`No parent LINE links found for student ${student_id}`);
      }
    } catch (error) {
      console.error('Error fetching parent LINE links:', error);
    }



    // บันทึก log การส่งข้อความ
    try {
      await supabase
        .from('notification_logs')
        .insert({
          notification_type: 'student_status_update',
          recipient_id: student_id,
          message: messageText,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            student_id,
            status,
            driver_id,
            location,
            notes,
            phase,
            notification_results: notificationResults
          }
        });
    } catch (logError) {
      console.error('Failed to log notification:', logError);
    }

    // Log การส่งข้อความ
    console.log(`📤 Student status notification processed:`, {
      student_id,
      student_name: studentData.student_name,
      status,
      phase,
      location,
      totalSent: notificationResults.filter(r => r.status === 'success').length,
      totalFailed: notificationResults.filter(r => r.status === 'failed').length
    });

    return res.status(200).json({
      success: true,
      message: 'Student status notification sent successfully',
      student: {
        id: student_id,
        name: studentData.student_name,
        code: studentData.student_id,
        class: studentData.grade
      },
      status: status,
      phase: phase,
      driver: driverData ? {
        id: driver_id,
        name: driverData.driver_name,
        license_plate: driverData.license_plate
      } : null,
      notification_results: notificationResults,
      summary: {
        total_sent: notificationResults.filter(r => r.status === 'success').length,
        total_failed: notificationResults.filter(r => r.status === 'failed').length,
        student_notified: notificationResults.filter(r => r.type === 'student' && r.status === 'success').length > 0,
        parents_notified: notificationResults.filter(r => r.type === 'parent' && r.status === 'success').length
      }
    });

  } catch (error) {
    console.error('Student status notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}