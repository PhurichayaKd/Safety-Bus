-- สคริปต์สำหรับเพิ่มคอลัมน์ line_display_id และย้ายข้อมูลเดิม
-- รันสคริปต์นี้ผ่าน Supabase Dashboard > SQL Editor

-- 1. เพิ่มคอลัมน์ line_display_id ในตาราง student_line_links
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_line_links' 
    AND column_name = 'line_display_id'
  ) THEN
    ALTER TABLE student_line_links 
    ADD COLUMN line_display_id VARCHAR(255);
    
    RAISE NOTICE 'Added line_display_id column to student_line_links';
  ELSE
    RAISE NOTICE 'Column line_display_id already exists in student_line_links';
  END IF;
END $$;

-- 2. เพิ่มคอลัมน์ line_display_id ในตาราง parent_line_links
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parent_line_links' 
    AND column_name = 'line_display_id'
  ) THEN
    ALTER TABLE parent_line_links 
    ADD COLUMN line_display_id VARCHAR(255);
    
    RAISE NOTICE 'Added line_display_id column to parent_line_links';
  ELSE
    RAISE NOTICE 'Column line_display_id already exists in parent_line_links';
  END IF;
END $$;

-- 3. ลบ NOT NULL constraint จากคอลัมน์ line_user_id ชั่วคราว
ALTER TABLE student_line_links ALTER COLUMN line_user_id DROP NOT NULL;
ALTER TABLE parent_line_links ALTER COLUMN line_user_id DROP NOT NULL;

-- 4. ย้ายข้อมูล LINE ID ปกติจาก line_user_id ไปยัง line_display_id
-- สำหรับ student_line_links
UPDATE student_line_links 
SET line_display_id = line_user_id,
    line_user_id = NULL
WHERE line_user_id IS NOT NULL 
  AND line_display_id IS NULL
  AND NOT (line_user_id ~ '^U[a-f0-9]{32}$'); -- ไม่ใช่ LINE User ID จริง

-- สำหรับ parent_line_links  
UPDATE parent_line_links 
SET line_display_id = line_user_id,
    line_user_id = NULL
WHERE line_user_id IS NOT NULL 
  AND line_display_id IS NULL
  AND NOT (line_user_id ~ '^U[a-f0-9]{32}$'); -- ไม่ใช่ LINE User ID จริง

-- 5. สร้าง index สำหรับการค้นหาที่เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_student_line_links_line_display_id 
ON student_line_links(line_display_id);

CREATE INDEX IF NOT EXISTS idx_parent_line_links_line_display_id 
ON parent_line_links(line_display_id);

-- 6. เพิ่ม NOT NULL constraint กลับคืนสำหรับ line_user_id (เฉพาะแถวที่มีค่า)
-- หมายเหตุ: ไม่เพิ่ม NOT NULL constraint กลับเนื่องจากตอนนี้ line_user_id อาจเป็น NULL ได้
-- เมื่อข้อมูลถูกย้ายไปยัง line_display_id แล้ว

-- 7. แสดงผลลัพธ์
SELECT 'student_line_links summary' as table_name,
       COUNT(*) as total_records,
       COUNT(line_user_id) as records_with_line_user_id,
       COUNT(line_display_id) as records_with_line_display_id
FROM student_line_links

UNION ALL

SELECT 'parent_line_links summary' as table_name,
       COUNT(*) as total_records,
       COUNT(line_user_id) as records_with_line_user_id,
       COUNT(line_display_id) as records_with_line_display_id
FROM parent_line_links;