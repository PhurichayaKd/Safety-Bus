# คำแนะนำการ Upload ไฟล์ไปยัง GitHub Repository

## ขั้นตอนการ Upload ไฟล์ไปยัง https://github.com/PhurichayaKd/vercel-deploy

### วิธีที่ 1: ผ่าน GitHub Web Interface (แนะนำสำหรับผู้เริ่มต้น)

#### 1. เข้าสู่ระบบ GitHub
- ไปที่ https://github.com/PhurichayaKd/vercel-deploy
- เข้าสู่ระบบด้วยบัญชี GitHub ของคุณ

#### 2. Upload ไฟล์
- คลิกปุ่ม **"Add file"** → **"Upload files"**
- ลากไฟล์ทั้งหมดจากโฟลเดอร์ `vercel-deploy` ลงในพื้นที่ upload
- หรือคลิก **"choose your files"** และเลือกไฟล์ทั้งหมด:
  - `index.html`
  - `package.json`
  - `vercel.json`
  - `README.md`
  - โฟลเดอร์ `css/` (พร้อมไฟล์ `date-picker.css`)
  - โฟลเดอร์ `js/` (พร้อมไฟล์ `date-picker.js`)

#### 3. Commit การเปลี่ยนแปลง
- ใส่ commit message: `"Add LIFF app files for Safety Bus system"`
- เลือก **"Commit directly to the main branch"**
- คลิก **"Commit changes"**

### วิธีที่ 2: ผ่าน Git Command Line

#### 1. Clone Repository
```bash
git clone https://github.com/PhurichayaKd/vercel-deploy.git
cd vercel-deploy
```

#### 2. Copy ไฟล์
- คัดลอกไฟล์ทั้งหมดจากโฟลเดอร์ `d:\Project-IoT\safety-bus-bot\vercel-deploy\` 
- วางลงในโฟลเดอร์ที่ clone มา

#### 3. Push ไฟล์
```bash
git add .
git commit -m "Add LIFF app files for Safety Bus system"
git push origin main
```

### วิธีที่ 3: ผ่าน GitHub Desktop

#### 1. ติดตั้ง GitHub Desktop
- ดาวน์โหลดจาก https://desktop.github.com/
- เข้าสู่ระบบด้วยบัญชี GitHub

#### 2. Clone Repository
- คลิก **"Clone a repository from the Internet"**
- ใส่ URL: `https://github.com/PhurichayaKd/vercel-deploy`
- เลือกโฟลเดอร์ที่ต้องการเก็บ

#### 3. Copy และ Commit
- คัดลอกไฟล์ทั้งหมดจาก `vercel-deploy` ไปยังโฟลเดอร์ที่ clone
- GitHub Desktop จะแสดงการเปลี่ยนแปลง
- ใส่ commit message และคลิก **"Commit to main"**
- คลิก **"Push origin"**

## รายการไฟล์ที่ต้อง Upload

```
vercel-deploy/
├── index.html              # หน้าเว็บหลัก
├── package.json            # ข้อมูลโปรเจกต์
├── vercel.json            # การตั้งค่า Vercel
├── README.md              # คำแนะนำการใช้งาน
├── css/
│   └── date-picker.css    # สไตล์ของแอป
└── js/
    └── date-picker.js     # JavaScript สำหรับ LIFF
```

## หลังจาก Upload เสร็จแล้ว

### ขั้นตอนต่อไป:
1. ✅ ไฟล์ถูก upload ไปยัง GitHub แล้ว
2. 🔄 เชื่อมต่อ GitHub repository กับ Vercel
3. 🚀 Deploy ไปยัง Vercel
4. 🔧 ตั้งค่า LIFF ID
5. 🧪 ทดสอบระบบ

### การตรวจสอบ
- ตรวจสอบว่าไฟล์ทั้งหมดปรากฏใน repository
- ตรวจสอบว่าโครงสร้างโฟลเดอร์ถูกต้อง
- ตรวจสอบว่าไฟล์ `index.html` เปิดได้ปกติ

## การแก้ไขปัญหา

### ปัญหาที่อาจพบ:
1. **ไฟล์ไม่ครบ**: ตรวจสอบว่า upload ไฟล์ทั้งหมดแล้ว
2. **โครงสร้างโฟลเดอร์ผิด**: ตรวจสอบว่าโฟลเดอร์ `css/` และ `js/` อยู่ในตำแหน่งที่ถูกต้อง
3. **Permission denied**: ตรวจสอบสิทธิ์การเข้าถึง repository

### การขอความช่วยเหลือ:
- ตรวจสอบ GitHub Documentation
- ติดต่อเจ้าของ repository หากมีปัญหาเรื่องสิทธิ์

---

**หมายเหตุ**: หลังจาก upload เสร็จแล้ว ให้ดำเนินการขั้นตอนต่อไปคือการเชื่อมต่อกับ Vercel เพื่อ deploy แอปพลิเคชัน