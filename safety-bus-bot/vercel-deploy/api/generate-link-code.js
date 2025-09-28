import { createSupabaseClient } from '../lib/db.js';

export default async function handler(req, res) {
  // ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userType, studentId, parentId, linkCode } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!userType || (userType === 'student' && !studentId) || (userType === 'parent' && !parentId)) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน กรุณากรอกข้อมูลให้ครบ'
      });
    }

    const supabase = createSupabaseClient();

    // ตรวจสอบว่าข้อมูลผู้ใช้มีอยู่ในระบบหรือไม่
    let userData = null;
    let targetId = null;

    if (userType === 'student') {
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('student_id, student_name, parent_id')
        .eq('student_id', studentId)
        .single();

      if (studentError || !student) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลนักเรียนในระบบ กรุณาตรวจสอบรหัสนักเรียน'
        });
      }

      userData = student;
      targetId = student.student_id;

      // ตรวจสอบว่ามีการเชื่อมโยงอยู่แล้วหรือไม่
      const { data: existingLink } = await supabase
        .from('student_line_links')
        .select('line_user_id, active')
        .eq('student_id', studentId)
        .eq('active', true)
        .single();

      if (existingLink && existingLink.line_user_id) {
        return res.status(400).json({
          success: false,
          message: 'นักเรียนรายนี้ได้เชื่อมโยง LINE ID แล้ว'
        });
      }

    } else if (userType === 'parent') {
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('parent_id, parent_name, parent_phone')
        .eq('parent_id', parentId)
        .single();

      if (parentError || !parent) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบข้อมูลผู้ปกครองในระบบ กรุณาตรวจสอบรหัสผู้ปกครอง'
        });
      }

      userData = parent;
      targetId = parent.parent_id;

      // ตรวจสอบว่ามีการเชื่อมโยงอยู่แล้วหรือไม่
      const { data: existingLink } = await supabase
        .from('parent_line_links')
        .select('line_user_id, active')
        .eq('parent_id', parentId)
        .eq('active', true)
        .single();

      if (existingLink && existingLink.line_user_id) {
        return res.status(400).json({
          success: false,
          message: 'ผู้ปกครองรายนี้ได้เชื่อมโยง LINE ID แล้ว'
        });
      }
    }

    // สร้างรหัสเชื่อมโยงแบบสุ่ม
    const generatedLinkCode = generateRandomCode();

    // บันทึกรหัสเชื่อมโยงลงในตารางที่เหมาะสม
    let tokenError = null;
    
    if (userType === 'student') {
      const { error } = await supabase
        .from('student_link_tokens')
        .insert({
          token: generatedLinkCode,
          student_id: targetId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // หมดอายุใน 24 ชั่วโมง
          created_at: new Date().toISOString()
        });
      tokenError = error;
    } else if (userType === 'parent') {
      const { error } = await supabase
        .from('parent_link_tokens')
        .insert({
          token: generatedLinkCode,
          parent_id: targetId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // หมดอายุใน 24 ชั่วโมง
          created_at: new Date().toISOString()
        });
      tokenError = error;
    }

    if (tokenError) {
      console.error('Error creating link token:', tokenError);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการสร้างรหัสเชื่อมโยง'
      });
    }

    // ส่งผลลัพธ์กลับ
    return res.status(200).json({
      success: true,
      linkCode: generatedLinkCode,
      userType: userType,
      userData: {
        name: userData.student_name || userData.parent_name,
        id: targetId
      },
      expiresIn: '24 ชั่วโมง',
      message: 'สร้างรหัสเชื่อมโยงสำเร็จ กรุณาส่งรหัสไปยัง LINE Bot เพื่อเชื่อมโยงบัญชี'
    });

  } catch (error) {
    console.error('Error in generate-link-code:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง'
    });
  }
}

// ฟังก์ชันสร้างรหัสสุ่ม
function generateRandomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}