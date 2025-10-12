import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// อ่าน environment variables
dotenv.config({ path: path.join(process.cwd(), '../safety-bus-bot/vercel-deploy/.env.local') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || 'https://ugkxolufzlnvsvtpxhp.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ไม่พบ environment variables ที่จำเป็น');
    console.log('SUPABASE_URL:', supabaseUrl);
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'มี' : 'ไม่มี');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFixColumns() {
    try {
        console.log('🔧 เริ่มแก้ไขคอลัมน์ที่ขาดหาย...\n');

        // อ่านไฟล์ SQL
        const sqlContent = fs.readFileSync(path.join(__dirname, 'fix-all-missing-columns.sql'), 'utf8');
        
        // รันคำสั่ง SQL
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
        
        if (error) {
            console.error('❌ เกิดข้อผิดพลาด:', error);
            
            // ลองรันทีละคำสั่ง
            console.log('\n🔄 ลองรันทีละคำสั่ง...\n');
            await runIndividualCommands();
        } else {
            console.log('✅ รันคำสั่ง SQL สำเร็จ');
            console.log('📊 ผลลัพธ์:', data);
        }

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการรันสคริปต์:', error);
        
        // ลองรันทีละคำสั่ง
        console.log('\n🔄 ลองรันทีละคำสั่ง...\n');
        await runIndividualCommands();
    }
}

async function runIndividualCommands() {
    try {
        // 1. เพิ่มคอลัมน์ notification_sent
        console.log('1️⃣ เพิ่มคอลัมน์ notification_sent...');
        const { error: error1 } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'rfid_scan_logs')
            .eq('column_name', 'notification_sent');

        if (error1) {
            // ลองเพิ่มคอลัมน์โดยตรง
            const { error: addError1 } = await supabase.rpc('exec_sql', {
                sql_query: `ALTER TABLE public.rfid_scan_logs ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;`
            });
            
            if (addError1) {
                console.log('⚠️  คอลัมน์ notification_sent อาจมีอยู่แล้ว หรือเกิดข้อผิดพลาด:', addError1.message);
            } else {
                console.log('✅ เพิ่มคอลัมน์ notification_sent สำเร็จ');
            }
        }

        // 2. เพิ่มคอลัมน์ scan_method
        console.log('2️⃣ เพิ่มคอลัมน์ scan_method...');
        const { error: addError2 } = await supabase.rpc('exec_sql', {
            sql_query: `ALTER TABLE public.pickup_dropoff ADD COLUMN IF NOT EXISTS scan_method text DEFAULT 'rfid' CHECK (scan_method IN ('rfid', 'manual', 'qr_code', 'nfc'));`
        });
        
        if (addError2) {
            console.log('⚠️  คอลัมน์ scan_method อาจมีอยู่แล้ว หรือเกิดข้อผิดพลาด:', addError2.message);
        } else {
            console.log('✅ เพิ่มคอลัมน์ scan_method สำเร็จ');
        }

        // 3. อัปเดตข้อมูลเก่า
        console.log('3️⃣ อัปเดตข้อมูลเก่า...');
        
        const { error: updateError1 } = await supabase
            .from('rfid_scan_logs')
            .update({ notification_sent: false })
            .is('notification_sent', null);
            
        if (updateError1) {
            console.log('⚠️  อัปเดต rfid_scan_logs:', updateError1.message);
        } else {
            console.log('✅ อัปเดต rfid_scan_logs สำเร็จ');
        }

        const { error: updateError2 } = await supabase
            .from('pickup_dropoff')
            .update({ scan_method: 'rfid' })
            .is('scan_method', null);
            
        if (updateError2) {
            console.log('⚠️  อัปเดต pickup_dropoff:', updateError2.message);
        } else {
            console.log('✅ อัปเดต pickup_dropoff สำเร็จ');
        }

        console.log('\n🎉 การแก้ไขคอลัมน์เสร็จสิ้น!');
        
        // ตรวจสอบผลลัพธ์
        await checkColumns();

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการรันทีละคำสั่ง:', error);
    }
}

async function checkColumns() {
    console.log('\n📋 ตรวจสอบคอลัมน์ที่เพิ่ม...');
    
    try {
        // ตรวจสอบ notification_sent
        const { data: rfidCols, error: rfidError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, column_default')
            .eq('table_schema', 'public')
            .eq('table_name', 'rfid_scan_logs')
            .eq('column_name', 'notification_sent');

        if (rfidCols && rfidCols.length > 0) {
            console.log('✅ rfid_scan_logs.notification_sent:', rfidCols[0]);
        } else {
            console.log('❌ ไม่พบคอลัมน์ notification_sent');
        }

        // ตรวจสอบ scan_method
        const { data: pickupCols, error: pickupError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, column_default')
            .eq('table_schema', 'public')
            .eq('table_name', 'pickup_dropoff')
            .eq('column_name', 'scan_method');

        if (pickupCols && pickupCols.length > 0) {
            console.log('✅ pickup_dropoff.scan_method:', pickupCols[0]);
        } else {
            console.log('❌ ไม่พบคอลัมน์ scan_method');
        }

    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error);
    }
}

// รันสคริปต์
runFixColumns();