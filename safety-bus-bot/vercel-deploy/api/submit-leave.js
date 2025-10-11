import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { student_id, leave_dates, line_user_id } = req.body;

    // Validate required fields
    if (!student_id || !leave_dates || !Array.isArray(leave_dates) || leave_dates.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: student_id and leave_dates array' 
      });
    }

    // Validate maximum 3 days
    if (leave_dates.length > 3) {
      return res.status(400).json({ 
        error: 'Cannot request leave for more than 3 days' 
      });
    }

    // Validate date format and ensure dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const validDates = [];
    for (const dateStr of leave_dates) {
      const leaveDate = new Date(dateStr);
      if (isNaN(leaveDate.getTime())) {
        return res.status(400).json({ 
          error: `Invalid date format: ${dateStr}` 
        });
      }
      
      leaveDate.setHours(0, 0, 0, 0);
      if (leaveDate < today) {
        return res.status(400).json({ 
          error: `Cannot request leave for past dates: ${dateStr}` 
        });
      }
      
      validDates.push(dateStr);
    }

    // Check if student exists and is active
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('student_id, student_name, is_active')
      .eq('student_id', student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (!student.is_active) {
      return res.status(403).json({ error: 'Student account is inactive' });
    }

    // Check for duplicate leave requests
    const { data: existingLeaves, error: checkError } = await supabase
      .from('leave_requests')
      .select('leave_date')
      .eq('student_id', student_id)
      .in('leave_date', validDates)
      .eq('status', 'approved');

    if (checkError) {
      console.error('Error checking existing leaves:', checkError);
      return res.status(500).json({ error: 'Database error while checking existing leaves' });
    }

    if (existingLeaves && existingLeaves.length > 0) {
      const duplicateDates = existingLeaves.map(leave => leave.leave_date);
      return res.status(409).json({ 
        error: 'Leave already requested for these dates',
        duplicate_dates: duplicateDates
      });
    }

    // Prepare leave requests data
    const leaveRequests = validDates.map(date => ({
      student_id: student_id,
      leave_date: date,
      status: 'approved',
      leave_type: 'personal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert leave requests
    const { data: insertedLeaves, error: insertError } = await supabase
      .from('leave_requests')
      .insert(leaveRequests)
      .select();

    if (insertError) {
      console.error('Error inserting leave requests:', insertError);
      return res.status(500).json({ error: 'Failed to submit leave requests' });
    }

    console.log('Leave requests submitted successfully:', {
      student_id,
      student_name: student.student_name,
      leave_dates: validDates,
      line_user_id
    });

    return res.status(201).json({
      success: true,
      message: 'Leave requests submitted successfully',
      data: {
        student_id,
        student_name: student.student_name,
        leave_requests: insertedLeaves,
        submitted_dates: validDates
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}