import { createClient } from '@supabase/supabase-js';

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
  },
  global: {
    headers: {
      'X-Client-Info': 'driver-app',
    },
  },
  // เพิ่มการตั้งค่า realtime
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
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
        error instanceof TypeError && error.message.includes('fetch') ||
        error instanceof Error && (
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED') ||
          error.message.includes('ERR_QUIC_PROTOCOL_ERROR') ||
          error.message.includes('ERR_NETWORK_IO_SUSPENDED')
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
};

// Export types for TypeScript
export type { Session, User } from '@supabase/supabase-js';