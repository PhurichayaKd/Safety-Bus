import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
    console.log('🔍 Checking database constraints...');
    
    // Try to insert a driver without auth_user_id
    try {
        const testDriverData = {
            driver_name: 'Test Driver',
            phone_number: '081-000-0000',
            username: 'testdriver',
            license_plate: 'TEST-001',
            capacity: 20,
            route_id: 1, // Assuming route exists
            home_latitude: 13.7563,
            home_longitude: 100.5018,
            school_latitude: 13.7650,
            school_longitude: 100.5380
        };

        console.log('🧪 Testing driver insertion without auth_user_id...');
        const { data, error } = await supabase
            .from('driver_bus')
            .insert(testDriverData)
            .select()
            .single();

        if (error) {
            console.log('❌ Error without auth_user_id:', error);
        } else {
            console.log('✅ Success without auth_user_id:', data);
            
            // Clean up test data
            await supabase
                .from('driver_bus')
                .delete()
                .eq('driver_id', data.driver_id);
            console.log('🧹 Cleaned up test data');
        }
    } catch (err) {
        console.log('❌ Test failed:', err.message);
    }
}

checkConstraints();