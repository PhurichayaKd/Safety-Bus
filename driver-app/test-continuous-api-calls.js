// test-continuous-api-calls.js
// ทดสอบการเรียก API แบบต่อเนื่องเหมือนในแอป React Native

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let callCount = 0;
let errorCount = 0;
let successCount = 0;

// จำลองการเรียก checkEmergencyLogs ทุก 10 วินาที
async function checkEmergencyLogs() {
    try {
        callCount++;
        console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Emergency logs check #${callCount}`);
        
        const { data, error } = await supabase
            .from('emergency_logs')
            .select('*')
            .eq('driver_id', 1)
            .is('driver_response_type', null)
            .order('event_time', { ascending: false })
            .limit(1);

        if (error) {
            errorCount++;
            console.error('❌ Error checking emergency logs:', error.message);
        } else {
            successCount++;
            console.log(`✅ Emergency logs check successful (${data?.length || 0} records)`);
        }
    } catch (error) {
        errorCount++;
        console.error('❌ Exception in checkEmergencyLogs:', error.message);
    }
}

// จำลองการเรียก getMyDriverId
async function getMyDriverId() {
    try {
        callCount++;
        console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Driver ID check #${callCount}`);
        
        const { data, error } = await supabase
            .from('driver_bus')
            .select('route_id')
            .eq('driver_id', 1);

        if (error) {
            errorCount++;
            console.error('❌ Error getting driver bus info:', error.message);
        } else {
            successCount++;
            console.log(`✅ Driver bus check successful (Route ID: ${data?.[0]?.route_id || 'N/A'})`);
        }
    } catch (error) {
        errorCount++;
        console.error('❌ Exception in getMyDriverId:', error.message);
    }
}

// จำลองการเรียก fetchTodayEvents ทุก 1 วินาที
async function fetchTodayEvents() {
    try {
        callCount++;
        console.log(`\n🔍 [${new Date().toLocaleTimeString()}] Today events check #${callCount}`);
        
        const today = new Date().toISOString().split('T')[0] + 'T17:00:00.000Z';
        
        const { data, error } = await supabase
            .from('pickup_dropoff')
            .select('student_id,event_type,event_time,pickup_source,location_type,driver_id')
            .gte('event_time', today)
            .eq('driver_id', 1)
            .order('event_time', { ascending: true });

        if (error) {
            errorCount++;
            console.error('❌ Error fetching today events:', error.message);
        } else {
            successCount++;
            console.log(`✅ Today events check successful (${data?.length || 0} records)`);
        }
    } catch (error) {
        errorCount++;
        console.error('❌ Exception in fetchTodayEvents:', error.message);
    }
}

// ฟังก์ชันแสดงสถิติ
function showStats() {
    console.log('\n📊 === API Call Statistics ===');
    console.log(`Total calls: ${callCount}`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Success rate: ${callCount > 0 ? ((successCount / callCount) * 100).toFixed(2) : 0}%`);
    console.log('===============================\n');
}

// เริ่มการทดสอบ
async function startContinuousTest() {
    console.log('🚀 Starting continuous API calls test...');
    console.log('📝 This simulates the actual app behavior');
    console.log('⏰ Emergency logs: every 10 seconds');
    console.log('⏰ Today events: every 1 second');
    console.log('⏰ Driver bus: every 10 seconds');
    console.log('🛑 Press Ctrl+C to stop\n');

    // เรียกครั้งแรก
    await checkEmergencyLogs();
    await getMyDriverId();
    await fetchTodayEvents();

    // ตั้งเวลาเรียกแบบต่อเนื่อง
    const emergencyTimer = setInterval(checkEmergencyLogs, 10000); // ทุก 10 วินาที
    const driverTimer = setInterval(getMyDriverId, 10000); // ทุก 10 วินาที
    const eventsTimer = setInterval(fetchTodayEvents, 1000); // ทุก 1 วินาที
    const statsTimer = setInterval(showStats, 30000); // แสดงสถิติทุก 30 วินาที

    // จัดการการหยุดโปรแกรม
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping continuous test...');
        clearInterval(emergencyTimer);
        clearInterval(driverTimer);
        clearInterval(eventsTimer);
        clearInterval(statsTimer);
        showStats();
        process.exit(0);
    });
}

// เริ่มการทดสอบ
startContinuousTest().catch(error => {
    console.error('❌ Failed to start continuous test:', error);
    process.exit(1);
});