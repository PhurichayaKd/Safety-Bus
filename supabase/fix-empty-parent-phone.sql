-- แก้ไขปัญหาค่าว่างซ้ำในคอลัมน์ parent_phone

-- 1. ตรวจสอบข้อมูลซ้ำที่เป็นค่าว่างหรือ NULL
SELECT 
    'Empty/NULL phone duplicates' as issue_type,
    COUNT(*) as total_count,
    COUNT(CASE WHEN parent_phone IS NULL THEN 1 END) as null_count,
    COUNT(CASE WHEN parent_phone = '' THEN 1 END) as empty_string_count
FROM parents 
WHERE parent_phone IS NULL OR parent_phone = '';

-- 2. ดูรายละเอียดของ parents ที่มี parent_phone เป็นค่าว่างหรือ NULL
SELECT 
    parent_id,
    parent_name,
    parent_phone,
    CASE 
        WHEN parent_phone IS NULL THEN 'NULL'
        WHEN parent_phone = '' THEN 'EMPTY_STRING'
        ELSE 'OTHER'
    END as phone_status,
    created_at
FROM parents 
WHERE parent_phone IS NULL OR parent_phone = ''
ORDER BY created_at;

-- 3. ตรวจสอบว่า parents เหล่านี้มีนักเรียนที่ดูแลหรือไม่
SELECT 
    p.parent_id,
    p.parent_name,
    p.parent_phone,
    COUNT(s.student_id) as student_count,
    STRING_AGG(s.student_name, ', ') as students
FROM parents p
LEFT JOIN students s ON p.parent_id = s.parent_id
WHERE p.parent_phone IS NULL OR p.parent_phone = ''
GROUP BY p.parent_id, p.parent_name, p.parent_phone
ORDER BY student_count DESC, p.created_at;

-- 4. ตรวจสอบ LINE links ของ parents ที่มีปัญหา
SELECT 
    p.parent_id,
    p.parent_name,
    p.parent_phone,
    pll.line_user_id,
    pll.active as line_active
FROM parents p
LEFT JOIN parent_line_links pll ON p.parent_id = pll.parent_id
WHERE p.parent_phone IS NULL OR p.parent_phone = ''
ORDER BY p.parent_id;

-- 5. แก้ไขข้อมูล: อัปเดตค่าว่าง (empty string) เป็น NULL
-- เพื่อให้ PostgreSQL จัดการ NULL values ได้ถูกต้อง
UPDATE parents 
SET parent_phone = NULL 
WHERE parent_phone = '';

-- 6. ตรวจสอบผลลัพธ์หลังการอัปเดต
SELECT 
    'After fixing empty strings' as status,
    COUNT(*) as total_parents,
    COUNT(CASE WHEN parent_phone IS NULL THEN 1 END) as null_phone_count,
    COUNT(CASE WHEN parent_phone = '' THEN 1 END) as empty_string_count,
    COUNT(CASE WHEN parent_phone IS NOT NULL AND parent_phone != '' THEN 1 END) as valid_phone_count
FROM parents;

-- 7. ตรวจสอบว่ายังมีข้อมูลซ้ำหรือไม่ (ไม่ควรมีแล้วหลังจากแปลง empty string เป็น NULL)
SELECT 
    parent_phone,
    COUNT(*) as duplicate_count
FROM parents 
WHERE parent_phone IS NOT NULL AND parent_phone != ''
GROUP BY parent_phone 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 8. แสดงสถิติสุดท้าย
SELECT 
    'Final statistics' as summary,
    COUNT(*) as total_parents,
    COUNT(DISTINCT parent_phone) as unique_phones,
    COUNT(CASE WHEN parent_phone IS NULL THEN 1 END) as null_phones,
    COUNT(CASE WHEN parent_phone IS NOT NULL AND parent_phone != '' THEN 1 END) as valid_phones
FROM parents;