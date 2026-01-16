import { supabase } from './db.js';

/**
 * ฟังก์ชันสำหรับจับคู่ LINE Display ID กับ LINE User ID จริง
 * เมื่อผู้ใช้ส่งข้อความมาที่ Bot ครั้งแรก
 * @param {string} lineUserId - LINE User ID จริง (U + 32 ตัวอักษร)
 * @param {string} lineDisplayId - LINE Display ID ที่ผู้ใช้ตั้งเอง
 * @returns {Object} ผลการจับคู่
 */
export async function matchLineIds(lineUserId, lineDisplayId) {
  try {
    console.log(`Attempting to match LINE IDs: User ID: ${lineUserId}, Display ID: ${lineDisplayId}`);

    // ตรวจสอบรูปแบบ LINE User ID
    const lineUserIdPattern = /^U[a-f0-9]{32}$/i;
    if (!lineUserIdPattern.test(lineUserId)) {
      return {
        success: false,
        message: 'รูปแบบ LINE User ID ไม่ถูกต้อง'
      };
    }

    // ค้นหาใน student_line_links ด้วย line_display_id
    const { data: studentData, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        *,
        students (
          student_name,
          student_code,
          class
        )
      `)
      .eq('line_display_id', lineDisplayId)
      .eq('active', true)
      .single();

    if (studentData && !studentError) {
      // พบข้อมูลนักเรียน ให้อัปเดต line_user_id
      const { error: updateError } = await supabase
        .from('student_line_links')
        .update({
          line_user_id: lineUserId,
          linked_at: new Date().toISOString()
        })
        .eq('line_display_id', lineDisplayId)
        .eq('active', true);

      if (updateError) {
        console.error('Error updating student LINE User ID:', updateError);
        return {
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดต LINE User ID'
        };
      }

      return {
        success: true,
        userType: 'student',
        userData: studentData.students,
        message: `จับคู่ LINE ID สำเร็จ - นักเรียน: ${studentData.students?.student_name}`
      };
    }

    // ค้นหาใน parent_line_links ด้วย line_display_id
    const { data: parentData, error: parentError } = await supabase
      .from('parent_line_links')
      .select(`
        *,
        parents (
          parent_name,
          phone_number
        ),
        students (
          student_name,
          student_code,
          class
        )
      `)
      .eq('line_display_id', lineDisplayId)
      .eq('active', true)
      .single();

    if (parentData && !parentError) {
      // พบข้อมูลผู้ปกครอง ให้อัปเดต line_user_id
      const { error: updateError } = await supabase
        .from('parent_line_links')
        .update({
          line_user_id: lineUserId,
          linked_at: new Date().toISOString()
        })
        .eq('line_display_id', lineDisplayId)
        .eq('active', true);

      if (updateError) {
        console.error('Error updating parent LINE User ID:', updateError);
        return {
          success: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดต LINE User ID'
        };
      }

      return {
        success: true,
        userType: 'parent',
        userData: {
          parent: parentData.parents,
          student: parentData.students
        },
        message: `จับคู่ LINE ID สำเร็จ - ผู้ปกครอง: ${parentData.parents?.parent_name}`
      };
    }

    // ไม่พบข้อมูลในทั้งสองตาราง
    return {
      success: false,
      message: 'ไม่พบข้อมูล LINE Display ID ในระบบ'
    };

  } catch (error) {
    console.error('Error matching LINE IDs:', error);
    return {
      success: false,
      message: 'เกิดข้อผิดพลาดในการจับคู่ LINE ID'
    };
  }
}

/**
 * ตรวจสอบว่า LINE User ID ถูกจับคู่แล้วหรือไม่
 * @param {string} lineUserId - LINE User ID จริง
 * @returns {Object} ผลการตรวจสอบ
 */
export async function checkLineUserIdExists(lineUserId) {
  try {
    // ตรวจสอบใน student_line_links
    const { data: studentData, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        *,
        students (
          student_name,
          student_code,
          class
        )
      `)
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (studentData && !studentError) {
      return {
        exists: true,
        userType: 'student',
        userData: studentData.students
      };
    }

    // ตรวจสอบใน parent_line_links
    const { data: parentData, error: parentError } = await supabase
      .from('parent_line_links')
      .select(`
        *,
        parents (
          parent_name,
          phone_number
        ),
        students (
          student_name,
          student_code,
          class
        )
      `)
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (parentData && !parentError) {
      return {
        exists: true,
        userType: 'parent',
        userData: {
          parent: parentData.parents,
          student: parentData.students
        }
      };
    }

    return {
      exists: false,
      message: 'ไม่พบข้อมูล LINE User ID ในระบบ'
    };

  } catch (error) {
    console.error('Error checking LINE User ID:', error);
    return {
      exists: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ LINE User ID'
    };
  }
}

/**
 * ดึงข้อมูลผู้ใช้จาก LINE Display ID
 * @param {string} lineDisplayId - LINE Display ID ที่ผู้ใช้ตั้งเอง
 * @returns {Object} ข้อมูลผู้ใช้
 */
export async function getUserByLineDisplayId(lineDisplayId) {
  try {
    // ค้นหาใน student_line_links
    const { data: studentData, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        *,
        students (
          student_name,
          student_code,
          class
        )
      `)
      .eq('line_display_id', lineDisplayId)
      .eq('active', true)
      .single();

    if (studentData && !studentError) {
      return {
        found: true,
        userType: 'student',
        userData: studentData.students,
        linkData: studentData
      };
    }

    // ค้นหาใน parent_line_links
    const { data: parentData, error: parentError } = await supabase
      .from('parent_line_links')
      .select(`
        *,
        parents (
          parent_name,
          phone_number
        ),
        students (
          student_name,
          student_code,
          class
        )
      `)
      .eq('line_display_id', lineDisplayId)
      .eq('active', true)
      .single();

    if (parentData && !parentError) {
      return {
        found: true,
        userType: 'parent',
        userData: {
          parent: parentData.parents,
          student: parentData.students
        },
        linkData: parentData
      };
    }

    return {
      found: false,
      message: 'ไม่พบข้อมูล LINE Display ID ในระบบ'
    };

  } catch (error) {
    console.error('Error getting user by LINE Display ID:', error);
    return {
      found: false,
      message: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล'
    };
  }
}