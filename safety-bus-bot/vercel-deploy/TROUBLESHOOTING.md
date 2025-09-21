# คู่มือแก้ไขปัญหา Vercel Deployment

## ปัญหาที่พบบ่อยและวิธีแก้ไข

### 1. 🔴 Repository Error
```
The provided GitHub repository does not contain the requested branch or commit reference.
```

**สาเหตุ**: Repository ยังว่างเปล่า

**วิธีแก้ไข**:
1. Upload ไฟล์ทั้งหมดไปยัง GitHub ก่อน
2. ตรวจสอบว่ามี commit อย่างน้อย 1 commit
3. Deploy ใหม่ใน Vercel

### 2. 🔴 Build Failed
```
Error: Build failed with exit code 1
```

**สาเหตุ**: ปัญหาในการ build โปรเจกต์

**วิธีแก้ไข**:
1. ตรวจสอบไฟล์ `package.json`
2. ตั้งค่า Build Command เป็นค่าว่าง
3. ตั้งค่า Output Directory เป็น `public` หรือค่าว่าง

### 3. 🔴 404 Not Found
```
This page could not be found.
```

**สาเหตุ**: ไม่พบไฟล์ `index.html`

**วิธีแก้ไข**:
1. ตรวจสอบว่าไฟล์ `index.html` อยู่ใน root directory
2. ตรวจสอบชื่อไฟล์ให้ถูกต้อง (ตัวพิมพ์เล็ก)
3. Redeploy โปรเจกต์

### 4. 🔴 LIFF SDK Error
```
LIFF SDK is not initialized
```

**สาเหตุ**: ปัญหาการโหลด LIFF SDK

**วิธีแก้ไข**:
1. ตรวจสอบ LIFF ID ใน JavaScript
2. ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
3. ตรวจสอบ URL ใน LINE Developers Console

### 5. 🔴 CSS/JS Not Loading
```
Failed to load resource: 404
```

**สาเหตุ**: ไฟล์ CSS หรือ JS ไม่พบ

**วิธีแก้ไข**:
1. ตรวจสอบโครงสร้างโฟลเดอร์:
   ```
   ├── index.html
   ├── css/
   │   └── date-picker.css
   └── js/
       └── date-picker.js
   ```
2. ตรวจสอบ path ในไฟล์ `index.html`
3. Upload ไฟล์ที่ขาดหายไป

## ขั้นตอนการแก้ไขปัญหาทั่วไป

### Step 1: ตรวจสอบ GitHub Repository
```bash
# ตรวจสอบว่ามีไฟล์ครบหรือไม่
✅ index.html
✅ package.json
✅ vercel.json
✅ css/date-picker.css
✅ js/date-picker.js
```

### Step 2: ตรวจสอบการตั้งค่า Vercel
```
Framework Preset: Other
Build Command: (ปล่อยว่าง)
Output Directory: (ปล่อยว่าง หรือ public)
Install Command: npm install
```

### Step 3: ตรวจสอบไฟล์ vercel.json
```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Step 4: ตรวจสอบไฟล์ package.json
```json
{
  "name": "safety-bus-liff",
  "version": "1.0.0",
  "description": "LIFF App for Safety Bus System",
  "main": "index.html",
  "scripts": {
    "start": "serve ."
  },
  "dependencies": {},
  "devDependencies": {}
}
```

## การทดสอบหลัง Deploy

### 1. ทดสอบการเข้าถึงเว็บไซต์
- เปิด URL ที่ได้จาก Vercel
- ตรวจสอบว่าหน้าเว็บโหลดได้ปกติ
- ตรวจสอบ Console ใน Developer Tools

### 2. ทดสอบ LIFF Functionality
- เปิดใน LINE Browser
- ทดสอบการเลือกวันที่
- ทดสอบการส่งข้อความ

### 3. ทดสอบ Responsive Design
- ทดสอบบนมือถือ
- ทดสอบบน Desktop
- ตรวจสอบการแสดงผลใน LINE

## เครื่องมือช่วยแก้ไขปัญหา

### Vercel CLI (ทางเลือก)
```bash
# ติดตั้ง Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy จาก local
vercel --prod
```

### การตรวจสอบ Logs
1. ไปที่ Vercel Dashboard
2. เลือกโปรเจกต์
3. คลิกแท็บ "Functions" หรือ "Deployments"
4. ดู Error logs

### การ Debug ใน Browser
```javascript
// เพิ่มใน Console เพื่อ debug
console.log('LIFF initialized:', liff.isLoggedIn());
console.log('LIFF environment:', liff.getOS());
```

## การขอความช่วยเหลือ

### ข้อมูลที่ควรเตรียมก่อนขอความช่วยเหลือ:
1. URL ของ Vercel deployment
2. Error message ที่แสดง
3. Screenshot ของปัญหา
4. ข้อมูล Browser และ Device
5. ขั้นตอนที่ทำก่อนเกิดปัญหา

### แหล่งข้อมูลเพิ่มเติม:
- [Vercel Documentation](https://vercel.com/docs)
- [LINE LIFF Documentation](https://developers.line.biz/en/docs/liff/)
- [GitHub Help](https://help.github.com/)

---

**💡 เคล็ดลับ**: เก็บ log และ screenshot ของ error ไว้ จะช่วยในการแก้ไขปัญหาได้รวดเร็วขึ้น