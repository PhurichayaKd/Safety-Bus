import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import '../polyfills';

// Polyfills are now imported from separate file

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // เพิ่มการตั้งค่าสำหรับ token refresh
    flowType: 'pkce',
    // ใช้ AsyncStorage โดยตรงสำหรับ React Native
    storage: AsyncStorage,
  },
  global: {
    headers: {
      'X-Client-Info': 'driver-app',
    },
    // เพิ่ม timeout และ retry settings
    fetch: (url, options = {}) => {
      // สร้าง AbortController สำหรับ timeout ที่รองรับใน React Native
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutId);
      });
    },
  },
  // เพิ่มการตั้งค่า realtime
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  // เพิ่มการตั้งค่า database
  db: {
    schema: 'public',
  },
});

// Utility function สำหรับ retry logic
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // ตรวจสอบว่าเป็น network error หรือไม่
      const isNetworkError = 
        error instanceof TypeError && (
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch')
        ) ||
        error instanceof Error && (
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED') ||
          error.message.includes('ERR_QUIC_PROTOCOL_ERROR') ||
          error.message.includes('ERR_NETWORK_IO_SUSPENDED') ||
          error.message.includes('ERR_NETWORK_CHANGED') ||
          error.message.includes('ERR_NAME_NOT_RESOLVED') ||
          error.message.includes('net::ERR_QUIC_PROTOCOL_ERROR') ||
          error.message.includes('net::ERR_NETWORK_CHANGED') ||
          error.message.includes('net::ERR_NETWORK_IO_SUSPENDED') ||
          error.message.includes('net::ERR_NAME_NOT_RESOLVED')
        );
      
      if (isNetworkError && attempt < maxRetries) {
        console.warn(`Network error on attempt ${attempt}, retrying in ${delay}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      // ถ้าไม่ใช่ network error หรือครบจำนวน retry แล้ว ให้ throw error
      throw error;
    }
  }
  
  throw lastError!;
};

// Session recovery utility
export const recoverSession = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // ตรวจสอบว่าเป็น refresh token error หรือไม่
      if (error.message.includes('refresh') || error.message.includes('token')) {
        console.warn('Refresh token error, clearing session:', error.message);
        // ล้าง session ที่เสียหายออกจาก storage
        await supabase.auth.signOut();
        return false;
      }
      console.warn('Session recovery error:', error.message);
      return false;
    }
    
    if (!session) {
      console.log('No session to recover');
      return false;
    }
    
    // ตรวจสอบว่า session ยังใช้งานได้หรือไม่
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    
    if (expiresAt <= now) {
      console.log('Session expired, attempting refresh...');
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          // ถ้า refresh ล้มเหลว ให้ล้าง session
          if (refreshError.message.includes('refresh') || refreshError.message.includes('token')) {
            console.warn('Refresh token invalid, clearing session:', refreshError.message);
            await supabase.auth.signOut();
          } else {
            console.warn('Session refresh failed:', refreshError.message);
          }
          return false;
        }
        
        console.log('Session refreshed successfully');
        return !!refreshData.session;
      } catch (refreshError) {
        console.warn('Session refresh exception:', refreshError);
        // ล้าง session เมื่อเกิด error
        await supabase.auth.signOut();
        return false;
      }
    }
    
    console.log('Session is valid');
    return true;
    
  } catch (error) {
    console.warn('Session recovery failed:', error);
    // ล้าง session เมื่อเกิด error ที่ไม่คาดคิด
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.warn('Failed to sign out after error:', signOutError);
    }
    return false;
  }
};

// Enhanced auth methods with retry logic
export const authWithRetry = {
  signInWithPassword: (credentials: { email: string; password: string }) =>
    withRetry(() => supabase.auth.signInWithPassword(credentials)),
  
  signOut: () =>
    withRetry(() => supabase.auth.signOut()),
  
  getSession: () =>
    withRetry(() => supabase.auth.getSession()),
  
  getUser: () =>
    withRetry(() => supabase.auth.getUser()),
  
  refreshSession: () =>
    withRetry(() => supabase.auth.refreshSession()),
  
  // เพิ่มฟังก์ชันสำหรับ session recovery
  recoverSession: () =>
    withRetry(() => recoverSession()),
};

// Export types for TypeScript
export type { Session, User } from '@supabase/supabase-js';