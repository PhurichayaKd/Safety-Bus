const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_ANON_KEY ใน environment variables');
    console.log('🔍 ตรวจสอบไฟล์ .env.local ใน safety-bus-bot/vercel-deploy/');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateFunction() {
    console.log('🔄 กำลังอัปเดตฟังก์ชัน record_rfid_scan ใน Supabase...\n');
    
    try {
        // อ่านไฟล์ SQL
        const sqlPath = path.join(__dirname, 'final-fixed-function.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('📄 อ่านไฟล์ final-fixed-function.sql สำเร็จ');
        console.log('📝 เนื้อหาฟังก์ชัน:');
        console.log('   - ลบคอลัมน์ recipient_type ออกจาก notification_logs');
        console.log('   - ใช้ error_details แทน metadata');
        console.log('   - ใช้ event_type เป็น "pickup" ตาม constraint');
        console.log('   - ไม่ส่ง event_local_date เพราะเป็น GENERATED column\n');
        
        // รันคำสั่ง SQL
        const { data, error } = await supabase.rpc('exec', {
            sql: sqlContent
        });
        
        if (error) {
            // ลองใช้วิธีอื่นถ้า exec ไม่ทำงาน
            console.log('⚠️ ไม่สามารถใช้ rpc exec ได้, ลองใช้วิธีอื่น...');
            
            // ลองใช้ from().select() เพื่อรัน SQL
            const { data: result, error: sqlError } = await supabase
                .from('_dummy_')
                .select('*')
                .limit(0);
                
            // หรือลองใช้ raw SQL ผ่าน PostgREST
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`,
                    'apikey': supabaseKey
                },
                body: JSON.stringify({ sql: sqlContent })
            });
            
            if (!response.ok) {
                console.error('❌ ไม่สามารถอัปเดตฟังก์ชันได้:', response.statusText);
                console.log('\n📋 วิธีแก้ไขด้วยตนเอง:');
                console.log('1. เปิด Supabase Dashboard');
                console.log('2. ไปที่ SQL Editor');
                console.log('3. คัดลอกเนื้อหาจากไฟล์ final-fixed-function.sql');
                console.log('4. รันคำสั่ง SQL ใน Dashboard');
                return;
            }
            
            console.log('✅ อัปเดตฟังก์ชันสำเร็จผ่าน HTTP API');
        } else {
            console.log('✅ อัปเดตฟังก์ชันสำเร็จผ่าน RPC');
        }
        
        console.log('\n🎉 ฟังก์ชัน record_rfid_scan ได้รับการอัปเดตแล้ว!');
        console.log('📋 การเปลี่ยนแปลงที่สำคัญ:');
        console.log('   ✅ ใช้คอลัมน์ที่ถูกต้องตามโครงสร้างตารางจริง');
        console.log('   ✅ แก้ไขปัญหา recipient_type และ metadata');
        console.log('   ✅ ใช้ event_type เป็น "pickup" ตาม constraint');
        console.log('   ✅ ไม่ส่ง event_local_date เพราะเป็น GENERATED column');
        console.log('   ✅ แก้ไข pickup_source เป็น NULL เพราะ constraint อนุญาตเฉพาะ NULL');
        
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาด:', err.message);
        console.log('\n📋 วิธีแก้ไขด้วยตนเอง:');
        console.log('1. เปิด Supabase Dashboard');
        console.log('2. ไปที่ SQL Editor');
        console.log('3. คัดลอกเนื้อหาจากไฟล์ final-fixed-function.sql');
        console.log('4. รันคำสั่ง SQL ใน Dashboard');
    }
}

updateFunction();