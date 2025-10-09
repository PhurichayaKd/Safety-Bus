import { supabase } from './supabaseClient';

export interface StudentWithStatus {
  student_id: string;
  student_name: string;
  grade: string;
  rfid_tag: string;
  home_latitude: number;
  home_longitude: number;
  student_phone: string;
  is_active: boolean;
  status: string;
  last_event_time?: string;
  last_event_type?: string;
  last_location_type?: string;
}

export interface StudentTodayStatus {
  student_id: string;
  last_event_time: string;
  last_event_type: string;
  last_location_type: string;
}

/**
 * ดึงข้อมูลนักเรียนทั้งหมดที่ active
 */
export async function getActiveStudents(): Promise<StudentWithStatus[]> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        rfid_tag,
        home_latitude,
        home_longitude,
        student_phone,
        is_active,
        status
      `)
      .eq('is_active', true)
      .order('student_name');

    if (error) {
      console.error('Error fetching students:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch students:', error);
    throw error;
  }
}

/**
 * ดึงสถานะของนักเรียนในวันนี้
 */
export async function getTodayStudentStatus(): Promise<StudentTodayStatus[]> {
  try {
    const { data, error } = await supabase
      .from('v_student_today_status')
      .select('*');

    if (error) {
      console.error('Error fetching today status:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch today status:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลนักเรียนพร้อมสถานะวันนี้
 */
export async function getStudentsWithTodayStatus(): Promise<StudentWithStatus[]> {
  try {
    // ดึงข้อมูลนักเรียนทั้งหมด
    const students = await getActiveStudents();
    
    // ดึงสถานะวันนี้
    const todayStatus = await getTodayStudentStatus();
    
    // รวมข้อมูล
    const studentsWithStatus = students.map(student => {
      const status = todayStatus.find(s => s.student_id === student.student_id);
      return {
        ...student,
        last_event_time: status?.last_event_time,
        last_event_type: status?.last_event_type,
        last_location_type: status?.last_location_type
      };
    });

    return studentsWithStatus;
  } catch (error) {
    console.error('Failed to fetch students with status:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลนักเรียนตาม student_id
 */
export async function getStudentById(studentId: string): Promise<StudentWithStatus | null> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        rfid_tag,
        home_latitude,
        home_longitude,
        student_phone,
        is_active,
        status
      `)
      .eq('student_id', studentId)
      .single();

    if (error) {
      console.error('Error fetching student:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch student:', error);
    throw error;
  }
}