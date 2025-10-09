-- อัปเดตฟังก์ชัน send_line_notification ด้วย LINE token ที่ถูกต้อง
-- รันคำสั่งนี้ใน Supabase SQL Editor

CREATE OR REPLACE FUNCTION send_line_notification(
    p_line_user_id TEXT,
    p_message TEXT
) RETURNS JSON AS $$
DECLARE
    line_token TEXT := 'jZk+Nn4CdZM02f2NBMXD3yOVm9n4j6yJOjE2RWcFSbsizUrfA7uWIItjSD2YB328X/2z8WfEchqxCWpBQACaGegO+OIvI2IjMFArDMgDOWe9J3if8W2yDLNP/vvCeCKldYfQiHlWkfgU4spC9kCY/QdB04t89/1O/w1cDnyilFU=';
    response_data JSON;
    http_response RECORD;
    log_id BIGINT;
BEGIN
    -- ตรวจสอบว่ามี line_user_id หรือไม่
    IF p_line_user_id IS NULL OR p_line_user_id = '' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'LINE User ID is required'
        );
    END IF;

    -- บันทึก log ก่อนส่ง
    INSERT INTO notification_logs (
        notification_type,
        recipient_id,
        message,
        status,
        created_at
    ) VALUES (
        'line',
        p_line_user_id,
        p_message,
        'sending',
        NOW()
    ) RETURNING id INTO log_id;

    BEGIN
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
            -- อัปเดต log เป็น success
            UPDATE notification_logs 
            SET status = 'sent', 
                updated_at = NOW(),
                error_details = json_build_object(
                    'http_status', http_response.status,
                    'response', http_response.content
                )
            WHERE id = log_id;
            
            RETURN json_build_object(
                'success', true,
                'message', 'LINE notification sent successfully',
                'http_status', http_response.status
            );
        ELSE
            -- อัปเดต log เป็น failed
            UPDATE notification_logs 
            SET status = 'failed', 
                updated_at = NOW(),
                error_details = json_build_object(
                    'http_status', http_response.status,
                    'response', http_response.content
                )
            WHERE id = log_id;
            
            RETURN json_build_object(
                'success', false,
                'error', 'Failed to send LINE notification',
                'http_status', http_response.status,
                'response', http_response.content
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        -- อัปเดต log เป็น error
        UPDATE notification_logs 
        SET status = 'error', 
            updated_at = NOW(),
            error_details = json_build_object('error_message', SQLERRM)
        WHERE id = log_id;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Exception occurred: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;