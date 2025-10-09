import { supabase } from './supabaseClient';

export interface BoardingStatus {
  student_id: number;
  status: 'waiting' | 'boarded' | 'dropped' | 'absent';
  phase: 'go' | 'return';
  timestamp: string;
  rfid_tag?: string;
}

export interface RFIDScanEvent {
  student_id: number;
  boarding_status: 'onboard' | 'offboard';
  phase: 'go' | 'return';
  scan_time: string;
  rfid_tag: string;
  // Additional properties for compatibility
  status: 'onboard' | 'offboard';
  timestamp: string;
}

export interface OriginalBoardingStatus {
  status_id: number;
  student_id: string;
  driver_id: number;
  trip_date: string;
  trip_phase: 'go' | 'return';
  boarding_status: 'waiting' | 'boarded' | 'dropped' | 'absent';
  pickup_time?: string;
  dropoff_time?: string;
  last_scan_id?: number;
  updated_at: string;
}

export interface RfidScanLog {
  scan_id: number;
  rfid_code: string;
  student_id: string;
  driver_id: number;
  location_type: string;
  latitude?: number;
  longitude?: number;
  scan_timestamp: string;
  trip_phase: 'go' | 'return';
  is_valid_scan: boolean;
  notification_sent: boolean;
}

/**
 * ดึงสถานะการขึ้นรถของนักเรียนทั้งหมดสำหรับคนขับและวันที่ระบุ
 */
export async function getBoardingStatusByDriver(
  driverId: number, 
  tripDate?: string,
  tripPhase?: 'go' | 'return'
): Promise<OriginalBoardingStatus[]> {
  try {
    const targetDate = tripDate || new Date().toISOString().split('T')[0];
    
    // ใช้ v_student_today_status แทน student_boarding_status
    let query = supabase
      .from('v_student_today_status')
      .select('*');
    
    if (tripPhase) {
      query = query.eq('trip_phase', tripPhase);
    }
    
    const { data, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching boarding status:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch boarding status:', error);
    throw error;
  }
}

/**
 * ดึงสถานะการขึ้นรถของนักเรียนคนเดียว
 */
export async function getStudentBoardingStatus(
  studentId: string,
  driverId: number,
  tripDate?: string,
  tripPhase?: 'go' | 'return'
): Promise<BoardingStatus | null> {
  try {
    const targetDate = tripDate || new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('v_student_today_status')
      .select('*')
      .eq('student_id', studentId);
    
    if (tripPhase) {
      query = query.eq('trip_phase', tripPhase);
    }
    
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching student boarding status:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch student boarding status:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลการสแกน RFID ล่าสุดของคนขับ
 */
export async function getRecentRfidScans(
  driverId: number,
  limit: number = 10,
  tripDate?: string
): Promise<RfidScanLog[]> {
  try {
    const targetDate = tripDate || new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('rfid_scan_logs')
      .select('*')
      .eq('driver_id', driverId)
      .gte('scan_timestamp', `${targetDate}T00:00:00`)
      .lte('scan_timestamp', `${targetDate}T23:59:59`)
      .eq('is_valid_scan', true)
      .order('scan_timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching RFID scan logs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch RFID scan logs:', error);
    throw error;
  }
}

/**
 * อัปเดตสถานะการขึ้นรถของนักเรียนแบบ manual
 */
export async function updateBoardingStatus(
  studentId: string,
  driverId: number,
  status: 'waiting' | 'boarded' | 'dropped' | 'absent',
  tripDate?: string,
  tripPhase?: 'go' | 'return'
): Promise<BoardingStatus> {
  try {
    const targetDate = tripDate || new Date().toISOString().split('T')[0];
    const currentPhase = tripPhase || 'go';
    
    const updateData: any = {
      boarding_status: status,
      updated_at: new Date().toISOString()
    };
    
    if (status === 'boarded' && !updateData.pickup_time) {
      updateData.pickup_time = new Date().toISOString();
    } else if (status === 'dropped' && !updateData.dropoff_time) {
      updateData.dropoff_time = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('student_boarding_status')
      .upsert({
        student_id: studentId,
        driver_id: driverId,
        trip_date: targetDate,
        trip_phase: currentPhase,
        ...updateData
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating boarding status:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to update boarding status:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time changes in boarding status
 */
export function subscribeToBoardingStatusChanges(
  driverId: number,
  callback: (payload: any) => void,
  tripDate?: string
) {
  const targetDate = tripDate || new Date().toISOString().split('T')[0];
  
  const subscription = supabase
    .channel('boarding_status_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'student_boarding_status',
        filter: `driver_id=eq.${driverId} and trip_date=eq.${targetDate}`
      },
      callback
    )
    .subscribe();

  return subscription;
}

/**
 * Subscribe to real-time RFID scan changes
 */
export function subscribeToRfidScanChanges(
  driverId: number,
  callback: (payload: any) => void,
  tripDate?: string
) {
  const targetDate = tripDate || new Date().toISOString().split('T')[0];
  
  const subscription = supabase
    .channel('rfid_scan_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'rfid_scan_logs',
        filter: `driver_id=eq.${driverId}`
      },
      (payload) => {
        // Filter by date on client side since Supabase filter doesn't support date functions
        const scanDate = new Date(payload.new.scan_timestamp).toISOString().split('T')[0];
        if (scanDate === targetDate) {
          callback(payload);
        }
      }
    )
    .subscribe();

  return subscription;
}

/**
 * Comprehensive Boarding Status Service Class
 */
class BoardingStatusService {
  private driverId: number | null = null;
  private currentDate: string = new Date().toISOString().split('T')[0];
  private subscriptions: any[] = [];

  async initialize(driverId: number) {
    this.driverId = driverId;
    this.currentDate = new Date().toISOString().split('T')[0];
  }

  async getCurrentBoardingStatuses(): Promise<Map<number, BoardingStatus>> {
    if (!this.driverId) {
      throw new Error('Service not initialized');
    }

    try {
      const statuses = await getBoardingStatusByDriver(this.driverId, this.currentDate);
      const statusMap = new Map<number, BoardingStatus>();

      statuses.forEach(status => {
        statusMap.set(parseInt(status.student_id), {
          student_id: parseInt(status.student_id),
          status: status.boarding_status,
          phase: status.trip_phase,
          timestamp: status.updated_at,
          rfid_tag: undefined
        });
      });

      return statusMap;
    } catch (error) {
      console.error('Error fetching current boarding statuses:', error);
      return new Map();
    }
  }

  subscribeToRFIDScans(callback: (event: RFIDScanEvent) => void): () => void {
    if (!this.driverId) {
      throw new Error('Service not initialized');
    }

    const subscription = subscribeToRfidScanChanges(
      this.driverId,
      (payload) => {
        try {
          const scanData = payload.new;
          const event: RFIDScanEvent = {
            student_id: parseInt(scanData.student_id),
            boarding_status: scanData.location_type === 'pickup' ? 'onboard' : 'offboard',
            phase: scanData.trip_phase,
            scan_time: scanData.scan_timestamp,
            rfid_tag: scanData.rfid_code,
            // Additional properties for compatibility
            status: scanData.location_type === 'pickup' ? 'onboard' : 'offboard',
            timestamp: scanData.scan_timestamp
          };
          callback(event);
        } catch (error) {
          console.error('Error processing RFID scan event:', error);
        }
      },
      this.currentDate
    );

    this.subscriptions.push(subscription);

    return () => {
      const index = this.subscriptions.indexOf(subscription);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
        subscription.unsubscribe();
      }
    };
  }

  subscribeToBoardingStatusUpdates(callback: (payload: any) => void): () => void {
    if (!this.driverId) {
      throw new Error('Service not initialized');
    }

    const subscription = subscribeToBoardingStatusChanges(
      this.driverId,
      callback,
      this.currentDate
    );

    this.subscriptions.push(subscription);

    return () => {
      const index = this.subscriptions.indexOf(subscription);
      if (index > -1) {
        this.subscriptions.splice(index, 1);
        subscription.unsubscribe();
      }
    };
  }

  async updateStudentStatus(
    studentId: number,
    status: 'waiting' | 'boarded' | 'dropped' | 'absent',
    phase: 'go' | 'return' = 'go'
  ): Promise<void> {
    if (!this.driverId) {
      throw new Error('Service not initialized');
    }

    try {
      await updateBoardingStatus(
        studentId.toString(),
        this.driverId,
        status,
        this.currentDate,
        phase
      );
    } catch (error) {
      console.error('Error updating student status:', error);
      throw error;
    }
  }

  cleanup() {
    this.subscriptions.forEach(subscription => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    });
    this.subscriptions = [];
  }
}

// Export singleton instance
export const boardingStatusService = new BoardingStatusService();