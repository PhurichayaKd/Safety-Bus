import dotenv from 'dotenv';

// Load .env.local for development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local' });
}

import { supabase } from './db.js';

/**
 * ดึงข้อมูลนักเรียนจาก LINE ID ที่เชื่อมโยงแล้ว
 * @param {string} lineUserId - LINE User ID
 * @returns {Object|null} ข้อมูลนักเรียนหรือ null หากไม่พบ
 */
export async function getStudentByLineId(lineUserId) {
  try {
    // ตรวจสอบการเชื่อมโยงจากตาราง parent_line_links
    const { data: parentLink, error: parentError } = await supabase
      .from('parent_line_links')
      .select('parent_id')
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (parentError && parentError.code !== 'PGRST116') {
      throw parentError;
    }

    if (parentLink) {
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

    // ตรวจสอบการเชื่อมโยงจากตาราง driver_line_links
    const { data: driverLink, error: driverError } = await supabase
      .from('driver_line_links')
      .select(`
        student_id,
        driver_name,
        students!inner(
          student_id,
          student_name,
          grade,
          link_code
        )
      `)
      .eq('line_user_id', lineUserId)
      .eq('active', true)
      .single();

    if (driverError && driverError.code !== 'PGRST116') {
      throw driverError;
    }

    if (driverLink && driverLink.students) {
      return {
        type: 'driver',
        student: {
          student_id: driverLink.students.student_id,
          link_code: driverLink.students.link_code,
          student_name: driverLink.students.student_name,
          name: driverLink.students.student_name,
          class: driverLink.students.grade
        },
        driver_name: driverLink.driver_name
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting student by LINE ID:', error);
    throw error;
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