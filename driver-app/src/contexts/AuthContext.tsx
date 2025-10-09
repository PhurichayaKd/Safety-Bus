import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, authWithRetry } from '../../src/services/supabaseClient';
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
    
    // ตรวจสอบ session ปัจจุบันด้วย retry logic
    authWithRetry.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Failed to get session after retries:', error);
      if (mounted) {
        setSession(null);
        setLoading(false);
      }
    });

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
