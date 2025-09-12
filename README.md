# Project-IoT: Safety Bus System

โปรเจคนี้เป็นระบบ **ความปลอดภัยรถรับ-ส่งนักเรียน (Safety Bus System)**  
แบ่งออกเป็น 2 ส่วนหลัก คือ **แอพฝั่งคนขับ (Driver App)** และ **บอทไลน์ (Safety Bus Bot)**

---

## 📱 driver-app (React Native + Expo)
- โฟลเดอร์: `driver-app/`
- พัฒนาโดยใช้ **React Native (Expo)**  
- ทำหน้าที่เป็น **แอพมือถือฝั่งคนขับ** สำหรับ:
  - จัดการข้อมูลนักเรียน/ผู้โดยสาร
  - บันทึกการขึ้น-ลงนักเรียน
  - ดูแผนที่/เส้นทางรถ
  - ส่งข้อมูลขึ้นฐานข้อมูล Supabase แบบ Realtime
- **วิธีรัน**
  ```bash
  cd driver-app
  npx expo start

เทคโนโลยีที่ใช้

Frontend (Mobile): React Native (Expo), TypeScript
Backend (Bot): Node.js, Express, LINE Messaging API SDK
Database: Supabase (PostgreSQL, Realtime, Auth, Storage)