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

// Get student information by LINE ID
async function getStudentByLineId(lineUserId) {
    const supabase = createSupabaseClient();
    
    try {
        // ตรวจสอบการเชื่อมโยงจากตาราง parent_line_links
        const { data: parentLink, error: parentError } = await supabase
            .from('parent_line_links')
            .select('parent_id')
            .eq('line_user_id', lineUserId)
            .eq('active', true)
            .single();

        if (parentLink && !parentError) {
            // หาข้อมูลนักเรียนจาก students table โดยตรง
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('student_id, student_name, grade, link_code')
                .eq('parent_id', parentLink.parent_id)
                .single();

            if (student && !studentError) {
                return {
                    id: student.student_id,
                    name: student.student_name,
                    class: student.grade,
                    link_code: student.link_code,
                    line_user_id: lineUserId
                };
            }
        }

        // ถ้าไม่พบจาก parent_line_links ให้ลองหาจาก students table โดยตรง
        const { data: directStudent, error: directError } = await supabase
            .from('students')
            .select('student_id, student_name, grade, link_code')
            .eq('line_user_id', lineUserId)
            .single();

        if (directStudent && !directError) {
            return {
                id: directStudent.student_id,
                name: directStudent.student_name,
                class: directStudent.grade,
                link_code: directStudent.link_code,
                line_user_id: lineUserId
            };
        }

        return null;
    } catch (error) {
        console.error('Error in getStudentByLineId:', error);
        throw error;
    }
}

// Main API handler
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { lineUserId } = req.body;
        
        if (!lineUserId) {
            return res.status(400).json({
                success: false,
                message: 'LINE User ID is required'
            });
        }
        
        console.log('Getting student info for LINE ID:', lineUserId);
        
        const student = await getStudentByLineId(lineUserId);
        
        if (student) {
            return res.status(200).json({
                success: true,
                student: student
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบข้อมูลนักเรียนในระบบ กรุณาติดต่อเจ้าหน้าที่'
            });
        }
        
    } catch (error) {
        console.error('Error in get-student API:', error);
        return res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
        });
    }
}