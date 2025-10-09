import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// โหลด environment variables
dotenv.config({ path: path.join(process.cwd(), '../safety-bus-bot/vercel-deploy/.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

if (!lineToken) {
    console.error('❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLineNotificationFunction() {
    console.log('🔄 อัปเดตฟังก์ชัน send_line_notification ด้วย LINE token ที่ถูกต้อง...');
    
    const functionSQL = `
-- ฟังก์ชันสำหรับส่ง LINE notification (อัปเดต)
CREATE OR REPLACE FUNCTION send_line_notification(
    p_line_user_id TEXT,
    p_message TEXT
) RETURNS JSON AS $$
DECLARE
    line_token TEXT := '${lineToken}';
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
    ) RETURNING log_id INTO log_id;

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
                sent_at = NOW(),
                response_data = json_build_object(
                    'http_status', http_response.status,
                    'response', http_response.content
                )
            WHERE log_id = log_id;
            
            RETURN json_build_object(
                'success', true,
                'message', 'LINE notification sent successfully',
                'http_status', http_response.status
            );
        ELSE
            -- อัปเดต log เป็น failed
            UPDATE notification_logs 
            SET status = 'failed', 
                error_message = json_build_object(
                    'http_status', http_response.status,
                    'response', http_response.content
                )::text
            WHERE log_id = log_id;
            
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
            error_message = SQLERRM
        WHERE log_id = log_id;
        
        RETURN json_build_object(
            'success', false,
            'error', 'Exception occurred: ' || SQLERRM
        );
    END;
END;
$$ LANGUAGE plpgsql;
`;

    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: functionSQL
        });

        if (error) {
            console.error('❌ ข้อผิดพลาดในการอัปเดตฟังก์ชัน:', error);
            return false;
        }

        console.log('✅ อัปเดตฟังก์ชัน send_line_notification สำเร็จ');
        console.log('🔑 ใช้ LINE token:', lineToken.substring(0, 20) + '...');
        return true;

    } catch (error) {
        console.error('❌ ข้อผิดพลาด:', error);
        return false;
    }
}

// รันฟังก์ชัน
updateLineNotificationFunction().then(success => {
    if (success) {
        console.log('🎉 อัปเดต LINE token เรียบร้อยแล้ว');
    } else {
        console.log('❌ ไม่สามารถอัปเดต LINE token ได้');
    }
    process.exit(success ? 0 : 1);
});