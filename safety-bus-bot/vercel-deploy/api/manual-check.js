import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { student_id, driver_id, event_type, location_type = 'unknown' } = req.body;

    if (!student_id || !driver_id || !event_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: student_id, driver_id, event_type' 
      });
    }

    console.log(`[Manual Check] Student: ${student_id}, Driver: ${driver_id}, Event: ${event_type}, Location: ${location_type}`);

    // 1. ตรวจสอบว่านักเรียนมีอยู่และ active
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('student_id, student_name, is_active')
      .eq('student_id', student_id)
      .eq('is_active', true)
      .single();

    if (studentError || !studentData) {
      console.log(`[Manual Check] Student not found or inactive: ${student_id}`);
      return res.status(404).json({ 
        error: 'Student not found or inactive'
      });
    }

    // 2. ตรวจสอบว่าคนขับมีอยู่และ active
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name, is_active')
      .eq('driver_id', driver_id)
      .eq('is_active', true)
      .single();

    if (driverError || !driverData) {
      console.log(`[Manual Check] Driver not found or inactive: ${driver_id}`);
      return res.status(404).json({ 
        error: 'Driver not found or inactive'
      });
    }

    // 3. บันทึกการขึ้น/ลงรถ
    const { data: pickupData, error: pickupError } = await supabase
      .from('pickup_dropoff')
      .insert({
        student_id: studentData.student_id,
        driver_id: driver_id,
        event_type: event_type,
        location_type: location_type,
        pickup_source: 'manual_check',
        event_time: new Date().toISOString()
      })
      .select()
      .single();

    if (pickupError) {
      console.error('[Manual Check] Error inserting pickup record:', pickupError);
      return res.status(500).json({ 
        error: 'Failed to record pickup/dropoff'
      });
    }

    // 4. ส่งการแจ้งเตือน LINE
    try {
      await sendLineNotification(studentData, event_type, location_type, driverData);
    } catch (lineError) {
      console.error('[Manual Check] LINE notification failed:', lineError);
      // ไม่ return error เพราะการบันทึกสำเร็จแล้ว
    }

    console.log(`[Manual Check] Success: ${studentData.student_name} - ${event_type} by ${driverData.driver_name}`);

    return res.status(200).json({
      success: true,
      student: {
        id: studentData.student_id,
        name: studentData.student_name
      },
      driver: {
        id: driverData.driver_id,
        name: driverData.driver_name
      },
      event: {
        type: event_type,
        location_type: location_type,
        time: pickupData.event_time
      },
      message: `${studentData.student_name} ${event_type === 'pickup' ? 'ขึ้นรถ' : 'ลงรถ'}แล้ว โดย ${driverData.driver_name}`
    });

  } catch (error) {
    console.error('[Manual Check] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error'
    });
  }
}

// ฟังก์ชันส่งการแจ้งเตือน LINE
async function sendLineNotification(student, eventType, locationType, driver) {
  try {
    // หา LINE user ID ของนักเรียน
    const { data: studentLineData } = await supabase
      .from('student_line_links')
      .select('line_user_id')
      .eq('student_id', student.student_id)
      .eq('active', true)
      .single();

    // หา LINE user ID ของผู้ปกครอง
    const { data: parentLineData } = await supabase
      .from('student_guardians')
      .select(`
        parent_id,
        parent_line_links!inner(line_user_id)
      `)
      .eq('student_id', student.student_id)
      .eq('parent_line_links.active', true);

    const currentTime = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    let message = '';
    if (eventType === 'pickup') {
      message = `🟢ขึ้นรถแล้ว🟢\n${student.student_name}\n\nสถานะ : เช็คขึ้นรถ โดยคนขับ\nคนขับ: ${driver.driver_name}\n⏰ เวลา: ${currentTime}`;
    } else if (eventType === 'dropoff') {
      message = `🟠ลงรถแล้ว🟠\n${student.student_name}\n\nสถานะ : เช็คลงรถ โดยคนขับ\nคนขับ: ${driver.driver_name}\n⏰ เวลา: ${currentTime}`;
    }

    // ส่งให้นักเรียน (ถ้ามี)
    if (studentLineData?.line_user_id) {
      await sendLineMessage(studentLineData.line_user_id, message);
    }

    // ส่งให้ผู้ปกครอง (ถ้ามี)
    if (parentLineData && parentLineData.length > 0) {
      for (const parent of parentLineData) {
        if (parent.parent_line_links?.line_user_id) {
          await sendLineMessage(parent.parent_line_links.line_user_id, message);
        }
      }
    }

  } catch (error) {
    console.error('[LINE Notification] Error:', error);
    throw error;
  }
}

// ฟังก์ชันส่งข้อความ LINE
async function sendLineMessage(lineUserId, message) {
  const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('[LINE] No access token configured');
    return;
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
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
      const errorText = await response.text();
      console.error(`[LINE] Failed to send message: ${response.status} - ${errorText}`);
    } else {
      console.log(`[LINE] Message sent successfully to ${lineUserId}`);
    }
  } catch (error) {
    console.error('[LINE] Send message error:', error);
    throw error;
  }
}