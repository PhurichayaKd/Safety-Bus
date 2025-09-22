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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { userId, selectedDates, action } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Handle different actions
    if (action === 'getStudentInfo') {
      const studentData = await getStudentByLineId(userId);
      
      if (!studentData) {
        return res.status(404).json({ 
          error: 'ไม่พบข้อมูลบัญชีที่ผูกไว้',
          message: 'กรุณาผูกบัญชีด้วยรหัสนักเรียนก่อน'
        });
      }

      return res.status(200).json({
        success: true,
        studentData: studentData
      });
    }
    
    if (action === 'submitLeave') {
      if (!selectedDates || !Array.isArray(selectedDates) || selectedDates.length === 0) {
        return res.status(400).json({ error: 'Missing selectedDates' });
      }

      if (selectedDates.length > 3) {
        return res.status(400).json({ error: 'สามารถเลือกวันลาได้สูงสุด 3 วันเท่านั้น' });
      }

      // Get student data
      const studentData = await getStudentByLineId(userId);
      
      if (!studentData) {
        return res.status(404).json({ 
          error: 'ไม่พบข้อมูลบัญชีที่ผูกไว้',
          message: 'กรุณาผูกบัญชีด้วยรหัสนักเรียนก่อน'
        });
      }

      const student = studentData.student;
      const leaveRecords = [];

      // บันทึกข้อมูลการลาแต่ละวัน
      for (const dateStr of selectedDates) {
        try {
          // ตรวจสอบว่ามีการลาในวันนี้แล้วหรือไม่
          const { data: existingLeave } = await supabase
            .from('absences')
            .select('*')
            .eq('student_id', student.student_id)
            .eq('start_date', dateStr)
            .single();

          if (existingLeave) {
            continue; // ข้ามวันที่มีการลาแล้ว
          }

          // บันทึกข้อมูลการลา
          const { data: leave, error } = await supabase
            .from('absences')
            .insert({
              student_id: student.student_id,
              absence_type: 'bus_skip',
              start_date: dateStr,
              end_date: dateStr,
              reason: 'ไม่ประสงค์ขึ้นรถบัสรับ-ส่งในวันดังกล่าว',
              status: 'approved',
              created_by: studentData.parent_id || student.student_id,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!error && leave) {
            leaveRecords.push({
              date: dateStr,
              thaiDate: formatThaiDate(dateStr),
              id: leave.id
            });
          }
        } catch (err) {
          console.error(`Error saving leave for date ${dateStr}:`, err);
        }
      }

      if (leaveRecords.length === 0) {
        return res.status(400).json({ 
          error: 'ไม่สามารถบันทึกข้อมูลการลาได้',
          message: 'อาจมีการลาในวันที่เลือกแล้ว'
        });
      }

      // สร้างข้อความยืนยัน
      const dateList = leaveRecords.map(record => `📅 ${record.thaiDate}`).join('\n');
      const message = {
        type: 'text',
        text: `✅ บันทึกการแจ้งลาเรียบร้อยแล้ว\n\n👤 นักเรียน: ${student.student_name}\n🆔 รหัส: ${student.link_code}\n\n${dateList}\n\n📝 เหตุผล: ไม่ประสงค์ขึ้นรถบัสรับ-ส่ง\n⏰ เวลาที่แจ้ง: ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
      };
      
      // Send message to user
      await client.pushMessage(userId, message);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Leave request submitted successfully',
        leaveRecords: leaveRecords,
        student: student
      });
    }

    return res.status(400).json({ error: 'Invalid action' });
    
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}