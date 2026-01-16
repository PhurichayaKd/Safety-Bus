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

// ข้อความสำหรับสถานะต่างๆ ของคนขับ (แบบสั้นและกระชับ)
const DRIVER_STATUS_MESSAGES = {
  // เริ่มออกเดินทาง
  start_journey: {
    emoji: '🚌',
    title: 'เริ่มออกเดินทาง',
    message: 'กรุณาเตรียมตัวให้พร้อม'
  },
  go: {
    emoji: '🚌',
    title: 'เริ่มออกเดินทาง',
    message: 'กรุณาเตรียมตัวให้พร้อม'
  },
  enroute: {
    emoji: '🚌',
    title: 'เริ่มออกเดินทาง',
    message: 'กรุณาเตรียมตัวให้พร้อม'
  },
  // ถึงโรงเรียน
  arrived_school: {
    emoji: '🏫',
    title: 'ถึงโรงเรียนแล้ว',
    message: 'นักเรียนสามารถลงรถได้'
  },
  arrive_school: {
    emoji: '🏫',
    title: 'ถึงโรงเรียนแล้ว',
    message: 'นักเรียนสามารถลงรถได้'
  },
  // รอรับกลับบ้าน
  waiting_return: {
    emoji: '⏰',
    title: 'รอรับกลับบ้าน',
    message: 'กรุณาเตรียมตัวให้พร้อม'
  },
  wait_pickup: {
    emoji: '⏰',
    title: 'รอรับกลับบ้าน',
    message: 'กรุณาเตรียมตัวให้พร้อม'
  },
  // จบการเดินทาง
  finished: {
    emoji: '✅',
    title: 'จบการเดินทาง',
    message: 'นักเรียนทุกคนกลับถึงบ้านเรียบร้อย'
  },
  finish_journey: {
    emoji: '✅',
    title: 'จบการเดินทาง',
    message: 'นักเรียนทุกคนกลับถึงบ้านเรียบร้อย'
  },
  // สถานะเพิ่มเติม
  return: {
    emoji: '🏠',
    title: 'เส้นทางกลับบ้าน',
    message: 'เริ่มส่งนักเรียนกลับบ้าน'
  },
  pickup: {
    emoji: '📍',
    title: 'กำลังรับนักเรียน',
    message: 'อยู่ในช่วงรับนักเรียนขึ้นรถ'
  },
  dropoff: {
    emoji: '🏫',
    title: 'กำลังส่งนักเรียน',
    message: 'อยู่ในช่วงส่งนักเรียนลงรถ'
  },
  driving: {
    emoji: '🛣️',
    title: 'กำลังเดินทาง',
    message: 'เดินทางไปยังจุดหมายปลายทาง'
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

    // สร้างข้อความแบบสั้นและกระชับ
    const currentTime = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit'
    });

    // ข้อความสั้นและกระชับ
    let messageText = `${messageInfo.emoji} ${messageInfo.title}`;
    messageText += `\n🚌 ${driverData.license_plate} | ⏰ ${currentTime}`;
    
    // เพิ่มข้อความหลักแบบสั้น
    if (messageInfo.message) {
      messageText += `\n${messageInfo.message}`;
    }

    const lineMessage = {
      type: 'text',
      text: messageText
    };

    let notificationResults = [];

    // ส่งแจ้งเตือนไปยัง student_line_links และ parent_line_links
    try {
      // ขั้นตอนที่ 1: หา route ของ driver นี้
      const { data: driverRoutes, error: routeError } = await supabase
        .from('driver_bus')
        .select('route_id')
        .eq('driver_id', driver_id)
        .single();

      if (routeError || !driverRoutes?.route_id) {
        console.log('No route found for driver:', driver_id);
      } else {
        // ขั้นตอนที่ 2: หา students ใน route นี้
        const { data: routeStudents, error: studentsError } = await supabase
          .from('route_students')
          .select('student_id')
          .eq('route_id', driverRoutes.route_id);

        if (studentsError) {
          console.error('Error fetching route students:', studentsError);
        } else {
          const studentIds = routeStudents.map(rs => rs.student_id);

          if (studentIds.length > 0) {
            // ขั้นตอนที่ 3: ดึงข้อมูล student_line_links สำหรับ students เหล่านี้
            const { data: studentLinks, error: studentError } = await supabase
              .from('student_line_links')
              .select(`
                line_user_id, 
                student_id,
                line_display_id,
                students!inner(student_name)
              `)
              .in('student_id', studentIds)
              .not('line_user_id', 'is', null)
              .neq('line_user_id', '')
              .eq('active', true);

            // กรองเฉพาะ LINE User ID ที่ถูกต้อง (ขึ้นต้นด้วย U และมี 33 ตัวอักษร)
            const validStudentLinks = studentLinks?.filter(link => 
              link.line_user_id && 
              link.line_user_id.startsWith('U') && 
              link.line_user_id.length === 33
            ) || [];

            if (studentError) {
              console.error('Error fetching student links:', studentError);
            } else if (validStudentLinks && validStudentLinks.length > 0) {
              // ส่งข้อความไปยังนักเรียนทุกคน
              for (const student of validStudentLinks) {
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

            // ขั้นตอนที่ 4: หา parents ของ students เหล่านี้ผ่าน student_guardians
            const { data: parentIds, error: guardianError } = await supabase
              .from('student_guardians')
              .select('parent_id')
              .in('student_id', studentIds);

            if (guardianError) {
              console.error('Error fetching student guardians:', guardianError);
            } else {
              const uniqueParentIds = [...new Set(parentIds.map(pg => pg.parent_id))];

              if (uniqueParentIds.length > 0) {
                // ขั้นตอนที่ 5: ดึงข้อมูล parent_line_links สำหรับ parents เหล่านี้
                const { data: parentLinks, error: parentError } = await supabase
                  .from('parent_line_links')
                  .select(`
                    line_user_id, 
                    parent_id,
                    line_display_id,
                    parents!inner(parent_name)
                  `)
                  .in('parent_id', uniqueParentIds)
                  .not('line_user_id', 'is', null)
                  .neq('line_user_id', '')
                  .eq('active', true);

                // กรองเฉพาะ LINE User ID ที่ถูกต้อง (ขึ้นต้นด้วย U และมี 33 ตัวอักษร)
                const validParentLinks = parentLinks?.filter(link => 
                  link.line_user_id && 
                  link.line_user_id.startsWith('U') && 
                  link.line_user_id.length === 33
                ) || [];

                if (parentError) {
                  console.error('Error fetching parent links:', parentError);
                } else if (validParentLinks && validParentLinks.length > 0) {
                  // ส่งข้อความไปยังผู้ปกครองทุกคน
                  for (const parent of validParentLinks) {
                    try {
                      await lineClient.pushMessage(parent.line_user_id, lineMessage);
                      const parentName = parent.parents?.parent_name || parent.line_display_id || 'Unknown Parent';
                      notificationResults.push({
                        lineUserId: parent.line_user_id,
                        parentId: parent.parent_id,
                        parentName: parentName,
                        type: 'parent',
                        status: 'success'
                      });
                      console.log(`✅ Driver status notification sent to parent ${parentName} (${parent.line_user_id})`);
                    } catch (error) {
                      const parentName = parent.parents?.parent_name || parent.line_display_id || 'Unknown Parent';
                      console.error(`❌ Failed to send to parent ${parentName}:`, error);
                      notificationResults.push({
                        lineUserId: parent.line_user_id,
                        parentId: parent.parent_id,
                        parentName: parentName,
                        type: 'parent',
                        status: 'failed',
                        error: error.message
                      });
                    }
                  }
                } else {
                  console.log('No parent LINE links found');
                }
              }
            }
          }
        }
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