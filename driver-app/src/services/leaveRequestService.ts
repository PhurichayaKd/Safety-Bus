import { supabase } from './supabaseClient';

export interface LeaveRequest {
  id: number;
  student_id: number;
  leave_date: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

/**
 * ดึงรายการ student_id ที่มีใบลาในวันนี้ (approved status)
 */
export async function fetchTodayLeaveRequests(): Promise<Set<number>> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const { data, error } = await supabase
      .from('leave_requests')
      .select('student_id')
      .eq('leave_date', today)
      .eq('status', 'approved');

    if (error) {
      console.error('Error fetching today leave requests:', error);
      throw error;
    }

    // แปลงเป็น Set ของ student_id
    const studentIds = new Set<number>();
    if (data) {
      data.forEach(request => {
        studentIds.add(request.student_id);
      });
    }

    return studentIds;
  } catch (error) {
    console.error('Failed to fetch today leave requests:', error);
    return new Set<number>(); // คืนค่า empty Set ถ้าเกิดข้อผิดพลาด
  }
}

/**
 * ดึงรายการใบลาทั้งหมดของวันที่กำหนด
 */
export async function getLeaveRequestsByDate(date: string): Promise<LeaveRequest[]> {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('leave_date', date)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leave requests by date:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch leave requests by date:', error);
    throw error;
  }
}

/**
 * ดึงรายการใบลาของนักเรียนคนหนึ่ง
 */
export async function getStudentLeaveRequests(studentId: number): Promise<LeaveRequest[]> {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('leave_date', { ascending: false });

    if (error) {
      console.error('Error fetching student leave requests:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch student leave requests:', error);
    throw error;
  }
}