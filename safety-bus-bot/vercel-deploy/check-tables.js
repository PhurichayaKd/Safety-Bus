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

async function checkTables() {
    console.log('🔍 Checking available tables...');
    
    // Check driver_bus table structure
    try {
        const { data, error } = await supabase
            .from('driver_bus')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ driver_bus table error:', error);
        } else {
            console.log('✅ driver_bus table exists');
            if (data && data.length > 0) {
                console.log('📊 driver_bus columns:', Object.keys(data[0]));
            }
        }
    } catch (err) {
        console.log('❌ driver_bus table check failed:', err.message);
    }
    
    // Check routes table
    try {
        const { data, error } = await supabase
            .from('routes')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ routes table error:', error);
        } else {
            console.log('✅ routes table exists');
            if (data && data.length > 0) {
                console.log('📊 routes columns:', Object.keys(data[0]));
            }
        }
    } catch (err) {
        console.log('❌ routes table check failed:', err.message);
    }
    
    // Check live_driver_locations table
    try {
        const { data, error } = await supabase
            .from('live_driver_locations')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('❌ live_driver_locations table error:', error);
        } else {
            console.log('✅ live_driver_locations table exists');
            if (data && data.length > 0) {
                console.log('📊 live_driver_locations columns:', Object.keys(data[0]));
            }
        }
    } catch (err) {
        console.log('❌ live_driver_locations table check failed:', err.message);
    }
}

checkTables();