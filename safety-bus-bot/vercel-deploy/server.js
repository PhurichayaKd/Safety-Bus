import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Mock API endpoint for submit-leave
app.post('/api/submit-leave', async (req, res) => {
    try {
        console.log('📨 Received leave request:', req.body);
        
        const { action, userId, studentInfo, leaveDates } = req.body;
        
        if (action === 'getStudentInfo') {
            // Mock student data for testing
            const mockStudent = {
                student_id: 'STU001',
                name: 'นักเรียนทดสอบ',
                class: 'ม.6/1',
                bus_route: 'เส้นทาง A'
            };
            
            console.log('📋 Returning mock student data:', mockStudent);
            return res.json({
                ok: true,
                student: mockStudent
            });
        }
        
        if (action === 'submitLeave') {
            // Validate required fields
            if (!userId || !studentInfo || !leaveDates || leaveDates.length === 0) {
                return res.status(400).json({
                    ok: false,
                    error: 'ข้อมูลไม่ครบถ้วน'
                });
            }
            
            // Mock successful submission
            console.log('✅ Leave request submitted successfully');
            console.log('👤 Student:', studentInfo.name);
            console.log('📅 Dates:', leaveDates);
            
            return res.json({
                ok: true,
                message: 'บันทึกข้อมูลการลาเรียบร้อยแล้ว'
            });
        }
        
        return res.status(400).json({
            ok: false,
            error: 'Invalid action'
        });
        
    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({
            ok: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
        });
    }
});

// Mock API endpoint for student-status-notification
app.post('/api/student-status-notification', async (req, res) => {
    try {
        console.log('📨 Received student status notification:', req.body);
        
        const { student_id, status, driver_id, phase, location } = req.body;
        
        // Validate required fields
        if (!student_id || !status || !driver_id) {
            return res.status(400).json({
                ok: false,
                error: 'ข้อมูลไม่ครบถ้วน'
            });
        }
        
        // Mock successful notification
        console.log('✅ Student status notification processed successfully');
        console.log('👤 Student ID:', student_id);
        console.log('📊 Status:', status);
        console.log('🚌 Driver ID:', driver_id);
        console.log('📍 Phase:', phase);
        console.log('🗺️ Location:', location);
        
        return res.json({
            ok: true,
            message: 'ส่งแจ้งเตือนเรียบร้อยแล้ว'
        });
        
    } catch (error) {
        console.error('❌ Student Status Notification API Error:', error);
        return res.status(500).json({
            ok: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leave-form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'leave-form.html'));
});

app.get('/leave-request.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'leave-request.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Leave form available at: http://localhost:${PORT}/leave-form.html`);
});