# SAFETY BUS – ระบบติดตามความปลอดภัยรถโรงเรียนด้วย IoT

โปรเจกต์นี้เป็นระบบครบวงจรสำหรับติดตามความปลอดภัยของนักเรียนระหว่างการเดินทางด้วยรถโรงเรียน ประกอบด้วยแอปสำหรับคนขับ, LINE Bot/LIFF สำหรับผู้ปกครอง และบริการฝั่งฐานข้อมูลบน Supabase เพื่อบันทึก/ประมวลผลข้อมูลการขึ้น–ลงรถและเหตุฉุกเฉินแบบเรียลไทม์

โค้ดในคลังนี้ถูกจัดเป็น **Monorepo** หลัก ๆ 3 ส่วน ดังนี้

- `driver-app/` – แอปมือถือสำหรับคนขับรถ (Expo / React Native)
- `safety-bus-bot/` – LINE Bot + LIFF และ API สำหรับแจ้งเตือน/จัดการใบลา (Deploy บน Vercel)
- `supabase/` – สคริปต์สำหรับเชื่อมต่อและตรวจสอบข้อมูลบน Supabase (เครื่องมือสำหรับงานวิเคราะห์/ดูแลฐานข้อมูล)

> หมายเหตุ: ระบบค้นหาโค้ดอัตโนมัติของ IDE ยังไม่พร้อมใช้งาน จึงมีการสำรวจโครงสร้างโปรเจกต์โดยการเปิดไฟล์และโฟลเดอร์ที่เกี่ยวข้องโดยตรง

---

## โครงสร้างภาพรวมของโปรเจกต์

```text
Project-IoT/
├── driver-app/          # แอปมือถือสำหรับคนขับ (Expo + React Native)
├── safety-bus-bot/      # LINE Bot + LIFF + Serverless API (Vercel)
├── supabase/            # สคริปต์เชื่อมต่อ/ตรวจสอบฐานข้อมูล Supabase
├── package.json         # ใช้ @supabase/supabase-js ระดับ root (utility)
└── package-lock.json
```

รายละเอียดในแต่ละส่วนจะอธิบายในหัวข้อย่อยด้านล่าง

---

## 1. driver-app – แอปคนขับรถโรงเรียน

แอป `driver-app` เป็นแอปมือถือสำหรับคนขับรถโรงเรียน พัฒนาโดยใช้ **Expo + React Native (Expo Router)** ทำหน้าที่หลักในการ:

- แสดงแดชบอร์ดสถานะการเดินทางของรถ
- เชื่อมต่อกับฐานข้อมูล **Supabase** เพื่อดึงข้อมูลนักเรียน/เส้นทาง/สถานะการขึ้น–ลงรถ
- บันทึกเหตุการณ์การสแกนบัตร RFID ของนักเรียน (ขึ้นรถ–ลงรถ)
- อัปเดตสถานะเที่ยวรถ เช่น `เริ่มออกเดินทาง`, `ถึงโรงเรียน`, `รอรับกลับบ้าน`, `จบการเดินทาง`
- แจ้งเตือนเหตุฉุกเฉิน และซิงก์สถานะไปยัง LINE Bot ผ่าน API

### 1.1 เทคโนโลยีหลัก

- **Framework**: Expo 54, React Native 0.81, React 19, Expo Router
- **ภาษา**: TypeScript / JavaScript
- **Backend as a Service**: Supabase (`@supabase/supabase-js`)
- **การเก็บข้อมูลในเครื่อง**: `@react-native-async-storage/async-storage`
- **แผนที่**: `react-native-maps`
- **UI และ UX เพิ่มเติม**: `@expo/vector-icons`, `expo-haptics`, `expo-image`, `expo-status-bar` เป็นต้น

### 1.2 โครงสร้างสำคัญของ driver-app

```text
driver-app/
├── app/                     # เส้นทาง (routes) ของ Expo Router
│   ├── (tabs)/              # แท็บหลัก เช่น home, passenger-list
│   ├── auth/                # หน้าจอเข้าสู่ระบบ/ลิงก์บัญชี
│   ├── manage/              # จัดการบัตร RFID, นักเรียน, รายงาน
│   ├── pick/                # หน้าจอเลือกจุดรับ–ส่งบนแผนที่
│   ├── user-info/           # ข้อมูลคนขับ/ผู้ใช้งาน
│   ├── emergency-history.tsx
│   ├── map.tsx              # หน้าจอแผนที่หลัก
│   └── +not-found.tsx
├── src/
│   ├── components/          # ส่วนประกอบ UI สำหรับ Emergency, Network Status ฯลฯ
│   ├── contexts/            # AuthContext, EmergencyContext
│   ├── services/            # เรียกใช้งาน Supabase / API ต่าง ๆ
│   ├── utils/               # ฟังก์ชันช่วยเหลือทั่วไป (เช่นนำทาง)
│   ├── polyfills/           # ปรับ environment ให้ Supabase ใช้งานใน RN ได้
│   └── types.ts             # TypeScript types สำหรับ Student, Driver, Route, RFID ฯลฯ
├── assets/                  # ฟอนต์และรูปภาพ
├── components/              # คอมโพเนนต์ JS เดิม (รุ่นก่อนแยกเข้า src/)
├── .env.example             # ตัวอย่างการตั้งค่า Supabase สำหรับ Expo
└── package.json
```

### 1.3 ฟีเจอร์หลักของแอปคนขับ

- **การยืนยันตัวตน (Authentication)**  
  ใช้ระบบ Auth ของ Supabase โดยมี `AuthContext` ดูแล session และจัดการการ login/logout พร้อมกลไก retry และ recover session เพื่อป้องกันปัญหา token หมดอายุหรือเครือข่ายไม่เสถียร

- **แดชบอร์ดสถานะรถ (Driver Dashboard)**  
  หน้า `home` แสดงสถานะการเดินทางปัจจุบันของรถ เช่น
  - รอออกเดินทาง
  - เริ่มออกเดินทาง
  - ถึงโรงเรียน
  - รอรับกลับบ้าน
  - จบการเดินทาง  
  พร้อมสถิติจำนวนเด็กบนรถ/ลงรถ, ระยะทาง, เวลาโดยประมาณ และข้อมูลวันที่–เวลาแบบเรียลไทม์

- **การติดตามนักเรียนและการสแกนบัตร**  
  ประมวลผลเหตุการณ์สแกนบัตร RFID (ขึ้น/ลงรถ, ขาไป/ขากลับ, จุดรับ–ส่ง) เชื่อมโยงกับข้อมูลนักเรียน, เส้นทาง และสถิติในแต่ละรอบการเดินทาง

- **การจัดการนักเรียนและบัตร RFID**  
  ส่วนของเมนู `manage` สำหรับ
  - ลงทะเบียน/แก้ไขข้อมูลนักเรียน
  - ผูกบัตร RFID กับนักเรียนและกำหนดวันหมดอายุ
  - ตรวจสอบสถานะบัตรและบันทึกการใช้งานล่าสุด

- **การตรวจสอบนักเรียนที่ยังไม่ขึ้นรถ**  
  ระบบตรวจสอบโดยอัตโนมัติเมื่อตั้งสถานะ `รอรับกลับบ้าน` และแจ้งเตือนหากมีนักเรียนที่ควรขึ้นรถแต่ยังไม่สแกนบัตร โดยดึงข้อมูลจาก Supabase แล้วกรองตามใบลาที่ได้รับการอนุมัติ

- **การบันทึกและรีเซ็ตสถิติแต่ละวัน**  
  ใช้ `AsyncStorage` เก็บสถิติ เช่น
  - จำนวนเด็กทั้งหมด
  - จำนวนที่ขึ้น/ลงรถ ขาไป–ขากลับ  
  เมื่อสิ้นสุดการเดินทาง ระบบจะรีเซ็ตสถิติและสถานะต่าง ๆ เตรียมพร้อมสำหรับวันถัดไป

- **ระบบแจ้งเตือนผ่าน LINE Bot**  
  เมื่อสถานะรถมีการเปลี่ยนแปลง แอปจะเรียก API ไปยังบริการ `driver-status-notification` เพื่อส่งข้อความแจ้งเตือนไปยัง LINE (เช่น ผู้ปกครอง)

### 1.4 การตั้งค่าและใช้งาน driver-app

#### ติดตั้งและรันในโหมดพัฒนา

```bash
cd driver-app
npm install
npx expo start
```

สามารถเปิดแอปผ่าน

- Expo Go (มือถือ)
- Android Emulator
- iOS Simulator

#### การตั้งค่า Environment Variables

สร้างไฟล์ `.env` ในโฟลเดอร์ `driver-app` โดยอ้างอิงจากไฟล์ตัวอย่าง `.env.example`

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url_here
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# (ตัวเลือก) API Base URL สำหรับเรียก LINE Bot / Backend อื่น ๆ
# EXPO_PUBLIC_API_BASE_URL=https://your-vercel-app-url.vercel.app/api
```

> ค่าของ `EXPO_PUBLIC_*` จะถูกใช้ทั้งในฝั่งแอปและเว็บ (ถ้า build เป็น web)

---

## 2. safety-bus-bot – LINE Bot และ LIFF (Vercel)

โฟลเดอร์ `safety-bus-bot` เป็นส่วนของ **LINE Bot + LIFF Application** ที่ใช้สื่อสารกับผู้ปกครอง/บุคลากร ผ่านแพลตฟอร์ม LINE และเชื่อมต่อกับฐานข้อมูล Supabase

ภายในมีโฟลเดอร์ `vercel-deploy/` ซึ่งเป็นโครงสร้างที่เตรียมไว้สำหรับ deploy ขึ้น **Vercel** โดยเฉพาะ

### 2.1 โครงสร้างสำคัญ

โครงสร้างจริงอาจมีไฟล์เพิ่มเติมจากตัวอย่าง README เดิม แต่แนวคิดหลักคือ

- `api/` – Serverless Functions บน Vercel เช่น
  - Webhook ของ LINE (`webhook.mjs`)
  - Endpoint สำหรับแจ้งเตือนเหตุฉุกเฉิน/สถานะรถ
  - Endpoint สำหรับใบลาของนักเรียน (ส่งลา, ยกเลิก, ดูรายการ)
- `lib/` – โมดูล core เช่น
  - การเชื่อมต่อฐานข้อมูล (`db.js`)
  - ตัวจัดการข้อความและ event ของ LINE (`handlers.js`, `line.js`)
  - การจัดการ Rich Menu (`menu.js`)
  - ฟังก์ชันสำหรับดึง/จัดรูปข้อมูลนักเรียน (`student-data.js`)
- `assets/` / `public/` – ไฟล์ภาพและ JavaScript ที่ใช้กับหน้า LIFF เช่น
  - Form ใบลา
  - หน้าแผนที่ตำแหน่งรถ (ถ้ามี)
- `vercel.json` – ไฟล์ตั้งค่าการ deploy บน Vercel

### 2.2 เทคโนโลยีหลัก

- Node.js 18+ (ตามที่กำหนดใน `engines`)
- `express` 5.x สำหรับ routing บางส่วน (ในโหมด local / serverless adapter)
- `@line/bot-sdk` สำหรับเชื่อมต่อกับ LINE Messaging API
- `@supabase/supabase-js` สำหรับเชื่อม Supabase
- `axios` สำหรับเรียก API ภายนอกเพิ่มเติม

### 2.3 ฟีเจอร์หลักของ LINE Bot / LIFF

- แจ้งเตือนเหตุฉุกเฉินหรือสถานะการเดินรถไปยังผู้ปกครองผ่าน LINE
- ฟอร์ม LIFF สำหรับ
  - ส่งข้อมูลใบลาของนักเรียน
  - ยกเลิกใบลา
  - ตรวจสอบสถานะใบลา
- ฟังก์ชัน Account Linking เชื่อม LINE User กับข้อมูลนักเรียนในฐานข้อมูล
- การดึงข้อมูลสถานะนักเรียน/รถ เพื่อแสดงผลแบบเรียลไทม์บน LIFF หรือข้อความ LINE

### 2.4 การตั้งค่าและ deploy บน Vercel

การพัฒนาและ deploy (อ้างอิง/ปรับปรุงจาก README เดิม)

```bash
cd safety-bus-bot/vercel-deploy
npm install
```

- สำหรับการทดสอบ local สามารถรันสคริปต์ที่เตรียมไว้ (ถ้ามี เช่น dev server) หรือใช้ `npm start` เพื่อตรวจสอบโครงสร้างพื้นฐาน
- สำหรับการ deploy:
  1. Push โค้ดขึ้น Git repository
  2. เชื่อมต่อ repository เข้ากับ Vercel
  3. กำหนด Environment Variables ใน Vercel
  4. กด Deploy หรือใช้ระบบ Auto Deploy ของ Vercel

#### Environment Variables หลัก (บน Vercel)

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `LIFF_ID`
- `LIFF_CANCEL_ID`

> ชื่อตัวแปรด้านบนอ้างอิงจาก README ของ `safety-bus-bot` ซึ่งสามารถขยายเพิ่มเติมได้ตามโค้ดจริงใน `lib/config.js` หรือไฟล์ตั้งค่าอื่น ๆ

---

## 3. supabase – เครื่องมือ/สคริปต์สำหรับงานฐานข้อมูล

โฟลเดอร์ `supabase/` ใช้สำหรับรวบรวมสคริปต์ Node.js ที่เชื่อมต่อกับ **Supabase** เพื่อวิเคราะห์หรือจัดการข้อมูล เช่น ตรวจสอบความถูกต้องของ schema, วิเคราะห์ข้อมูลการขึ้น–ลงรถย้อนหลัง เป็นต้น

### 3.1 เทคโนโลยี

- Node.js
- `@supabase/supabase-js`
- `dotenv`
- `node-fetch`

### 3.2 การใช้งานเบื้องต้น

```bash
cd supabase
npm install
```

สร้างไฟล์ `.env` (ถ้าสคริปต์ต้องใช้งาน) แล้วกำหนดค่าการเชื่อมต่อ Supabase เช่นเดียวกับที่ใช้ในส่วนอื่นของระบบ

---

## 4. การเริ่มต้นใช้งานทั้งระบบ (Development Workflow)

เพื่อพัฒนาหรือทดสอบระบบครบทั้งฝั่งคนขับและผู้ปกครอง แนะนำ workflow โดยสรุปดังนี้

1. **เตรียม Supabase Project**
   - สร้างโปรเจกต์บน Supabase
   - กำหนดตารางหลัก เช่น `students`, `driver_bus`, `pickup_dropoff`, `leave_requests` และตารางที่เกี่ยวข้องกับ RFID ตาม schema ของระบบ
   - นำค่า **Project URL** และ **Anon Key** มาใช้ใน `.env` ของ `driver-app` และ `safety-bus-bot`

2. **ตั้งค่าและรันแอปคนขับ (`driver-app`)**
   - ตั้งค่า `.env` ตามหัวข้อ 1.4
   - รัน `npx expo start`
   - ทดสอบการเข้าสู่ระบบ, แดชบอร์ดสถานะ และการเปลี่ยนสถานะเที่ยวรถ

3. **ตั้งค่า LINE Bot และ LIFF (`safety-bus-bot`)**
   - สร้าง LINE Messaging API Channel และ LIFF App
   - กำหนด URL ของ Vercel deployment เป็น Endpoint ของ LINE Webhook / LIFF URL
   - ตั้งค่า Environment Variables ตามหัวข้อ 2.4

4. **ทดสอบการทำงานร่วมกัน**
   - เปลี่ยนสถานะรถจากแอปคนขับ และตรวจสอบว่า LINE แจ้งเตือนถูกส่งถึงผู้ปกครอง
   - ทดสอบฟอร์มใบลา/ยกเลิกใบลาผ่าน LIFF และดูผลในฐานข้อมูล Supabase และแอปคนขับ

---

## 5. แนวทางการพัฒนาและมาตรฐานโค้ด

- ใช้ **TypeScript** เป็นหลักในส่วนที่รองรับ เพื่อให้ type ชัดเจน เช่น `src/types.ts` ใน `driver-app`
- แยก **contexts**, **services**, **components** และ **utils** เพื่อให้โค้ดอ่านง่ายและบำรุงรักษาได้ง่าย
- มีการใช้ **retry logic** และ **session recovery** สำหรับการเรียก Supabase เพื่อลดผลกระทบจากปัญหาเครือข่าย
- การจัดเก็บค่าคงที่ เช่น สี และค่าคอนฟิก UI แยกไว้ในไฟล์เฉพาะ (`colors.ts`, `constants/Colors.ts` ฯลฯ)

---

## 6. การทดสอบและการนำขึ้นใช้งานจริง

รูปแบบการทดสอบและ deployment ที่แนะนำ:

- **ฝั่งแอปคนขับ (driver-app)**
  - ทดสอบบนอุปกรณ์จริง (Android / iOS) ด้วย Expo Go ก่อน build เป็นแอปจริง
  - ทดสอบกรณีต่าง ๆ ของการเปลี่ยนสถานะเที่ยวรถ เช่น
    - ยังมีนักเรียนที่ไม่ขึ้นรถแต่กด “ถึงโรงเรียน”
    - ยังเช็กลงรถไม่ครบแต่กด “รอรับกลับบ้าน” หรือ “จบการเดินทาง”

- **ฝั่ง LINE Bot / LIFF (safety-bus-bot)**
  - ทดสอบ Webhook และ LIFF บน LINE Developer Console ในโหมด staging ก่อนเปิดใช้จริง
  - ตรวจสอบว่า Environment Variables ถูกตั้งค่าถูกต้องในทุก environment (dev, staging, production)

- **ฐานข้อมูล (Supabase)**
  - ทดสอบ constraints, trigger และ policy (RLS) ให้เหมาะสมกับการเข้าถึงข้อมูลของแต่ละบทบาท (คนขับ, ผู้ปกครอง, admin)

---

## 7. สรุป

โปรเจกต์ **SAFETY BUS** นี้ถูกออกแบบให้เป็นโซลูชันครบวงจรสำหรับเพิ่มความปลอดภัยในการเดินทางของนักเรียนด้วยรถโรงเรียน ประกอบด้วย

- แอปคนขับที่ใช้งานง่ายและรองรับสถานการณ์จริง (ขาไป–ขากลับ, ตรวจสอบนักเรียน, เหตุฉุกเฉิน)
- LINE Bot/LIFF ที่ช่วยให้ผู้ปกครองและโรงเรียนรับรู้สถานะได้แบบเรียลไทม์และส่งใบลาได้สะดวก
- Backend บน Supabase ที่เก็บและประมวลผลข้อมูลอย่างเป็นระบบ

ด้วยสถาปัตยกรรมที่แยกเป็นโมดูลชัดเจนและใช้เทคโนโลยีสมัยใหม่ ระบบนี้สามารถต่อยอดทั้งในด้านฟีเจอร์ (เช่น ระบบวิเคราะห์เส้นทาง, การแจ้งเตือนเชิงคาดการณ์) และการขยายไปยังโรงเรียน/เส้นทางเพิ่มเติมได้ในอนาคต

