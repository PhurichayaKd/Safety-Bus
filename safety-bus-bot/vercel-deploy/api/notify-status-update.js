// api/notify-status-update.js - ส่งแจ้งเตือนไลน์เมื่อคนขับอัปเดตสถานะ

import { createClient } from '@supabase/supabase-js';
import { sendLineMessage } from '../lib/line.js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// สถานะและข้อความที่จะส่ง
const STATUS_MESSAGES = {
  enroute: {
    title: '🚌 เริ่มออกเดินทาง',
    message: 'รถโรงเรียนเริ่มออกเดินทางแล้ว กรุณาเตรียมตัวรอรถที่จุดรับ-ส่ง',
    emoji: '🚌'
  },
  arrived_school: {
    title: '🏫 ถึงโรงเรียนแล้ว',
    message: 'รถโรงเรียนถึงโรงเรียนแล้ว นักเรียนได้ลงรถเรียบร้อย',
    emoji: '🏫'
  },
  waiting_return: {
    title: '🔄 รอรับกลับบ้าน',
    message: 'รถโรงเรียนกำลังรอรับนักเรียนกลับบ้าน',
    emoji: '🔄'
  },
  finished: {
    title: '✅ จบการเดินทาง',
    message: 'รถโรงเรียนจบการเดินทางแล้ว นักเรียนทุกคนได้กลับถึงบ้านเรียบร้อย',
    emoji: '✅'
  }
};

/**
 * ดึงข้อมูล LINE User IDs ของนักเรียนและผู้ปกครองทั้งหมด
 */
async function getAllLineUserIds() {
  try {
    console.log('🔍 Fetching all LINE user IDs...');
    
    // ดึง LINE User IDs ของนักเรียน
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('line_user_id, student_id')
      .eq('active', true)
      .not('line_user_id', 'is', null);

    if (studentError) {
      console.error('❌ Error fetching student LINE links:', studentError);
      throw studentError;
    }

    // ดึง LINE User IDs ของผู้ปกครอง
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('line_user_id, parent_id')
      .eq('active', true)
      .not('line_user_id', 'is', null);

    if (parentError) {
      console.error('❌ Error fetching parent LINE links:', parentError);
      throw parentError;
    }

    console.log(`📊 Found ${studentLinks?.length || 0} student LINE links`);
    console.log(`📊 Found ${parentLinks?.length || 0} parent LINE links`);

    return {
      students: studentLinks || [],
      parents: parentLinks || []
    };
  } catch (error) {
    console.error('❌ Error in getAllLineUserIds:', error);
    throw error;
  }
}

/**
 * ส่งแจ้งเตือนไปยัง LINE User ID เดียว
 */
async function sendNotificationToUser(lineUserId, status, timestamp) {
  try {
    const statusInfo = STATUS_MESSAGES[status];
    if (!statusInfo) {
      throw new Error(`Unknown status: ${status}`);
    }

    const message = {
      type: 'text',
      text: `${statusInfo.emoji} ${statusInfo.title}\n\n${statusInfo.message}\n\n⏰ เวลา: ${new Date(timestamp).toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}`
    };

    await sendLineMessage(lineUserId, message);
    console.log(`✅ Notification sent to ${lineUserId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification to ${lineUserId}:`, error);
    return false;
  }
}

/**
 * ส่งแจ้งเตือนไปยังผู้ใช้ทั้งหมด
 */
async function sendNotificationsToAll(status, timestamp) {
  try {
    const { students, parents } = await getAllLineUserIds();
    
    // รวม LINE User IDs ทั้งหมด
    const allLineUserIds = [
      ...students.map(s => s.line_user_id),
      ...parents.map(p => p.line_user_id)
    ].filter(id => id); // กรองค่า null/undefined ออก

    console.log(`📤 Sending notifications to ${allLineUserIds.length} users...`);

    // ส่งแจ้งเตือนแบบ parallel แต่จำกัดจำนวน
    const batchSize = 10; // ส่งครั้งละ 10 คน
    const results = [];

    for (let i = 0; i < allLineUserIds.length; i += batchSize) {
      const batch = allLineUserIds.slice(i, i + batchSize);
      const batchPromises = batch.map(userId => 
        sendNotificationToUser(userId, status, timestamp)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // รอสักครู่ระหว่าง batch เพื่อไม่ให้ rate limit
      if (i + batchSize < allLineUserIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failCount = results.length - successCount;

    console.log(`📊 Notification results: ${successCount} success, ${failCount} failed`);

    return {
      total: allLineUserIds.length,
      success: successCount,
      failed: failCount
    };
  } catch (error) {
    console.error('❌ Error in sendNotificationsToAll:', error);
    throw error;
  }
}

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
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST method is supported'
    });
  }

  try {
    console.log('🚌 Driver status update notification request received');
    console.log('📝 Request body:', JSON.stringify(req.body, null, 2));

    const { status, timestamp } = req.body;

    // Validate input
    if (!status) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'status is required'
      });
    }

    if (!STATUS_MESSAGES[status]) {
      return res.status(400).json({
        error: 'Invalid status',
        message: `Status must be one of: ${Object.keys(STATUS_MESSAGES).join(', ')}`
      });
    }

    const notificationTimestamp = timestamp || new Date().toISOString();

    // ส่งแจ้งเตือนไปยังผู้ใช้ทั้งหมด
    const results = await sendNotificationsToAll(status, notificationTimestamp);

    console.log('✅ Status update notifications sent successfully');

    return res.status(200).json({
      success: true,
      message: 'Notifications sent successfully',
      status: status,
      timestamp: notificationTimestamp,
      results: results
    });

  } catch (error) {
    console.error('❌ Error in notify-status-update:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}