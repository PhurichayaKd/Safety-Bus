-- ฟังก์ชันสำหรับส่ง LINE notification
CREATE OR REPLACE FUNCTION send_line_notification(
    p_line_user_id TEXT,
    p_message TEXT
) RETURNS JSON AS $$
DECLARE
    line_token TEXT := 'YOUR_LINE_CHANNEL_ACCESS_TOKEN'; -- ต้องแทนที่ด้วย token จริง
    response_data JSON;
    http_response RECORD;
BEGIN
    -- ตรวจสอบว่ามี line_user_id หรือไม่
    IF p_line_user_id IS NULL OR p_line_user_id = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'LINE User ID is required'
        );
    END IF;

    -- ส่งข้อความผ่าน LINE Messaging API
    SELECT * INTO http_response FROM http((
        'POST',
        'https://api.line.me/v2/bot/message/push',
        ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || line_token)
        ],
        'application/json',
        json_build_object(
            'to', p_line_user_id,
            'messages', json_build_array(
                json_build_object(
                    'type', 'text',
                    'text', p_message
                )
            )
        )::text
    ));

    -- ตรวจสอบผลลัพธ์
    IF http_response.status = 200 THEN
        RETURN json_build_object(
            'success', true,
            'message', 'LINE notification sent successfully'
        );
    ELSE
        -- บันทึก error log
        INSERT INTO notification_logs (
            notification_type,
            recipient_id,
            message,
            status,
            error_details,
            created_at
        ) VALUES (
            'line',
            p_line_user_id,
            p_message,
            'failed',
            json_build_object(
                'http_status', http_response.status,
                'response', http_response.content
            ),
            NOW()
        );

        RETURN json_build_object(
            'success', false,
            'error', 'Failed to send LINE notification',
            'http_status', http_response.status
        );
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        -- บันทึก error log
        INSERT INTO notification_logs (
            notification_type,
            recipient_id,
            message,
            status,
            error_details,
            created_at
        ) VALUES (
            'line',
            p_line_user_id,
            p_message,
            'error',
            json_build_object(
                'error_code', SQLSTATE,
                'error_message', SQLERRM
            ),
            NOW()
        );

        RETURN json_build_object(
            'success', false,
            'error', 'Internal error: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ฟังก์ชันสำหรับสร้างข้อความแจ้งเตือนการขึ้น-ลงรถ
CREATE OR REPLACE FUNCTION create_pickup_notification_message(
    p_student_name TEXT,
    p_location_type TEXT,
    p_scan_time TIMESTAMP WITH TIME ZONE,
    p_driver_name TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    action_text TEXT;
    time_text TEXT;
    driver_text TEXT := '';
BEGIN
    -- กำหนดข้อความตามประเภทการเดินทาง
    IF p_location_type = 'go' THEN
        action_text := 'ขึ้นรถ';
    ELSIF p_location_type = 'return' THEN
        action_text := 'ลงรถ';
    ELSE
        action_text := 'สแกนบัตร';
    END IF;

    -- จัดรูปแบบเวลา
    time_text := TO_CHAR(p_scan_time AT TIME ZONE 'Asia/Bangkok', 'DD/MM/YYYY HH24:MI');

    -- เพิ่มชื่อคนขับถ้ามี
    IF p_driver_name IS NOT NULL AND p_driver_name != '' THEN
        driver_text := E'\nคนขับ: ' || p_driver_name;
    END IF;

    -- สร้างข้อความแจ้งเตือน
    RETURN '🚌 แจ้งเตือนการเดินทาง' || E'\n' ||
           '👦 นักเรียน: ' || p_student_name || E'\n' ||
           '📍 สถานะ: ' || action_text || E'\n' ||
           '🕐 เวลา: ' || time_text ||
           driver_text || E'\n' ||
           E'\n' ||
           '✅ ระบบบันทึกข้อมูลเรียบร้อยแล้ว';
END;
$$ LANGUAGE plpgsql;

-- ลบตารางเก่าถ้ามี (เพื่อป้องกันปัญหาโครงสร้างไม่ตรงกัน)
DROP TABLE IF EXISTS notification_logs CASCADE;

-- ตารางสำหรับบันทึก notification logs
CREATE TABLE notification_logs (
    id BIGSERIAL PRIMARY KEY,
    notification_type VARCHAR(20) NOT NULL, -- 'line', 'sms', 'email'
    recipient_id TEXT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'error'
    error_details JSON,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้าง index สำหรับการค้นหา
CREATE INDEX idx_notification_logs_type_status 
ON notification_logs(notification_type, status);

CREATE INDEX idx_notification_logs_created_at 
ON notification_logs(created_at);

-- เพิ่ม trigger สำหรับอัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_logs_updated_at
    BEFORE UPDATE ON notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ฟังก์ชันสำหรับทำความสะอาด logs เก่า (เก็บไว้ 30 วัน)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notification_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ตัวอย่างการใช้งาน:
-- SELECT send_line_notification('U1234567890abcdef', 'ทดสอบข้อความ');
-- SELECT create_pickup_notification_message('สมชาย ใจดี', 'go', NOW(), 'คุณสมศักดิ์');