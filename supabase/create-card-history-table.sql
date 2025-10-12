-- สร้างตาราง card_history สำหรับบันทึกประวัติการจัดการบัตร RFID
-- ตารางนี้จะบันทึกทุกการเปลี่ยนแปลงสถานะของบัตร RFID

CREATE TABLE IF NOT EXISTS public.card_history (
    history_id BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('issue', 'expire', 'renew', 'cancel', 'suspend', 'reactivate')),
    old_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT,
    performed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Foreign key constraints
    CONSTRAINT fk_card_history_student 
        FOREIGN KEY (student_id) 
        REFERENCES public.students(student_id) 
        ON DELETE CASCADE
);

-- สร้าง indexes สำหรับการค้นหาที่มีประสิทธิภาพ
CREATE INDEX IF NOT EXISTS idx_card_history_student_id ON public.card_history(student_id);
CREATE INDEX IF NOT EXISTS idx_card_history_action_type ON public.card_history(action_type);
CREATE INDEX IF NOT EXISTS idx_card_history_created_at ON public.card_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_history_performed_by ON public.card_history(performed_by);

-- สร้าง composite index สำหรับการค้นหาที่ซับซ้อน
CREATE INDEX IF NOT EXISTS idx_card_history_student_action_date 
    ON public.card_history(student_id, action_type, created_at DESC);

-- เพิ่ม comments สำหรับ documentation
COMMENT ON TABLE public.card_history IS 'ตารางบันทึกประวัติการจัดการบัตร RFID ของนักเรียน';
COMMENT ON COLUMN public.card_history.history_id IS 'รหัสประวัติ (Primary Key)';
COMMENT ON COLUMN public.card_history.student_id IS 'รหัสนักเรียน';
COMMENT ON COLUMN public.card_history.action_type IS 'ประเภทการดำเนินการ: issue, expire, renew, cancel, suspend, reactivate';
COMMENT ON COLUMN public.card_history.old_status IS 'สถานะเดิมก่อนการเปลี่ยนแปลง';
COMMENT ON COLUMN public.card_history.new_status IS 'สถานะใหม่หลังการเปลี่ยนแปลง';
COMMENT ON COLUMN public.card_history.reason IS 'เหตุผลของการเปลี่ยนแปลง';
COMMENT ON COLUMN public.card_history.performed_by IS 'ผู้ดำเนินการ (user_id หรือ username)';
COMMENT ON COLUMN public.card_history.created_at IS 'วันเวลาที่บันทึกประวัติ';
COMMENT ON COLUMN public.card_history.metadata IS 'ข้อมูลเพิ่มเติมในรูปแบบ JSON (เช่น card_id, rfid_code, etc.)';

-- สร้าง RLS (Row Level Security) policies ถ้าต้องการ
ALTER TABLE public.card_history ENABLE ROW LEVEL SECURITY;

-- Policy สำหรับการอ่านข้อมูล (authenticated users สามารถอ่านได้ทั้งหมด)
CREATE POLICY "Allow read access to card_history for authenticated users" 
    ON public.card_history FOR SELECT 
    TO authenticated 
    USING (true);

-- Policy สำหรับการเขียนข้อมูล (authenticated users สามารถเพิ่มข้อมูลได้)
CREATE POLICY "Allow insert access to card_history for authenticated users" 
    ON public.card_history FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT ON public.card_history TO authenticated;
GRANT SELECT, INSERT ON public.card_history TO anon;
GRANT USAGE ON SEQUENCE public.card_history_history_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.card_history_history_id_seq TO anon;

-- สร้างฟังก์ชันสำหรับดึงประวัติบัตรของนักเรียน
CREATE OR REPLACE FUNCTION get_student_card_history(p_student_id INTEGER)
RETURNS TABLE (
    history_id BIGINT,
    action_type TEXT,
    old_status TEXT,
    new_status TEXT,
    reason TEXT,
    performed_by TEXT,
    created_at TIMESTAMPTZ,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.history_id,
        ch.action_type,
        ch.old_status,
        ch.new_status,
        ch.reason,
        ch.performed_by,
        ch.created_at,
        ch.metadata
    FROM public.card_history ch
    WHERE ch.student_id = p_student_id
    ORDER BY ch.created_at DESC;
END;
$$;

-- Grant execute permission สำหรับฟังก์ชัน
GRANT EXECUTE ON FUNCTION get_student_card_history TO authenticated;
GRANT EXECUTE ON FUNCTION get_student_card_history TO anon;

COMMENT ON FUNCTION get_student_card_history IS 'ฟังก์ชันสำหรับดึงประวัติการจัดการบัตรของนักเรียน';