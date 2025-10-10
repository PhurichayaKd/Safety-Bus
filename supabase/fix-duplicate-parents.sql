-- ตรวจสอบข้อมูลซ้ำในตาราง parents
-- 1. หาเบอร์โทรที่ซ้ำกัน
SELECT 
    parent_phone,
    COUNT(*) as duplicate_count,
    STRING_AGG(parent_id::text, ', ') as parent_ids,
    STRING_AGG(parent_name, ' | ') as parent_names
FROM parents 
WHERE parent_phone IS NOT NULL 
    AND parent_phone != ''
GROUP BY parent_phone 
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 2. ดูรายละเอียดของเบอร์โทร 0123456789 ที่ซ้ำ
SELECT 
    parent_id,
    parent_name,
    parent_phone,
    (SELECT COUNT(*) FROM student_guardians sg WHERE sg.parent_id = p.parent_id) as student_count
FROM parents p
WHERE parent_phone = '0123456789'
ORDER BY parent_id;

-- 3. ตรวจสอบว่าผู้ปกครองเหล่านี้มีนักเรียนที่ดูแลหรือไม่
SELECT 
    p.parent_id,
    p.parent_name,
    p.parent_phone,
    s.student_id,
    s.student_name,
    sg.relationship,
    sg.is_primary
FROM parents p
LEFT JOIN student_guardians sg ON p.parent_id = sg.parent_id
LEFT JOIN students s ON sg.student_id = s.student_id
WHERE p.parent_phone = '0123456789'
ORDER BY p.parent_id, s.student_id;

-- 4. ตรวจสอบ LINE links ของผู้ปกครองที่ซ้ำ
SELECT 
    p.parent_id,
    p.parent_name,
    p.parent_phone,
    pll.link_id,
    pll.line_user_id,
    pll.line_display_id,
    pll.active
FROM parents p
LEFT JOIN parent_line_links pll ON p.parent_id = pll.parent_id
WHERE p.parent_phone = '0123456789'
ORDER BY p.parent_id, pll.link_id;