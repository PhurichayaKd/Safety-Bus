// src/utils/navigationUtils.ts
import { router } from 'expo-router';

/**
 * ฟังก์ชันสำหรับการนำทางย้อนกลับอย่างปลอดภัย
 * จะตรวจสอบว่าสามารถย้อนกลับได้หรือไม่ ถ้าไม่ได้จะไปหน้าหลักแทน
 */
export function safeGoBack(fallbackRoute: string = '/(tabs)/home') {
  try {
    // ตรวจสอบว่าสามารถย้อนกลับได้หรือไม่
    if (router.canGoBack()) {
      router.back();
    } else {
      // ถ้าไม่สามารถย้อนกลับได้ ให้ไปหน้าที่กำหนด
      router.replace(fallbackRoute as any);
    }
  } catch (error) {
    console.warn('Navigation error, redirecting to fallback route:', error);
    // ถ้าเกิดข้อผิดพลาด ให้ไปหน้าหลัก
    router.replace(fallbackRoute as any);
  }
}

/**
 * ฟังก์ชันสำหรับการนำทางย้อนกลับแบบ dismiss (สำหรับ modal หรือ overlay)
 */
export function safeDismiss(fallbackRoute: string = '/(tabs)/home') {
  try {
    if (router.canDismiss()) {
      router.dismiss();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } catch (error) {
    console.warn('Dismiss error, redirecting to fallback route:', error);
    router.replace(fallbackRoute as any);
  }
}

/**
 * ฟังก์ชันตรวจสอบว่าสามารถย้อนกลับได้หรือไม่
 */
export function canNavigateBack(): boolean {
  try {
    return router.canGoBack();
  } catch (error) {
    console.warn('Error checking navigation state:', error);
    return false;
  }
}

/**
 * ฟังก์ชันสำหรับการนำทางไปหน้าใดหน้าหนึ่งอย่างปลอดภัย
 */
export function safeNavigate(route: string, options?: { replace?: boolean }) {
  try {
    if (options?.replace) {
      router.replace(route as any);
    } else {
      router.push(route as any);
    }
  } catch (error) {
    console.error('Navigation error:', error);
    // ถ้าเกิดข้อผิดพลาด ลองใช้ replace แทน
    try {
      router.replace(route as any);
    } catch (fallbackError) {
      console.error('Fallback navigation also failed:', fallbackError);
    }
  }
}