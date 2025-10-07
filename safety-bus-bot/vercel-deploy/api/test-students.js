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

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const supabase = createSupabaseClient();
        
        // Get all students
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('*')
            .order('id');

        if (studentsError) {
            console.error('Error fetching students:', studentsError);
        }

        // Get all parent LINE links
        const { data: parentLineLinks, error: linksError } = await supabase
            .from('parent_line_links')
            .select('*')
            .order('id');

        if (linksError) {
            console.error('Error fetching parent line links:', linksError);
        }

        // Get all leave requests
        const { data: leaveRequests, error: leaveError } = await supabase
            .from('leave_requests')
            .select('*')
            .order('id');

        if (leaveError) {
            console.error('Error fetching leave requests:', leaveError);
        }

        // Prepare response data
        const responseData = {
            counts: {
                students: students ? students.length : 0,
                parent_line_links: parentLineLinks ? parentLineLinks.length : 0,
                leave_requests: leaveRequests ? leaveRequests.length : 0
            },
            students: students || [],
            parent_line_links: parentLineLinks || [],
            leave_requests: leaveRequests || []
        };

        return res.status(200).json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error('Error in test-students API:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
}