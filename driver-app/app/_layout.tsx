// app/_layout.tsx

import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '../hooks/useColorScheme';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';

// กันไม่ให้ Splash หายก่อนโหลดฟอนต์เสร็จ
SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // โหลดฟอนต์ (รวม Ionicons)
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,                                // << สำคัญ: โหลดฟอนต์ไอคอน
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // ซ่อน splash เมื่อทั้งฟอนต์โหลดแล้ว และเช็ค session เสร็จ
    if (fontsLoaded && !loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, loading]);

  useEffect(() => {
    if (loading) return;

    const first = segments[0] as string | undefined;
    const inAuthFlow = first === 'auth';
    const inTabsFlow = first === '(tabs)';

    // ❗ ไม่มี session → ไป login (แต่ไม่ redirect ถ้าอยู่ในหน้า auth แล้ว)
    if (!session) {
      if (!inAuthFlow) {
        router.replace('/auth/login');
      }
      return;
    }

    // ✅ มี session แล้ว → ถ้าอยู่หน้า login ส่งไปแท็บหลัก (แต่ไม่ redirect ถ้าอยู่ในแท็บแล้ว)
    if (session && inAuthFlow) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, segments]);

  const colorScheme = useColorScheme();

  // รอจนกว่าจะโหลดฟอนต์ + เช็ค session เสร็จ
  if (!fontsLoaded || loading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
