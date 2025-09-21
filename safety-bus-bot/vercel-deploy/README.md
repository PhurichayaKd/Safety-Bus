# Safety Bus LIFF App - Vercel Deployment

## Overview
LIFF (LINE Front-end Framework) App สำหรับระบบแจ้งลาของ Safety Bus ที่ deploy บน Vercel พร้อม API backend

## Features
- 📅 เลือกวันที่แจ้งลา
- ✅ ส่งคำขอลาผ่าน LINE Bot API
- 🔒 ใช้ LIFF SDK สำหรับการยืนยันตัวตน
- 🚀 Deploy บน Vercel พร้อม Serverless Functions

## Project Structure
```
vercel-deploy/
├── api/
│   └── submit-leave.js     # Vercel Function สำหรับจัดการคำขอลา
├── css/
│   └── date-picker.css     # Styles สำหรับ date picker
├── js/
│   └── date-picker.js      # JavaScript สำหรับ LIFF App
├── index.html              # หน้าหลักของ LIFF App
├── package.json            # Dependencies
├── vercel.json             # Vercel configuration
└── .env.example            # Environment variables template
```

## Setup Instructions

### 1. Environment Variables
สร้างไฟล์ `.env.local` สำหรับ local development หรือตั้งค่าใน Vercel Dashboard:

```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm install -g vercel
vercel --prod
```

#### Option B: GitHub Integration
1. Push โค้ดไปยัง GitHub repository
2. เชื่อมต่อ repository กับ Vercel
3. ตั้งค่า environment variables ใน Vercel Dashboard
4. Deploy อัตโนมัติ

### 3. LINE Console Configuration
1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Channel ของคุณ
3. ไปที่ LIFF tab
4. อัพเดท Endpoint URL เป็น: `https://your-vercel-app.vercel.app`
5. ตั้งค่า Scope: `profile`, `openid`

## API Endpoints

### POST /api/submit-leave
ส่งคำขอลา

**Request Body:**
```json
{
  "userId": "LINE_USER_ID",
  "selectedDate": "2024-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Leave request submitted successfully",
  "date": "15 มกราคม 2567"
}
```

## Development

### Local Development
```bash
npm install
npm start
```

### Testing
1. เปิด LIFF App ใน LINE
2. เลือกวันที่ที่ต้องการลา
3. กดยืนยัน
4. ตรวจสอบข้อความตอบกลับใน LINE Chat

## Troubleshooting

### LIFF ไม่สามารถเชื่อมต่อได้
- ตรวจสอบ LIFF ID ใน `date-picker.js`
- ตรวจสอบ Endpoint URL ใน LINE Console

### API Error
- ตรวจสอบ Environment Variables
- ตรวจสอบ LINE Channel Access Token
- ดู logs ใน Vercel Dashboard

### CORS Issues
- API มีการตั้งค่า CORS headers แล้ว
- ตรวจสอบ domain ใน Vercel settings

## Production Checklist
- [ ] ตั้งค่า Environment Variables ใน Vercel
- [ ] อัพเดท LIFF Endpoint URL ใน LINE Console
- [ ] ทดสอบการทำงานใน LINE App
- [ ] ตรวจสอบ logs และ monitoring

## Support
หากมีปัญหาการใช้งาน กรุณาตรวจสอบ:
1. Vercel Function logs
2. Browser console errors
3. LINE Bot webhook logs