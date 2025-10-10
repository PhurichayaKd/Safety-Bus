-- ตรวจสอบ triggers ที่มีอยู่แล้วในฐานข้อมูล

-- 1. ดู triggers ทั้งหมดในฐานข้อมูล
SELECT 
    trigger_schema as schemaname,
    event_object_table as tablename,
    trigger_name as triggername,
    action_statement as definition
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. ตรวจสอบ trigger เฉพาะที่เกิดข้อผิดพลาด
SELECT 
    trigger_schema as schemaname,
    event_object_table as tablename,
    trigger_name as triggername,
    action_statement as definition
FROM information_schema.triggers 
WHERE trigger_name = 'update_notification_preferences_updated_at';

-- 3. ดู functions ที่เกี่ยวข้องกับ updated_at triggers
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname LIKE '%updated_at%'
   OR p.proname LIKE '%update_timestamp%'
ORDER BY schema_name, function_name;

-- 4. ตรวจสอบตาราง notification_preferences
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notification_preferences'
ORDER BY ordinal_position;

-- 5. ดู constraints ของตาราง notification_preferences
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'notification_preferences'
ORDER BY tc.constraint_type, tc.constraint_name;