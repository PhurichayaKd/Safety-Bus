import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

if (!lineToken) {
    console.error('❌ ไม่พบ LINE_CHANNEL_ACCESS_TOKEN');
    console.log('\n📝 กรุณาตั้งค่า LINE_CHANNEL_ACCESS_TOKEN ในไฟล์ .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Function SQL ที่อัปเดตแล้ว
const updatedFunction = `
-- ฟังก์ชันสำหรับส่ง LINE notification (อัปเดตแล้ว)
CREATE OR REPLACE FUNCTION send_line_notification(
    p_line_user_id TEXT,
    p_message TEXT
) RETURNS JSON AS $$
DECLARE
    line_token TEXT := '${lineToken}'; -- ใช้ token จริง
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
                'status', http_response.status,
                'response', http_response.content
            ),
            NOW()
        );

        RETURN json_build_object(
            'success', false,
            'error', 'Failed to send LINE notification',
            'status', http_response.status,
            'response', http_response.content
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
                'error', SQLERRM
            ),
            NOW()
        );

        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
`;

async function updateLineFunction() {
    console.log('🔄 กำลังอัปเดต function send_line_notification...');
    
    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: updatedFunction
        });

        if (error) {
            // ลองใช้วิธีอื่นถ้า rpc ไม่ทำงาน
            console.log('⚠️  rpc ไม่ทำงาน กำลังลองวิธีอื่น...');
            
            const { data: result, error: directError } = await supabase
                .from('pg_stat_user_functions')
                .select('*')
                .limit(1);
                
            if (directError) {
                console.error('❌ ไม่สามารถเชื่อมต่อ Supabase ได้:', directError.message);
                return;
            }
            
            console.log('✅ เชื่อมต่อ Supabase สำเร็จ');
            console.log('📝 กรุณารัน SQL ต่อไปนี้ใน Supabase SQL Editor:');
            console.log('\n' + '='.repeat(80));
            console.log(updatedFunction);
            console.log('='.repeat(80));
            
        } else {
            console.log('✅ อัปเดต function สำเร็จ!');
        }
        
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาด:', err.message);
        console.log('\n📝 กรุณารัน SQL ต่อไปนี้ใน Supabase SQL Editor:');
        console.log('\n' + '='.repeat(80));
        console.log(updatedFunction);
        console.log('='.repeat(80));
    }
}

// ทดสอบการเชื่อมต่อ Supabase ก่อน
async function testConnection() {
    console.log('🔍 ทดสอบการเชื่อมต่อ Supabase...');
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('student_id')
            .limit(1);
            
        if (error) {
            console.error('❌ ไม่สามารถเชื่อมต่อ Supabase ได้:', error.message);
            return false;
        }
        
        console.log('✅ เชื่อมต่อ Supabase สำเร็จ');
        return true;
        
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ:', err.message);
        return false;
    }
}

// รันการทดสอบ
console.log('🚀 เริ่มต้นการอัปเดต LINE function...\n');

console.log('📋 ข้อมูลการตั้งค่า:');
console.log(`SUPABASE_URL: ${supabaseUrl ? '✅ ตั้งค่าแล้ว' : '❌ ไม่ได้ตั้งค่า'}`);
console.log(`SUPABASE_KEY: ${supabaseKey ? '✅ ตั้งค่าแล้ว' : '❌ ไม่ได้ตั้งค่า'}`);
console.log(`LINE_TOKEN: ${lineToken ? '✅ ตั้งค่าแล้ว' : '❌ ไม่ได้ตั้งค่า'}\n`);

testConnection().then(connected => {
    if (connected) {
        updateLineFunction();
    }
});