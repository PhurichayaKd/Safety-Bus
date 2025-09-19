# คู่มือการทดสอบ LINE Bot Safety Bus Bot

## 🚀 วิธีการเริ่มต้นทดสอบ

### 1. การเตรียมสภาพแวดล้อม

#### ติดตั้ง Dependencies
```bash
cd d:\Project-IoT\safety-bus-bot
npm install
```

#### ตั้งค่า Environment Variables
```bash
# คัดลอกไฟล์ .env.example เป็น .env
copy .env.example .env

# แก้ไขค่าตัวแปรใน .env
notepad .env
```

**ตัวแปรที่จำเป็นสำหรับการทดสอบ:**
```env
# LINE Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
LINE_BOT_ID=your_bot_id

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# API Security
API_SECRET_KEY=your_api_secret_key

# Application Configuration
BASE_URL=https://your-domain.com
PORT=3000
NODE_ENV=development
```

### 2. การรันระบบ

#### รันในโหมด Development
```bash
npm start
```

#### รันด้วย Ngrok (สำหรับทดสอบ Webhook)
```bash
# Terminal 1: รัน application
npm start

# Terminal 2: รัน ngrok
ngrok http 3000
```

**คัดลอก HTTPS URL จาก ngrok และใส่ใน LINE Webhook URL**

## 📱 การทดสอบ LINE Bot

### 1. การเพิ่ม Friend และทดสอบพื้นฐาน

1. **เพิ่ม Friend บอท**
   - สแกน QR Code จาก LINE Developers Console
   - หรือค้นหาด้วย Bot ID

2. **ทดสอบคำสั่งพื้นฐาน**
   ```
   ส่งข้อความ: "สวัสดี"
   ผลลัพธ์ที่คาดหวัง: ข้อความต้อนรับและเมนูหลัก
   ```

   ```
   ส่งข้อความ: "เมนู"
   ผลลัพธ์ที่คาดหวัง: แสดง Flex Message เมนูหลัก
   ```

   ```
   ส่งข้อความ: "สถานะ"
   ผลลัพธ์ที่คาดหวัง: แสดงสถานะการเชื่อมโยงบัญชี
   ```

### 2. การทดสอบระบบผูกบัญชี

#### ขั้นตอนการทดสอบ:

1. **เริ่มต้นการผูกบัญชี**
   ```
   ส่งข้อความ: "ผูกบัญชี"
   ผลลัพธ์ที่คาดหวัง: ขอรหัสนักเรียน
   ```

2. **ใส่รหัสนักเรียนที่ถูกต้อง**
   ```
   ส่งข้อความ: "STU001" (หรือรหัสที่มีในฐานข้อมูล)
   ผลลัพธ์ที่คาดหวัง: ยืนยันการผูกบัญชีสำเร็จ
   ```

3. **ทดสอบรหัสนักเรียนที่ไม่ถูกต้อง**
   ```
   ส่งข้อความ: "INVALID123"
   ผลลัพธ์ที่คาดหวัง: แจ้งไม่พบข้อมูลนักเรียน
   ```

### 3. การทดสอบฟีเจอร์หลัก (หลังผูกบัญชีแล้ว)

#### ทดสอบประวัติการเดินทาง
```
ส่งข้อความ: "ประวัติ"
ผลลัพธ์ที่คาดหวัง: แสดง Flex Message ประวัติการเดินทาง
```

#### ทดสอบตำแหน่งรถบัส
```
ส่งข้อความ: "ตำแหน่งรถ"
ผลลัพธ์ที่คาดหวัง: แสดงตำแหน่งรถปัจจุบันพร้อมแผนที่
```

#### ทดสอบการแจ้งลาหยุด
```
ส่งข้อความ: "ลาหยุด"
ผลลัพธ์ที่คาดหวัง: เริ่ม flow การแจ้งลาหยุด
```

## 🔧 การทดสอบ API Endpoints

### 1. ใช้ Postman หรือ curl

#### ทดสอบ Health Check
```bash
curl -X GET http://localhost:3000/api/health

# ผลลัพธ์ที่คาดหวัง:
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

#### ทดสอบ RFID Scan
```bash
curl -X POST http://localhost:3000/api/rfid-scan \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_secret_key" \
  -d '{
    "student_id": "STU001",
    "scan_type": "board",
    "bus_id": "BUS001",
    "location": {
      "latitude": 13.7563,
      "longitude": 100.5018
    }
  }'

# ผลลัพธ์ที่คาดหวัง:
{
  "success": true,
  "message": "RFID scan recorded successfully",
  "notification_sent": true
}
```

#### ทดสอบ Emergency Alert
```bash
curl -X POST http://localhost:3000/api/emergency \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_secret_key" \
  -d '{
    "bus_id": "BUS001",
    "emergency_type": "accident",
    "description": "Minor collision",
    "location": {
      "latitude": 13.7563,
      "longitude": 100.5018
    }
  }'
```

#### ทดสอบ Bus Location Update
```bash
curl -X POST http://localhost:3000/api/bus-location \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_secret_key" \
  -d '{
    "bus_id": "BUS001",
    "latitude": 13.7563,
    "longitude": 100.5018,
    "speed": 45.5,
    "heading": 180.0
  }'
```

### 2. ใช้ Postman Collection

**Import Collection นี้ใน Postman:**

```json
{
  "info": {
    "name": "Safety Bus Bot API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "api_key",
      "value": "your_api_secret_key"
    }
  ],
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": "{{base_url}}/api/health"
      }
    },
    {
      "name": "RFID Scan - Board",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "X-API-Key",
            "value": "{{api_key}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"student_id\": \"STU001\",\n  \"scan_type\": \"board\",\n  \"bus_id\": \"BUS001\",\n  \"location\": {\n    \"latitude\": 13.7563,\n    \"longitude\": 100.5018\n  }\n}"
        },
        "url": "{{base_url}}/api/rfid-scan"
      }
    }
  ]
}
```

## 📊 การดูผลลัพธ์และ Logs

### 1. การดู Console Logs

**ใน Terminal ที่รัน npm start:**
```
[2024-01-20 10:30:00] INFO: Server started on port 3000
[2024-01-20 10:30:15] INFO: Webhook received from LINE
[2024-01-20 10:30:15] INFO: Message from user: U1234567890
[2024-01-20 10:30:15] INFO: Sending reply: Welcome message
```

### 2. การใช้ Script ดู Logs

```bash
# ดู logs ทั้งหมด
npm run logs

# ดู logs แบบ real-time
npm run logs -- --follow

# ดู logs เฉพาะ error
npm run logs -- --level error
```

### 3. การตรวจสอบฐานข้อมูล

#### ใน Supabase Dashboard:

1. **ตรวจสอบตาราง parent_line_links**
   ```sql
   SELECT * FROM parent_line_links 
   WHERE line_user_id = 'U1234567890';
   ```

2. **ตรวจสอบ RFID scans**
   ```sql
   SELECT * FROM rfid_scans 
   ORDER BY scanned_at DESC 
   LIMIT 10;
   ```

3. **ตรวจสอบ LINE logs**
   ```sql
   SELECT * FROM line_logs 
   WHERE status = 'error' 
   ORDER BY sent_at DESC;
   ```

### 4. การตรวจสอบ LINE Webhook

**ใน LINE Developers Console:**

1. ไปที่ Messaging API > Webhook settings
2. คลิก "Verify" เพื่อทดสอบ webhook
3. ดู Webhook logs ใน Console

## 🧪 การทดสอบ Scenarios

### Scenario 1: นักเรียนขึ้นรถ

1. **ส่ง RFID Scan API:**
   ```json
   {
     "student_id": "STU001",
     "scan_type": "board",
     "bus_id": "BUS001",
     "location": {
       "latitude": 13.7563,
       "longitude": 100.5018
     }
   }
   ```

2. **ตรวจสอบผลลัพธ์:**
   - ผู้ปกครองได้รับ Push Message
   - บันทึกใน rfid_scans table
   - Log การส่งข้อความใน line_logs

### Scenario 2: เหตุฉุกเฉิน

1. **ส่ง Emergency API:**
   ```json
   {
     "bus_id": "BUS001",
     "emergency_type": "breakdown",
     "description": "Engine problem",
     "location": {
       "latitude": 13.7563,
       "longitude": 100.5018
     }
   }
   ```

2. **ตรวจสอบผลลัพธ์:**
   - ผู้ปกครองทุกคนในรถได้รับแจ้งเตือน
   - บันทึกใน emergencies table
   - ส่งข้อความไปยัง admin

### Scenario 3: การแจ้งลาหยุด

1. **ผู้ปกครองส่งคำสั่ง "ลาหยุด"**
2. **ใส่วันที่และเหตุผล**
3. **ตรวจสอบผลลัพธ์:**
   - บันทึกใน absence_requests table
   - ส่งการยืนยันไปยังผู้ปกครอง
   - แจ้งไปยังคนขับรถ

## 🔍 การ Debug ปัญหา

### ปัญหาที่พบบ่อย

#### 1. Webhook ไม่ทำงาน

**ตรวจสอบ:**
```bash
# ตรวจสอบ ngrok ทำงานหรือไม่
curl https://your-ngrok-url.ngrok.io/api/health

# ตรวจสอบ LINE Webhook URL
# ใน LINE Console > Messaging API > Webhook settings
```

**แก้ไข:**
- ตรวจสอบ HTTPS URL ใน LINE Console
- ตรวจสอบ Channel Secret
- ดู error logs ใน console

#### 2. Push Message ไม่ส่ง

**ตรวจสอบ:**
```javascript
// ใน console logs หา error message
[ERROR] Failed to send push message: Invalid channel access token
```

**แก้ไข:**
- ตรวจสอบ Channel Access Token
- ตรวจสอบ LINE User ID
- ตรวจสอบ Rate Limit

#### 3. Database Connection Error

**ตรวจสอบ:**
```bash
# ทดสอบ connection
node -e "console.log(process.env.SUPABASE_URL)"
```

**แก้ไข:**
- ตรวจสอบ Supabase URL และ Key
- ตรวจสอบ Network Connection
- ตรวจสอบ Database Schema

### การใช้ Debug Mode

```bash
# รันในโหมด debug
DEBUG=* npm start

# หรือเฉพาะ LINE Bot
DEBUG=line:* npm start
```

## 📈 การ Monitor ระบบ

### 1. Real-time Monitoring

```bash
# ดู logs แบบ real-time
tail -f logs/app.log

# ดู system resources
top

# ดู network connections
netstat -an | grep :3000
```

### 2. Performance Testing

```bash
# ใช้ Apache Bench
ab -n 100 -c 10 http://localhost:3000/api/health

# ใช้ curl สำหรับ load test
for i in {1..100}; do
  curl -s http://localhost:3000/api/health > /dev/null &
done
wait
```

## ✅ Checklist การทดสอบ

### พื้นฐาน
- [ ] ระบบรันได้โดยไม่มี error
- [ ] Webhook ทำงานปกติ
- [ ] Database connection สำเร็จ
- [ ] Environment variables ครบถ้วน

### LINE Bot Functions
- [ ] ตอบกลับข้อความได้
- [ ] แสดงเมนูหลักได้
- [ ] ระบบผูกบัญชีทำงาน
- [ ] แสดงประวัติการเดินทาง
- [ ] แสดงตำแหน่งรถบัส
- [ ] ระบบแจ้งลาหยุดทำงาน

### API Endpoints
- [ ] Health check ตอบกลับ 200
- [ ] RFID scan API ทำงาน
- [ ] Emergency API ทำงาน
- [ ] Bus location API ทำงาน
- [ ] API authentication ทำงาน

### Notifications
- [ ] Push message ส่งได้
- [ ] แจ้งเตือนขึ้น-ลงรถ
- [ ] แจ้งเตือนเหตุฉุกเฉิน
- [ ] แจ้งเตือนการลาหยุด

### Database
- [ ] บันทึกข้อมูล RFID scans
- [ ] บันทึกข้อมูล emergencies
- [ ] บันทึกข้อมูล absence requests
- [ ] บันทึก logs ต่างๆ

## 🎯 Tips การทดสอบ

1. **ทดสอบทีละขั้นตอน** - เริ่มจากพื้นฐานก่อน
2. **ใช้ข้อมูลจริง** - สร้างข้อมูลทดสอบที่ใกล้เคียงกับการใช้งานจริง
3. **ทดสอบ Edge Cases** - ลองใส่ข้อมูลผิดพลาดดู
4. **ดู Logs เสมอ** - ช่วยในการ debug ปัญหา
5. **ทดสอบบน Mobile** - LINE Bot ใช้งานบนมือถือเป็นหลัก
6. **ทดสอบ Performance** - ระบบต้องรองรับผู้ใช้หลายคน
7. **Backup ข้อมูล** - ก่อนทดสอบที่อาจทำลายข้อมูล

---

**หมายเหตุ:** การทดสอบเป็นขั้นตอนสำคัญ ควรทำอย่างละเอียดก่อนนำไปใช้งานจริง