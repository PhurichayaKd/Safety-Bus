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
console.log('Supabase URL exists:', !!process.env.SUPABASE_URL);
console.log('Supabase Key exists:', !!process.env.SUPABASE_ANON_KEY);

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
  
  // Parse JSON body if it's a string
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return res.status(400).json({ ok: false, error: 'Invalid JSON format' });
    }
  }
  
  const { action, studentInfo, leaveDates, userId, source } = body;
  
  console.log('=== Submit Leave API Called ===');
  console.log('Request body:', JSON.stringify(body, null, 2));
  console.log('Action:', action);
  console.log('StudentInfo:', studentInfo);
  console.log('LeaveDates:', leaveDates);
  console.log('UserId:', userId);
  console.log('Source:', source);
  console.log('Supabase URL exists:', !!process.env.SUPABASE_URL);
  console.log('Supabase Key exists:', !!process.env.SUPABASE_ANON_KEY);
  
  // Handle different actions
  if (action === 'getStudentInfo') {
    try {
      const result = await getStudentByLineId(userId);
      return res.json(result);
    } catch (error) {
      console.error('Error getting student info:', error);
      return res.status(500).json({ ok: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน' });
    }
  }
  
  if (action !== 'submitLeave') {
    return res.status(400).json({ ok: false, error: 'Invalid action' });
  }
  
  if (!studentInfo || !leaveDates || !Array.isArray(leaveDates)) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  
  // Parse studentInfo if it's a string
  let parsedStudentInfo = studentInfo;
  if (typeof studentInfo === 'string') {
    try {
      parsedStudentInfo = JSON.parse(studentInfo);
    } catch (error) {
      console.error('Error parsing studentInfo:', error);
      return res.status(400).json({ ok: false, error: 'Invalid studentInfo format' });
    }
  }
  
  // Handle different field names from LIFF form
  const studentId = parsedStudentInfo.student_id || parsedStudentInfo.id;
  const studentName = parsedStudentInfo.student_name || parsedStudentInfo.name;
  
  console.log('Parsed student info:', parsedStudentInfo);
  console.log('Extracted studentId:', studentId);
  console.log('Extracted studentName:', studentName);
  
  if (!studentId || !studentName) {
    console.error('Missing student ID or name:', { studentId, studentName, parsedStudentInfo });
    return res.status(400).json({ ok: false, error: 'ข้อมูลนักเรียนไม่ครบถ้วน' });
  }
  
  console.log('Processing leave request:', { studentId, studentName, leaveDates });
  console.log('Supabase client initialized:', !!supabase);
  console.log('Environment check - URL:', process.env.SUPABASE_URL ? 'exists' : 'missing');
  console.log('Environment check - Key:', process.env.SUPABASE_ANON_KEY ? 'exists' : 'missing');
  
  try {
    console.log('Starting database insertion...');
    
    // บันทึก leaveDates (array) ลง supabase
    const insertPromises = leaveDates.map(async (date) => {
      console.log(`Attempting to insert leave request for date: ${date}`);
      
      const insertData = {
        student_id: parseInt(studentId),
        leave_date: date,
        leave_type: 'personal',
        status: 'approved',
        created_at: new Date().toISOString()
      };
      
      console.log('Insert data:', insertData);
      
      const { data, error } = await supabase.from('leave_requests').insert(insertData).select();
      
      if (error) {
        console.error('Supabase insert error for date', date, ':', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('Successfully inserted leave request for date', date, ':', data);
      return data;
    });
    
    const results = await Promise.all(insertPromises);
    console.log('All leave requests inserted successfully. Results:', results);
    
    // ส่ง push message กลับ LINE เฉพาะเมื่อมาจาก LINE Bot
    if (source !== 'direct' && userId) {
      // ดึงข้อมูล link_code จาก studentInfo
      const linkCode = studentInfo?.link_code || studentId;
      
      await sendLineMessage(userId, {
        type: 'text',
        text: `รายละเอียดข้อมูลที่ทำรายการแจ้งลา\n\nชื่อนักเรียน: ${studentName}\nรหัสนักเรียน: ${linkCode}\nวันที่ลา: ${leaveDates.join(', ')}\nไม่ประสงค์ใช้บริการรับส่งในวันดังกล่าว\n\nข้อมูลได้ส่งบันทึกแล้วเรียบร้อย`
      });
    }
    
    res.status(200).json({ 
      ok: true, 
      message: 'แจ้งลาสำเร็จ',
      data: {
        studentName,
        studentId,
        leaveDates,
        leave_type: 'personal'
      }
    });
  } catch (error) {
    console.error('Error submitting leave request:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    
    // ส่ง error message ที่ละเอียดมากขึ้น
    let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
    
    if (error.message) {
      if (error.message.includes('connection')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง';
      } else if (error.message.includes('permission')) {
        errorMessage = 'ไม่มีสิทธิ์เข้าถึงฐานข้อมูล';
      } else {
        errorMessage = `เกิดข้อผิดพลาด: ${error.message}`;
      }
    }
    
    res.status(500).json({ 
      ok: false, 
      error: errorMessage,
      debug: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        details: error.details
      } : undefined
    });
  }
}