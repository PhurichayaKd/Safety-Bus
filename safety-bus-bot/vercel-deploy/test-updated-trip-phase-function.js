import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdatedTripPhaseFunction() {
    console.log('🧪 ทดสอบฟังก์ชัน update_driver_trip_phase ที่อัปเดตแล้ว...\n');

    try {
        // ดึงข้อมูลคนขับคนแรกเพื่อทดสอบ
        const { data: drivers, error: driversError } = await supabase
            .from('driver_bus')
            .select('driver_id, driver_name, trip_phase')
            .limit(1);

        if (driversError) {
            console.error('❌ Error fetching drivers:', driversError);
            return;
        }

        if (!drivers || drivers.length === 0) {
            console.log('❌ ไม่พบข้อมูลคนขับในระบบ');
            return;
        }

        const testDriver = drivers[0];
        console.log(`📋 ทดสอบกับคนขับ: ${testDriver.driver_name} (ID: ${testDriver.driver_id})`);
        console.log(`📋 trip_phase ปัจจุบัน: ${testDriver.trip_phase}\n`);

        // ทดสอบ 1: อัปเดตเป็น 'go'
        console.log('🔄 ทดสอบที่ 1: อัปเดต trip_phase เป็น "go"');
        const { data: result1, error: error1 } = await supabase
            .rpc('update_driver_trip_phase', {
                p_driver_id: testDriver.driver_id,
                p_trip_phase: 'go',
                p_latitude: 13.7563,
                p_longitude: 100.5018
            });

        if (error1) {
            console.error('❌ Error:', error1);
        } else {
            console.log('✅ ผลลัพธ์:', JSON.stringify(result1, null, 2));
        }

        // รอสักครู่
        await new Promise(resolve => setTimeout(resolve, 1000));

        // ทดสอบ 2: อัปเดตเป็น 'return'
        console.log('\n🔄 ทดสอบที่ 2: อัปเดต trip_phase เป็น "return"');
        const { data: result2, error: error2 } = await supabase
            .rpc('update_driver_trip_phase', {
                p_driver_id: testDriver.driver_id,
                p_trip_phase: 'return',
                p_latitude: 13.7563,
                p_longitude: 100.5018
            });

        if (error2) {
            console.error('❌ Error:', error2);
        } else {
            console.log('✅ ผลลัพธ์:', JSON.stringify(result2, null, 2));
        }

        // ทดสอบ 3: ทดสอบค่าที่ไม่ถูกต้อง (ควรจะ error)
        console.log('\n🔄 ทดสอบที่ 3: ทดสอบค่า trip_phase ที่ไม่ถูกต้อง "pickup" (ควรจะ error)');
        const { data: result3, error: error3 } = await supabase
            .rpc('update_driver_trip_phase', {
                p_driver_id: testDriver.driver_id,
                p_trip_phase: 'pickup'
            });

        if (error3) {
            console.error('❌ Error (คาดหวัง):', error3);
        } else {
            console.log('📋 ผลลัพธ์:', JSON.stringify(result3, null, 2));
            if (result3 && !result3.success) {
                console.log('✅ ฟังก์ชันตรวจสอบค่าที่ไม่ถูกต้องได้อย่างถูกต้อง');
            }
        }

        // ตรวจสอบข้อมูลในฐานข้อมูลหลังการทดสอบ
        console.log('\n📊 ตรวจสอบข้อมูลในฐานข้อมูลหลังการทดสอบ:');
        const { data: finalData, error: finalError } = await supabase
            .from('driver_bus')
            .select('driver_id, driver_name, trip_phase, current_status, current_updated_at')
            .eq('driver_id', testDriver.driver_id);

        if (finalError) {
            console.error('❌ Error fetching final data:', finalError);
        } else {
            console.log('📋 ข้อมูลปัจจุบัน:', JSON.stringify(finalData[0], null, 2));
        }

        console.log('\n✅ การทดสอบเสร็จสิ้น!');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// รันการทดสอบ
testUpdatedTripPhaseFunction();