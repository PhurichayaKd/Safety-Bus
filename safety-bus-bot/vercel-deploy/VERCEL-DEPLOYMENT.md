# คำแนะนำการเชื่อมต่อ GitHub กับ Vercel และ Deploy

## ขั้นตอนการ Deploy ผ่าน GitHub + Vercel

### 1. เตรียมความพร้อม

#### ✅ สิ่งที่ต้องมี:
- บัญชี GitHub (ที่มีไฟล์ใน repository แล้ว)
- บัญชี Vercel (สมัครฟรีได้ที่ vercel.com)
- ไฟล์ทั้งหมดใน repository: https://github.com/PhurichayaKd/vercel-deploy

### 2. สมัครและเข้าสู่ระบบ Vercel

#### 2.1 สมัครบัญชี Vercel
1. ไปที่ https://vercel.com
2. คลิก **"Sign Up"**
3. เลือก **"Continue with GitHub"** (แนะนำ)
4. อนุญาตให้ Vercel เข้าถึง GitHub account
5. ยืนยันอีเมล (ถ้าจำเป็น)

#### 2.2 เข้าสู่ระบบ
- หลังจากสมัครเสร็จ จะเข้าสู่ Vercel Dashboard อัตโนมัติ
- หรือไปที่ https://vercel.com/dashboard

### 3. เชื่อมต่อ GitHub Repository กับ Vercel

#### 3.1 สร้างโปรเจกต์ใหม่
1. ใน Vercel Dashboard คลิก **"New Project"**
2. หรือไปที่ https://vercel.com/new

#### 3.2 เลือก Repository
1. ในหน้า "Import Git Repository"
2. ค้นหา **"vercel-deploy"** ใน repository list
3. หรือใส่ URL: `https://github.com/PhurichayaKd/vercel-deploy`
4. คลิก **"Import"** ข้างชื่อ repository

#### 3.3 ตั้งค่าโปรเจกต์
```
Project Name: safety-bus-liff-app
Framework Preset: Other
Root Directory: ./
Build Command: (ปล่อยว่าง)
Output Directory: (ปล่อยว่าง)
Install Command: npm install
```

#### 3.4 Deploy
1. ตรวจสอบการตั้งค่า
2. คลิก **"Deploy"**
3. รอสักครู่ (ประมาณ 1-2 นาที)

### 4. ผลลัพธ์หลังจาก Deploy

#### 4.1 URL ที่ได้รับ
Vercel จะให้ URL ในรูปแบบ:
```
https://safety-bus-liff-app.vercel.app
```
หรือ
```
https://vercel-deploy-xxx.vercel.app
```

#### 4.2 ตรวจสอบการทำงาน
1. คลิกลิงก์ที่ได้รับ
2. ตรวจสอบว่าหน้าเว็บเปิดได้
3. ตรวจสอบว่า CSS และ JavaScript โหลดได้

### 5. การตั้งค่า Custom Domain (ไม่บังคับ)

#### 5.1 เพิ่ม Custom Domain
1. ใน Vercel Dashboard → เลือกโปรเจกต์
2. ไปที่แท็บ **"Settings"**
3. เลือก **"Domains"**
4. คลิก **"Add"** และใส่ domain ที่ต้องการ

### 6. การอัปเดตโค้ด

#### 6.1 Auto Deploy
- ทุกครั้งที่ push โค้ดใหม่ไปยัง GitHub
- Vercel จะ deploy อัตโนมัติ
- ไม่ต้องทำอะไรเพิ่มเติม

#### 6.2 Manual Deploy
1. ใน Vercel Dashboard → เลือกโปรเจกต์
2. ไปที่แท็บ **"Deployments"**
3. คลิก **"Redeploy"**

### 7. การตั้งค่า Environment Variables (ถ้าจำเป็น)

#### 7.1 เพิ่ม Environment Variables
1. ใน Vercel Dashboard → เลือกโปรเจกต์
2. ไปที่แท็บ **"Settings"**
3. เลือก **"Environment Variables"**
4. เพิ่มตัวแปรที่จำเป็น

### 8. การแก้ไขปัญหา

#### 8.1 ปัญหาที่พบบ่อย

**ปัญหา**: Build Failed
- **สาเหตุ**: ไฟล์ package.json มีปัญหา
- **แก้ไข**: ตรวจสอบ syntax ใน package.json

**ปัญหา**: 404 Not Found
- **สาเหตุ**: ไฟล์ index.html ไม่อยู่ใน root directory
- **แก้ไข**: ตรวจสอบโครงสร้างไฟล์

**ปัญหา**: CSS/JS ไม่โหลด
- **สาเหตุ**: path ไฟล์ไม่ถูกต้อง
- **แก้ไข**: ตรวจสอบ relative path ในไฟล์ HTML

#### 8.2 การดู Logs
1. ใน Vercel Dashboard → เลือกโปรเจกต์
2. ไปที่แท็บ **"Functions"** หรือ **"Deployments"**
3. คลิกที่ deployment ที่ต้องการดู
4. ดู logs ในส่วน **"Build Logs"**

### 9. การตรวจสอบความปลอดภัย

#### 9.1 HTTPS
- Vercel ให้ HTTPS อัตโนมัติ
- ใบรับรองจาก Let's Encrypt
- ต่ออายุอัตโนมัติ

#### 9.2 Security Headers
- ตั้งค่าใน vercel.json แล้ว
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block

### 10. การติดตาม Performance

#### 10.1 Analytics
1. ใน Vercel Dashboard → เลือกโปรเจกต์
2. ไปที่แท็บ **"Analytics"**
3. ดูสถิติการใช้งาน

#### 10.2 Speed Insights
- Vercel ให้ข้อมูล Core Web Vitals
- ตรวจสอบความเร็วของเว็บไซต์
- แนะนำการปรับปรุง

---

## สรุปขั้นตอน

1. ✅ Upload ไฟล์ไปยัง GitHub
2. 🔄 สมัคร/เข้าสู่ระบบ Vercel
3. 🔗 เชื่อมต่อ GitHub repository
4. ⚙️ ตั้งค่าโปรเจกต์
5. 🚀 Deploy
6. 🔧 ตั้งค่า LIFF ID
7. 🧪 ทดสอบระบบ

**หมายเหตุ**: หลังจาก deploy สำเร็จแล้ว ให้ดำเนินการขั้นตอนต่อไปคือการตั้งค่า LIFF ID ในไฟล์ JavaScript