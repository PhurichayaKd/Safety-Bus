-- ตรวจสอบข้อมูลซ้ำในทุกตารางที่เกี่ยวข้อง

-- 1. ตรวจสอบ parents table
SELECT 'parents' as table_name, 'parent_phone' as column_name, parent_phone as value, COUNT(*) as count
FROM parents 
WHERE parent_phone IS NOT NULL AND parent_phone != ''
GROUP BY parent_phone 
HAVING COUNT(*) > 1

UNION ALL

-- 2. ตรวจสอบ routes table
SELECT 'routes' as table_name, 'route_name' as column_name, route_name as value, COUNT(*) as count
FROM routes 
WHERE route_name IS NOT NULL AND route_name != ''
GROUP BY route_name 
HAVING COUNT(*) > 1

UNION ALL

-- 3. ตรวจสอบ student_line_links - active links ซ้ำ
SELECT 'student_line_links' as table_name, 'student_id (active)' as column_name, 
       student_id::text as value, COUNT(*) as count
FROM student_line_links 
WHERE active = true
GROUP BY student_id 
HAVING COUNT(*) > 1

UNION ALL

-- 4. ตรวจสอบ parent_line_links - active links ซ้ำ
SELECT 'parent_line_links' as table_name, 'parent_id (active)' as column_name, 
       parent_id::text as value, COUNT(*) as count
FROM parent_line_links 
WHERE active = true
GROUP BY parent_id 
HAVING COUNT(*) > 1

ORDER BY table_name, count DESC;