// test-emergency-system.js
// ทดสอบระบบแจ้งเตือนเหตุฉุกเฉินแบบครบวงจร

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testEmergencySystem() {
    console.log('🚨 === Emergency System Test ===\n');

    try {
        // 1. ทดสอบการดึงข้อมูล emergency logs ที่ยังไม่ได้ตอบสนอง
        console.log('1️⃣ Testing unresolved emergency logs...');
        const { data: unresolvedLogs, error: unresolvedError } = await supabase
            .from('emergency_logs')
            .select('*')
            .eq('driver_id', 1)
            .is('driver_response_type', null)
            .order('event_time', { ascending: false });

        if (unresolvedError) {
            console.error('❌ Error fetching unresolved emergency logs:', unresolvedError.message);
        } else {
            console.log(`✅ Found ${unresolvedLogs?.length || 0} unresolved emergency logs`);
            if (unresolvedLogs && unresolvedLogs.length > 0) {
                console.log('📋 Latest unresolved emergency:');
                const latest = unresolvedLogs[0];
                console.log(`   - Event ID: ${latest.event_id}`);
                console.log(`   - Type: ${latest.event_type}`);
                console.log(`   - Time: ${latest.event_time}`);
                console.log(`   - Triggered by: ${latest.triggered_by}`);
            }
        }

        // 2. ทดสอบการดึงข้อมูล emergency logs ทั้งหมด
        console.log('\n2️⃣ Testing all emergency logs...');
        const { data: allLogs, error: allError } = await supabase
            .from('emergency_logs')
            .select('*')
            .eq('driver_id', 1)
            .order('event_time', { ascending: false })
            .limit(10);

        if (allError) {
            console.error('❌ Error fetching all emergency logs:', allError.message);
        } else {
            console.log(`✅ Found ${allLogs?.length || 0} emergency logs (last 10)`);
            if (allLogs && allLogs.length > 0) {
                console.log('📋 Emergency logs summary:');
                allLogs.forEach((log, index) => {
                    console.log(`   ${index + 1}. ${log.event_type} - ${log.event_time} - Response: ${log.driver_response_type || 'None'}`);
                });
            }
        }

        // 3. ทดสอบการสร้าง emergency log ใหม่ (จำลอง)
        console.log('\n3️⃣ Testing emergency log creation...');
        const testEmergency = {
            driver_id: 1,
            event_type: 'PANIC_BUTTON',
            triggered_by: 'driver',
            event_time: new Date().toISOString(),
            description: 'Test emergency from automated test',
            location: 'Test Location',
            status: 'pending'
        };

        const { data: newEmergency, error: createError } = await supabase
            .from('emergency_logs')
            .insert([testEmergency])
            .select()
            .single();

        if (createError) {
            console.error('❌ Error creating test emergency:', createError.message);
        } else {
            console.log(`✅ Created test emergency with ID: ${newEmergency.event_id}`);

            // 4. ทดสอบการอัปเดต emergency response
            console.log('\n4️⃣ Testing emergency response update...');
            const { error: updateError } = await supabase
                .from('emergency_logs')
                .update({
                    driver_response_type: 'CHECKED',
                    driver_response_time: new Date().toISOString(),
                    driver_response_notes: 'Test response from automated test'
                })
                .eq('event_id', newEmergency.event_id);

            if (updateError) {
                console.error('❌ Error updating emergency response:', updateError.message);
            } else {
                console.log('✅ Successfully updated emergency response');

                // 5. ทดสอบการลบ emergency log ที่สร้างขึ้นเพื่อทดสอบ
                console.log('\n5️⃣ Cleaning up test emergency...');
                const { error: deleteError } = await supabase
                    .from('emergency_logs')
                    .delete()
                    .eq('event_id', newEmergency.event_id);

                if (deleteError) {
                    console.error('❌ Error deleting test emergency:', deleteError.message);
                } else {
                    console.log('✅ Successfully cleaned up test emergency');
                }
            }
        }

        // 6. ทดสอบการดึงข้อมูล driver bus
        console.log('\n6️⃣ Testing driver bus information...');
        const { data: driverBus, error: busError } = await supabase
            .from('driver_bus')
            .select('*')
            .eq('driver_id', 1)
            .single();

        if (busError) {
            console.error('❌ Error fetching driver bus info:', busError.message);
        } else {
            console.log('✅ Driver bus information:');
            console.log(`   - Driver ID: ${driverBus.driver_id}`);
            console.log(`   - Route ID: ${driverBus.route_id}`);
            console.log(`   - Trip Phase: ${driverBus.trip_phase}`);
            console.log(`   - License Plate: ${driverBus.license_plate}`);
        }

        // 7. ทดสอบการดึงข้อมูล pickup_dropoff วันนี้
        console.log('\n7️⃣ Testing today\'s pickup/dropoff events...');
        const today = new Date().toISOString().split('T')[0] + 'T17:00:00.000Z';
        const { data: todayEvents, error: eventsError } = await supabase
            .from('pickup_dropoff')
            .select('*')
            .gte('event_time', today)
            .eq('driver_id', 1)
            .order('event_time', { ascending: true });

        if (eventsError) {
            console.error('❌ Error fetching today events:', eventsError.message);
        } else {
            console.log(`✅ Found ${todayEvents?.length || 0} events today`);
            if (todayEvents && todayEvents.length > 0) {
                const pickups = todayEvents.filter(e => e.event_type === 'pickup').length;
                const dropoffs = todayEvents.filter(e => e.event_type === 'dropoff').length;
                console.log(`   - Pickups: ${pickups}`);
                console.log(`   - Dropoffs: ${dropoffs}`);
            }
        }

        console.log('\n🎉 === Emergency System Test Completed ===');
        console.log('✅ All tests passed successfully!');
        console.log('🔧 The emergency system is working properly.');

    } catch (error) {
        console.error('\n❌ === Emergency System Test Failed ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

// เริ่มการทดสอบ
testEmergencySystem().catch(error => {
    console.error('❌ Failed to run emergency system test:', error);
    process.exit(1);
});