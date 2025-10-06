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
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const supabase = createSupabaseClient();

        // Get students data
        const { data: students, error: studentsError } = await supabase
            .from('students')
            .select('student_id, student_name, grade, parent_id, status')
            .limit(10);

        if (studentsError) {
            console.error('Error fetching students:', studentsError);
            throw studentsError;
        }

        // Get parent line links
        const { data: parentLinks, error: parentLinksError } = await supabase
            .from('parent_line_links')
            .select('line_user_id, parent_id, active')
            .limit(10);

        if (parentLinksError) {
            console.error('Error fetching parent links:', parentLinksError);
            throw parentLinksError;
        }

        // Get leave requests
        const { data: leaveRequests, error: leaveRequestsError } = await supabase
            .from('leave_requests')
            .select('id, student_id, leave_date, leave_type, status')
            .limit(10);

        if (leaveRequestsError) {
            console.error('Error fetching leave requests:', leaveRequestsError);
            throw leaveRequestsError;
        }

        // Format students data
        const formattedStudents = students.map(student => ({
            id: student.student_id,
            name: student.student_name,
            class: student.grade,
            student_id: student.student_id,
            status: student.status
        }));

        const result = {
            success: true,
            data: {
                counts: {
                    students: students.length,
                    parent_line_links: parentLinks.length,
                    leave_requests: leaveRequests.length
                },
                students: formattedStudents,
                parent_line_links: parentLinks,
                leave_requests: leaveRequests,
                raw_students: students // เพิ่มข้อมูลดิบเพื่อดู grade field
            }
        };

        res.status(200).json(result);

    } catch (error) {
        console.error('Error in test-students API:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error
        });
    }
}