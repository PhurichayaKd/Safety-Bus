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
 * ตรวจสอบและพยายามจับคู่ LINE User ID อัตโนมัติ
 * สำหรับผู้ใช้ที่มี line_display_id แต่ไม่มี line_user_id
 * @param {string} lineUserId - LINE User ID จริง
 * @returns {Object} ผลการตรวจสอบและจับคู่
 */
export async function checkAndAutoMatchLineId(lineUserId) {
  try {
    // ตรวจสอบการเชื่อมโยงปกติก่อน
    const existingLink = await checkLineUserIdExists(lineUserId);
    if (existingLink.exists) {
      return existingLink;
    }

    console.log(`🔍 ไม่พบ LINE User ID: ${lineUserId} ในระบบ, พยายามจับคู่อัตโนมัติ...`);

    // ค้นหาใน student_line_links ที่มี line_display_id แต่ไม่มี line_user_id
    const { data: incompleteStudents, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        *,
        students (
          student_name,
          student_code,
          class
        )
      `)
      .eq('active', true)
      .not('line_display_id', 'is', null)
      .is('line_user_id', null);

    if (!studentError && incompleteStudents && incompleteStudents.length > 0) {
      console.log(`📊 พบ ${incompleteStudents.length} รายการ student ที่ยังไม่ได้จับคู่`);
      
      // ถ้ามีเพียงรายการเดียว ให้จับคู่อัตโนมัติ
      if (incompleteStudents.length === 1) {
        const student = incompleteStudents[0];
        console.log(`🔄 จับคู่อัตโนมัติ: Student ID ${student.student_id} กับ LINE User ID ${lineUserId}`);
        
        const { error: updateError } = await supabase
          .from('student_line_links')
          .update({
            line_user_id: lineUserId,
            linked_at: new Date().toISOString()
          })
          .eq('id', student.id);

        if (!updateError) {
          return {
            exists: true,
            userType: 'student',
            userData: student.students,
            autoMatched: true,
            message: `จับคู่อัตโนมัติสำเร็จ - นักเรียน: ${student.students?.student_name}`
          };
        }
      }
    }

    // ค้นหาใน parent_line_links ที่มี line_display_id แต่ไม่มี line_user_id
    const { data: incompleteParents, error: parentError } = await supabase
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
      .eq('active', true)
      .not('line_display_id', 'is', null)
      .is('line_user_id', null);

    if (!parentError && incompleteParents && incompleteParents.length > 0) {
      console.log(`📊 พบ ${incompleteParents.length} รายการ parent ที่ยังไม่ได้จับคู่`);
      
      // ถ้ามีเพียงรายการเดียว ให้จับคู่อัตโนมัติ
      if (incompleteParents.length === 1) {
        const parent = incompleteParents[0];
        console.log(`🔄 จับคู่อัตโนมัติ: Parent ID ${parent.parent_id} กับ LINE User ID ${lineUserId}`);
        
        const { error: updateError } = await supabase
          .from('parent_line_links')
          .update({
            line_user_id: lineUserId,
            linked_at: new Date().toISOString()
          })
          .eq('id', parent.id);

        if (!updateError) {
          return {
            exists: true,
            userType: 'parent',
            userData: {
              parent: parent.parents,
              student: parent.students
            },
            autoMatched: true,
            message: `จับคู่อัตโนมัติสำเร็จ - ผู้ปกครอง: ${parent.parents?.parent_name}`
          };
        }
      }
    }

    return {
      exists: false,
      message: 'ไม่พบข้อมูล LINE User ID ในระบบ และไม่สามารถจับคู่อัตโนมัติได้'
    };

  } catch (error) {
    console.error('Error in checkAndAutoMatchLineId:', error);
    return {
      exists: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบและจับคู่ LINE User ID'
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