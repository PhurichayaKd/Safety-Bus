import { supabase } from './supabaseClient';

export interface ModernBoardingStatus {
  student_id: string;
  last_event_time: string;
  last_event_type: string;
  last_location_type: string;
}

export interface StudentWithStatus {
  student_id: string;
  student_name: string;
  grade: string;
  rfid_code?: string; // จาก rfid_card_assignments และ rfid_cards
  student_phone: string;
  home_latitude: number;
  home_longitude: number;
  is_active: boolean;
  status: string;
  last_event_time?: string;
  last_event_type?: string;
  last_location_type?: string;
}

export interface RFIDScanEvent {
  student_id: string;
  boarding_status: 'onboard' | 'offboard';
  phase: 'go' | 'return';
  scan_time: string;
  rfid_code?: string; // เปลี่ยนจาก rfid_tag เป็น rfid_code
  status: 'onboard' | 'offboard';
  timestamp: string;
}

class ModernBoardingService {
  private driverId: number | null = null;
  private subscriptions: Array<(event: RFIDScanEvent) => void> = [];

  async initialize(driverId: number): Promise<void> {
    this.driverId = driverId;
    console.log('ModernBoardingService initialized with driver ID:', driverId);
  }

  async getCurrentBoardingStatuses(): Promise<ModernBoardingStatus[]> {
    try {
      const { data, error } = await supabase
        .from('v_student_today_status')
        .select('*');

      if (error) {
        console.error('Error fetching current boarding statuses:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch boarding status:', error);
      throw error;
    }
  }

  async getStudentsWithStatus(): Promise<StudentWithStatus[]> {
    try {
      // ดึงข้อมูลนักเรียนทั้งหมด
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          student_id,
          student_name,
          grade,
          student_phone,
          home_latitude,
          home_longitude,
          is_active,
          status,
          rfid_card_assignments (
            rfid_cards (
              rfid_code
            )
          )
        `)
        .eq('is_active', true)
        .order('student_name');

      if (studentsError) {
        console.error('Error fetching students:', studentsError);
        throw studentsError;
      }

      // ดึงสถานะวันนี้
      const { data: todayStatus, error: statusError } = await supabase
        .from('v_student_today_status')
        .select('*');

      if (statusError) {
        console.error('Error fetching today status:', statusError);
        // ไม่ throw error เพราะอาจจะยังไม่มีข้อมูลสถานะ
      }

      // รวมข้อมูล
      const studentsWithStatus = (students || []).map(student => {
        const status = todayStatus?.find(s => s.student_id === student.student_id);
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

  subscribeToRFIDScans(callback: (event: RFIDScanEvent) => void): () => void {
    this.subscriptions.push(callback);
    
    // ในอนาคตอาจะเพิ่ม real-time subscription ที่นี่
    
    return () => {
      const index = this.subscriptions.indexOf(callback);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
      }
    };
  }

  async updateStudentStatus(
    studentId: string,
    status: 'onboard' | 'offboard' | 'absent',
    phase: 'pickup' | 'dropoff'
  ): Promise<void> {
    try {
      // ในอนาคตอาจะมีการอัปเดตสถานะที่นี่
      console.log('Update student status:', { studentId, status, phase });
      
      // Notify subscribers
      const event: RFIDScanEvent = {
        student_id: studentId,
        boarding_status: status as 'onboard' | 'offboard',
        phase: phase === 'pickup' ? 'go' : 'return',
        scan_time: new Date().toISOString(),
        rfid_code: '',
        status: status as 'onboard' | 'offboard',
        timestamp: new Date().toISOString()
      };

      this.subscriptions.forEach(callback => callback(event));
    } catch (error) {
      console.error('Failed to update student status:', error);
      throw error;
    }
  }
}

export const modernBoardingService = new ModernBoardingService();
export default modernBoardingService;