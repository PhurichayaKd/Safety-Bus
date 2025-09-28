import { createClient } from '@supabase/supabase-js';
import { sendLineMessage } from '../lib/line.js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Status labels in Thai
const STATUS_LABELS = {
  'enroute': 'เริ่มออกเดินทาง',
  'arrived_school': 'ถึงโรงเรียน',
  'waiting_return': 'รอรับกลับบ้าน',
  'finished': 'จบการเดินทาง'
};

// Status emojis
const STATUS_EMOJIS = {
  'enroute': '🚌',
  'arrived_school': '🏫',
  'waiting_return': '⏰',
  'finished': '✅'
};

/**
 * ดึงรายการ LINE User ID ทั้งหมดที่ผูกบัญชีแล้ว
 */
async function getAllLinkedLineUsers() {
  try {
    console.log('🔍 Fetching all linked LINE users...');
    
    // ดึงจาก student_line_links
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('line_user_id')
      .not('line_user_id', 'is', null)
      .eq('active', true);

    if (studentError) {
      console.error('❌ Error fetching student links:', studentError);
    } else {
      console.log(`📚 Found ${studentLinks?.length || 0} student LINE links`);
    }

    // ดึงจาก parent_line_links
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('line_user_id')
      .not('line_user_id', 'is', null)
      .eq('active', true);

    if (parentError) {
      console.error('❌ Error fetching parent links:', parentError);
    } else {
      console.log(`👨‍👩‍👧‍👦 Found ${parentLinks?.length || 0} parent LINE links`);
    }

    // รวมรายการและลบ duplicate
    const allLinks = [
      ...(studentLinks || []),
      ...(parentLinks || [])
    ];

    // ลบ LINE User ID ที่ซ้ำกัน
    const uniqueLineUserIds = [...new Set(allLinks.map(link => link.line_user_id))];
    
    console.log(`✅ Found ${uniqueLineUserIds.length} unique LINE users to notify`);
    console.log('📋 LINE User IDs:', uniqueLineUserIds);
    
    return uniqueLineUserIds;
  } catch (error) {
    console.error('❌ Error getting linked LINE users:', error);
    return [];
  }
}

/**
 * สร้างข้อความแจ้งเตือนการอัพเดตสถานะ
 */
function createStatusMessage(status, timestamp) {
  const emoji = STATUS_EMOJIS[status] || '🚌';
  const label = STATUS_LABELS[status] || status;
  const time = new Date(timestamp).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return {
    type: 'text',
    text: `${emoji} แจ้งเตือนสถานะรถบัส\n\n📍 สถานะปัจจุบัน: ${label}\n⏰ เวลา: ${time}\n\n🚌 รถบัสโรงเรียน\nขอบคุณที่ใช้บริการ`
  };
}

/**
 * ส่งแจ้งเตือนไปยัง LINE users ทั้งหมด
 */
async function broadcastStatusUpdate(status, timestamp) {
  try {
    const lineUserIds = await getAllLinkedLineUsers();
    
    if (lineUserIds.length === 0) {
      console.log('No LINE users found to notify');
      return { success: true, notified: 0 };
    }

    const message = createStatusMessage(status, timestamp);
    let successCount = 0;
    let errorCount = 0;

    // ส่งข้อความไปยังแต่ละ user
    for (const userId of lineUserIds) {
      try {
        await sendLineMessage(userId, message);
        successCount++;
        console.log(`✅ Notification sent to user: ${userId}`);
        
        // เพิ่ม delay เล็กน้อยเพื่อไม่ให้ hit rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
        console.error(`❌ Failed to send notification to user ${userId}:`, error);
      }
    }

    console.log(`Broadcast completed: ${successCount} success, ${errorCount} errors`);
    return { 
      success: true, 
      notified: successCount, 
      errors: errorCount,
      total: lineUserIds.length 
    };
  } catch (error) {
    console.error('Error broadcasting status update:', error);
    throw error;
  }
}

/**
 * Main API handler
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { status, timestamp } = req.body;

    // Validate input
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    if (!STATUS_LABELS[status]) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed values: ${Object.keys(STATUS_LABELS).join(', ')}`
      });
    }

    const notificationTimestamp = timestamp || new Date().toISOString();

    console.log(`🚀 Broadcasting status update: ${status} at ${notificationTimestamp}`);

    // ส่งแจ้งเตือนไปยัง LINE users ทั้งหมด
    const result = await broadcastStatusUpdate(status, notificationTimestamp);

    return res.status(200).json({
      success: true,
      message: 'Status notification sent successfully',
      status: status,
      statusLabel: STATUS_LABELS[status],
      timestamp: notificationTimestamp,
      ...result
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}