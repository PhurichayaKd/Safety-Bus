-- ทดสอบการแก้ไข pg_triggers เป็น information_schema.triggers

-- 1. ทดสอบการดู triggers ทั้งหมด
SELECT 
    'Test 1: All triggers' as test_name,
    trigger_schema as schemaname,
    event_object_table as tablename,
    trigger_name as triggername
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. ทดสอบการค้นหา trigger เฉพาะ
SELECT 
    'Test 2: Specific trigger search' as test_name,
    trigger_schema as schemaname,
    event_object_table as tablename,
    trigger_name as triggername
FROM information_schema.triggers 
WHERE trigger_name = 'update_notification_preferences_updated_at'
AND trigger_schema = 'public';

-- 3. ทดสอบการนับจำนวน triggers
SELECT 
    'Test 3: Trigger count' as test_name,
    COUNT(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

-- 4. ทดสอบการตรวจสอบ trigger ใน DO block
DO $$
BEGIN
    -- ทดสอบการตรวจสอบว่า trigger มีอยู่หรือไม่
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_notification_preferences_updated_at'
        AND trigger_schema = 'public'
    ) THEN
        RAISE NOTICE 'Test 4: พบ trigger update_notification_preferences_updated_at';
    ELSE
        RAISE NOTICE 'Test 4: ไม่พบ trigger update_notification_preferences_updated_at';
    END IF;
    
    -- ทดสอบการนับ triggers
    RAISE NOTICE 'Test 4: จำนวน triggers ทั้งหมด: %', (
        SELECT COUNT(*) FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    );
END $$;

-- 5. แสดงข้อมูลเปรียบเทียบ (หากต้องการ)
SELECT 
    'Test 5: Trigger details' as test_name,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

RAISE NOTICE 'การทดสอบเสร็จสิ้น - ไม่มีข้อผิดพลาด pg_triggers';