# Vercel Deployment Setup Guide

## Environment Variables Configuration

เพื่อให้แอปพลิเคชันทำงานได้อย่างถูกต้องบน Vercel คุณจำเป็นต้องตั้งค่า Environment Variables ดังต่อไปนี้:

### 1. Supabase Configuration

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**วิธีหา Supabase URL และ Key:**
1. เข้าไปที่ [Supabase Dashboard](https://app.supabase.com)
2. เลือกโปรเจคของคุณ
3. ไปที่ Settings > API
4. คัดลอก Project URL และ anon public key

### 2. LINE Bot Configuration

```
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
```

**วิธีหา LINE Bot Credentials:**
1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Provider และ Channel ของคุณ
3. ไปที่แท็บ "Messaging API"
4. คัดลอก Channel access token และ Channel secret

### 3. LIFF Configuration

```
LIFF_ID=2006508893-Aw6Ej5Vy
```

**วิธีหา LIFF ID:**
1. ใน LINE Developers Console
2. ไปที่แท็บ "LIFF"
3. คัดลอก LIFF ID ของแอปที่คุณสร้าง

## การตั้งค่าใน Vercel Dashboard

### ขั้นตอนการเพิ่ม Environment Variables:

1. **เข้าไปที่ Vercel Dashboard**
   - ไปที่ [vercel.com](https://vercel.com)
   - เลือกโปรเจคของคุณ

2. **ไปที่ Settings**
   - คลิกที่แท็บ "Settings"
   - เลือก "Environment Variables" จากเมนูด้านซ้าย

3. **เพิ่ม Environment Variables**
   - คลิก "Add New"
   - ใส่ชื่อตัวแปร (เช่น `SUPABASE_URL`)
   - ใส่ค่าของตัวแปร
   - เลือก Environment: `Production`, `Preview`, และ `Development`
   - คลิก "Save"

4. **ทำซ้ำสำหรับทุกตัวแปร**
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `LIFF_ID`

5. **Redeploy โปรเจค**
   - ไปที่แท็บ "Deployments"
   - คลิก "Redeploy" บน deployment ล่าสุด
   - หรือ push code ใหม่เพื่อให้ auto-deploy

## การตรวจสอบการตั้งค่า

### ตรวจสอบว่า Environment Variables ถูกตั้งค่าแล้ว:

1. ไปที่ Vercel Dashboard > Settings > Environment Variables
2. ตรวจสอบว่าทุกตัวแปรมีอยู่และมีค่าที่ถูกต้อง
3. ตรวจสอบว่าตัวแปรถูกเลือกสำหรับ Production environment

### ทดสอบการทำงาน:

1. เปิดแอปบน Vercel URL
2. ทดสอบการเข้าสู่ระบบผ่าน LINE
3. ทดสอบการส่งฟอร์มลา
4. ตรวจสอบ Vercel Function Logs หากมีปัญหา

## การแก้ไขปัญหา

### หากแอปไม่ทำงาน:

1. **ตรวจสอบ Function Logs**
   - ไปที่ Vercel Dashboard > Functions
   - ดู logs ของ `/api/submit-leave`

2. **ตรวจสอบ Environment Variables**
   - ตรวจสอบว่าทุกตัวแปรมีค่าที่ถูกต้อง
   - ตรวจสอบว่าไม่มีช่องว่างหรือตัวอักษรพิเศษที่ไม่ต้องการ

3. **ตรวจสอบ Supabase Connection**
   - ทดสอบการเชื่อมต่อ Supabase ใน local environment ก่อน
   - ตรวจสอบว่า URL และ Key ถูกต้อง

4. **ตรวจสอบ LINE Bot Settings**
   - ตรวจสอบว่า Webhook URL ชี้ไปที่ Vercel URL ที่ถูกต้อง
   - ตรวจสอบว่า LIFF URL ถูกตั้งค่าเป็น Vercel URL

## หมายเหตุ

- Environment Variables จะมีผลหลังจาก redeploy เท่านั้น
- ห้ามเปิดเผย Environment Variables ในโค้ดหรือ commit ลง Git
- ใช้ `.env.local` สำหรับการพัฒนาในเครื่อง
- ตรวจสอบให้แน่ใจว่า Supabase และ LINE Bot มี permissions ที่เหมาะสม