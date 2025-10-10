-- ทดสอบรันสคริปต์ที่แก้ไขแล้ว
-- ไฟล์นี้จะรันเฉพาะส่วนที่แก้ไขเพื่อทดสอบ syntax

-- ทดสอบ DO block ที่แก้ไขแล้ว
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== ทดสอบ FOR loop ที่แก้ไขแล้ว ===';
    
    -- ทดสอบ loop แรก
    FOR rec IN 
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'UNIQUE' 
        AND table_name IN ('parents', 'routes')
        ORDER BY table_name, constraint_name
    LOOP
        RAISE NOTICE '- %: %', rec.table_name, rec.constraint_name;
    END LOOP;
    
    -- ทดสอบ loop ที่สอง
    FOR rec IN 
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE indexname LIKE '%_active_unique'
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '- %: %', rec.tablename, rec.indexname;
    END LOOP;
    
    RAISE NOTICE 'ทดสอบสำเร็จ - syntax ถูกต้องแล้ว';
END $$;