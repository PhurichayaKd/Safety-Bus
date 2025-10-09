# แก้ไขปัญหา notification_logs Table

## ปัญหาที่เกิดขึ้น
```
ERROR: 42703: column "created_at" does not exist
```

## สาเหตุ
- ตาราง `notification_logs` อาจถูกสร้างไม่สมบูรณ์
- หรือมีการสร้าง index ก่อนที่ตารางจะถูกสร้างเสร็จ
- โครงสร้างตารางไม่ตรงกับที่คาดหวัง

## วิธีแก้ไข

### วิธีที่ 1: ใช้ Supabase Dashboard (แนะนำ)
1. เข้าไปที่ Supabase Dashboard
2. ไปที่ SQL Editor
3. คัดลอกเนื้อหาจากไฟล์ `fix-notification-logs.sql`
4. วางและรัน SQL

### วิธีที่ 2: ใช้ psql command line
```bash
psql -h your-supabase-host -U postgres -d postgres -f fix-notification-logs.sql
```

### วิธีที่ 3: รันทีละขั้นตอน
หากการรันทั้งไฟล์มีปัญหา ให้รันทีละขั้นตอน:

#### ขั้นตอนที่ 1: ลบข้อมูลเก่า
```sql
DROP INDEX IF EXISTS idx_notification_logs_type_status;
DROP INDEX IF EXISTS idx_notification_logs_created_at;
DROP TRIGGER IF EXISTS update_notification_logs_updated_at ON notification_logs;
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS notification_logs CASCADE;
```

#### ขั้นตอนที่ 2: สร้างตารางใหม่
```sql
CREATE TABLE notification_logs (
    id BIGSERIAL PRIMARY KEY,
    notification_type VARCHAR(20) NOT NULL,
    recipient_id TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    error_details JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### ขั้นตอนที่ 3: สร้าง index
```sql
CREATE INDEX idx_notification_logs_type_status 
ON notification_logs(notification_type, status);

CREATE INDEX idx_notification_logs_created_at 
ON notification_logs(created_at);
```

#### ขั้นตอนที่ 4: สร้าง trigger
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_logs_updated_at
    BEFORE UPDATE ON notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## ตรวจสอบผลลัพธ์
หลังจากรันเสร็จแล้ว ให้ตรวจสอบว่าตารางถูกสร้างถูกต้อง:

```sql
-- ตรวจสอบโครงสร้างตาราง
\d notification_logs

-- หรือ
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notification_logs'
ORDER BY ordinal_position;
```

## หมายเหตุ
- การรันสคริปต์นี้จะลบข้อมูลเก่าในตาราง `notification_logs` (ถ้ามี)
- หากมีข้อมูลสำคัญ ให้ทำการ backup ก่อน
- หลังจากแก้ไขแล้ว ไฟล์ `line-notification.sql` จะสามารถรันได้ปกติ