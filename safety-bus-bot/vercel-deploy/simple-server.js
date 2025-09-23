import express from 'express';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration!');
    console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.error('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
console.log('Supabase client initialized successfully');

// API Routes
app.post('/api/get-student', async (req, res) => {
    try {
        const { lineId } = req.body;
        console.log('Getting student for LINE ID:', lineId);
        
        // หา parent_link ก่อน
        const { data: parentLink, error: parentError } = await supabase
            .from('parent_line_links')
            .select('parent_id')
            .eq('line_user_id', lineId)
            .eq('active', true)
            .single();
        
        if (parentError || !parentLink) {
            console.error('Parent link not found:', parentError);
            return res.status(404).json({ error: 'Student not found' });
        }
        
        // หาข้อมูลนักเรียนจาก students table
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('student_id, student_name, grade, link_code')
            .eq('parent_id', parentLink.parent_id)
            .single();
        
        if (studentError || !student) {
            console.error('Student not found:', studentError);
            return res.status(404).json({ error: 'Student not found' });
        }
        
        res.json({ 
            student: {
                id: student.student_id,
                name: student.student_name,
                class: student.grade,
                link_code: student.link_code,
                line_user_id: lineId
            }
        });
    } catch (error) {
        console.error('Error getting student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/submit-leave', async (req, res) => {
    try {
        const { studentId, studentName, leaveDates, reason, userId, source } = req.body;
        console.log('Submitting leave request:', { studentId, studentName, leaveDates, reason, userId, source });
        
        // Insert leave requests for each date
        const leaveRequests = leaveDates.map(date => ({
            student_id: parseInt(studentId),
            leave_date: date,
            status: 'approved',
            leave_type: 'personal',
            created_at: new Date().toISOString()
        }));
        
        const { data, error } = await supabase
            .from('leave_requests')
            .insert(leaveRequests);
        
        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                ok: false, 
                error: `Database error: ${error.message}` 
            });
        }
        
        console.log('Leave requests inserted successfully:', data);
        
        res.json({
            ok: true,
            message: 'แจ้งลาสำเร็จ',
            data: data
        });
        
    } catch (error) {
        console.error('Error submitting leave:', error);
        res.status(500).json({ 
            ok: false, 
            error: 'Internal server error' 
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/test-form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-form.html'));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
});