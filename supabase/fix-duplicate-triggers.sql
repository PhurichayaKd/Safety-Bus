-- แก้ไขปัญหา triggers ที่ซ้ำกัน

-- 1. ตรวจสอบ triggers ที่มีอยู่แล้ว
SELECT 
    'Existing triggers' as info,
    trigger_schema as schemaname,
    event_object_table as tablename,
    trigger_name as triggername,
    action_statement as definition
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. ตรวจสอบ trigger ที่เกิดข้อผิดพลาด
SELECT 
    'Problem trigger' as info,
    trigger_schema as schemaname,
    event_object_table as tablename,
    trigger_name as triggername,
    action_statement as definition
FROM information_schema.triggers 
WHERE trigger_name = 'update_notification_preferences_updated_at';

-- 3. ตรวจสอบว่าตาราง notification_preferences มีอยู่หรือไม่
SELECT 
    'notification_preferences table check' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'notification_preferences';

-- 4. หากตาราง notification_preferences มีอยู่ ให้ดูโครงสร้าง
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notification_preferences'
    ) THEN
        RAISE NOTICE 'ตาราง notification_preferences มีอยู่แล้ว';
        
        -- ตรวจสอบว่ามีคอลัมน์ updated_at หรือไม่
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'notification_preferences' 
            AND column_name = 'updated_at'
        ) THEN
            RAISE NOTICE 'คอลัมน์ updated_at มีอยู่ในตาราง notification_preferences';
        ELSE
            RAISE NOTICE 'ไม่พบคอลัมน์ updated_at ในตาราง notification_preferences';
        END IF;
    ELSE
        RAISE NOTICE 'ไม่พบตาราง notification_preferences';
    END IF;
END $$;

-- 5. ลบ trigger ที่ซ้ำกัน (หากจำเป็น)
DO $$
BEGIN
    -- ตรวจสอบว่า trigger มีอยู่หรือไม่
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_notification_preferences_updated_at'
        AND event_object_table = 'notification_preferences'
        AND trigger_schema = 'public'
    ) THEN
        -- ลบ trigger ที่มีอยู่
        DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
        RAISE NOTICE 'ลบ trigger update_notification_preferences_updated_at แล้ว';
    ELSE
        RAISE NOTICE 'ไม่พบ trigger update_notification_preferences_updated_at';
    END IF;
END $$;

-- 6. สร้าง function สำหรับ updated_at (หากยังไม่มี)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. สร้าง trigger ใหม่ (หากตาราง notification_preferences มีอยู่)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notification_preferences'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_preferences' 
        AND column_name = 'updated_at'
    ) THEN
        -- สร้าง trigger ใหม่
        CREATE TRIGGER update_notification_preferences_updated_at
            BEFORE UPDATE ON notification_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
            
        RAISE NOTICE 'สร้าง trigger update_notification_preferences_updated_at ใหม่แล้ว';
    ELSE
        RAISE NOTICE 'ไม่สามารถสร้าง trigger ได้ เนื่องจากไม่พบตารางหรือคอลัมน์ที่จำเป็น';
    END IF;
END $$;

-- 8. ตรวจสอบผลลัพธ์สุดท้าย
SELECT 
    'Final trigger status' as info,
    trigger_schema as schemaname,
    event_object_table as tablename,
    trigger_name as triggername
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notification_preferences%'
AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;