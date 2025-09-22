# Project-IoT: Safety Bus System

โปรเจคนี้เป็นระบบ **ความปลอดภัยรถรับ-ส่งนักเรียน (Safety Bus System)** ที่ออกแบบมาเพื่อเพิ่มความปลอดภัยและความสะดวกในการจัดการรถรับ-ส่งนักเรียน  
แบ่งออกเป็น 2 ส่วนหลัก คือ **แอพฝั่งคนขับ (Driver App)** และ **บอทไลน์ (Safety Bus Bot)**

## 🏗️ System Architecture

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

---

## 📱 Driver App (React Native + Expo)

### 📂 โครงสร้างโฟลเดอร์
```
driver-app/
├── app/                    # App Router (Expo Router)
│   ├── (tabs)/             # Tab Navigation
│   │   ├── home.tsx        # หน้าแรก - ภาพรวมระบบ
│   │   ├── map-live.tsx    # แผนที่แบบ Real-time
│   │   └── passenger-list.tsx # รายชื่อผู้โดยสาร
│   ├── auth/               # Authentication
│   │   ├── login.tsx       # หน้าเข้าสู่ระบบ
│   │   └── link-account.tsx # เชื่อมโยงบัญชี
│   ├── driver-info/        # ข้อมูลคนขับ
│   │   └── bus-form.tsx    # ฟอร์มข้อมูลรถ
│   ├── manage/             # จัดการข้อมูล
│   │   ├── students/       # จัดการนักเรียน
│   │   ├── reports/        # รายงาน
│   │   └── cards/          # บัตรนักเรียน
│   └── user-info/          # ข้อมูลผู้ใช้
├── src/
│   ├── components/         # React Components
│   ├── contexts/           # React Context (AuthContext)
│   ├── services/           # API Services (Supabase)
│   └── navigation/         # Navigation Logic
├── assets/                 # รูปภาพและ Fonts
└── hooks/                  # Custom React Hooks
```

### 🔧 เทคโนโลยีและ Dependencies
- **Framework**: React Native (Expo SDK 52)
- **Language**: TypeScript
- **Navigation**: Expo Router
- **Database**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **Maps**: React Native Maps
- **State Management**: React Context + Hooks

### 🚀 การติดตั้งและรัน
```bash
cd driver-app
npm install
npx expo start

# สำหรับ iOS
npx expo start --ios

# สำหรับ Android
npx expo start --android
```

### 🔑 Environment Variables (.env.local)
```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 📋 ฟีเจอร์หลัก
1. **Authentication System**
   - เข้าสู่ระบบด้วย Email/Password
   - เชื่อมโยงบัญชีกับข้อมูลคนขับ
   - Session Management

2. **Student Management**
   - เช็คชื่อนักเรียนขึ้น-ลงรถ
   - ดูรายชื่อผู้โดยสารแบบ Real-time
   - จัดการข้อมูลนักเรียน

3. **Real-time Tracking**
   - แผนที่แสดงตำแหน่งรถแบบ Real-time
   - อัปเดตสถานะการเดินทาง
   - แจ้งเตือนผู้ปกครอง

4. **Reports & Analytics**
   - รายงานการขึ้น-ลงรถ
   - สถิติการใช้งาน
   - ประวัติการเดินทาง

---

## 🤖 Safety Bus Bot (LINE Bot)

### 📂 โครงสร้างโฟลเดอร์
```
safety-bus-bot/vercel-deploy/
├── api/                    # API Endpoints (Vercel Functions)
│   ├── webhook.mjs         # LINE Webhook Handler
│   ├── get-student.js      # ดึงข้อมูลนักเรียน
│   ├── submit-leave.js     # ส่งคำขอลา
│   ├── cancel-leave.js     # ยกเลิกการลา
│   └── get-leave-requests.js # ดึงรายการลา
├── lib/                    # Core Libraries
│   ├── line.js             # LINE API Functions
│   ├── menu.js             # Rich Menu & Quick Reply
│   ├── handlers.js         # Event Handlers
│   ├── db.js               # Database Connection
│   └── student-data.js     # Student Data Management
├── assets/                 # Rich Menu Images
│   ├── richmenu-image.jpg
│   └── richmenu-image.svg
├── css/                    # Stylesheets
├── js/                     # Frontend JavaScript
├── server.js               # Local Development Server
├── setup-richmenu.js       # Rich Menu Setup Script
└── vercel.json             # Vercel Configuration
```

### 🔧 เทคโนโลยีและ Dependencies
- **Runtime**: Node.js 18+
- **Framework**: Express.js (สำหรับ local dev)
- **Deployment**: Vercel (Serverless Functions)
- **LINE SDK**: @line/bot-sdk
- **Database**: Supabase (PostgreSQL)
- **Environment**: dotenv

### 🚀 การติดตั้งและรัน
```bash
cd safety-bus-bot/vercel-deploy
npm install

# รันเซิร์ฟเวอร์ local
node server.js

# ตั้งค่า Rich Menu
node setup-richmenu.js

# Deploy ไป Vercel
vercel deploy
```

### 🔑 Environment Variables (.env.local)
```bash
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
WEBHOOK_URL=your_webhook_url
```

### 📋 ฟีเจอร์หลัก
1. **Rich Menu System**
   - เมนูหลัก 4 ปุ่ม: ประวัติ, ฟอร์มลา, ตำแหน่งรถ, ติดต่อ
   - Quick Reply สำหรับการโต้ตอบ
   - ข้อความธรรมดา (ไม่ใช่ Flex Message)

2. **Student Information**
   - ค้นหาข้อมูลนักเรียนด้วย LINE User ID
   - แสดงประวัติการขึ้น-ลงรถ
   - สถานะการลาปัจจุบัน

3. **Leave Request System**
   - ฟอร์มแจ้งลาออนไลน์ (LIFF)
   - ประเภทการลา: ป่วย, ลากิจ, ขาดเรียน
   - ยกเลิกการลาได้

4. **Real-time Notifications**
   - แจ้งเตือนเมื่อนักเรียนขึ้น-ลงรถ
   - อัปเดตตำแหน่งรถแบบ Real-time
   - แจ้งเตือนการอนุมัติ/ปฏิเสธการลา

### 🌐 API Endpoints
- `POST /api/webhook` - LINE Webhook
- `GET /api/get-student` - ดึงข้อมูลนักเรียน
- `POST /api/submit-leave` - ส่งคำขอลา
- `DELETE /api/cancel-leave` - ยกเลิกการลา
- `GET /api/get-leave-requests` - ดึงรายการลา

---

## 🗄️ Database Schema (Supabase)

### Tables
1. **students** - ข้อมูลนักเรียน
2. **drivers** - ข้อมูลคนขับ
3. **buses** - ข้อมูลรถ
4. **attendance** - บันทึกการขึ้น-ลงรถ
5. **leave_requests** - คำขอลา
6. **bus_locations** - ตำแหน่งรถแบบ Real-time

### Real-time Features
- **Subscriptions**: อัปเดตข้อมูลแบบ Real-time
- **Row Level Security**: ความปลอดภัยระดับแถว
- **Triggers**: อัตโนมัติสำหรับการแจ้งเตือน

---

## 🔄 สถานะปัจจุบันของโปรเจค

### ✅ สิ่งที่เสร็จแล้ว
1. **Driver App**
   - โครงสร้างแอพพื้นฐาน (Expo Router)
   - Authentication System
   - Supabase Integration
   - UI Components หลัก

2. **LINE Bot**
   - Webhook Handler สมบูรณ์
   - Rich Menu System (ไม่มี Flex Message)
   - Leave Request System (LIFF)
   - Database Integration
   - Vercel Deployment Ready

3. **Database**
   - Schema Design
   - Real-time Subscriptions
   - Security Policies

### 🚧 กำลังพัฒนา
1. **Driver App**
   - Real-time Map Integration
   - Student Check-in/out Features
   - Push Notifications
   - Report Generation

2. **LINE Bot**
   - Advanced Analytics
   - Multi-language Support
   - Admin Dashboard

### 📋 ขั้นตอนต่อไป
1. เชื่อมต่อ Driver App กับ Real-time Database
2. พัฒนาระบบ GPS Tracking
3. เพิ่มระบบ Push Notifications
4. สร้าง Admin Dashboard
5. Testing และ Deployment

---

## 🛠️ เทคโนโลยีที่ใช้

### Frontend (Mobile)
- **React Native (Expo)** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript
- **Expo Router** - File-based navigation
- **React Native Maps** - Map integration

### Backend (Bot)
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **LINE Messaging API SDK** - LINE Bot integration
- **Vercel** - Serverless deployment

### Database & Services
- **Supabase** - Backend-as-a-Service
  - PostgreSQL Database
  - Real-time Subscriptions
  - Authentication
  - Row Level Security
  - Storage

### Development Tools
- **Git** - Version control
- **npm** - Package management
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## 📞 การติดต่อและสนับสนุน

สำหรับคำถามหรือปัญหาในการใช้งาน กรุณาติดต่อทีมพัฒนา

**สถานะล่าสุด**: ระบบ LINE Bot ทำงานปกติ, Rich Menu อัปเดตแล้ว (ไม่มี Flex Message), Driver App อยู่ในขั้นตอนการพัฒนาต่อ