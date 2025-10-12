-- อัปเดตฟังก์ชัน send_line_notification ให้ทำงานร่วมกับ enhanced RFID function
-- ลบฟังก์ชันเก่าก่อน
DROP FUNCTION IF EXISTS public.send_line_notification(text, text);

-- สร้างฟังก์ชันใหม่
CREATE OR REPLACE FUNCTION send_line_notification(
    p_line_user_id TEXT,
    p_message TEXT
) RETURNS JSON AS $$
DECLARE
    line_token TEXT := 'jZk+Nn4CdZM02f2NBMXD3yOVm9n4j6yJOjE2RWcFSbsizUrfA7uWIItjSD2YB328X/2z8WfEchqxCWpBQACaGegO+OIvI2IjMFArDMgDOWe9J3if8W2yDLNP/vvCeCKldYfQiHlWkfgU4spC9kCY/QdB04t89/1O/w1cDnyilFU='; -- ต้องแทนที่ด้วย token จริง
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

    -- ตรวจสอบว่ามี LINE token หรือไม่
    IF line_token IS NULL OR line_token = '' OR line_token = 'YOUR_LINE_CHANNEL_ACCESS_TOKEN' THEN
        RETURN json_build_object(
            'success', false,
            'error', 'LINE Channel Access Token not configured'
        );
    END IF;

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
            RETURN json_build_object(
                'success', true,
                'message', 'LINE notification sent successfully',
                'http_status', http_response.status
            );
        ELSE
            RETURN json_build_object(
                'success', false,
                'error', 'Failed to send LINE notification',
                'http_status', http_response.status,
                'response', http_response.content
            );
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Internal error: ' || SQLERRM,
                'sqlstate', SQLSTATE
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ให้สิทธิ์เรียกใช้
GRANT EXECUTE ON FUNCTION public.send_line_notification(text, text) TO anon, authenticated;

-- ฟังก์ชันสำหรับทดสอบการส่ง LINE notification
CREATE OR REPLACE FUNCTION test_line_notification(
    p_line_user_id TEXT,
    p_test_message TEXT DEFAULT 'ทดสอบการส่งข้อความจากระบบ Safety Bus'
) RETURNS JSON AS $$
BEGIN
    RETURN send_line_notification(p_line_user_id, p_test_message);
END;
$$ LANGUAGE plpgsql;

-- ให้สิทธิ์เรียกใช้ฟังก์ชันทดสอบ
GRANT EXECUTE ON FUNCTION public.test_line_notification(text, text) TO anon, authenticated;