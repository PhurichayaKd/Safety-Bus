# Safety Bus Bot - LINE Messaging API

🚍 ระบบแจ้งเตือนผู้ปกครองผ่าน LINE Bot สำหรับโครงการ Safety Bus IoT

## ✨ ฟีเจอร์หลัก

### 📱 เมนูสำหรับผู้ปกครอง
- **📊 ประวัติข้อมูล** - ดูประวัติการเดินทางของนักเรียน
- **📝 แจ้งลาหยุด** - แจ้งการลาป่วย/ลากิจ/ไม่มาเรียน
- **📍 ดูตำแหน่ง** - ติดตามตำแหน่งรถบัสแบบเรียลไทม์
- **📞 ติดต่อคนขับ** - ติดต่อคนขับรถโดยตรง

### 🔔 การแจ้งเตือนอัตโนมัติ
- **🚌 ขึ้น-ลงรถ** - แจ้งเตือนเมื่อนักเรียนขึ้น/ลงรถ (จาก RFID)
- **🚨 เหตุฉุกเฉิน** - แจ้งเตือนเหตุฉุกเฉินพร้อมพิกัด
- **⏰ ใกล้ถึงจุดรับ-ส่ง** - แจ้งเตือนเมื่อรถใกล้ถึง (Geo-fence)
- **⚠️ ขาดเรียน** - แจ้งเตือนเมื่อนักเรียนไม่ขึ้นรถตามปกติ
- **🕐 รถล่าช้า** - แจ้งเตือนเมื่อรถล่าช้า

### 🔗 ระบบผูกบัญชี
- ผูกบัญชี LINE กับข้อมูลผู้ปกครอง-นักเรียน
- ใช้โทเคนชั่วคราวเพื่อความปลอดภัย
- รองรับการผูกด้วยรหัสนักเรียนหรือโทเคนลิงก์

## 🛠️ การติดตั้งและใช้งาน

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าตัวแปรแวดล้อม
คัดลอกไฟล์ `.env.example` เป็น `.env` และกรอกข้อมูล:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:
```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_actual_access_token
LINE_CHANNEL_SECRET=your_actual_channel_secret
LINE_CHANNEL_ID=your_actual_channel_id

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# API Security
API_SECRET_KEY=your_strong_api_key_for_iot_devices

# Application Configuration
BASE_URL=https://your-domain.com
PORT=3000
```

### 3. เริ่มใช้งาน

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## 📡 API Endpoints

### Webhook
- `POST /webhook` - รับ events จาก LINE

### IoT Device APIs
ทุก API ต้องส่ง `x-api-key` header หรือ `api_key` query parameter

- `POST /api/rfid-scan` - บันทึกการขึ้น-ลงรถจาก RFID
- `POST /api/emergency` - แจ้งเหตุฉุกเฉิน
- `POST /api/bus-location` - อัพเดตตำแหน่งรถ
- `POST /api/delay-notification` - แจ้งความล่าช้า
- `POST /api/check-attendance` - ตรวจสอบการขาดเรียน
- `POST /api/test-notification` - ทดสอบการส่งข้อความ

### Health Check
- `GET /health` - ตรวจสอบสถานะเซิร์ฟเวอร์

## 📊 ตัวอย่างการใช้งาน API

### บันทึกการขึ้นรถ (RFID Scan)
```bash
curl -X POST https://your-domain.com/api/rfid-scan \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "student_id": "12345678",
    "scan_type": "pickup",
    "bus_number": "BUS001",
    "location": "หน้าโรงเรียน",
    "coordinates": "13.7563,100.5018"
  }'
```

### แจ้งเหตุฉุกเฉิน
```bash
curl -X POST https://your-domain.com/api/emergency \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "bus_number": "BUS001",
    "emergency_type": "fire",
    "location": "ถนนสุขุมวิท",
    "coordinates": "13.7563,100.5018",
    "severity": "high",
    "description": "เกิดไฟไหม้บนรถ"
  }'
```

### อัพเดตตำแหน่งรถ
```bash
curl -X POST https://your-domain.com/api/bus-location \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "bus_number": "BUS001",
    "driver_id": "DRV001",
    "latitude": 13.7563,
    "longitude": 100.5018,
    "speed": 45,
    "heading": 90
  }'
```

## 🗄️ โครงสร้างฐานข้อมูล

### ตารางหลัก
- `students` - ข้อมูลนักเรียน
- `parents` - ข้อมูลผู้ปกครอง
- `parent_line_links` - การผูกบัญชี LINE กับผู้ปกครอง
- `parent_link_tokens` - โทเคนชั่วคราวสำหรับผูกบัญชี
- `trips` - ประวัติการเดินทาง (ขึ้น-ลงรถ)
- `student_leaves` - ข้อมูลการลาหยุด
- `emergencies` - บันทึกเหตุฉุกเฉิน
- `bus_locations` - ตำแหน่งรถแบบเรียลไทม์
- `bus_stops` - ข้อมูลจุดรับ-ส่ง
- `notification_logs` - บันทึกการส่งการแจ้งเตือน

## 🔧 การตั้งค่า LINE Bot

### 1. สร้าง LINE Channel
1. ไปที่ [LINE Developers Console](https://developers.line.biz/)
2. สร้าง Provider และ Channel ใหม่
3. เลือกประเภท "Messaging API"
4. คัดลอก Channel Access Token และ Channel Secret

### 2. ตั้งค่า Webhook
1. ในหน้า Channel Settings
2. เปิดใช้งาน "Use webhook"
3. ตั้งค่า Webhook URL: `https://your-domain.com/webhook`
4. เปิดใช้งาน "Allow bot to join group chats"

### 3. ตั้งค่า Rich Menu (ทางเลือก)
```javascript
// ใช้ฟังก์ชันใน lib/menu.js
const { createRichMenu, setDefaultRichMenu } = require('./lib/menu');

// สร้างและตั้งค่า Rich Menu
const richMenuId = await createRichMenu();
await setDefaultRichMenu(richMenuId);
```

## 🚀 การ Deploy

### Render.com
1. เชื่อมต่อ GitHub repository
2. ตั้งค่า Environment Variables
3. ตั้งค่า Build Command: `npm install`
4. ตั้งค่า Start Command: `npm start`

### Railway
1. เชื่อมต่อ GitHub repository
2. ตั้งค่า Environment Variables
3. Railway จะ auto-deploy เมื่อมีการ push

### VPS/Cloud
1. Clone repository
2. ติดตั้ง Node.js และ npm
3. ตั้งค่า Environment Variables
4. ใช้ PM2 สำหรับ process management:
```bash
npm install -g pm2
pm2 start server/index.js --name safety-bus-bot
pm2 startup
pm2 save
```

## 🔒 ความปลอดภัย

- ✅ ตรวจสอบ LINE Signature ทุก webhook
- ✅ ใช้ API Key สำหรับ IoT devices
- ✅ โทเคนชั่วคราวสำหรับการผูกบัญชี
- ✅ บันทึก logs ทุกการส่งข้อความ
- ✅ CORS configuration
- ✅ Input validation

## 📝 การใช้งานสำหรับผู้ปกครอง

### การผูกบัญชี
1. เพิ่มเพื่อน LINE Bot
2. ส่งรหัสนักเรียน หรือ
3. ส่งโทเคนลิงก์ในรูปแบบ `LINK:xxxxxxxx`
4. ระบบจะยืนยันการผูกบัญชี

### การใช้งานเมนู
- พิมพ์ "เมนู" เพื่อแสดงตัวเลือก
- กดปุ่มในเมนูเพื่อเลือกฟังก์ชัน
- ระบบจะแสดง Quick Reply สำหรับตัวเลือกย่อย

## 🐛 การแก้ไขปัญหา

### ไม่ได้รับการแจ้งเตือน
1. ตรวจสอบการผูกบัญชี LINE
2. ตรวจสอบ API Key ของอุปกรณ์ IoT
3. ดู logs ใน notification_logs table

### Webhook ไม่ทำงาน
1. ตรวจสอบ SSL certificate
2. ตรวจสอบ LINE Channel Secret
3. ตรวจสอบ URL ใน LINE Console

### ข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล
1. ตรวจสอบ SUPABASE_URL และ SUPABASE_ANON_KEY
2. ตรวจสอบสิทธิ์การเข้าถึงตาราง
3. ตรวจสอบ RLS policies ใน Supabase

## 📞 การสนับสนุน

หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อทีมพัฒนา หรือสร้าง Issue ใน GitHub repository

## 📄 License

ISC License - ดูรายละเอียดในไฟล์ LICENSE