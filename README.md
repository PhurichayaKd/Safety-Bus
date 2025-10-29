# Project-IoT: Safety Bus System

ระบบความปลอดภัยรถรับ-ส่งนักเรียน (Safety Bus System) ประกอบด้วย 2 ส่วนหลักที่เชื่อมต่อกับฐานข้อมูล Supabase (PostgreSQL) และ LINE Messaging API เพื่อให้ผู้ขับรถและผู้ปกครองใช้งานได้สะดวกและปลอดภัย

- ส่วนที่ 1: Driver App (React Native + Expo)
- ส่วนที่ 2: Safety Bus Bot (LINE Bot บน Vercel Serverless)

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Driver App    │    │   Supabase DB   │    │  LINE Bot API   │
│  (React Native) │◄──►│   (PostgreSQL)  │◄──►│   (Webhook)     │
│                 │    │   + Realtime    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   คนขับรถ       │    │   ข้อมูลนักเรียน │    │   ผู้ปกครอง     │
│   - เช็คชื่อ     │    │   - การขึ้น-ลง   │    │   - แจ้งเตือน    │
│   - อัปเดตสถานะ │    │   - สถานะการลา  │    │   - ขอลา        │
│   - ดูแผนที่     │    │   - ตำแหน่งรถ    │    │   - ติดตาม      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📂 โครงสร้างโปรเจกต์

```
Project-IoT/
├── driver-app/                  # แอปคนขับ (Expo)
│   ├── app/                     # Expo Router pages
│   ├── src/                     # Components, contexts, services
│   ├── services/                # EmergencyService, LineNotificationService
│   ├── assets/                  # รูปภาพและฟอนต์
│   ├── vercel.json              # การตั้งค่า (สำหรับ web preview เท่านั้น)
│   └── .env.example             # ตัวอย่างตัวแปรสภาพแวดล้อม
├── safety-bus-bot/
│   └── vercel-deploy/           # LINE Bot (Vercel Serverless)
│       ├── api/                 # Serverless functions (webhook, student, leave)
│       ├── lib/                 # โค้ดแกน เช่น line.js, handlers.js, db.js
│       ├── assets/              # รูป Rich Menu และไฟล์หน้าเว็บ
│       └── vercel.json          # การตั้งค่า Vercel
├── supabase/                    # สคริปต์จัดการสถานะข้อมูล
├── System-Testing-Guide.md      # คู่มือการทดสอบระบบ
├── Troubleshooting-Guide.md     # คู่มือแก้ปัญหา
├── LINE-Bot-Migration-Guide.md  # คู่มือการย้ายระบบ LINE Bot
├── LINE-Bot-UI-UX-Guide.md      # แนวทางออกแบบประสบการณ์ผู้ใช้ของบอท
├── Production-Deployment-Guide.md # คู่มือ Deploy ระบบจริง
├── Driver-App-Migration-Guide.md  # คู่มือย้ายระบบฝั่งคนขับ
└── README.md                    # เอกสารหลักของโปรเจกต์
```

## 🔧 เทคโนโลยีที่ใช้

- Frontend (Mobile): React Native (Expo), TypeScript, Expo Router
- Backend (Bot): Node.js 18+, Vercel Serverless Functions, LINE Messaging API SDK
- Database & Services: Supabase (PostgreSQL, Realtime, Auth, RLS)
- Dev Tools: Git, npm, ESLint, Prettier

## 🔑 ตัวแปรสภาพแวดล้อม

ตั้งค่าตัวแปรในไฟล์ `.env.local` ตามส่วนประกอบต่อไปนี้

- Driver App (`driver-app/.env.local`)
  - `EXPO_PUBLIC_SUPABASE_URL=your_supabase_url`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key`

- Safety Bus Bot (`safety-bus-bot/vercel-deploy/.env.local`)
  - `LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token`
  - `LINE_CHANNEL_SECRET=your_line_channel_secret`
  - `SUPABASE_URL=your_supabase_url`
  - `SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key`
  - `WEBHOOK_URL=your_vercel_webhook_url`

## 🚀 การติดตั้งและการรัน (Development)

ข้อกำหนดเบื้องต้น: ติดตั้ง Node.js 18+, npm, Expo CLI, และ Vercel CLI

- ติดตั้งและรัน Driver App
  ```bash
  cd driver-app
  npm install
  npx expo start
  ```

- ติดตั้งและรัน Safety Bus Bot (Local dev)
  ```bash
  cd safety-bus-bot/vercel-deploy
  npm install
  # รัน local server (ถ้ามี server.js)
  node server.js
  ```

## 🌐 การ Deploy ไปยัง Production

- Deploy LINE Bot ไป Vercel
  ```bash
  cd safety-bus-bot/vercel-deploy
  vercel deploy
  ```

- สร้างแอป Driver App สำหรับการปล่อยใช้งาน (ตาม workflow ของ Expo/Expo Application Services)
  - iOS: `eas build --platform ios`
  - Android: `eas build --platform android`

รายละเอียดขั้นตอนและคำแนะนำเพิ่มเติมดูที่ `Production-Deployment-Guide.md`

## 🌐 API Endpoints (Safety Bus Bot)

- `POST /api/webhook` — LINE Webhook Handler
- `GET /api/get-student` — ดึงข้อมูลนักเรียน
- `POST /api/submit-leave` — ส่งคำขอลา
- `DELETE /api/cancel-leave` — ยกเลิกการลา
- `GET /api/get-leave-requests` — ดึงรายการลา

## 🗄️ โครงสร้างฐานข้อมูล (Supabase)

ตารางหลัก:
- `students` — ข้อมูลนักเรียน
- `drivers` — ข้อมูลคนขับ
- `buses` — ข้อมูลรถ
- `attendance` — บันทึกการขึ้น-ลงรถ
- `leave_requests` — คำขอลา
- `bus_locations` — ตำแหน่งรถแบบ Real-time

ฟีเจอร์ฐานข้อมูล:
- Realtime Subscriptions, Row Level Security (RLS), Triggers

## 📋 ฟีเจอร์หลัก

Driver App:
- เข้าสู่ระบบ, เชื่อมบัญชีคนขับ, ดูรายชื่อ/สถานะนักเรียนแบบเรียลไทม์
- แผนที่ติดตามตำแหน่งรถ, รายงานการใช้งาน, แจ้งเตือน

Safety Bus Bot:
- Rich Menu 4 ปุ่ม (ข้อความธรรมดา, ไม่มี Flex Message)
- ตรวจสอบข้อมูลนักเรียน, ยื่นคำขอลา/ยกเลิก
- การแจ้งเตือนขึ้น-ลงรถและตำแหน่งแบบ Real-time

## 🧪 การทดสอบ

ดูขั้นตอนและกรณีทดสอบใน `System-Testing-Guide.md` และไฟล์ทดสอบที่เกี่ยวข้องในรากโปรเจกต์ เช่น:
- `test-emergency-api.js`, `test-emergency-notification.js`, `test-line-linking.js`

## 🆘 การแก้ไขปัญหา

แนวทางแก้ไขปัญหาพบบ่อย (การเชื่อมต่อ, Encoding, Performance, การตั้งค่าตัวแปรแวดล้อม) ดูใน `Troubleshooting-Guide.md`

## 📖 เอกสารและคู่มือที่เกี่ยวข้อง

- `Complete-Project-Guide.md` — ภาพรวมโปรเจกต์แบบครบถ้วน
- `Driver-App-Migration-Guide.md` — ย้ายระบบฝั่ง Driver App
- `LINE-Bot-Migration-Guide.md` — ย้ายระบบ LINE Bot
- `LINE-Bot-UI-UX-Guide.md` — แนวทาง UI/UX สำหรับ LINE Bot
- `Production-Deployment-Guide.md` — Deploy ระบบจริง
- `System-Testing-Guide.md` — ทดสอบระบบ
- `Troubleshooting-Guide.md` — แก้ไขปัญหา
- `line-bot-setup.md` — ตั้งค่า LINE Bot เบื้องต้น
- `proximity_notification_guide.md` — ระบบแจ้งเตือนตามระยะทาง

## 🤝 การมีส่วนร่วม (Contributing)

ยินดีรับคำแนะนำและ Pull Request เพื่อปรับปรุงระบบ โปรดทำตามมาตรฐานโค้ดและแนวทางในเอกสารประกอบ

## 📜 License

โครงการนี้เป็นส่วนหนึ่งของงานวิจัย/การพัฒนาระบบภายใน โปรดติดต่อทีมพัฒนาเพื่อขอข้อมูลสิทธิ์และการใช้งานเพิ่มเติม

---

สถานะล่าสุด: ระบบ LINE Bot พร้อม Deploy บน Vercel, Driver App อยู่ระหว่างการพัฒนาฟีเจอร์ Real-time และการแจ้งเตือน เพิ่มเติมดูรายละเอียดในเอกสารประกอบด้านบน