# คำแนะนำการตั้งค่า LIFF ID หลังจาก Deploy สำเร็จ

## ขั้นตอนการตั้งค่า LINE LIFF App

### 1. เตรียม URL จาก Vercel

#### 1.1 รับ URL หลังจาก Deploy
หลังจาก deploy สำเร็จใน Vercel คุณจะได้ URL เช่น:
```
https://safety-bus-liff-app.vercel.app
```
หรือ
```
https://vercel-deploy-xxx.vercel.app
```

#### 1.2 ทดสอบ URL
1. เปิด URL ในเบราว์เซอร์
2. ตรวจสอบว่าหน้าเว็บแสดงผลถูกต้อง
3. ตรวจสอบว่ามี HTTPS (🔒) ในแถบที่อยู่

### 2. ตั้งค่า LIFF App ใน LINE Developers Console

#### 2.1 เข้าสู่ระบบ LINE Developers
1. ไปที่ https://developers.line.biz/
2. เข้าสู่ระบบด้วยบัญชี LINE
3. เลือก Provider และ Channel ที่ต้องการ

#### 2.2 สร้าง LIFF App ใหม่
1. ไปที่แท็บ **"LIFF"**
2. คลิก **"Add"** เพื่อสร้าง LIFF app ใหม่

#### 2.3 กรอกข้อมูล LIFF App
```
LIFF app name: Safety Bus Leave Request
Size: Compact
Endpoint URL: https://your-vercel-url.vercel.app
Scope: 
  ✅ profile
  ✅ openid
Bot link feature: On (Aggressive)
Scan QR: Off
Module mode: Off
```

#### 2.4 บันทึกและรับ LIFF ID
1. คลิก **"Add"**
2. คัดลอก **LIFF ID** ที่ได้ (รูปแบบ: `1234567890-abcdefgh`)

### 3. อัปเดต LIFF ID ในโค้ด

#### 3.1 แก้ไขไฟล์ JavaScript
1. เปิดไฟล์ `js/date-picker.js` ใน repository
2. ค้นหาบรรทัดที่ 9:
```javascript
await liff.init({ liffId: 'YOUR_LIFF_ID' });
```

3. แทนที่ `YOUR_LIFF_ID` ด้วย LIFF ID จริง:
```javascript
await liff.init({ liffId: '1234567890-abcdefgh' });
```

#### 3.2 วิธีแก้ไขผ่าน GitHub Web
1. ไปที่ https://github.com/PhurichayaKd/vercel-deploy
2. เข้าไปในโฟลเดอร์ `js/`
3. คลิกไฟล์ `date-picker.js`
4. คลิกปุ่ม ✏️ (Edit this file)
5. แก้ไข LIFF ID
6. Scroll ลงล่างและกรอก:
   - Commit message: `"Update LIFF ID"`
   - เลือก "Commit directly to the main branch"
7. คลิก **"Commit changes"**

#### 3.3 Auto Deploy
- หลังจาก commit ใน GitHub
- Vercel จะ deploy อัตโนมัติ
- รอประมาณ 1-2 นาที

### 4. การทดสอบ LIFF App

#### 4.1 ทดสอบผ่าน LINE Developers Console
1. ใน LIFF app ที่สร้าง
2. คลิก **"Share target picker"** หรือ **"Send to chat"**
3. เลือกแชทที่ต้องการทดสอบ
4. ส่งลิงก์ LIFF

#### 4.2 ทดสอบใน LINE App
1. เปิด LINE app บนมือถือ
2. ไปที่แชทที่ส่งลิงก์ไว้
3. คลิกลิงก์ LIFF
4. ตรวจสอบการทำงาน:
   - หน้าเว็บเปิดใน LINE app
   - Date picker ทำงานได้
   - สามารถเลือกวันที่ได้
   - ปุ่มยืนยันทำงานได้

### 5. การแก้ไขปัญหา

#### 5.1 ปัญหาที่พบบ่อย

**ปัญหา**: "Enter a valid HTTPS URL"
- **สาเหตุ**: URL ไม่ใช่ HTTPS หรือไม่ถูกต้อง
- **แก้ไข**: ตรวจสอบ URL จาก Vercel ให้ขึ้นต้นด้วย `https://`

**ปัญหา**: "LIFF initialization failed"
- **สาเหตุ**: LIFF ID ไม่ถูกต้อง
- **แก้ไข**: ตรวจสอบ LIFF ID ในไฟล์ JavaScript

**ปัญหา**: หน้าเว็บไม่เปิดใน LINE
- **สาเหตุ**: URL ใน LIFF app ไม่ตรงกับ Vercel
- **แก้ไข**: อัปเดต Endpoint URL ใน LINE Developers Console

**ปัญหา**: Date picker ไม่ทำงาน
- **สาเหตุ**: JavaScript error หรือ CSS ไม่โหลด
- **แก้ไข**: ตรวจสอบ Developer Tools ในเบราว์เซอร์

#### 5.2 การ Debug

**ใน LINE App:**
1. เปิด LIFF app
2. เขย่ามือถือ 3 ครั้ง (iOS) หรือกด Volume Down 3 ครั้ง (Android)
3. เลือก "Enable Developer Tools"
4. ดู Console logs

**ใน Desktop Browser:**
1. เปิด URL ของ LIFF app
2. กด F12 เพื่อเปิด Developer Tools
3. ดูแท็บ Console และ Network
4. ตรวจสอบ errors

### 6. การตั้งค่าเพิ่มเติม

#### 6.1 Rich Menu Integration
หากต้องการเพิ่ม LIFF app ใน Rich Menu:
1. ไปที่ LINE Developers Console
2. เลือกแท็บ **"Messaging API"**
3. ไปที่ส่วน **"Rich Menu"**
4. สร้าง Rich Menu ใหม่หรือแก้ไขที่มีอยู่
5. เพิ่ม Action type: **"URI"**
6. ใส่ LIFF URL: `https://liff.line.me/1234567890-abcdefgh`

#### 6.2 การตั้งค่า Scope เพิ่มเติม
หากต้องการข้อมูลผู้ใช้เพิ่มเติม:
- `profile`: ชื่อ, รูปโปรไฟล์
- `openid`: User ID
- `email`: อีเมล (ต้องขออนุมัติ)
- `phone`: เบอร์โทรศัพท์ (ต้องขออนุมัติ)

### 7. การติดตาม Analytics

#### 7.1 LINE Analytics
1. ใน LINE Developers Console
2. ไปที่แท็บ **"Analytics"**
3. ดูสถิติการใช้งาน LIFF app

#### 7.2 Vercel Analytics
1. ใน Vercel Dashboard
2. เลือกโปรเจกต์
3. ไปที่แท็บ **"Analytics"**
4. ดูสถิติการเข้าชม

---

## Checklist การตั้งค่า

- [ ] ได้ URL จาก Vercel แล้ว
- [ ] สร้าง LIFF app ใน LINE Developers Console
- [ ] ได้ LIFF ID แล้ว
- [ ] อัปเดต LIFF ID ในไฟล์ JavaScript
- [ ] Deploy ใหม่ใน Vercel
- [ ] ทดสอบ LIFF app ใน LINE
- [ ] ตรวจสอบการทำงานของ Date picker
- [ ] ทดสอบการส่งข้อความกลับไปยังแชท

**หมายเหตุ**: หลังจากตั้งค่าเสร็จแล้ว ให้ทดสอบระบบอย่างละเอียดเพื่อให้แน่ใจว่าทุกอย่างทำงานได้ถูกต้อง