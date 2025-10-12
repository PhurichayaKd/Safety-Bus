import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// โหลด environment variables
dotenv.config({ path: path.join(process.cwd(), '../safety-bus-bot/vercel-deploy/.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLineDirectly() {
    console.log('🧪 ทดสอบฟังก์ชัน LINE โดยตรง...\n');

    // ทดสอบหลาย format ของ LINE User ID
    const testCases = [
        {
            name: 'Format 1: 33 ตัวอักษร',
            userId: 'U1234567890abcdef1234567890abcdef12',
            message: 'ทดสอบ Format 1'
        },
        {
            name: 'Format 2: 32 ตัวอักษร',
            userId: 'U1234567890abcdef1234567890abcdef',
            message: 'ทดสอบ Format 2'
        },
        {
            name: 'Format 3: ใช้ตัวอย่างจาก LINE Documentation',
            userId: 'Udeadbeefdeadbeefdeadbeefdeadbeef',
            message: 'ทดสอบ Format 3'
        }
    ];

    for (const testCase of testCases) {
        console.log(`📱 ${testCase.name}:`);
        console.log(`   User ID: ${testCase.userId} (${testCase.userId.length} ตัวอักษร)`);
        
        try {
            const { data: result, error } = await supabase.rpc('send_line_notification', {
                p_line_user_id: testCase.userId,
                p_message: testCase.message
            });

            if (error) {
                console.log(`   ❌ Error: ${error.message}`);
            } else {
                console.log(`   ✅ Result:`, JSON.stringify(result, null, 2));
            }
        } catch (err) {
            console.log(`   ❌ Exception: ${err.message}`);
        }
        
        console.log();
    }

    // ทดสอบด้วย User ID ที่ไม่ถูกต้อง
    console.log('📱 ทดสอบ User ID ที่ไม่ถูกต้อง:');
    try {
        const { data: result, error } = await supabase.rpc('send_line_notification', {
            p_line_user_id: 'invalid_user_id',
            p_message: 'ทดสอบ User ID ไม่ถูกต้อง'
        });

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   Result:`, JSON.stringify(result, null, 2));
        }
    } catch (err) {
        console.log(`   ❌ Exception: ${err.message}`);
    }
}

testLineDirectly().catch(console.error);