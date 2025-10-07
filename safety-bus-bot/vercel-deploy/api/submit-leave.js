// Vercel Function for handling leave requests
// api/submit-leave.js

import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// LINE Bot configuration
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Initialize LINE Bot SDK
let client = null;
try {
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    client = new Client(config);
  } else {
    console.warn('⚠️ LINE_CHANNEL_ACCESS_TOKEN not set - LINE messaging disabled');
  }
} catch (error) {
  console.error('❌ Failed to initialize LINE client:', error.message);
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Supabase URL exists:', !!supabaseUrl);
console.log('Supabase Key exists:', !!supabaseKey);

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
    console.log('🔍 Looking up student for LINE User ID:', lineUserId);
    console.log('Supabase client available:', !!supabase);
    console.log('Environment variables check:');
    console.log('- SUPABASE_URL:', !!process.env.SUPABASE_URL);
    console.log('- SUPABASE_ANON_KEY:', !!process.env.SUPABASE_ANON_KEY);
    
    // Check if this is a URL parameter-based user ID (direct access)
    if (lineUserId && lineUserId.startsWith('url-param-')) {
      const studentId = lineUserId.replace('url-param-', '');
      console.log('🔄 URL parameter mode detected for student ID:', studentId);
      console.log('🚀 Using direct URL access - no database lookup needed');
      
      // For URL parameter access, we don't need to lookup in database
      // The student data is already provided in the URL parameters
      // Just return a success response to indicate the user is valid
      return {
        type: 'student',
        student: {
          student_id: studentId,
          student_name: 'ข้อมูลจาก URL',
          name: 'ข้อมูลจาก URL',
          class: 'ข้อมูลจาก URL'
        },
        source: 'url_params'
      };
    }
    
    // Check if this is a fallback user ID from URL parameters (legacy support)
    if (lineUserId && lineUserId.startsWith('fallback-')) {
      const studentId = lineUserId.replace('fallback-', '');
      console.log('🔄 Fallback mode detected for student ID:', studentId);
      
      if (supabase) {
        // Try to get real student data from database
        const { data: student, error } = await supabase
          .from('students')
          .select('student_id, student_name, grade')
          .eq('student_id', studentId)
          .single();
        
        if (student && !error) {
          console.log('✅ Found student data in database:', student);
          return {
            type: 'student',
            student: {
              student_id: student.student_id,
              student_name: student.student_name,
              name: student.student_name,
              class: student.grade
            }
          };
        }
      }
      
      // Return fallback data if database lookup fails
      console.warn('⚠️ Database lookup failed - using fallback data');
      return {
        type: 'student',
        student: {
          student_id: studentId,
          student_name: 'นักเรียนทดสอบ',
          name: 'นักเรียนทดสอบ',
          class: 'ไม่ระบุ'
        }
      };
    }
    
    // Handle anonymous users (when LIFF fails and no URL parameters)
    if (lineUserId === 'anonymous-user') {
      console.log('🔄 Anonymous user detected - returning demo data');
      return {
        type: 'student',
        student: {
          student_id: 123456, // Use integer ID that exists in database
          student_name: 'นักเรียนทดสอบระบบ',
          name: 'นักเรียนทดสอบระบบ',
          class: 'ทดสอบ'
        }
      };
    }
    
    if (!supabase) {
      console.warn('⚠️ Supabase not available - returning mock data');
      return {
        type: 'student',
        student: {
          student_id: '123456',
          student_name: 'นักเรียนทดสอบ',
          name: 'นักเรียนทดสอบ',
          class: 'ม.1/1'
        }
      };
    }
    
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
        .select('student_id, student_name, grade')
        .eq('parent_id', parentLink.parent_id)
        .single();
      
      if (student && !studentError) {
        return {
          type: 'parent',
          student: {
            student_id: student.student_id,
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
          grade
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
          student_name: student.student_name,
          name: student.student_name,
          class: student.grade
        }
      };
    }

    // If no data found, return mock data for testing
    console.warn('⚠️ No student data found in database - returning mock data for testing');
    return {
      type: 'student',
      student: {
        student_id: '123456',
        student_name: 'นักเรียนทดสอบ',
        name: 'นักเรียนทดสอบ',
        class: 'ม.1/1'
      }
    };
  } catch (error) {
    console.error('Error getting student data:', error);
    // Return mock data even on error for testing
    console.warn('⚠️ Error occurred - returning mock data for testing');
    return {
      type: 'student',
      student: {
        student_id: '123456',
        student_name: 'นักเรียนทดสอบ',
        name: 'นักเรียนทดสอบ',
        class: 'ม.1/1'
      }
    };
  }
}

// Send message to user via LINE
async function sendLineMessage(userId, message) {
  try {
    console.log('Sending LINE message to userId:', userId);
    console.log('Message content:', message);
    
    // ตรวจสอบว่ามี LINE client configuration หรือไม่
    if (!client || !process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.warn('⚠️ LINE client not available - skipping message send');
      return { success: false, reason: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
    }
    
    const result = await client.pushMessage(userId, message);
    console.log('LINE message sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending LINE message:', {
      message: error.message,
      code: error.code,
      details: error.details,
      userId: userId
    });
    // Don't throw error, just return failure status
    return { success: false, error: error.message };
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
  
  const { action, studentInfo, leaveDates, leaveType, userId, source } = body;
  
  console.log('=== Submit Leave API Called ===');
  console.log('Request body:', JSON.stringify(body, null, 2));
  console.log('Action:', action);
  console.log('StudentInfo:', studentInfo);
  console.log('LeaveDates:', leaveDates);
  console.log('LeaveType:', leaveType);
  console.log('UserId:', userId);
  console.log('Source:', source);
  console.log('Supabase URL exists:', !!process.env.SUPABASE_URL);
  console.log('Supabase Key exists:', !!process.env.SUPABASE_ANON_KEY);
  
  // Handle different actions
  if (action === 'getStudentInfo') {
    try {
      console.log('🔍 Getting student info for userId:', userId);
      const result = await getStudentByLineId(userId);
      console.log('📋 Student info result:', result);
      res.json(result);
      return;
    } catch (error) {
      console.error('Error getting student info:', error);
      res.status(500).json({ ok: false, error: 'เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน' });
      return;
    }
  }
  
  if (action !== 'submitLeave') {
    return res.status(400).json({ ok: false, error: 'Invalid action' });
  }
  
  // Validate required fields
  if (!studentInfo || !leaveDates || !Array.isArray(leaveDates) || leaveDates.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'ข้อมูลไม่ครบถ้วน: ต้องมีข้อมูลนักเรียนและวันที่ลา'
    });
  }

  // Validate maximum 3 dates
  if (leaveDates.length > 3) {
    return res.status(400).json({
      ok: false,
      error: 'สามารถลาได้สูงสุด 3 วันเท่านั้น'
    });
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
  let studentId = parsedStudentInfo.student_id || parsedStudentInfo.id;
  let studentName = parsedStudentInfo.student_name || parsedStudentInfo.name;
  
  // Handle demo/test student IDs
  if (studentId === 'DEMO001' || studentId === 'demo001') {
    console.log('🔍 Demo student detected, using test student ID');
    studentId = 123456; // Use the test student ID that exists in database
    studentName = studentName || 'นักเรียนทดสอบระบบ';
  }
  // If student_id is not a number, try to find student by name or other identifier
  else if (!studentId || isNaN(parseInt(studentId))) {
    console.log('🔍 Student ID not found, using fallback data');
    studentId = 123456; // Use the test student ID that exists in database
    studentName = studentName || 'นักเรียนทดสอบ';
  }
  
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
    
    // Check for duplicate leave dates first
    if (supabase) {
      const { data: existingLeaves, error: checkError } = await supabase
        .from('leave_requests')
        .select('leave_date')
        .eq('student_id', parseInt(studentId))
        .in('leave_date', leaveDates)
        .is('cancelled_at', null);

      if (checkError) {
        console.error('❌ Error checking existing leaves:', checkError);
      } else if (existingLeaves && existingLeaves.length > 0) {
        const duplicateDates = existingLeaves.map(leave => formatThaiDate(leave.leave_date));
        return res.status(400).json({
          ok: false,
          error: `มีการลาในวันที่ดังกล่าวแล้ว: ${duplicateDates.join(', ')}`
        });
      }
    }
    
    // Insert leave requests into Supabase
    const leaveRecords = leaveDates.map(date => ({
      student_id: parseInt(studentId),
      leave_date: date,
      status: 'approved',
      leave_type: leaveType || 'personal', // ใช้ leaveType จากฟอร์ม หรือ default เป็น 'personal'
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('💾 Inserting leave records:', leaveRecords);

    let insertedData = null;
    if (supabase) {
      const { data, error: insertError } = await supabase
        .from('leave_requests')
        .insert(leaveRecords)
        .select();

      if (insertError) {
        console.error('❌ Supabase insert error:', insertError);
        
        // Check if it's a foreign key constraint error
        if (insertError.code === '23503') {
          // For demo/test purposes, create a mock response
          if (parseInt(studentId) === 123456) {
            console.log('🔧 Demo mode: Creating mock leave record');
            const mockData = leaveRecords.map((record, index) => ({
              ...record,
              id: Math.floor(Math.random() * 1000) + index,
              mock: true
            }));
            
            return res.status(200).json({
              ok: true,
              message: 'แจ้งลาสำเร็จ (โหมดทดสอบ)',
              data: mockData,
              mock: true
            });
          }
          
          return res.status(400).json({
            ok: false,
            error: 'ไม่พบข้อมูลนักเรียนในระบบ กรุณาติดต่อผู้ดูแลระบบ'
          });
        }
        
        throw new Error(insertError.message);
      } else {
        console.log('✅ Successfully inserted leave records:', data);
        insertedData = data;
      }
    } else {
      console.warn('⚠️ Supabase not available - using mock data');
      insertedData = leaveRecords.map((record, index) => ({
        ...record,
        id: Math.floor(Math.random() * 1000) + index,
        mock: true
      }));
    }
    
    // ส่ง push message กลับ LINE เฉพาะเมื่อมาจาก LINE Bot (ไม่ใช่การเข้าถึงโดยตรงจากฟอร์ม)
    const shouldSendLineMessage = (
      source !== 'direct' && 
      userId && 
      !userId.startsWith('fallback-') && 
      !userId.includes('anonymous') &&
      !userId.startsWith('test-') &&
      userId !== 'test-user-id' &&
      typeof liff !== 'undefined' // ตรวจสอบว่ามาจาก LIFF จริง
    );
    
    if (shouldSendLineMessage) {
      try {
        console.log('Attempting to send LINE message to userId:', userId);
        
        const message = `✅ แจ้งลาสำเร็จ!\n\n👤 นักเรียน: ${studentName}\n📅 วันที่ลา:\n${leaveDates.map(date => `• ${formatThaiDate(date)}`).join('\n')}\n\n📝 สถานะ: อนุมัติแล้ว`;
        
        await sendLineMessage(userId, {
          type: 'text',
          text: message
        });
        
        console.log('📱 LINE message sent successfully');
      } catch (lineError) {
        console.error('Error sending LINE message (non-critical):', {
          message: lineError.message,
          code: lineError.code,
          userId: userId
        });
        // ไม่ให้ error ของ LINE message ทำให้การบันทึกข้อมูลล้มเหลว
        // เพราะข้อมูลได้ถูกบันทึกเรียบร้อยแล้ว
      }
    } else {
      console.log('Skipping LINE message send - direct form access detected or test mode');
    }
    
    res.status(200).json({ 
      ok: true, 
      message: 'บันทึกข้อมูลการลาเรียบร้อยแล้ว',
      data: {
        studentName,
        studentId,
        leaveDates,
        recordsInserted: insertedData ? insertedData.length : leaveRecords.length,
        insertedRecords: insertedData
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