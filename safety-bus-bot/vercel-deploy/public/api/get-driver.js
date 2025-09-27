import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
function createSupabaseClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
    }
    
    return createClient(supabaseUrl, supabaseKey);
}

// Get driver information by username
async function getDriverByUsername(username) {
    const supabase = createSupabaseClient();
    
    try {
        const { data: driver, error } = await supabase
            .from('driver_bus')
            .select('driver_name, phone_number, license_plate, username')
            .eq('username', username)
            .single();

        if (error) {
            console.error('Error fetching driver:', error);
            throw error;
        }

        if (!driver) {
            return null;
        }

        return {
            driver_name: driver.driver_name,
            phone_number: driver.phone_number,
            license_plate: driver.license_plate,
            username: driver.username
        };
    } catch (error) {
        console.error('Error getting driver by username:', error);
        throw error;
    }
}

// API handler
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({ 
                error: 'Missing username parameter',
                message: 'กรุณาระบุ username ของคนขับ'
            });
        }

        console.log('Fetching driver data for username:', username);
        
        const driverData = await getDriverByUsername(username);
        
        if (!driverData) {
            return res.status(404).json({ 
                error: 'Driver not found',
                message: 'ไม่พบข้อมูลคนขับ'
            });
        }

        console.log('Driver data found:', driverData);
        
        return res.status(200).json({
            success: true,
            driver: driverData
        });
        
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลคนขับ'
        });
    }
}