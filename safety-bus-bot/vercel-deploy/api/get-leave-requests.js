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

// Get student leave requests
async function getStudentLeaveRequests(studentId, onlyFuture = false) {
    const supabase = createSupabaseClient();
    
    try {
        let query = supabase
            .from('leave_requests')
            .select('*')
            .eq('student_id', studentId)
            .eq('status', 'approved'); // Only get approved leave requests
        
        // If onlyFuture is true, only get future dates
        if (onlyFuture) {
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            query = query.gte('leave_date', todayString);
        }
        
        const { data, error } = await query.order('leave_date', { ascending: true });
        
        if (error) {
            console.error('Error fetching leave requests:', error);
            throw error;
        }
        
        return data || [];
    } catch (error) {
        console.error('Error in getStudentLeaveRequests:', error);
        throw error;
    }
}

// Main API handler
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            message: 'Method not allowed' 
        });
    }
    
    try {
        const { studentId, onlyFuture } = req.body;
        
        // Validate required fields
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }
        
        console.log('Getting leave requests for student:', studentId);
        console.log('Only future requests:', onlyFuture);
        
        // Get leave requests
        const leaveRequests = await getStudentLeaveRequests(studentId, onlyFuture);
        
        console.log('Found leave requests:', leaveRequests.length);
        
        return res.status(200).json({
            success: true,
            leaveRequests: leaveRequests,
            message: `Found ${leaveRequests.length} leave request(s)`
        });
        
    } catch (error) {
        console.error('API Error:', error);
        
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}