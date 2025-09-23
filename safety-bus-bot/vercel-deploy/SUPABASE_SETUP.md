# การตั้งค่า Supabase สำหรับระบบแจ้งลา Safety Bus

## ขั้นตอนการตั้งค่า

### 1. สร้างตาราง leave_requests ใน Supabase

รันคำสั่ง SQL นี้ใน Supabase SQL Editor:

```sql
CREATE TABLE leave_requests (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    leave_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    leave_type VARCHAR(20) DEFAULT 'personal' CHECK (leave_type IN ('personal', 'sick', 'emergency', 'family')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- เพิ่ม Index เพื่อประสิทธิภาพ
CREATE INDEX idx_leave_requests_student_id ON leave_requests(student_id);
CREATE INDEX idx_leave_requests_leave_date ON leave_requests(leave_date);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);

-- เพิ่ม Foreign Key (ถ้ามีตาราง students)
-- ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_student_id 
-- FOREIGN KEY (student_id) REFERENCES students(id);
```

### 2. ตั้งค่า Supabase Configuration

1. ไปที่ Supabase Dashboard ของโปรเจกต์คุณ
2. ไปที่ Settings > API
3. คัดลอก Project URL และ anon public key
4. แก้ไขไฟล์ `js/supabase-config.js`:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://your-actual-project-url.supabase.co', // ใส่ Project URL ของคุณ
    anonKey: 'your-actual-anon-key' // ใส่ anon public key ของคุณ
};
```

### 3. ตั้งค่า Row Level Security (RLS)

เพื่อความปลอดภัย ควรเปิด RLS และสร้าง Policy:

```sql
-- เปิด RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy สำหรับการ Insert (อนุญาตให้ทุกคนเพิ่มข้อมูล)
CREATE POLICY "Allow insert for all users" ON leave_requests
    FOR INSERT WITH CHECK (true);

-- สร้าง Policy สำหรับการ Select (อนุญาตให้ทุกคนดูข้อมูล)
CREATE POLICY "Allow select for all users" ON leave_requests
    FOR SELECT USING (true);

-- สร้าง Policy สำหรับการ Update (อนุญาตให้ทุกคนแก้ไขข้อมูล)
CREATE POLICY "Allow update for all users" ON leave_requests
    FOR UPDATE USING (true);
```

### 4. ทดสอบการทำงาน

#### วิธีที่ 1: ใช้หน้าทดสอบ (แนะนำ)
1. เปิดไฟล์ `test-supabase.html` ในเบราว์เซอร์
2. ทำตามขั้นตอนการทดสอบทีละขั้น
3. ตรวจสอบว่าทุกขั้นตอนผ่าน ✅

#### วิธีที่ 2: ทดสอบผ่านฟอร์มจริง
1. เปิดแอปพลิเคชันในเบราว์เซอร์ (`index.html`)
2. ทดสอบการแจ้งลาผ่านฟอร์ม
3. เปิด Developer Tools (F12) เพื่อดู Console logs
4. ตรวจสอบข้อมูลในตาราง leave_requests ใน Supabase Dashboard

### 5. การแก้ไขปัญหาที่พบบ่อย

#### ปัญหา: "กรุณาตั้งค่า Supabase URL/anon key"
- **สาเหตุ**: ยังไม่ได้แก้ไขไฟล์ `supabase-config.js`
- **วิธีแก้**: แก้ไขค่า `url` และ `anonKey` ในไฟล์ `js/supabase-config.js`

#### ปัญหา: "relation 'public.leave_requests' does not exist"
- **สาเหตุ**: ยังไม่ได้สร้างตาราง `leave_requests`
- **วิธีแก้**: รันคำสั่ง SQL ในขั้นตอนที่ 1

#### ปัญหา: "Row Level Security policy violation"
- **สาเหตุ**: ยังไม่ได้ตั้งค่า RLS Policy
- **วิธีแก้**: รันคำสั่ง SQL ในขั้นตอนที่ 3

#### ปัญหา: "Invalid API key"
- **สาเหตุ**: anon key ไม่ถูกต้อง
- **วิธีแก้**: ตรวจสอบ anon key ใน Supabase Dashboard > Settings > API

## โครงสร้างข้อมูลที่จะถูกบันทึก

```javascript
{
    student_id: 12345,           // รหัสนักเรียน
    leave_date: '2024-01-15',    // วันที่ลา (YYYY-MM-DD)
    status: 'approved',          // สถานะ (approved เป็นค่าเริ่มต้น)
    leave_type: 'personal',      // ประเภทการลา
    created_at: '2024-01-10T10:30:00Z' // วันเวลาที่สร้างข้อมูล
}
```

## หมายเหตุ

- ระบบจะบันทึกข้อมูลการลาแต่ละวันเป็นแถวแยกกัน
- สถานะเริ่มต้นจะเป็น 'approved' (อนุมัติอัตโนมัติ)
- ข้อมูลจะถูกส่งไปยัง Supabase โดยตรงจาก Frontend
- ไม่ต้องใช้ API endpoint `/api/submit-leave` อีกต่อไป