// API endpoint สำหรับส่งแจ้งเตือน LINE เมื่อคนขับอัพเดตสถานะ
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

// ข้อความสำหรับสถานะต่างๆ ของคนขับ
const DRIVER_STATUS_MESSAGES = {
  // เริ่มออกเดินทาง
  start_journey: {
    emoji: '🚌',
    title: 'คนขับเริ่มออกเดินทาง',
    message: 'คนขับได้เริ่มออกเดินทางแล้ว กรุณาเตรียมตัวให้พร้อม'
  },
  go: {
    emoji: '🚌',
    title: 'คนขับเริ่มออกเดินทาง',
    message: 'คนขับได้เริ่มออกเดินทางแล้ว กรุณาเตรียมตัวให้พร้อม'
  },
  // ถึงโรงเรียน
  arrived_school: {
    emoji: '🏫',
    title: 'คนขับถึงโรงเรียนแล้ว',
    message: 'คนขับได้มาถึงโรงเรียนเรียบร้อยแล้ว นักเรียนสามารถลงรถได้'
  },
  arrive_school: {
    emoji: '🏫',
    title: 'คนขับถึงโรงเรียนแล้ว',
    message: 'คนขับได้มาถึงโรงเรียนเรียบร้อยแล้ว นักเรียนสามารถลงรถได้'
  },
  // รอรับกลับบ้าน
  waiting_return: {
    emoji: '⏰',
    title: 'คนขับรอรับกลับบ้าน',
    message: 'คนขับกำลังรอรับนักเรียนกลับบ้าน กรุณาเตรียมตัวให้พร้อม'
  },
  wait_pickup: {
    emoji: '⏰',
    title: 'คนขับรอรับกลับบ้าน',
    message: 'คนขับกำลังรอรับนักเรียนกลับบ้าน กรุณาเตรียมตัวให้พร้อม'
  },
  // จบการเดินทาง
  finished: {
    emoji: '✅',
    title: 'คนขับจบการเดินทาง',
    message: 'คนขับได้เสร็จสิ้นการเดินทางแล้ว นักเรียนทุกคนได้กลับถึงบ้านเรียบร้อย'
  },
  finish_journey: {
    emoji: '✅',
    title: 'คนขับจบการเดินทาง',
    message: 'คนขับได้เสร็จสิ้นการเดินทางแล้ว นักเรียนทุกคนได้กลับถึงบ้านเรียบร้อย'
  },
  // สถานะเพิ่มเติม (เก็บไว้เพื่อความเข้ากันได้)
  return: {
    emoji: '🏠',
    title: 'คนขับเริ่มเส้นทางส่งกลับบ้าน',
    message: 'คนขับได้เริ่มเส้นทางส่งนักเรียนกลับบ้านแล้ว'
  },
  pickup: {
    emoji: '📍',
    title: 'คนขับกำลังรับนักเรียน',
    message: 'คนขับกำลังอยู่ในช่วงรับนักเรียนขึ้นรถ'
  },
  dropoff: {
    emoji: '🏫',
    title: 'คนขับกำลังส่งนักเรียน',
    message: 'คนขับกำลังอยู่ในช่วงส่งนักเรียนลงรถ'
  },
  driving: {
    emoji: '🛣️',
    title: 'คนขับกำลังเดินทาง',
    message: 'คนขับกำลังเดินทางไปยังจุดหมายปลายทาง'
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
      driver_id, 
      trip_phase, 
      current_status, 
      location,
      notes 
    } = req.body;

    // Validate required fields
    if (!driver_id || !trip_phase) {
      return res.status(400).json({ 
        error: 'driver_id and trip_phase are required' 
      });
    }

    // ตรวจสอบการตั้งค่า LINE
    if (!lineClient) {
      console.error('LINE client not initialized');
      return res.status(500).json({ 
        error: 'LINE messaging service not available' 
      });
    }

    // ดึงข้อมูลคนขับ
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select(`
        driver_id,
        driver_name,
        license_plate,
        phone_number
      `)
      .eq('driver_id', driver_id)
      .single();

    if (driverError || !driverData) {
      return res.status(404).json({ 
        error: 'Driver not found' 
      });
    }

    // กำหนดข้อความตามสถานะ
    let messageInfo = DRIVER_STATUS_MESSAGES[current_status] || DRIVER_STATUS_MESSAGES[trip_phase];
    
    if (!messageInfo) {
      messageInfo = {
        emoji: '📢',
        title: 'คนขับอัพเดตสถานะ',
        message: `คนขับได้อัพเดตสถานะเป็น ${current_status || trip_phase}`
      };
    }

    // สร้างข้อความ
    const currentTime = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let messageText = `${messageInfo.emoji} ${messageInfo.title}\n\n${messageInfo.message}`;
    
    messageText += `\n\n👨‍✈️ คนขับ: ${driverData.driver_name}`;
    messageText += `\n🚌 รถเมล์: ${driverData.license_plate}`;
    
    if (location) {
      messageText += `\n📍 ตำแหน่ง: ${location}`;
    }
    
    if (notes) {
      messageText += `\n📝 หมายเหตุ: ${notes}`;
    }
    
    messageText += `\n\n⏰ เวลา: ${currentTime}`;

    const lineMessage = {
      type: 'text',
      text: messageText
    };

    let notificationResults = [];

    // ส่งแจ้งเตือนไปยัง student_line_links และ parent_line_links
    try {
      // ดึงข้อมูลจาก student_line_links พร้อม join กับตาราง students
      const { data: studentLinks, error: studentError } = await supabase
        .from('student_line_links')
        .select(`
          line_user_id, 
          student_id,
          line_display_id,
          students!inner(student_name)
        `)
        .not('line_user_id', 'is', null)
        .neq('line_user_id', '');

      if (studentError) {
        console.error('Error fetching student links:', studentError);
      } else if (studentLinks && studentLinks.length > 0) {
        // ส่งข้อความไปยังนักเรียนทุกคน
        for (const student of studentLinks) {
          try {
            await lineClient.pushMessage(student.line_user_id, lineMessage);
            const studentName = student.students?.student_name || student.line_display_id || 'Unknown Student';
            notificationResults.push({
              lineUserId: student.line_user_id,
              studentId: student.student_id,
              studentName: studentName,
              type: 'student',
              status: 'success'
            });
            console.log(`✅ Driver status notification sent to student ${studentName} (${student.line_user_id})`);
          } catch (error) {
            const studentName = student.students?.student_name || student.line_display_id || 'Unknown Student';
            console.error(`❌ Failed to send to student ${studentName}:`, error);
            notificationResults.push({
              lineUserId: student.line_user_id,
              studentId: student.student_id,
              studentName: studentName,
              type: 'student',
              status: 'failed',
              error: error.message
            });
          }
        }
      } else {
        console.log('No student LINE links found');
      }

      // ดึงข้อมูลจาก parent_line_links พร้อม join กับตาราง parents และ students
      const { data: parentLinks, error: parentError } = await supabase
        .from('parent_line_links')
        .select(`
          line_user_id, 
          parent_id,
          line_display_id,
          parents!inner(parent_name),
          students!inner(student_name)
        `)
        .not('line_user_id', 'is', null)
        .neq('line_user_id', '');

      if (parentError) {
        console.error('Error fetching parent links:', parentError);
      } else if (parentLinks && parentLinks.length > 0) {
        // ส่งข้อความไปยังผู้ปกครองทุกคน
        for (const parent of parentLinks) {
          try {
            await lineClient.pushMessage(parent.line_user_id, lineMessage);
            const parentName = parent.parents?.parent_name || parent.line_display_id || 'Unknown Parent';
            const studentName = parent.students?.student_name || 'Unknown Student';
            notificationResults.push({
              lineUserId: parent.line_user_id,
              parentId: parent.parent_id,
              parentName: parentName,
              studentName: studentName,
              type: 'parent',
              status: 'success'
            });
            console.log(`✅ Driver status notification sent to parent ${parentName} (${parent.line_user_id})`);
          } catch (error) {
            const parentName = parent.parents?.parent_name || parent.line_display_id || 'Unknown Parent';
            const studentName = parent.students?.student_name || 'Unknown Student';
            console.error(`❌ Failed to send to parent ${parentName}:`, error);
            notificationResults.push({
              lineUserId: parent.line_user_id,
              parentId: parent.parent_id,
              parentName: parentName,
              studentName: studentName,
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



    // บันทึก log การส่งข้อความ
    try {
      await supabase
        .from('notification_logs')
        .insert({
          notification_type: 'driver_status_update',
          recipient_id: 'all_users',
          message: messageText,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: {
            driver_id,
            trip_phase,
            current_status,
            location,
            notes,
            notification_results: notificationResults
          }
        });
    } catch (logError) {
      console.error('Failed to log notification:', logError);
    }

    // Log การส่งข้อความ
    console.log(`📤 Driver status notification processed:`, {
      driver_id,
      trip_phase,
      current_status,
      location,
      totalSent: notificationResults.filter(r => r.status === 'success').length,
      totalFailed: notificationResults.filter(r => r.status === 'failed').length
    });

    return res.status(200).json({
      success: true,
      message: 'Driver status notification sent successfully',
      driver: {
        id: driver_id,
        name: driverData.driver_name,
        license_plate: driverData.license_plate
      },
      status: {
        trip_phase,
        current_status
      },
      notification_results: notificationResults,
      summary: {
        total_sent: notificationResults.filter(r => r.status === 'success').length,
        total_failed: notificationResults.filter(r => r.status === 'failed').length,
        students_notified: notificationResults.filter(r => r.type === 'student' && r.status === 'success').length,
        parents_notified: notificationResults.filter(r => r.type === 'parent' && r.status === 'success').length
      }
    });

  } catch (error) {
    console.error('Driver status notification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}