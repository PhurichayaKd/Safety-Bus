import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

// Import Platform and NetInfo for React Native with proper error handling
let Platform: any = null;
let NetInfo: any = null;

try {
  // Try to import Platform from react-native
  Platform = require('react-native').Platform;
} catch (error) {
  // Fallback for web environments
  Platform = { OS: 'web' };
}

try {
  if (Platform.OS !== 'web') {
    NetInfo = require('@react-native-community/netinfo').default;
  }
} catch (error) {
  console.warn('NetInfo not available, using fallback network detection');
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type?: string;
  supabaseConnected: boolean;
  lastChecked: Date;
}

class NetworkMonitor {
  private listeners: ((status: NetworkStatus) => void)[] = [];
  private currentStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    supabaseConnected: false,
    lastChecked: new Date()
  };
  private netInfoUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // สำหรับ React Native ใช้ NetInfo
    if (Platform.OS !== 'web' && NetInfo) {
      try {
        // ตรวจสอบสถานะเครือข่ายเริ่มต้น
        const netInfoState = await NetInfo.fetch();
        this.updateStatusFromNetInfo(netInfoState);
        
        // ฟังการเปลี่ยนแปลงสถานะเครือข่าย
        this.netInfoUnsubscribe = NetInfo.addEventListener((state: any) => {
          this.updateStatusFromNetInfo(state);
        });
      } catch (error) {
        console.warn('Failed to initialize NetInfo:', error);
        this.fallbackToNavigator();
      }
    } else {
      // สำหรับ web platform ใช้ navigator.onLine
      this.fallbackToNavigator();
    }

    // ตรวจสอบการเชื่อมต่อ Supabase เริ่มต้น
    await this.checkSupabaseConnection();
    this.notifyListeners();
  }

  private fallbackToNavigator() {
    if (typeof navigator !== 'undefined') {
      this.currentStatus.isConnected = navigator.onLine;
      this.currentStatus.isInternetReachable = navigator.onLine;
      
      // ฟังการเปลี่ยนแปลงสถานะเครือข่าย (เฉพาะ web)
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.addEventListener('online', this.handleOnline);
        window.addEventListener('offline', this.handleOffline);
      }
    }
  }

  private updateStatusFromNetInfo(netInfoState: any) {
    this.currentStatus.isConnected = netInfoState.isConnected || false;
    this.currentStatus.isInternetReachable = netInfoState.isInternetReachable;
    this.currentStatus.type = netInfoState.type || 'unknown';
    this.currentStatus.lastChecked = new Date();
    
    if (this.currentStatus.isConnected) {
      this.checkSupabaseConnection();
    } else {
      this.currentStatus.supabaseConnected = false;
    }
    
    this.notifyListeners();
  }

  private handleOnline = async () => {
    this.currentStatus.isConnected = true;
    this.currentStatus.isInternetReachable = true;
    this.currentStatus.lastChecked = new Date();
    await this.checkSupabaseConnection();
    this.notifyListeners();
  };

  private handleOffline = () => {
    this.currentStatus.isConnected = false;
    this.currentStatus.isInternetReachable = false;
    this.currentStatus.supabaseConnected = false;
    this.currentStatus.lastChecked = new Date();
    this.notifyListeners();
  };

  private async checkSupabaseConnection() {
    try {
      // ใช้ timeout เพื่อป้องกันการรอนาน
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      const connectionPromise = supabase
        .from('driver_bus')
        .select('count')
        .limit(1);

      const { data, error } = await Promise.race([connectionPromise, timeoutPromise]) as any;
      
      this.currentStatus.supabaseConnected = !error;
      
      if (error) {
        console.warn('Supabase query error:', error);
      }
    } catch (error: any) {
      console.warn('Supabase connection check failed:', error);
      
      // ตรวจสอบประเภทของ error
      const errorMessage = error?.message || '';
      const isNetworkError = 
        errorMessage.includes('ERR_NETWORK_IO_SUSPENDED') ||
        errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
        errorMessage.includes('ERR_NETWORK') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Connection timeout') ||
        error?.name === 'TypeError';

      if (isNetworkError) {
        // ถ้าเป็น network error ให้อัปเดตสถานะเครือข่ายด้วย
        this.currentStatus.isConnected = false;
        this.currentStatus.isInternetReachable = false;
      }
      
      this.currentStatus.supabaseConnected = false;
    }
    this.currentStatus.lastChecked = new Date();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentStatus));
  }

  public subscribe(callback: (status: NetworkStatus) => void): () => void {
    this.listeners.push(callback);
    
    // เรียก callback ทันทีด้วยสถานะปัจจุบัน
    callback(this.currentStatus);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getCurrentStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  public async forceRefresh(): Promise<NetworkStatus> {
    if (typeof navigator !== 'undefined') {
      this.currentStatus.isConnected = navigator.onLine;
      this.currentStatus.isInternetReachable = navigator.onLine;
    }
    
    if (this.currentStatus.isConnected) {
      await this.checkSupabaseConnection();
    } else {
      this.currentStatus.supabaseConnected = false;
    }
    
    this.currentStatus.lastChecked = new Date();
    this.notifyListeners();
    return this.getCurrentStatus();
  }

  public destroy() {
    // Clean up NetInfo subscription for React Native
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    
    // Clean up window event listeners for web
    if (typeof window !== 'undefined' && Platform.OS === 'web') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    
    this.listeners = [];
  }
}

// สร้าง singleton instance แบบ lazy initialization
let networkMonitorInstance: NetworkMonitor | null = null;

export const getNetworkMonitor = (): NetworkMonitor => {
  if (!networkMonitorInstance) {
    networkMonitorInstance = new NetworkMonitor();
  }
  return networkMonitorInstance;
};

export const networkMonitor = getNetworkMonitor();

// Hook สำหรับ React components
export function useNetworkStatus() {
  const monitor = getNetworkMonitor();
  const [status, setStatus] = useState<NetworkStatus>(monitor.getCurrentStatus());

  useEffect(() => {
    const unsubscribe = monitor.subscribe(setStatus);
    return unsubscribe;
  }, [monitor]);

  return status;
}

export default getNetworkMonitor();