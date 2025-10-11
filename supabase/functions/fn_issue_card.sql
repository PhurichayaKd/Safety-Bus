-- ฟังก์ชัน fn_issue_card สำหรับการออกบัตรใหม่
-- รองรับการแทนที่บัตรเดิม และบันทึกประวัติในตาราง card_history
CREATE OR REPLACE FUNCTION fn_issue_card(
    p_student_id INTEGER,
    p_new_rfid_code VARCHAR,
    p_assigned_by INTEGER,
    p_old_card_action VARCHAR DEFAULT 'lost' -- 'lost', 'damaged', 'returned'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_card_id BIGINT;
    v_old_card_id BIGINT;
    v_old_rfid_code VARCHAR;
    v_student_name VARCHAR;
    v_current_time TIMESTAMPTZ;
    v_old_status TEXT;
    v_new_status TEXT;
BEGIN
    -- ตั้งค่าเวลาปัจจุบัน
    v_current_time := NOW();
    
    -- ตรวจสอบว่านักเรียนมีอยู่จริง
    SELECT student_name INTO v_student_name
    FROM students 
    WHERE student_id = p_student_id AND is_active = true;
    
    IF v_student_name IS NULL THEN
        RETURN 'STUDENT_NOT_FOUND';
    END IF;
    
    -- ตรวจสอบว่าบัตรใหม่มีอยู่และยังไม่ถูกใช้งาน
    SELECT card_id INTO v_new_card_id
    FROM rfid_cards 
    WHERE rfid_code = p_new_rfid_code 
        AND is_active = true 
        AND (status IS NULL OR status = 'available');
    
    IF v_new_card_id IS NULL THEN
        RETURN 'NEW_CARD_NOT_AVAILABLE';
    END IF;
    
    -- ตรวจสอบว่าบัตรใหม่ถูก assign แล้วหรือไม่
    IF EXISTS (
        SELECT 1 FROM rfid_card_assignments 
        WHERE card_id = v_new_card_id 
            AND is_active = true 
            AND valid_to IS NULL
    ) THEN
        RETURN 'NEW_CARD_ALREADY_ASSIGNED';
    END IF;
    
    -- ค้นหาบัตรเดิมของนักเรียน (ถ้ามี)
    SELECT rca.card_id, rc.rfid_code
    INTO v_old_card_id, v_old_rfid_code
    FROM rfid_card_assignments rca
    JOIN rfid_cards rc ON rca.card_id = rc.card_id
    WHERE rca.student_id = p_student_id 
        AND rca.is_active = true 
        AND rca.valid_to IS NULL
    ORDER BY rca.valid_from DESC
    LIMIT 1;
    
    -- ถ้ามีบัตรเดิม ให้ยุติการใช้งาน
    IF v_old_card_id IS NOT NULL THEN
        -- อัปเดต assignment เดิมให้หมดอายุ
        UPDATE rfid_card_assignments 
        SET valid_to = v_current_time,
            is_active = false
        WHERE card_id = v_old_card_id 
            AND student_id = p_student_id 
            AND is_active = true 
            AND valid_to IS NULL;
        
        -- อัปเดตสถานะบัตรเดิมตามเหตุผล
        CASE p_old_card_action
            WHEN 'lost' THEN
                UPDATE rfid_cards SET status = 'lost' WHERE card_id = v_old_card_id;
                v_old_status := 'assigned';
                v_new_status := 'lost';
            WHEN 'damaged' THEN
                UPDATE rfid_cards SET status = 'damaged' WHERE card_id = v_old_card_id;
                v_old_status := 'assigned';
                v_new_status := 'damaged';
            WHEN 'returned' THEN
                UPDATE rfid_cards SET status = 'available' WHERE card_id = v_old_card_id;
                v_old_status := 'assigned';
                v_new_status := 'available';
            ELSE
                UPDATE rfid_cards SET status = 'retired' WHERE card_id = v_old_card_id;
                v_old_status := 'assigned';
                v_new_status := 'retired';
        END CASE;
        
        -- บันทึกประวัติการยกเลิกบัตรเดิม
        INSERT INTO card_history (
            student_id,
            action_type,
            old_status,
            new_status,
            reason,
            performed_by,
            created_at,
            metadata
        ) VALUES (
            p_student_id,
            CASE p_old_card_action
                WHEN 'lost' THEN 'cancel'
                WHEN 'damaged' THEN 'cancel'
                WHEN 'returned' THEN 'expire'
                ELSE 'cancel'
            END,
            v_old_status,
            v_new_status,
            CASE p_old_card_action
                WHEN 'lost' THEN 'บัตรสูญหาย'
                WHEN 'damaged' THEN 'บัตรชำรุด'
                WHEN 'returned' THEN 'คืนบัตรเดิม'
                ELSE 'เหตุผลอื่นๆ'
            END,
            p_assigned_by,
            v_current_time,
            jsonb_build_object(
                'old_card_id', v_old_card_id,
                'old_rfid_code', v_old_rfid_code,
                'action', p_old_card_action,
                'replaced_with_card_id', v_new_card_id,
                'replaced_with_rfid_code', p_new_rfid_code
            )
        );
    END IF;
    
    -- สร้าง assignment ใหม่
    INSERT INTO rfid_card_assignments (
        card_id,
        student_id,
        valid_from,
        valid_to,
        assigned_by,
        is_active
    ) VALUES (
        v_new_card_id,
        p_student_id,
        v_current_time,
        NULL,
        p_assigned_by,
        true
    );
    
    -- อัปเดตสถานะบัตรใหม่
    UPDATE rfid_cards 
    SET status = 'assigned',
        last_seen_at = v_current_time
    WHERE card_id = v_new_card_id;
    
    -- บันทึกประวัติการออกบัตรใหม่
    INSERT INTO card_history (
        student_id,
        action_type,
        old_status,
        new_status,
        reason,
        performed_by,
        created_at,
        metadata
    ) VALUES (
        p_student_id,
        CASE 
            WHEN v_old_card_id IS NOT NULL THEN 'renew'
            ELSE 'issue'
        END,
        CASE 
            WHEN v_old_card_id IS NOT NULL THEN 'expired'
            ELSE NULL
        END,
        'active',
        CASE 
            WHEN v_old_card_id IS NOT NULL THEN 'ออกบัตรใหม่แทนบัตรเดิม'
            ELSE 'ออกบัตรใหม่'
        END,
        p_assigned_by,
        v_current_time,
        jsonb_build_object(
            'new_card_id', v_new_card_id,
            'new_rfid_code', p_new_rfid_code,
            'student_name', v_student_name,
            'old_card_id', v_old_card_id,
            'old_rfid_code', v_old_rfid_code,
            'replacement_reason', p_old_card_action
        )
    );
    
    RETURN 'ISSUED_OK';
    
EXCEPTION
    WHEN OTHERS THEN
        -- บันทึก error log
        INSERT INTO card_history (
            student_id,
            action_type,
            old_status,
            new_status,
            reason,
            performed_by,
            created_at,
            metadata
        ) VALUES (
            p_student_id,
            'issue',
            NULL,
            'error',
            'เกิดข้อผิดพลาดในการออกบัตร',
            p_assigned_by,
            v_current_time,
            jsonb_build_object(
                'error_message', SQLERRM,
                'error_code', SQLSTATE,
                'new_rfid_code', p_new_rfid_code,
                'old_card_action', p_old_card_action
            )
        );
        
        RETURN 'ERROR: ' || SQLERRM;
END;
$$;

-- ให้สิทธิ์ในการเรียกใช้ function
GRANT EXECUTE ON FUNCTION fn_issue_card TO anon, authenticated;

-- สร้าง comment สำหรับ function
COMMENT ON FUNCTION fn_issue_card IS 'ฟังก์ชันสำหรับการออกบัตร RFID ใหม่ รองรับการแทนที่บัตรเดิมและบันทึกประวัติ';