// Vercel Function for handling leave requests
import dotenv from 'dotenv';

// Load .env.local for development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new Client(config);

// Supabase configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Helper function to format Thai date
function formatThaiDate(dateString) {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const date = new Date(dateString);
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // Convert to Buddhist Era
  
  return `${day} ${month} ${year}`;
}

// Helper function to get student data by LINE ID
async function getStudentByLineId(lineUserId) {
  try {
    // ตรวจสอบการเชื่อมโยงจากตาราง parent_line_links
    const { data: parentLink, error: parentError } = await supabase
      .from('parent_line_links')
      .select('parent_id')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (parentLink && !parentError) {
      // หาข้อมูลนักเรียนจาก students table โดยตรง
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('student_id, student_name, grade, link_code')
        .eq('parent_id', parentLink.parent_id)
        .single();
      
      if (student && !studentError) {
        return {
          type: 'parent',
          student: {
            student_id: student.student_id,
            link_code: student.link_code,
            student_name: student.student_name,
            name: student.student_name,
            class: student.grade
          },
          parent_id: parentLink.parent_id
        };
      }
    }

    // ตรวจสอบการเชื่อมโยงจากตาราง student_line_links
    const { data: studentLink, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        student_id,
        students (
          student_id,
          student_name,
          grade,
          link_code
        )
      `)
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (studentLink && studentLink.students && !studentError) {
      const student = studentLink.students;
      return {
        type: 'student',
        student: {
          student_id: student.student_id,
          link_code: student.link_code,
          student_name: student.student_name,
          name: student.student_name,
          class: student.grade
        }
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting student data:', error);
    return null;
  }
}

// Send message to user via LINE
async function sendLineMessage(userId, message) {
  try {
    await client.pushMessage(userId, message);
  } catch (error) {
    console.error('Error sending LINE message:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { studentId, studentName, leaveDates, reason, userId, source } = req.body;
  
  try {
    // บันทึก leaveDates (array) ลง supabase
    for (const date of leaveDates) {
      await supabase.from('leave_requests').insert({
        student_id: studentId,
        leave_date: date,
        reason,
        status: 'approved',
        created_at: new Date().toISOString()
      });
    }
    
    // ส่ง push message กลับ LINE เฉพาะเมื่อมาจาก LINE Bot
    if (source !== 'direct' && userId) {
      await sendLineMessage(userId, {
        type: 'text',
        text: `✅ แจ้งลาสำเร็จ\n\nนักเรียน: ${studentName}\nรหัส: ${studentId}\nวันที่ลา: ${leaveDates.join(', ')}\nไม่ประสงค์ขึ้นรถรับ-ส่ง ในวันดังกล่าว\nระบบได้ส่งข้อมูลการแจ้งลาเรียบร้อยแล้ว`
      });
    }
    
    res.status(200).json({ 
      ok: true, 
      message: 'แจ้งลาสำเร็จ',
      data: {
        studentName,
        studentId,
        leaveDates,
        reason
      }
    });
  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล' 
    });
  }
}