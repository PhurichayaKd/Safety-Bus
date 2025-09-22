# 🔗 การตั้งค่า Webhook สำหรับ LINE Bot

## 📋 ขั้นตอนการตั้งค่า

### 1. เริ่มต้น Development Server
```bash
node server.js
```
Server จะรันที่ `http://localhost:3001`

### 2. สร้าง Public URL ด้วย LocalTunnel
```bash
lt --port 3001
```
จะได้ URL เช่น: `https://eager-chairs-sit.loca.lt`

### 3. อัปเดต Webhook URL ใน LINE Developer Console

1. เข้าไปที่ [LINE Developers Console](https://developers.line.biz/)
2. เลือก Provider และ Channel ของคุณ
3. ไปที่แท็บ **Messaging API**
4. ในส่วน **Webhook settings**:
   - **Webhook URL**: `https://your-tunnel-url.loca.lt/api/webhook`
   - **Use webhook**: เปิดใช้งาน (สีเขียว)
   - **Webhook redelivery**: เปิดใช้งาน (สีเขียว)
5. คลิก **Verify** เพื่อทดสอบ webhook
6. คลิก **Update**

### 4. ทดสอบ Bot

1. สแกน QR Code ใน Messaging API tab
2. เพิ่ม Bot เป็นเพื่อน
3. ส่งข้อความทดสอบ

## 🔧 การแก้ไขปัญหา

### ❌ 400 Bad Request
- ตรวจสอบว่า webhook URL ถูกต้อง
- ตรวจสอบว่า LocalTunnel ยังทำงานอยู่
- ตรวจสอบ environment variables ใน `.env`

### ❌ 401 Unauthorized
- ตรวจสอบ `LINE_CHANNEL_SECRET` ใน `.env`
- ตรวจสอบ signature validation

### ❌ 500 Internal Server Error
- ดู logs ใน terminal ที่รัน `node server.js`
- ตรวจสอบ `LINE_CHANNEL_ACCESS_TOKEN` ใน `.env`

## 📝 หมายเหตุ

- LocalTunnel URL จะเปลี่ยนทุกครั้งที่รีสตาร์ท
- สำหรับ production ให้ deploy ไปยัง Vercel แทน
- ไฟล์ `.env` ต้องมี credentials ที่ถูกต้องจาก LINE Developer Console

## 🚀 Deploy to Production

เมื่อทดสอบเสร็จแล้ว:
```bash
vercel --prod
```
แล้วอัปเดต webhook URL เป็น production URL ใน LINE Developer Console