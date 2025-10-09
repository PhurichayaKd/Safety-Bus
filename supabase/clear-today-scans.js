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

async function clearTodayScans() {
    console.log('🧹 ลบข้อมูลการสแกนวันนี้สำหรับนักเรียน 100014...');
    
    try {
        // ลบข้อมูลการสแกนวันนี้
        const { data, error } = await supabase
            .from('pickup_dropoff')
            .delete()
            .eq('student_id', 100014)
            .gte('event_time', new Date().toISOString().split('T')[0] + 'T00:00:00.000Z');
        
        if (error) {
            console.error('❌ ข้อผิดพลาดในการลบข้อมูล:', error);
            return false;
        }
        
        console.log('✅ ลบข้อมูลการสแกนวันนี้เรียบร้อยแล้ว');
        return true;
        
    } catch (error) {
        console.error('❌ ข้อผิดพลาด:', error);
        return false;
    }
}

// รันฟังก์ชัน
clearTodayScans().then(success => {
    if (success) {
        console.log('🎉 พร้อมทดสอบการสแกนใหม่');
    } else {
        console.log('❌ ไม่สามารถลบข้อมูลได้');
    }
    process.exit(success ? 0 : 1);
});