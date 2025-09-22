# Safety Bus Bot - Vercel Deployment

## โครงสร้างโปรเจ็กต์

โปรเจ็กต์นี้ได้ถูกปรับโครงสร้างเพื่อ deploy บน Vercel แล้ว ไฟล์ทั้งหมดที่จำเป็นอยู่ในโฟลเดอร์ `vercel-deploy/`

```
safety-bus-bot/
└── vercel-deploy/          # โฟลเดอร์หลักสำหรับ Vercel deployment
    ├── api/                # Serverless functions
    │   ├── webhook.mjs     # LINE Bot webhook
    │   ├── submit-leave.js # API สำหรับส่งใบลา
    │   ├── get-student.js  # API ดึงข้อมูลนักเรียน
    │   ├── get-leave-requests.js # API ดึงรายการใบลา
    │   └── cancel-leave.js # API ยกเลิกใบลา
    ├── lib/                # Core libraries
    │   ├── db.js          # Database connection
    │   ├── handlers.js    # Message handlers
    │   ├── line.js        # LINE API client
    │   ├── menu.js        # Rich menu
    │   └── student-data.js # Student data functions
    ├── css/               # Stylesheets
    ├── js/                # Client-side JavaScript
    ├── index.html         # LIFF Date Picker
    ├── cancel-leave.html  # LIFF Cancel Leave
    ├── package.json       # Dependencies
    └── vercel.json        # Vercel configuration
```

## การใช้งาน

### Development
```bash
cd vercel-deploy
npm install
npm run dev
```

### Deployment
1. Push โค้ดไปยัง Git repository
2. เชื่อมต่อ repository กับ Vercel
3. ตั้งค่า Environment Variables ใน Vercel Dashboard
4. Deploy อัตโนมัติ

### Environment Variables
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `LIFF_ID`
- `LIFF_CANCEL_ID`

## ฟีเจอร์
- 📱 LINE Bot สำหรับแจ้งลา
- 📅 LIFF Date Picker
- ❌ LIFF Cancel Leave
- 🔗 Account Linking
- 📊 Leave Management
- 🚌 Bus Tracking Integration

## สถานะ
✅ พร้อม deploy บน Vercel
✅ ทดสอบ development server แล้ว
✅ LIFF SDK integration
✅ Database connection