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
    const { linkCode, lineUserId } = req.body;

    // ตรวจสอบข้อมูลที่จำเป็น
    if (!linkCode || !lineUserId) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน กรุณาระบุรหัสเชื่อมโยงและ LINE User ID'
      });
    }

    const supabase = createSupabaseClient();

    // ตรวจสอบรหัสเชื่อมโยงในตาราง student_link_tokens และ parent_link_tokens
    let tokenData = null;
    let userType = null;

    // ค้นหาในตาราง student_link_tokens ก่อน
    const { data: studentToken, error: studentError } = await supabase
      .from('student_link_tokens')
      .select('*, students(student_name)')
      .eq('token', linkCode.toUpperCase())
      .is('used_at', null)
      .single();

    if (studentToken && !studentError) {
      tokenData = studentToken;
      userType = 'student';
    } else {
      // ถ้าไม่พบในตาราง student ให้ค้นหาในตาราง parent
      const { data: parentToken, error: parentError } = await supabase
        .from('parent_link_tokens')
        .select('*, parents(parent_name)')
        .eq('token', linkCode.toUpperCase())
        .is('used_at', null)
        .single();

      if (parentToken && !parentError) {
        tokenData = parentToken;
        userType = 'parent';
      }
    }

    if (!tokenData) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบรหัสเชื่อมโยงหรือรหัสถูกใช้งานแล้ว'
      });
    }

    // ตรวจสอบว่ารหัสหมดอายุหรือไม่
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now > expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'รหัสเชื่อมโยงหมดอายุแล้ว กรุณาขอรหัสใหม่'
      });
    }

    // ตรวจสอบว่า LINE User ID นี้ถูกใช้งานแล้วหรือไม่
    const { data: existingStudent, error: existingStudentError } = await supabase
      .from('student_line_links')
      .select('student_id')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    const { data: existingParent, error: existingParentError } = await supabase
      .from('parent_line_links')
      .select('parent_id')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if ((existingStudent && !existingStudentError) || (existingParent && !existingParentError)) {
      return res.status(400).json({
        success: false,
        message: 'LINE ID นี้ถูกเชื่อมโยงกับบัญชีอื่นแล้ว'
      });
    }

    // อัปเดตหรือสร้างข้อมูลการเชื่อมโยง LINE
    let updateResult;
    
    if (userType === 'student') {
      // ตรวจสอบว่ามีข้อมูลในตาราง student_line_links หรือไม่
      const { data: existingLink } = await supabase
        .from('student_line_links')
        .select('id')
        .eq('student_id', tokenData.student_id)
        .single();

      if (existingLink) {
        // อัปเดตข้อมูลที่มีอยู่
        const { data, error } = await supabase
          .from('student_line_links')
          .update({
            line_user_id: lineUserId,
            active: true,
            linked_at: new Date().toISOString()
          })
          .eq('student_id', tokenData.student_id)
          .select();
        
        updateResult = { data, error };
      } else {
        // สร้างข้อมูลใหม่
        const { data, error } = await supabase
          .from('student_line_links')
          .insert({
            student_id: tokenData.student_id,
            line_user_id: lineUserId,
            active: true,
            linked_at: new Date().toISOString()
          })
          .select();
        
        updateResult = { data, error };
      }
    } else if (userType === 'parent') {
      // ตรวจสอบว่ามีข้อมูลในตาราง parent_line_links หรือไม่
      const { data: existingLink } = await supabase
        .from('parent_line_links')
        .select('id')
        .eq('parent_id', tokenData.parent_id)
        .single();

      if (existingLink) {
        // อัปเดตข้อมูลที่มีอยู่
        const { data, error } = await supabase
          .from('parent_line_links')
          .update({
            line_user_id: lineUserId,
            active: true,
            linked_at: new Date().toISOString()
          })
          .eq('parent_id', tokenData.parent_id)
          .select();
        
        updateResult = { data, error };
      } else {
        // สร้างข้อมูลใหม่
        const { data, error } = await supabase
          .from('parent_line_links')
          .insert({
            parent_id: tokenData.parent_id,
            line_user_id: lineUserId,
            active: true,
            linked_at: new Date().toISOString()
          })
          .select();
        
        updateResult = { data, error };
      }
    }

    if (updateResult.error) {
      console.error('Error updating LINE link:', updateResult.error);
      return res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลการเชื่อมโยง'
      });
    }

    // ทำเครื่องหมายว่ารหัสถูกใช้งานแล้ว
    const tableName = userType === 'student' ? 'student_link_tokens' : 'parent_link_tokens';
    const { error: markUsedError } = await supabase
      .from(tableName)
      .update({
        used_at: new Date().toISOString(),
        used_by_line_user_id: lineUserId
      })
      .eq('token', linkCode.toUpperCase());

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError);
    }

    // ส่งข้อมูลกลับ
    const userName = userType === 'student' 
      ? tokenData.students?.student_name 
      : tokenData.parents?.parent_name;
    
    const userId = userType === 'student' 
      ? tokenData.student_id 
      : tokenData.parent_id;

    return res.status(200).json({
      success: true,
      message: 'เชื่อมโยง LINE ID สำเร็จ!',
      userType: userType,
      userData: {
        name: userName,
        id: userId
      },
      linkedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in verify-link-code:', error);
    return res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง'
    });
  }
}