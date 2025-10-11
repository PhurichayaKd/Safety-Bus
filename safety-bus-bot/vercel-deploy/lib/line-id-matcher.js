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
          grade
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
          grade
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
          grade
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
          student_id,
          grade
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

    // สร้าง timeout สำหรับ query ที่อาจใช้เวลานาน
    const queryTimeout = 10000; // 10 วินาที
    
    // ใช้ Promise.race เพื่อจำกัดเวลา query
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), queryTimeout);
    });

    try {
      // ค้นหาใน student_line_links ที่มี line_display_id แต่ไม่มี line_user_id (แบบ simplified)
      const studentQuery = supabase
        .from('student_line_links')
        .select('id, student_id, line_display_id')
        .eq('active', true)
        .not('line_display_id', 'is', null)
        .is('line_user_id', null)
        .limit(5); // จำกัดผลลัพธ์

      const { data: incompleteStudents, error: studentError } = await Promise.race([
        studentQuery,
        timeoutPromise
      ]);

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
            // ดึงข้อมูล student แยกต่างหาก
            const { data: studentData } = await supabase
              .from('students')
              .select('student_name, grade')
              .eq('student_id', student.student_id)
              .single();

            return {
              exists: true,
              userType: 'student',
              userData: studentData,
              autoMatched: true,
              message: `จับคู่อัตโนมัติสำเร็จ - นักเรียน: ${studentData?.student_name}`
            };
          }
        }
      }

      // ค้นหาใน parent_line_links ที่มี line_display_id แต่ไม่มี line_user_id (แบบ simplified)
      const parentQuery = supabase
        .from('parent_line_links')
        .select('id, parent_id, student_id, line_display_id')
        .eq('active', true)
        .not('line_display_id', 'is', null)
        .is('line_user_id', null)
        .limit(5); // จำกัดผลลัพธ์

      const { data: incompleteParents, error: parentError } = await Promise.race([
        parentQuery,
        timeoutPromise
      ]);

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
            // ดึงข้อมูล parent และ student แยกต่างหาก
            const [parentData, studentData] = await Promise.all([
              supabase
                .from('parents')
                .select('parent_name, phone_number')
                .eq('id', parent.parent_id)
                .single(),
              supabase
                .from('students')
                .select('student_name, grade')
                .eq('student_id', parent.student_id)
                .single()
            ]);

            return {
              exists: true,
              userType: 'parent',
              userData: {
                parent: parentData.data,
                student: studentData.data
              },
              autoMatched: true,
              message: `จับคู่อัตโนมัติสำเร็จ - ผู้ปกครอง: ${parentData.data?.parent_name}`
            };
          }
        }
      }

    } catch (timeoutError) {
      if (timeoutError.message === 'Query timeout') {
        console.warn('⚠️ Auto-match query timeout, skipping auto-match');
        return {
          exists: false,
          message: 'ไม่พบข้อมูล LINE User ID ในระบบ (timeout)'
        };
      }
      throw timeoutError;
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
          student_id,
          grade
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
          student_id,
          grade
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