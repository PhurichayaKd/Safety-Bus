import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSampleData() {
    try {
        console.log('🚀 Adding sample bus location data...');

        // First, try to create users table and dummy users
        console.log('📋 Creating users table and dummy users...');
        try {
            const createUsersSQL = `
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY,
                    email VARCHAR(255) UNIQUE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                
                INSERT INTO users (id, email, created_at, updated_at) VALUES 
                ('00000000-0000-0000-0000-000000000001', 'somchai001@example.com', NOW(), NOW()),
                ('00000000-0000-0000-0000-000000000002', 'malee002@example.com', NOW(), NOW())
                ON CONFLICT (id) DO NOTHING;
            `;
            
            const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', { sql: createUsersSQL });
            
            if (sqlError) {
                console.log('⚠️ Could not create users table via RPC:', sqlError.message);
                console.log('📝 Please run the SQL manually in Supabase Dashboard:');
                console.log(createUsersSQL);
            } else {
                console.log('✅ Users table created successfully');
            }
        } catch (err) {
            console.log('⚠️ Could not create users table:', err.message);
        }

        // Sample route data
        const routeData = {
            route_name: 'เส้นทางหลัก',
            start_point: 'บ้านคนขับ',
            end_point: 'โรงเรียนประถม',
            route_data: {},
            start_latitude: 13.7563,
            start_longitude: 100.5018,
            end_latitude: 13.7650,
            end_longitude: 100.5380
        };

        // Insert route first
        const { data: route, error: routeError } = await supabase
            .from('routes')
            .insert(routeData)
            .select()
            .single();

        if (routeError) {
            console.error('❌ Error inserting route:', routeError);
            return;
        } else {
            console.log('✅ Route inserted:', route);
        }

        // Create a dummy auth user ID (UUID format)
        // Try to insert driver without auth_user_id first
        const driverDataWithoutAuth = {
            driver_name: 'นายสมชาย ใจดี',
            phone_number: '081-234-5678',
            username: 'somchai001',
            license_plate: 'กข-1234',
            capacity: 30,
            route_id: route.route_id,
            home_latitude: 13.7563,
            home_longitude: 100.5018,
            school_latitude: 13.7650,
            school_longitude: 100.5380
        };

        // If that fails, we'll try with a dummy auth_user_id
        const driverData = {
            ...driverDataWithoutAuth,
            auth_user_id: '00000000-0000-0000-0000-000000000001' // Dummy UUID
        };

        // Try to insert driver without auth_user_id first
        let driver, driverError;
        
        console.log('🔄 Trying to insert driver without auth_user_id...');
        const result1 = await supabase
            .from('driver_bus')
            .insert(driverDataWithoutAuth)
            .select()
            .single();

        if (result1.error) {
            console.log('⚠️ Failed without auth_user_id, trying with dummy UUID...');
            
            // Try with dummy auth_user_id
            const result2 = await supabase
                .from('driver_bus')
                .insert(driverData)
                .select()
                .single();
                
            driver = result2.data;
            driverError = result2.error;
        } else {
            driver = result1.data;
            driverError = result1.error;
        }

        if (driverError) {
            console.error('❌ Error inserting driver:', driverError);
            console.log('📝 Please create users table manually in Supabase Dashboard with the SQL provided above');
            return;
        } else {
            console.log('✅ Driver inserted:', driver);
        }

        // Sample current location data
        const locationData = {
            driver_id: driver.driver_id,
            latitude: 13.7600,
            longitude: 100.5200,
            last_updated: new Date().toISOString()
        };

        // Insert current location
        const { data: location, error: locationError } = await supabase
            .from('live_driver_locations')
            .insert(locationData)
            .select()
            .single();

        if (locationError) {
            console.error('❌ Error inserting location:', locationError);
        } else {
            console.log('✅ Location inserted:', location);
        }

        // Add a second bus for more test data
        const routeData2 = {
            route_name: 'เส้นทางรอง',
            start_point: 'หมู่บ้านใหม่',
            end_point: 'โรงเรียนมัธยม',
            route_data: {},
            start_latitude: 13.7400,
            start_longitude: 100.4800,
            end_latitude: 13.7700,
            end_longitude: 100.5500
        };

        const { data: route2, error: routeError2 } = await supabase
            .from('routes')
            .insert(routeData2)
            .select()
            .single();

        if (routeError2) {
            console.error('❌ Error inserting route 2:', routeError2);
            return;
        } else {
            console.log('✅ Route 2 inserted:', route2);
        }

        const driverData2WithoutAuth = {
            driver_name: 'นางสาวมาลี สวยงาม',
            phone_number: '082-345-6789',
            username: 'malee002',
            license_plate: 'คง-5678',
            capacity: 25,
            route_id: route2.route_id,
            home_latitude: 13.7400,
            home_longitude: 100.4800,
            school_latitude: 13.7700,
            school_longitude: 100.5500
        };

        const driverData2 = {
            ...driverData2WithoutAuth,
            auth_user_id: '00000000-0000-0000-0000-000000000002' // Dummy UUID
        };

        // Try to insert driver 2 without auth_user_id first
        let driver2, driverError2;
        
        console.log('🔄 Trying to insert driver 2 without auth_user_id...');
        const result3 = await supabase
            .from('driver_bus')
            .insert(driverData2WithoutAuth)
            .select()
            .single();

        if (result3.error) {
            console.log('⚠️ Failed without auth_user_id, trying with dummy UUID...');
            
            // Try with dummy auth_user_id
            const result4 = await supabase
                .from('driver_bus')
                .insert(driverData2)
                .select()
                .single();
                
            driver2 = result4.data;
            driverError2 = result4.error;
        } else {
            driver2 = result3.data;
            driverError2 = result3.error;
        }

        if (driverError2) {
            console.error('❌ Error inserting driver 2:', driverError2);
            return;
        } else {
            console.log('✅ Driver 2 inserted:', driver2);
        }

        const locationData2 = {
            driver_id: driver2.driver_id,
            latitude: 13.7450,
            longitude: 100.4900,
            last_updated: new Date().toISOString()
        };

        const { data: location2, error: locationError2 } = await supabase
            .from('live_driver_locations')
            .insert(locationData2)
            .select()
            .single();

        if (locationError2) {
            console.error('❌ Error inserting location 2:', locationError2);
        } else {
            console.log('✅ Location 2 inserted:', location2);
        }

        console.log('🎉 Sample data added successfully!');
        console.log('📍 You should now see 2 buses, 2 homes, and 2 schools on the map');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the script
addSampleData();