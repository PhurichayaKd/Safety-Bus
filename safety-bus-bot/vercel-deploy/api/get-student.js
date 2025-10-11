import { createClient } from '@supabase/supabase-js';

// Mock data for testing
const MOCK_STUDENTS = {
    'test-user-id': {
        student_id: 100006,
        student_name: 'กฤษฎา ทดสอบ',
        grade: 'ม.6/1',
        student_phone: '0812345678'
    }
};

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
    try {
        console.log('Looking up student for LINE ID:', lineUserId);
        
        // Handle test mode
        if (lineUserId === 'test-user-id') {
            console.log('🧪 Test mode detected - returning mock data');
            const mockData = MOCK_STUDENTS[lineUserId];
            return {
                id: mockData.student_id,
                name: mockData.student_name,
                class: mockData.grade,
                phone: mockData.student_phone,
                line_user_id: lineUserId
            };
        }
        
        const supabase = createSupabaseClient();
        
        // ขั้นตอนที่ 1: ตรวจสอบการเชื่อมโยงจากตาราง student_line_links
        const { data: studentLink, error: linkError } = await supabase
            .from('student_line_links')
            .select(`
                student_id,
                students (
                    student_id,
                    student_name,
                    grade,
                    student_phone,
                    is_active
                )
            `)
            .eq('line_user_id', lineUserId)
            .eq('active', true)
            .maybeSingle();

        if (linkError) {
            console.error('Error finding student link:', linkError);
            throw linkError;
        }

        if (!studentLink || !studentLink.students) {
            console.log('No student link found for LINE ID:', lineUserId);
            return null;
        }

        const student = studentLink.students;

        // Check if student is active
        if (!student.is_active) {
            console.log('Student account is inactive:', student.student_id);
            return null;
        }

        console.log('Found student data:', {
            student_id: student.student_id,
            student_name: student.student_name,
            grade: student.grade,
            student_phone: student.student_phone
        });

        return {
            id: student.student_id,
            name: student.student_name,
            class: student.grade || 'ไม่ระบุ',
            phone: student.student_phone || '',
            line_user_id: lineUserId
        };

    } catch (error) {
        console.error('Error in getStudentByLineId:', error);
        throw error;
    }
}

// Get student information by Student ID
async function getStudentByStudentId(studentId) {
    try {
        console.log('Looking up student for Student ID:', studentId);
        
        // Try Supabase first
        const supabase = createSupabaseClient();
        
        // หาข้อมูลนักเรียนจาก students table โดยใช้ student_id
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('student_id, student_name, grade')
            .eq('student_id', studentId)
            .maybeSingle();

        if (studentError) {
            console.error('Error finding student in database:', studentError);
            console.log('Falling back to mock data due to database error');
        } else if (student) {
            console.log('=== FOUND STUDENT DATA FROM DATABASE ===');
            console.log('Raw student object:', student);
            console.log('student.grade value:', student.grade);
            console.log('student.grade type:', typeof student.grade);

            return {
                id: student.student_id,
                name: student.student_name,
                class: student.grade || 'ไม่ระบุ'
            };
        } else {
            console.log('No student found in database for student_id:', studentId);
            console.log('Falling back to mock data');
        }
        
        // Fallback to mock data if database query fails or returns no results
        if (MOCK_STUDENTS[studentId]) {
            console.log('Using mock data fallback for student:', studentId);
            const student = MOCK_STUDENTS[studentId];
            console.log('=== MOCK STUDENT DATA FALLBACK ===');
            console.log('Raw student object:', student);
            console.log('student.grade value:', student.grade);
            console.log('student.grade type:', typeof student.grade);
            
            return {
                id: student.student_id,
                name: student.student_name,
                class: student.grade || 'ไม่ระบุ'
            };
        }
        
        // No data found in either database or mock data
        console.log('No student found in database or mock data for student_id:', studentId);
        return null;

    } catch (error) {
        console.error('Error in getStudentByStudentId:', error);
        
        // Try mock data as final fallback on error
        if (MOCK_STUDENTS[studentId]) {
            console.log('Using mock data as final fallback due to error');
            const student = MOCK_STUDENTS[studentId];
            return {
                id: student.student_id,
                name: student.student_name,
                class: student.grade || 'ไม่ระบุ'
            };
        }
        
        throw error;
    }
}

// Main API handler
export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Support both GET and POST methods
        let lineUserId, studentId;
        
        if (req.method === 'POST') {
            ({ lineUserId, studentId } = req.body);
        } else if (req.method === 'GET') {
            lineUserId = req.query.line_user_id;
            studentId = req.query.student_id;
        }
        
        if (!lineUserId && !studentId) {
            return res.status(400).json({
                success: false,
                message: 'LINE User ID or Student ID is required'
            });
        }
        
        let student;
        
        if (lineUserId) {
            console.log('Getting student info for LINE ID:', lineUserId);
            student = await getStudentByLineId(lineUserId);
        } else if (studentId) {
            console.log('Getting student info for Student ID:', studentId);
            student = await getStudentByStudentId(studentId);
        }
        
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