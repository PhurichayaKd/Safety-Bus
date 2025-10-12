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

async function testEnhancedRFIDSystem() {
    console.log('🧪 ทดสอบระบบ RFID ที่ปรับปรุงแล้ว...\n');

    // ข้อมูลทดสอบ
    const testData = {
        rfid_code: 'TEST001',
        driver_id: 1,
        latitude: 13.7563,
        longitude: 100.5018,
        location_type: 'go'
    };

    try {
        console.log('📋 ข้อมูลทดสอบ:');
        console.log(`   RFID Code: ${testData.rfid_code}`);
        console.log(`   Driver ID: ${testData.driver_id}`);
        console.log(`   Location: ${testData.latitude}, ${testData.longitude}`);
        console.log(`   Type: ${testData.location_type}\n`);

        // 1. ทดสอบฟังก์ชัน record_rfid_scan
        console.log('🔍 ทดสอบฟังก์ชัน record_rfid_scan...');
        const { data: scanResult, error: scanError } = await supabase.rpc('record_rfid_scan', {
            p_rfid_code: testData.rfid_code,
            p_driver_id: testData.driver_id,
            p_latitude: testData.latitude,
            p_longitude: testData.longitude,
            p_location_type: testData.location_type
        });

        if (scanError) {
            console.error('❌ ข้อผิดพลาดในการสแกน RFID:', scanError);
            return false;
        }

        console.log('✅ ผลลัพธ์การสแกน RFID:');
        console.log(JSON.stringify(scanResult, null, 2));
        console.log();

        // 2. ตรวจสอบ notification logs
        console.log('📝 ตรวจสอบ notification logs...');
        const { data: logs, error: logsError } = await supabase
            .from('notification_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (logsError) {
            console.error('❌ ข้อผิดพลาดในการดึง logs:', logsError);
        } else {
            console.log('📊 Notification logs ล่าสุด:');
            logs.forEach((log, index) => {
                console.log(`   ${index + 1}. ${log.notification_type} - ${log.status} - ${log.message.substring(0, 50)}...`);
            });
        }
        console.log();

        // 3. ตรวจสอบ student_boarding_status
        if (scanResult.success && scanResult.student_id) {
            console.log('👦 ตรวจสอบสถานะนักเรียน...');
            const { data: studentStatus, error: statusError } = await supabase
                .from('student_boarding_status')
                .select('*')
                .eq('student_id', scanResult.student_id.toString())
                .order('created_at', { ascending: false })
                .limit(3);

            if (statusError) {
                console.error('❌ ข้อผิดพลาดในการดึงสถานะนักเรียน:', statusError);
            } else {
                console.log('📈 สถานะนักเรียนล่าสุด:');
                studentStatus.forEach((status, index) => {
                    console.log(`   ${index + 1}. ${status.trip_phase} - ${status.boarding_status} - ${status.trip_date}`);
                });
            }
        }
        console.log();

        // 4. ตรวจสอบ pickup_dropoff records
        console.log('🚌 ตรวจสอบบันทึกการขึ้น-ลงรถ...');
        const { data: pickupRecords, error: pickupError } = await supabase
            .from('pickup_dropoff')
            .select('*')
            .order('event_time', { ascending: false })
            .limit(3);

        if (pickupError) {
            console.error('❌ ข้อผิดพลาดในการดึงบันทึกการขึ้น-ลงรถ:', pickupError);
        } else {
            console.log('📋 บันทึกการขึ้น-ลงรถล่าสุด:');
            pickupRecords.forEach((record, index) => {
                console.log(`   ${index + 1}. Student ${record.student_id} - ${record.event_type} - ${record.location_type} - ${record.event_time}`);
            });
        }

        return true;

    } catch (error) {
        console.error('❌ ข้อผิดพลาดในการทดสอบ:', error);
        return false;
    }
}

async function testLineNotification() {
    console.log('\n📱 ทดสอบการส่ง LINE notification...');

    // ทดสอบด้วย LINE User ID ที่ถูกต้อง (33 ตัวอักษร)
    const testLineUserId = 'U4ad414fe3c0be5d251cd0029c87d050d';
    const testMessage = '🧪 ทดสอบการส่งข้อความจากระบบ Safety Bus\n⏰ ' + new Date().toLocaleString('th-TH');

    try {
        const { data: lineResult, error: lineError } = await supabase.rpc('test_line_notification', {
            p_line_user_id: testLineUserId,
            p_test_message: testMessage
        });

        if (lineError) {
            console.error('❌ ข้อผิดพลาดในการทดสอบ LINE:', lineError);
            return false;
        }

        console.log('📱 ผลลัพธ์การทดสอบ LINE:');
        console.log(JSON.stringify(lineResult, null, 2));

        return lineResult.success;

    } catch (error) {
        console.error('❌ ข้อผิดพลาดในการทดสอบ LINE:', error);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 เริ่มทดสอบระบบ Safety Bus ที่ปรับปรุงแล้ว');
    console.log('=' .repeat(60));

    const rfidTestResult = await testEnhancedRFIDSystem();
    const lineTestResult = await testLineNotification();

    console.log('\n' + '=' .repeat(60));
    console.log('📊 สรุปผลการทดสอบ:');
    console.log(`   🔍 RFID System: ${rfidTestResult ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}`);
    console.log(`   📱 LINE Notification: ${lineTestResult ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}`);
    
    if (rfidTestResult && lineTestResult) {
        console.log('\n🎉 ระบบทำงานได้ปกติทั้งหมด!');
    } else {
        console.log('\n⚠️  มีบางส่วนที่ต้องตรวจสอบ');
        if (!lineTestResult) {
            console.log('💡 หมายเหตุ: การทดสอบ LINE อาจไม่ผ่านเพราะยังไม่ได้ตั้งค่า LINE token');
        }
    }

    return rfidTestResult;
}

// รันการทดสอบ
runAllTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('❌ ข้อผิดพลาดในการรันการทดสอบ:', error);
    process.exit(1);
});