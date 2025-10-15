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
    const { rfid_code, driver_id, location_type = 'unknown' } = req.body;

    if (!rfid_code || !driver_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: rfid_code, driver_id' 
      });
    }

    console.log(`[RFID Scan] Code: ${rfid_code}, Driver: ${driver_id}, Location: ${location_type}`);

    // 1. ตรวจสอบว่าบัตร RFID มีอยู่และ active
    const { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .select('card_id, rfid_code, is_active')
      .eq('rfid_code', rfid_code)
      .eq('is_active', true)
      .single();

    if (cardError || !cardData) {
      console.log(`[RFID Scan] Card not found or inactive: ${rfid_code}`);
      return res.status(404).json({ 
        error: 'RFID card not found or inactive',
        access_granted: false
      });
    }

    // 2. หานักเรียนที่ใช้บัตรนี้
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('rfid_card_assignments')
      .select(`
        student_id,
        students!inner(
          student_id,
          student_name,
          is_active
        )
      `)
      .eq('card_id', cardData.card_id)
      .eq('is_active', true)
      .lte('valid_from', new Date().toISOString())
      .or('valid_to.is.null,valid_to.gte.' + new Date().toISOString())
      .single();

    if (assignmentError || !assignmentData) {
      console.log(`[RFID Scan] No active student assignment for card: ${rfid_code}`);
      return res.status(404).json({ 
        error: 'No active student assignment for this card',
        access_granted: false
      });
    }

    const student = assignmentData.students;
    if (!student.is_active) {
      console.log(`[RFID Scan] Student is inactive: ${student.student_id}`);
      return res.status(403).json({ 
        error: 'Student is inactive',
        access_granted: false
      });
    }

    // 3. ตรวจสอบสถานะล่าสุดของนักเรียน
    const { data: lastRecord, error: lastRecordError } = await supabase
      .from('pickup_dropoff')
      .select('event_type, event_time, location_type')
      .eq('student_id', student.student_id)
      .order('event_time', { ascending: false })
      .limit(1);

    let newEventType = 'pickup'; // default
    let currentLocationStatus = 'home'; // สมมติว่าเริ่มต้นที่บ้าน

    if (lastRecord && lastRecord.length > 0) {
      const last = lastRecord[0];
      // ตรวจสอบสถานะล่าสุด
      if (last.event_type === 'pickup') {
        newEventType = 'dropoff'; // ถ้าขึ้นล่าสุด ครั้งนี้คือลง
        currentLocationStatus = 'on_bus';
      } else if (last.event_type === 'dropoff') {
        newEventType = 'pickup'; // ถ้าลงล่าสุด ครั้งนี้คือขึ้น
        currentLocationStatus = last.location_type === 'go' ? 'school' : 'home';
      }
    }

    // 4. บันทึกการขึ้น/ลงรถ
    const { data: pickupData, error: pickupError } = await supabase
      .from('pickup_dropoff')
      .insert({
        student_id: student.student_id,
        driver_id: driver_id,
        event_type: newEventType,
        location_type: location_type,
        pickup_source: 'rfid_scan',
        event_time: new Date().toISOString()
      })
      .select()
      .single();

    if (pickupError) {
      console.error('[RFID Scan] Error inserting pickup record:', pickupError);
      return res.status(500).json({ 
        error: 'Failed to record pickup/dropoff',
        access_granted: true // ยังให้เปิดประตูได้
      });
    }

    // 5. ส่งการแจ้งเตือน LINE
    try {
      await sendLineNotification(student, newEventType, location_type, driver_id);
    } catch (lineError) {
      console.error('[RFID Scan] LINE notification failed:', lineError);
      // ไม่ return error เพราะการบันทึกสำเร็จแล้ว
    }

    // 6. อัปเดต last_seen_at ของบัตร
    await supabase
      .from('rfid_cards')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('card_id', cardData.card_id);

    console.log(`[RFID Scan] Success: ${student.student_name} - ${newEventType}`);

    return res.status(200).json({
      success: true,
      access_granted: true,
      student: {
        id: student.student_id,
        name: student.student_name
      },
      event: {
        type: newEventType,
        location_type: location_type,
        time: pickupData.event_time
      },
      message: `${student.student_name} ${newEventType === 'pickup' ? 'ขึ้นรถ' : 'ลงรถ'}แล้ว`
    });

  } catch (error) {
    console.error('[RFID Scan] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      access_granted: false
    });
  }
}

// ฟังก์ชันส่งการแจ้งเตือน LINE
async function sendLineNotification(student, eventType, locationType, driverId) {
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

    // ดึงข้อมูลคนขับ
    let driverName = 'คนขับ';
    if (driverId) {
      const { data: driverData } = await supabase
        .from('driver_bus')
        .select('driver_name')
        .eq('driver_id', driverId)
        .single();
      
      if (driverData?.driver_name) {
        driverName = driverData.driver_name;
      }
    }

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
      message = `🟢ขึ้นรถแล้ว🟢\n${student.student_name}\n\nสถานะ : เช็คขึ้นรถ โดยการสแกนบัตร\nคนขับ: ${driverName}\n⏰ เวลา: ${currentTime}`;
    } else {
      // สำหรับการลงรถ - ใช้ข้อความเดิมไว้ก่อน เพราะ RFID scan ไม่ได้ใช้สำหรับลงรถ
      if (locationType === 'go') {
        message = `🏫 ${student.student_name} ลงรถที่โรงเรียนแล้ว\n⏰ เวลา: ${currentTime}`;
      } else {
        message = `🏠 ${student.student_name} ลงรถที่บ้านแล้ว\n⏰ เวลา: ${currentTime}`;
      }
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