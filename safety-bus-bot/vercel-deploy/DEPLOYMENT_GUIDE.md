# 🚀 คู่มือการ Deploy ไปยัง Vercel

## 📋 ขั้นตอนการ Deploy

### 1. ตั้งค่า Environment Variables ใน Vercel

ไปที่ Vercel Dashboard → Project Settings → Environment Variables และเพิ่มตัวแปรต่อไปนี้:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
NODE_ENV=production
```

### 2. ตรวจสอบไฟล์ที่สำคัญ

- ✅ `vercel.json` - การตั้งค่า Vercel
- ✅ `package.json` - Dependencies
- ✅ `api/submit-leave.js` - API endpoint หลัก
- ✅ `js/leave-form.js` - JavaScript สำหรับฟอร์ม
- ✅ `index.html` - หน้าหลัก

### 3. Deploy

```bash
# ติดตั้ง Vercel CLI (ถ้ายังไม่มี)
npm i -g vercel

# Deploy
vercel --prod
```

### 4. ทดสอบหลัง Deploy

1. เปิด URL ที่ได้จาก Vercel
2. ทดสอบฟอร์มแจ้งลา
3. ตรวจสอบ Vercel Function Logs
4. ตรวจสอบข้อมูลใน Supabase

## 🔧 การแก้ไขปัญหา

### ปัญหา: JavaScript ไม่ทำงาน
- ตรวจสอบ Console ในเบราว์เซอร์
- ตรวจสอบว่า DOM elements โหลดเสร็จแล้ว

### ปัญหา: ไม่สามารถบันทึกข้อมูลได้
- ตรวจสอบ Environment Variables ใน Vercel
- ตรวจสอบ Supabase connection
- ดู Vercel Function Logs

### ปัญหา: LIFF ไม่ทำงาน
- ตรวจสอบ LIFF ID
- ตรวจสอบ Domain ใน LINE Developers Console

## 📊 การตรวจสอบ Logs

```bash
# ดู Vercel Function Logs
vercel logs --follow
```

## 🔄 การอัปเดต

เมื่อมีการแก้ไขโค้ด:

```bash
# Push ไปยัง Git repository
git add .
git commit -m "Fix: แก้ไขปัญหาฟอร์มแจ้งลา"
git push

# Vercel จะ auto-deploy หรือใช้คำสั่ง
vercel --prod
```