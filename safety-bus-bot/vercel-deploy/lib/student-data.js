// Student data utilities

import { supabase } from './db.js';

/**
 * ดึงข้อมูลนักเรียนจาก LINE ID ที่เชื่อมโยงแล้ว
 * @param {string} lineUserId - LINE User ID
 * @returns {Object|null} ข้อมูลนักเรียนหรือ null หากไม่พบ
 */
export async function getStudentByLineId(lineUserId) {
  try {
    console.log(`🔍 Getting student data for LINE ID: ${lineUserId}`);
    
    // ตรวจสอบการเชื่อมโยงจากตาราง student_line_links ก่อน
    const { data: studentLink, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        student_id,
        students!inner(
          student_id,
          student_name,
          grade,
          parent_id
        )
      `)
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (studentError && studentError.code !== 'PGRST116') {
      console.error('❌ Error querying student_line_links:', studentError);
      // Don't throw, just log and continue to check parent links
    }

    if (studentLink && studentLink.students) {
      console.log(`✅ Found student link for ${lineUserId}`);
      return {
        type: 'student',
        student: {
          student_id: studentLink.students.student_id,
          student_name: studentLink.students.student_name,
          name: studentLink.students.student_name,
          class: studentLink.students.grade
        },
        parent_id: studentLink.students.parent_id
      };
    }

    // ตรวจสอบการเชื่อมโยงจากตาราง parent_line_links
    const { data: parentLink, error: parentError } = await supabase
      .from('parent_line_links')
      .select('parent_id')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (parentError && parentError.code !== 'PGRST116') {
      console.error('❌ Error querying parent_line_links:', parentError);
      // Don't throw, just log and return null
      return null;
    }

    if (parentLink) {
      console.log(`✅ Found parent link for ${lineUserId}`);
      // หาข้อมูลนักเรียนจาก students table โดยตรง
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('student_id, student_name, grade')
        .eq('parent_id', parentLink.parent_id)
        .single();
      
      if (student && !studentError) {
        console.log(`✅ Found student data via parent link for ${lineUserId}`);
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
      } else if (studentError) {
        console.error('❌ Error querying students via parent:', studentError);
      }
    }

    console.log(`❌ No link found for ${lineUserId}`);
    return null;
  } catch (error) {
    console.error('❌ Error getting student by LINE ID:', error);
    // Return null instead of throwing to prevent crashes
    return null;
  }
}

/**
 * ดึงข้อมูลนักเรียนจาก student_id
 * @param {string} studentId - Student ID
 * @returns {Object|null} ข้อมูลนักเรียนหรือ null หากไม่พบ
 */
export async function getStudentById(studentId) {
  try {
    const { data: student, error } = await supabase
      .from('students')
      .select('student_id, student_name, grade, link_code, parent_id')
      .eq('student_id', studentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return {
      student_id: student.student_id,
      link_code: student.link_code,
      student_name: student.student_name,
      name: student.student_name,
      class: student.grade,
      parent_id: student.parent_id
    };
  } catch (error) {
    console.error('Error getting student by ID:', error);
    throw error;
  }
}

/**
 * ตรวจสอบว่า LINE User ID มีการเชื่อมโยงแล้วหรือไม่
 * @param {string} lineUserId - LINE User ID
 * @returns {Object} สถานะการเชื่อมโยง
 */
export async function checkLinkStatus(lineUserId) {
  try {
    const student = await getStudentByLineId(lineUserId);
    
    if (student) {
      return {
        linked: true,
        type: student.type,
        student: student.student,
        driver_name: student.driver_name || null
      };
    }

    return {
      linked: false,
      type: null,
      student: null
    };
  } catch (error) {
    console.error('Error checking link status:', error);
    return {
      linked: false,
      type: null,
      student: null,
      error: error.message
    };
  }
}