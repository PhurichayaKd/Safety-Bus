import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL สำหรับ API
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://safety-bus-liff-v4-new.vercel.app/api';

// Interface สำหรับ response
interface TripPhaseUpdateResponse {
  success: boolean;
  error?: string;
  trip_phase?: string;
  current_status?: string;
  driver_id?: number;
}

interface TripPhaseStatusResponse {
  success: boolean;
  error?: string;
  trip_phase?: string;
  current_status?: string;
  driver_id?: number;
}

/**
 * อัปเดต trip_phase ของคนขับและส่งแจ้งเตือน LINE
 * @param driverId ID ของคนขับ
 * @param tripPhase 'go' สำหรับรอบไป หรือ 'return' สำหรับรอบกลับ
 * @param currentStatus สถานะปัจจุบัน (เช่น 'active', 'pickup', 'dropoff')
 * @param location ตำแหน่งปัจจุบัน (optional)
 * @param notes หมายเหตุ (optional)
 * @returns ผลลัพธ์การอัปเดต
 */
export async function updateTripPhase(
  driverId: number,
  tripPhase: 'go' | 'return',
  currentStatus: string = 'active',
  location?: string,
  notes?: string
): Promise<TripPhaseUpdateResponse> {
  try {
    console.log(`🔄 Updating trip_phase to ${tripPhase} for driver ${driverId}`);
    
    // อัพเดตสถานะคนขับ
    const response = await fetch(`${API_BASE_URL}/get-driver-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driver_id: driverId,
        trip_phase: tripPhase,
        current_status: currentStatus,
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Trip phase updated successfully:', result);
      
      // อัปเดต AsyncStorage ด้วย
      await AsyncStorage.setItem('trip_phase', tripPhase);
      
      // ส่งแจ้งเตือน LINE
      try {
        console.log('📤 Sending driver status notification...');
        const notificationResponse = await fetch(`${API_BASE_URL}/driver-status-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            driver_id: driverId,
            trip_phase: tripPhase,
            current_status: currentStatus,
            location: location,
            notes: notes
          }),
        });

        const notificationResult = await notificationResponse.json();
        
        if (notificationResponse.ok && notificationResult.success) {
          console.log('✅ Driver status notification sent successfully:', notificationResult.summary);
        } else {
          console.error('❌ Failed to send driver status notification:', notificationResult.error);
        }
      } catch (notificationError) {
        console.error('❌ Error sending driver status notification:', notificationError);
        // ไม่ให้ error ของการส่งแจ้งเตือนมาขัดขวางการอัพเดตสถานะ
      }
      
      return result;
    } else {
      console.error('❌ Failed to update trip phase:', result);
      return {
        success: false,
        error: result.error || 'Failed to update trip phase',
      };
    }
  } catch (error) {
    console.error('❌ Error updating trip phase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * ดึงสถานะ trip_phase ปัจจุบันของคนขับ
 * @param driverId ID ของคนขับ
 * @returns สถานะ trip_phase ปัจจุบัน
 */
export async function getCurrentTripPhase(driverId: number): Promise<TripPhaseStatusResponse> {
  try {
    console.log(`📡 Getting current trip_phase for driver ${driverId}`);
    
    const response = await fetch(`${API_BASE_URL}/get-driver-status?driver_id=${driverId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Got current trip phase:', result);
      
      // อัปเดต AsyncStorage ด้วย
      if (result.trip_phase) {
        await AsyncStorage.setItem('trip_phase', result.trip_phase);
      }
      
      return result;
    } else {
      console.error('❌ Failed to get current trip phase:', result);
      return {
        success: false,
        error: result.error || 'Failed to get current trip phase',
      };
    }
  } catch (error) {
    console.error('❌ Error getting current trip phase:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * อัพเดตสถานะคนขับแบบกำหนดเอง
 * @param driverId ID ของคนขับ
 * @param currentStatus สถานะปัจจุบัน
 * @param location ตำแหน่งปัจจุบัน (optional)
 * @param notes หมายเหตุ (optional)
 * @returns ผลลัพธ์การอัปเดต
 */
export async function updateDriverStatus(
  driverId: number,
  currentStatus: string,
  location?: string,
  notes?: string
): Promise<TripPhaseUpdateResponse> {
  try {
    console.log(`🔄 Updating driver status to ${currentStatus} for driver ${driverId}`);
    
    // ดึง trip_phase ปัจจุบันจาก AsyncStorage
    const currentTripPhase = await AsyncStorage.getItem('trip_phase') || 'go';
    
    // อัพเดตสถานะคนขับ
    const response = await fetch(`${API_BASE_URL}/get-driver-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        driver_id: driverId,
        trip_phase: currentTripPhase,
        current_status: currentStatus,
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Driver status updated successfully:', result);
      
      // ส่งแจ้งเตือน LINE
      try {
        console.log('📤 Sending driver status notification...');
        const notificationResponse = await fetch(`${API_BASE_URL}/driver-status-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            driver_id: driverId,
            trip_phase: currentTripPhase,
            current_status: currentStatus,
            location: location,
            notes: notes
          }),
        });

        const notificationResult = await notificationResponse.json();
        
        if (notificationResponse.ok && notificationResult.success) {
          console.log('✅ Driver status notification sent successfully:', notificationResult.summary);
        } else {
          console.error('❌ Failed to send driver status notification:', notificationResult.error);
        }
      } catch (notificationError) {
        console.error('❌ Error sending driver status notification:', notificationError);
        // ไม่ให้ error ของการส่งแจ้งเตือนมาขัดขวางการอัพเดตสถานะ
      }
      
      return result;
    } else {
      console.error('❌ Failed to update driver status:', result);
      return {
        success: false,
        error: result.error || 'Failed to update driver status',
      };
    }
  } catch (error) {
    console.error('❌ Error updating driver status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}