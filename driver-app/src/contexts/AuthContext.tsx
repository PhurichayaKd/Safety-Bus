import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, authWithRetry, recoverSession } from '../../src/services/supabaseClient';
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    // ตรวจสอบและกู้คืน session ด้วย retry logic
    const initializeSession = async () => {
      try {
        // พยายามกู้คืน session ก่อน
        const sessionRecovered = await authWithRetry.recoverSession();
        
        if (sessionRecovered) {
          // ถ้ากู้คืนสำเร็จ ให้ดึง session ปัจจุบัน
          const { data: { session }, error } = await authWithRetry.getSession();
          if (mounted) {
            if (error) {
              console.warn('Session retrieval error after recovery:', error.message);
              setSession(null);
            } else {
              setSession(session);
            }
            setLoading(false);
          }
        } else {
          // ถ้ากู้คืนไม่สำเร็จ ให้ลองดึง session ปกติ
          const { data: { session }, error } = await authWithRetry.getSession();
          if (mounted) {
            if (error) {
              console.warn('Session retrieval error:', error.message);
            }
            setSession(session);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to initialize session:', error);
        if (mounted) {
          setSession(null);
          setLoading(false);
        }
      }
    };
    
    initializeSession();

    // ฟังการเปลี่ยนแปลงของ auth state
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // ลบ session ใน local storage ก่อน
      setSession(null);
      setLoading(false);
      
      // ล้างข้อมูลใน AsyncStorage เมื่อ logout
      await AsyncStorage.multiRemove([
        'current_bus_status',
        'trip_phase',
        'last_trip_date',
        'reset_today_flag'
      ]);
      
      // พยายาม logout จาก Supabase ด้วย retry logic แต่ไม่ให้ error หยุดการทำงาน
      await authWithRetry.signOut();
    } catch (error) {
      console.warn('Logout error (non-critical):', error);
      // ไม่ throw error เพราะเราได้ clear session ใน local แล้ว
    }
  };

  const value = {
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
