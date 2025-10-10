-- สร้าง unique constraints อย่างปลอดภัยหลังจากแก้ไขข้อมูลซ้ำแล้ว

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
    
    -- สร้าง unique constraint (PostgreSQL อนุญาตให้มี NULL หลายค่าได้)
    ALTER TABLE public.parents 
    ADD CONSTRAINT parents_phone_unique UNIQUE (parent_phone);
    
    RAISE NOTICE 'สร้าง unique constraint สำหรับ parents.parent_phone สำเร็จ';
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
    
    -- สร้าง unique constraint
    ALTER TABLE public.routes 
    ADD CONSTRAINT routes_name_unique UNIQUE (route_name);
    
    RAISE NOTICE 'สร้าง unique constraint สำหรับ routes.route_name สำเร็จ';
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
    
    -- สร้าง partial unique index
    CREATE UNIQUE INDEX student_line_links_active_unique 
    ON public.student_line_links (student_id) 
    WHERE active = true;
    
    RAISE NOTICE 'สร้าง unique index สำหรับ student_line_links (active) สำเร็จ';
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
    
    -- สร้าง partial unique index
    CREATE UNIQUE INDEX parent_line_links_active_unique 
    ON public.parent_line_links (parent_id) 
    WHERE active = true;
    
    RAISE NOTICE 'สร้าง unique index สำหรับ parent_line_links (active) สำเร็จ';
END $$;