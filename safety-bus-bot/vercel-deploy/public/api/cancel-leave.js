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

// Get student data
async function getStudentData(studentId) {
    const supabase = createSupabaseClient();
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('id', studentId)
            .single();
        
        if (error) {
            console.error('Error fetching student:', error);
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error in getStudentData:', error);
        throw error;
    }
}

// Get student information by LINE ID
async function getStudentByLineId(lineId) {
    const supabase = createSupabaseClient();
    
    try {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('line_id', lineId)
            .single();
        
        if (error) {
            console.error('Error fetching student:', error);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Error in getStudentByLineId:', error);
        return null;
    }
}

// Get student's leave requests
async function getStudentLeaveRequests(studentId) {
    const supabase = createSupabaseClient();
    
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('student_id', studentId)
            .gte('leave_date', today.toISOString().split('T')[0])
            .eq('status', 'approved')
            .order('leave_date', { ascending: true });
        
        if (error) {
            console.error('Error fetching leave requests:', error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error('Error in getStudentLeaveRequests:', error);
        return [];
    }
}

// Get leave request
async function getLeaveRequest(leaveRequestId) {
    const supabase = createSupabaseClient();
    
    try {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', leaveRequestId)
            .single();
        
        if (error) {
            console.error('Error fetching leave request:', error);
            throw error;
        }
        
        return data;
    } catch (error) {
        console.error('Error in getLeaveRequest:', error);
        throw error;
    }
}

// Cancel leave request
async function cancelLeaveRequest(leaveId, studentId) {
    const supabase = createSupabaseClient();
    
    try {
        // First check if the leave request belongs to the student and is in the future
        const { data: leaveData, error: fetchError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', leaveId)
            .eq('student_id', studentId)
            .single();
        
        if (fetchError || !leaveData) {
            return { success: false, message: 'ไม่พบข้อมูลการลาที่ต้องการยกเลิก' };
        }
        
        // Check if the leave date is in the future
        const leaveDate = new Date(leaveData.leave_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (leaveDate <= today) {
            return { success: false, message: 'ไม่สามารถยกเลิกการลาในวันที่ผ่านมาแล้วหรือวันนี้ได้' };
        }
        
        // Update the leave request status to cancelled
        const { error: updateError } = await supabase
            .from('leave_requests')
            .update({ 
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', leaveId);
        
        if (updateError) {
            console.error('Error cancelling leave request:', updateError);
            return { success: false, message: 'เกิดข้อผิดพลาดในการยกเลิกการลา' };
        }
        
        return { 
            success: true, 
            message: 'ยกเลิกการลาเรียบร้อยแล้ว',
            cancelledDate: leaveData.leave_date
        };
        
    } catch (error) {
        console.error('Error in cancelLeaveRequest:', error);
        return { success: false, message: 'เกิดข้อผิดพลาดในระบบ' };
    }
}

// Send LINE message
async function sendLineMessage(lineUserId, message) {
    try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
            },
            body: JSON.stringify({
                to: lineUserId,
                messages: [{
                    type: 'text',
                    text: message
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error(`LINE API error: ${response.status}`);
        }
        
        console.log('LINE message sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending LINE message:', error);
        throw error;
    }
}

// Format Thai date
function formatThaiDate(dateString) {
    const date = new Date(dateString);
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const thaiDays = [
        'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
    ];
    
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    const dayName = thaiDays[date.getDay()];
    
    return `วัน${dayName}ที่ ${day} ${month} ${year}`;
}

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
        const { leaveRequestId, studentId, lineUserId } = req.body;
        
        // Validate required fields
        if (!leaveRequestId || !studentId || !lineUserId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: leaveRequestId, studentId, lineUserId'
            });
        }
        
        console.log('Cancelling leave request:', { leaveRequestId, studentId, lineUserId });
        
        // Get leave request details first
        const leaveRequest = await getLeaveRequest(leaveRequestId);
        
        // Verify that the leave request belongs to the student
        if (leaveRequest.student_id !== studentId) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized: Leave request does not belong to this student'
            });
        }
        
        // Check if the leave date is in the future
        const leaveDate = new Date(leaveRequest.leave_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (leaveDate <= today) {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel leave request for past or current date'
            });
        }
        
        // Check if the leave request is already cancelled
        if (leaveRequest.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Leave request is already cancelled'
            });
        }
        
        // Cancel the leave request
        const result = await cancelLeaveRequest(leaveRequestId, studentId);
        
        // Get student information for the message
        const student = await getStudentData(studentId);
        
        if (result.success) {
            // Format the cancellation message
            const formattedDate = formatThaiDate(result.cancelledDate);
            
            const message = `✅ ยกเลิกการลาเรียบร้อยแล้ว\n\n` +
                           `👤 ชื่อ: ${student.student_name}\n` +
                           `🆔 รหัสนักเรียน: ${student.link_code}\n` +
                           `📅 วันที่ยกเลิก: ${formattedDate}\n\n` +
                           `ระบบได้ยกเลิกการลาของคุณเรียบร้อยแล้ว หากต้องการลาใหม่ กรุณาส่งคำว่า "ลา" เพื่อเข้าสู่ระบบการลา`;
            
            // Send LINE message
            await sendLineMessage(lineUserId, message);
            
            console.log('Leave cancelled successfully:', {
                studentId: studentId,
                leaveRequestId: leaveRequestId,
                cancelledDate: result.cancelledDate
            });
        }
        
        return res.status(200).json({
            success: result.success,
            message: result.message,
            cancelledLeave: result.success ? {
                id: leaveRequestId,
                leave_date: result.cancelledDate,
                status: 'cancelled'
            } : undefined
        });
        
    } catch (error) {
        console.error('API Error:', error);
        
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}