import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // ตั้งค่า CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { linkCode, lineUserId } = req.body;

    if (!linkCode || !lineUserId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing linkCode or lineUserId' 
      });
    }

    console.log(`🔗 Verifying link code: ${linkCode} for LINE User: ${lineUserId}`);

    // ตรวจสอบรูปแบบ LINE User ID
    const lineIdPattern = /^U[a-f0-9]{32}$/i;
    if (!lineIdPattern.test(lineUserId)) {
      return res.status(400).json({
        success: false,
        error: 'รูปแบบ LINE User ID ไม่ถูกต้อง'
      });
    }

    // ค้นหา link code ในตาราง student_link_tokens
    const { data: studentToken, error: studentError } = await supabase
      .from('student_link_tokens')
      .select(`
        *,
        students (
          student_id,
          student_name,
          grade,
          parent_id
        )
      `)
      .eq('token', linkCode)
      .is('used_at', null)
      .single();

    if (studentToken && !studentError) {
      // พบ token ของนักเรียน
      const student = studentToken.students;
      
      // อัปเดต student_line_links
      const { error: updateStudentError } = await supabase
        .from('student_line_links')
        .upsert({
          student_id: student.student_id,
          line_user_id: lineUserId,
          line_display_id: `student_${student.student_id}`,
          active: true,
          linked_at: new Date().toISOString()
        }, {
          onConflict: 'student_id'
        });

      if (updateStudentError) {
        console.error('Error updating student line link:', updateStudentError);
        return res.status(500).json({
          success: false,
          error: 'เกิดข้อผิดพลาดในการเชื่อมโยงบัญชีนักเรียน'
        });
      }

      // อัปเดต parent_line_links ถ้ามี parent_id
      if (student.parent_id) {
        const { error: updateParentError } = await supabase
          .from('parent_line_links')
          .upsert({
            parent_id: student.parent_id,
            student_id: student.student_id,
            line_user_id: lineUserId,
            line_display_id: `parent_${student.parent_id}`,
            active: true,
            linked_at: new Date().toISOString()
          }, {
            onConflict: 'parent_id,student_id'
          });

        if (updateParentError) {
          console.error('Error updating parent line link:', updateParentError);
          // ไม่ return error เพราะ student link สำเร็จแล้ว
        }
      }

      // ทำเครื่องหมายว่า token ถูกใช้แล้ว
      await supabase
        .from('student_link_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', linkCode);

      return res.status(200).json({
        success: true,
        message: `✅ เชื่อมโยงบัญชีสำเร็จ!\nนักเรียน: ${student.student_name}\nชั้น: ${student.grade}`,
        userType: 'student',
        userData: {
          student_id: student.student_id,
          student_name: student.student_name,
          grade: student.grade
        }
      });
    }

    // ค้นหา link code ในตาราง parent_link_tokens
    const { data: parentToken, error: parentError } = await supabase
      .from('parent_link_tokens')
      .select(`
        *,
        parents (
          parent_id,
          parent_name,
          phone_number
        ),
        students (
          student_id,
          student_name,
          grade
        )
      `)
      .eq('token', linkCode)
      .is('used_at', null)
      .single();

    if (parentToken && !parentError) {
      // พบ token ของผู้ปกครอง
      const parent = parentToken.parents;
      const student = parentToken.students;

      // อัปเดต parent_line_links
      const { error: updateParentError } = await supabase
        .from('parent_line_links')
        .upsert({
          parent_id: parent.parent_id,
          student_id: student.student_id,
          line_user_id: lineUserId,
          line_display_id: `parent_${parent.parent_id}`,
          active: true,
          linked_at: new Date().toISOString()
        }, {
          onConflict: 'parent_id,student_id'
        });

      if (updateParentError) {
        console.error('Error updating parent line link:', updateParentError);
        return res.status(500).json({
          success: false,
          error: 'เกิดข้อผิดพลาดในการเชื่อมโยงบัญชีผู้ปกครอง'
        });
      }

      // ทำเครื่องหมายว่า token ถูกใช้แล้ว
      await supabase
        .from('parent_link_tokens')
        .update({ used_at: new Date().toISOString() })
        .eq('token', linkCode);

      return res.status(200).json({
        success: true,
        message: `✅ เชื่อมโยงบัญชีสำเร็จ!\nผู้ปกครอง: ${parent.parent_name}\nนักเรียน: ${student.student_name} ชั้น ${student.grade}`,
        userType: 'parent',
        userData: {
          parent_id: parent.parent_id,
          parent_name: parent.parent_name,
          student_id: student.student_id,
          student_name: student.student_name,
          grade: student.grade
        }
      });
    }

    // ไม่พบ link code ที่ถูกต้อง
    return res.status(404).json({
      success: false,
      error: 'ไม่พบรหัสเชื่อมโยงที่ระบุ หรือรหัสถูกใช้งานแล้ว'
    });

  } catch (error) {
    console.error('Error in verify-link-code:', error);
    return res.status(500).json({
      success: false,
      error: 'เกิดข้อผิดพลาดภายในระบบ'
    });
  }
}