-- สร้าง unique constraints อย่างปลอดภัยหลังจากแก้ไขข้อมูลซ้ำแล้ว (เวอร์ชัน 2)
-- จัดการกับ triggers และ constraints ที่มีอยู่แล้ว

-- 1. สร้าง unique constraint สำหรับ parent_phone
-- ตรวจสอบและแก้ไขข้อมูลก่อนสร้าง constraint
DO $$
BEGIN
    -- แก้ไขค่าว่าง (empty string) เป็น NULL ก่อน
    UPDATE parents SET parent_phone = NULL WHERE parent_phone = '';
    RAISE NOTICE 'แปลงค่าว่าง (empty string) เป็น NULL แล้ว';
    
    -- ตรวจสอบข้อมูลซ้ำ (ไม่รวม NULL)
    IF EXISTS (
        SELECT 1 FROM parents 
        WHERE parent_phone IS NOT NULL AND parent_phone != ''
        GROUP BY parent_phone 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'ยังมีเบอร์โทรซ้ำในตาราง parents กรุณาแก้ไขก่อน';
    END IF;
    
    -- ตรวจสอบว่า constraint มีอยู่แล้วหรือไม่
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'parents_phone_unique' 
        AND table_name = 'parents'
    ) THEN
        -- สร้าง unique constraint (PostgreSQL อนุญาตให้มี NULL หลายค่าได้)
        ALTER TABLE public.parents 
        ADD CONSTRAINT parents_phone_unique UNIQUE (parent_phone);
        
        RAISE NOTICE 'สร้าง unique constraint สำหรับ parents.parent_phone สำเร็จ';
    ELSE
        RAISE NOTICE 'unique constraint สำหรับ parents.parent_phone มีอยู่แล้ว';
    END IF;
END $$;

-- 2. สร้าง unique constraint สำหรับ route_name
DO $$
BEGIN
    -- ตรวจสอบข้อมูลซ้ำ
    IF EXISTS (
        SELECT 1 FROM routes 
        WHERE route_name IS NOT NULL AND route_name != ''
        GROUP BY route_name 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'ยังมีชื่อเส้นทางซ้ำในตาราง routes กรุณาแก้ไขก่อน';
    END IF;
    
    -- ตรวจสอบว่า constraint มีอยู่แล้วหรือไม่
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'routes_name_unique' 
        AND table_name = 'routes'
    ) THEN
        -- สร้าง unique constraint
        ALTER TABLE public.routes 
        ADD CONSTRAINT routes_name_unique UNIQUE (route_name);
        
        RAISE NOTICE 'สร้าง unique constraint สำหรับ routes.route_name สำเร็จ';
    ELSE
        RAISE NOTICE 'unique constraint สำหรับ routes.route_name มีอยู่แล้ว';
    END IF;
END $$;

-- 3. สร้าง partial unique index สำหรับ student_line_links (active)
DO $$
BEGIN
    -- ตรวจสอบข้อมูลซ้ำ
    IF EXISTS (
        SELECT 1 FROM student_line_links 
        WHERE active = true
        GROUP BY student_id 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'ยังมี active LINE links ซ้ำในตาราง student_line_links กรุณาแก้ไขก่อน';
    END IF;
    
    -- ตรวจสอบว่า index มีอยู่แล้วหรือไม่
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'student_line_links_active_unique'
    ) THEN
        -- สร้าง partial unique index
        CREATE UNIQUE INDEX student_line_links_active_unique 
        ON public.student_line_links (student_id) 
        WHERE active = true;
        
        RAISE NOTICE 'สร้าง unique index สำหรับ student_line_links (active) สำเร็จ';
    ELSE
        RAISE NOTICE 'unique index สำหรับ student_line_links (active) มีอยู่แล้ว';
    END IF;
END $$;

-- 4. สร้าง partial unique index สำหรับ parent_line_links (active)
DO $$
BEGIN
    -- ตรวจสอบข้อมูลซ้ำ
    IF EXISTS (
        SELECT 1 FROM parent_line_links 
        WHERE active = true
        GROUP BY parent_id 
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'ยังมี active LINE links ซ้ำในตาราง parent_line_links กรุณาแก้ไขก่อน';
    END IF;
    
    -- ตรวจสอบว่า index มีอยู่แล้วหรือไม่
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'parent_line_links_active_unique'
    ) THEN
        -- สร้าง partial unique index
        CREATE UNIQUE INDEX parent_line_links_active_unique 
        ON public.parent_line_links (parent_id) 
        WHERE active = true;
        
        RAISE NOTICE 'สร้าง unique index สำหรับ parent_line_links (active) สำเร็จ';
    ELSE
        RAISE NOTICE 'unique index สำหรับ parent_line_links (active) มีอยู่แล้ว';
    END IF;
END $$;

-- 5. ตรวจสอบและจัดการ triggers ที่อาจซ้ำ
DO $$
BEGIN
    -- ตรวจสอบว่ามี trigger update_notification_preferences_updated_at หรือไม่
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'update_notification_preferences_updated_at'
        AND trigger_schema = 'public'
    ) THEN
        RAISE NOTICE 'trigger update_notification_preferences_updated_at มีอยู่แล้ว';
    ELSE
        RAISE NOTICE 'ไม่พบ trigger update_notification_preferences_updated_at';
    END IF;
    
    -- แสดงสถิติ triggers ทั้งหมด
    RAISE NOTICE 'จำนวน triggers ทั้งหมดในฐานข้อมูล: %', (
        SELECT COUNT(*) FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    );
END $$;

-- 6. แสดงสรุปผลลัพธ์
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== สรุปผลการสร้าง Unique Constraints ===';
    RAISE NOTICE 'Constraints ที่สร้างสำเร็จ:';
    
    -- ตรวจสอบ constraints ที่สร้างแล้ว
    FOR rec IN 
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE constraint_type = 'UNIQUE' 
        AND table_name IN ('parents', 'routes')
        ORDER BY table_name, constraint_name
    LOOP
        RAISE NOTICE '- %: %', rec.table_name, rec.constraint_name;
    END LOOP;
    
    -- ตรวจสอบ indexes ที่สร้างแล้ว
    FOR rec IN 
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE indexname LIKE '%_active_unique'
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '- %: %', rec.tablename, rec.indexname;
    END LOOP;
    
    RAISE NOTICE '=== เสร็จสิ้นการสร้าง Unique Constraints ===';
END $$;