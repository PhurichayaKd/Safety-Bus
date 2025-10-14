import { sendLineMessage, replyLineMessage, getUserProfile } from './line.js';
import { supabase } from './db.js';
import { sendMainMenu } from './menu.js';
import { getStudentByLineId } from './student-data.js';
import { config } from './config.js';
import { checkLineUserIdExists, matchLineIds, checkAndAutoMatchLineId } from './line-id-matcher.js';
import { createStudentInfoBubble, createLeaveRequestBubble, createContactDriverBubble } from './flex-templates.js';

// Store user form states (in production, use Redis or database)
const userFormStates = new Map();
// Store user leave form sending states to prevent duplicate sends
const userLeaveFormStates = new Map();
// Store user error message states to prevent spam
const userErrorStates = new Map();
export { userFormStates, userLeaveFormStates, userErrorStates };

/**
 * ตรวจสอบสถานะการผูกบัญชีและดึงข้อมูลนักเรียน
 * @param {string} userId
 * @returns {Promise<{linked: boolean, type: string|null, student: object|null}>}
 */
export async function checkLinkStatus(userId) {
  try {
    console.log(`🔍 Checking link status for user: ${userId}`);
    
    // ตรวจสอบการเชื่อมโยงปกติก่อน
    const studentData = await getStudentByLineId(userId);
    
    if (studentData && studentData.student) {
      console.log(`✅ User ${userId} is linked as ${studentData.type}`);
      return { 
        linked: true, 
        type: studentData.type, 
        student: studentData.student 
      };
    }
    
    // ถ้าไม่พบการเชื่อมโยง ให้ลองจับคู่อัตโนมัติ
    console.log(`🔄 Attempting auto-match for user: ${userId}`);
    const autoMatchResult = await checkAndAutoMatchLineId(userId);
    
    if (autoMatchResult.exists) {
      console.log(`✅ Auto-matched user ${userId} as ${autoMatchResult.userType}`);
      return { 
        linked: true, 
        type: autoMatchResult.userType, 
        student: autoMatchResult.userData.student || autoMatchResult.userData,
        autoMatched: autoMatchResult.autoMatched
      };
    }
    
    console.log(`❌ User ${userId} is not linked and cannot be auto-matched`);
    return { linked: false, type: null, student: null };
  } catch (error) {
    console.error('❌ Error in checkLinkStatus:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details
    });
    // Always return false for linking status on error to prevent crashes
    return { linked: false, type: null, student: null };
  }
}

/**
 * จัดการข้อความที่ส่งมา
 * @param {Object} event - LINE webhook event
 */
export async function handleTextMessage(event) {
  const userId = event.source.userId;
  const text = event.message.text.trim();

  console.log(`📝 Text message from ${userId}: ${text}`);

  // ตรวจสอบการผูกบัญชีแบบเร็ว (ไม่ auto match ก่อน)
  let isLinked = false;
  
  // ตรวจสอบการผูกบัญชีแบบง่าย ๆ ก่อน
  try {
    const { data: studentLink } = await supabase
      .from('student_line_links')
      .select('id')
      .eq('line_user_id', userId)
      .limit(1)
      .single();
    
    if (studentLink) {
      isLinked = true;
    } else {
      const { data: parentLink } = await supabase
        .from('parent_line_links')
        .select('id')
        .eq('line_user_id', userId)
        .limit(1)
        .single();
      
      if (parentLink) {
        isLinked = true;
      }
    }
  } catch (error) {
    console.log('Quick link check failed, will try auto match later');
  }

  // ถ้ายังไม่ผูกบัญชี ให้ลอง auto match (แต่ทำใน background)
  if (!isLinked) {
    // ทำ auto match ใน background หลังจากตอบกลับแล้ว
    setImmediate(async () => {
      try {
        const linkStatus = await checkAndAutoMatchLineId(userId);
        if (linkStatus.autoMatched) {
          await sendLineMessage(userId, [{
            type: 'text',
            text: `✅ ${linkStatus.message}\n\nยินดีต้อนรับสู่ระบบ Safety Bus! 🚌\n\nตอนนี้คุณสามารถใช้งานระบบได้แล้ว`
          }]);
          await sendMainMenu(userId);
        }
      } catch (error) {
        console.error('Background auto match failed:', error);
      }
    });
  }

  // ถ้ายังไม่ผูกบัญชี แต่ข้อความไม่ใช่รหัสนักเรียนหรือรหัสเชื่อมโยง
  // ให้ลองจับคู่ LINE Display ID กับ LINE User ID
  if (!isLinked && !/^[0-9]{6}$/.test(text) && !/^[A-Z0-9]{8}$/.test(text.toUpperCase())) {
    // ลองใช้ text เป็น LINE Display ID เพื่อจับคู่
    const matchResult = await matchLineIds(userId, text);
    if (matchResult.success) {
      isLinked = true;
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: `✅ ${matchResult.message}\n\nยินดีต้อนรับสู่ระบบ Safety Bus! 🚌\n\nตอนนี้คุณสามารถใช้งานระบบได้แล้ว\nกดปุ่มเมนูด้านล่างเพื่อเริ่มใช้งาน`
      });
      await sendMainMenu(userId);
      return;
    }
  }

  // ตรวจสอบว่าเป็นรหัสเชื่อมโยง 8 ตัวอักษร (A-Z, 0-9)
  if (/^[A-Z0-9]{8}$/.test(text.toUpperCase())) {
    await handleLinkCodeVerification(event, text.toUpperCase());
    return;
  }

  // ตรวจสอบว่าเป็นรหัสนักเรียน 6 หลัก (สำหรับผูกบัญชี)
  if (/^[0-9]{6}$/.test(text)) {
    await handleStudentCodeLinking(event, text);
    return;
  }

  // หากยังไม่ผูกบัญชี ให้แนะนำการผูกบัญชี
  if (!isLinked) {
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `สวัสดีครับ! 👋\n\nยินดีต้อนรับสู่ระบบ Safety Bus\n\nเพื่อใช้งานระบบ กรุณาผูกบัญชีก่อน\nโดยพิมพ์รหัสนักเรียน 6 หลัก\n\nตัวอย่าง: 123456\n\n📝 หมายเหตุ: รหัสนักเรียนคือรหัส 6 หลัก โดยคนขับจะแจ้งให้ทราบ`
    });
    return;
  }

  // ตรวจสอบคำสั่งเมนู
  if (text.toLowerCase().includes('เมนู') || text.toLowerCase().includes('menu')) {
    await sendMainMenu(userId, event.replyToken);
    return;
  }

  // ตรวจสอบคำสั่งประวัติ
  if (text.includes('ประวัติ') || text.includes('history')) {
    await handleHistoryRequest(event);
    return;
  }

  // ตรวจสอบคำสั่งตำแหน่งรถ
  if (text.includes('ตำแหน่ง') || text.includes('รถ') || text.includes('location')) {
    await handleLocationRequest(event);
    return;
  }

  // คำสั่งสำหรับการทดสอบ - reset cooldown
  if (text.toLowerCase() === 'reset cooldown' || text === 'รีเซ็ต') {
    userLeaveFormStates.delete(userId);
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: '✅ รีเซ็ต cooldown เรียบร้อยแล้ว\nตอนนี้สามารถขอฟอร์มแจ้งลาได้ทันที\n\n💡 เพื่อขอฟอร์มแจ้งลา กรุณากดปุ่ม "แจ้งลา" ในเมนู หรือพิมพ์ "แจ้งลา"'
    });
    return;
  }

  // ตรวจสอบคำสั่งติดต่อ
  if (text.includes('ติดต่อ') || text.includes('contact') || text.includes('โทร')) {
    await handleContactDriverRequest(event);
    return;
  }

  // ตรวจสอบคำสั่งการลาหยุด (เฉพาะคำสั่งที่ชัดเจน)
  if (text === 'แจ้งลา' || text === 'ลา' || text === 'ขอลา' || text.includes('แจ้งลา') || text.includes('absence') || text.includes('ขาด')) {
    await handleLeaveRequestMenu(event);
    return;
  }

  // ตรวจสอบคำสั่งสำหรับคนขับ
  if (text.includes('คนขับ') || text.includes('driver')) {
    await handleDriverCommand(event);
    return;
  }

  // ข้อความทั่วไป - แสดงเมนู
  await sendMainMenu(userId, event.replyToken);
}

/**
 * จัดการ postback event
 * @param {Object} event - LINE webhook event
 */
export async function handlePostback(event) {
  const userId = event.source.userId;
  const data = event.postback.data;

  // เพิ่ม log
  console.log(`🔄 handlePostback called from ${userId}: ${data}`);
  console.log('📋 Full event data:', JSON.stringify(event, null, 2));

  try {
    // แยกประเภท action
    if (data.startsWith('action=')) {
      const action = data.split('=')[1];
      console.log('Postback action:', action);
      await handleMainAction(event, action);
    } else if (data.startsWith('leave_type=') || data.startsWith('confirm_leave=') || data.startsWith('leave_form_')) {
      // Handle leave-related postbacks by redirecting to leave request menu
      console.log('Leave-related postback, redirecting to leave request menu');
      await handleLeaveRequestMenu(event);
    } else {
      // กรณี action ไม่ตรง
      console.log('Unknown postback data:', data);
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'ขออภัย ไม่เข้าใจคำสั่งเมนูนี้ กรุณาใช้เมนูหลักแทน'
      });
      // ไม่ส่งเมนูเพิ่มเติม เพราะ Rich Menu จะแสดงอยู่แล้ว
      // await sendMainMenu(userId);
    }
  } catch (err) {
    console.error('❌ Error in handlePostback:', err);
    console.error('Error details:', {
      userId: userId,
      data: data,
      replyToken: event.replyToken,
      message: err.message,
      stack: err.stack
    });
    
    // ตรวจสอบ rate limiting สำหรับ error messages
    const currentTime = Date.now();
    const lastErrorTime = userErrorStates.get(userId);
    const errorCooldown = 30000; // 30 วินาที
    
    if (lastErrorTime && (currentTime - lastErrorTime) < errorCooldown) {
      console.log(`🚫 Error message cooldown active for user ${userId}`);
      return; // ไม่ส่งข้อความ error ซ้ำ
    }
    
    // อัปเดต error state
    userErrorStates.set(userId, currentTime);
    
    // ส่งข้อความ error เพียงครั้งเดียวผ่าน reply token เท่านั้น
    if (event.replyToken) {
      try {
        await replyLineMessage(event.replyToken, {
          type: 'text',
          text: 'เกิดข้อผิดพลาดในการประมวลผลเมนู กรุณาลองใหม่อีกครั้ง'
        });
        console.log('✅ Sent postback error message via reply token');
      } catch (replyError) {
        console.error('❌ Reply token already used or invalid:', replyError);
        // ไม่ใช้ push message เป็น fallback เพื่อป้องกันการส่งซ้ำ
        console.log('⚠️ Skipping push message fallback to prevent spam');
      }
    } else {
      console.log('⚠️ Cannot send postback error message - no reply token');
    }
  }
}

/**
 * จัดการ follow event (เมื่อผู้ใช้เพิ่มเพื่อน)
 * @param {Object} event - LINE webhook event
 */
export async function handleFollow(event) {
  const userId = event.source.userId;
  console.log(`👋 New follower: ${userId}`);

  // ตรวจสอบว่าผูกบัญชีแล้วหรือไม่
  const { linked, type, student } = await checkLinkStatus(userId);

  if (linked) {
    // หากผูกบัญชีแล้ว ให้แสดงเมนูทันที พร้อมแนะนำสิทธิ์
    let roleText = type === 'parent' ? 'ผู้ปกครอง' : 'นักเรียน';
    let nameText = student ? student.student_name : '';
    const welcomeMessage = {
      type: 'text',
      text: `✅ ผูกบัญชีสำเร็จแล้ว\n\nสวัสดี${roleText === 'ผู้ปกครอง' ? 'ครับ คุณ' : 'ครับ น้อง'}${nameText}\nสถานะ: ${roleText}\n\nคุณสามารถใช้เมนูด้านล่างเพื่อ:\n• ดูประวัตินักเรียน\n• แจ้งลาหยุด\n• ตรวจสอบตำแหน่งรถ\n• ติดต่อคนขับ\n\nหากต้องการเปลี่ยนบัญชี กรุณาติดต่อคนขับ`
    };
    await replyLineMessage(event.replyToken, welcomeMessage);
    // ไม่ส่งเมนูเพิ่มเติม เพราะ Rich Menu จะแสดงอยู่แล้ว
  } else {
    // หากยังไม่ผูกบัญชี ให้แนะนำการผูกบัญชี
    const welcomeMessage = {
      type: 'text',
      text: `ยินดีต้อนรับสู่ระบบ Safety Bus! 🚌\n\nเพื่อใช้งานระบบ กรุณาผูกบัญชีก่อน\nโดยพิมพ์รหัสนักเรียน 6 หลัก (link_code)\n\nตัวอย่าง: 123456\n\n📝 หมายเหตุ: รหัสนักเรียนคือรหัส 6 หลักที่ใช้ในโรงเรียน\n\nระบบจะช่วยคุณ:\n• แจ้งลาหยุดเรียน\n• ตรวจสอบประวัติการเดินทาง\n• ดูตำแหน่งรถบัส\n• ติดต่อคนขับรถ`
    };
    await replyLineMessage(event.replyToken, welcomeMessage);
  }
}

/**
 * จัดการ main action จาก postback
 * @param {Object} event - LINE webhook event
 * @param {string} action - Action type
 */
export async function handleMainAction(event, action) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  console.log(`🎯 handleMainAction: ${action} for user: ${userId}, replyToken: ${replyToken}`);

  try {
    // ตรวจสอบการผูกบัญชีและประเภทผู้ใช้
    const linkResult = await checkLinkStatus(userId);
    const { linked, type, student, autoMatched } = linkResult;
    console.log(`🔗 Account linking status: ${linked}, type: ${type}, autoMatched: ${autoMatched}`);
    
    // สำหรับเมนูติดต่อคนขับ ให้ใช้งานได้แม้ไม่ได้ผูกบัญชี
    if (!linked && action === 'contact_driver') {
      console.log('🚌 Contact driver requested by unlinked user, allowing access');
      await handleContactDriverRequest(event);
      return;
    }
    
    if (!linked) {
      if (replyToken) {
        await replyLineMessage(replyToken, {
          type: 'text',
          text: 'กรุณาผูกบัญชีก่อนใช้งาน\nโดยพิมพ์รหัสนักเรียน 6 หลัก\n\n💡 หรือหากต้องการติดต่อคนขับ สามารถใช้เมนู "ติดต่อคนขับ" ได้โดยไม่ต้องผูกบัญชี'
        });
      }
      return;
    }
    
    // ถ้าเป็นการจับคู่อัตโนมัติ ให้แจ้งผู้ใช้
    if (autoMatched && replyToken) {
      let roleText = type === 'parent' ? 'ผู้ปกครอง' : 'นักเรียน';
      let nameText = student ? student.student_name : '';
      await replyLineMessage(replyToken, {
        type: 'text',
        text: `✅ จับคู่บัญชีสำเร็จ!\n\nสวัสดี${roleText === 'ผู้ปกครอง' ? 'ครับ คุณ' : 'ครับ น้อง'}${nameText}\nสถานะ: ${roleText}\n\nยินดีต้อนรับกลับสู่ระบบ Safety Bus! 🚌\nตอนนี้คุณสามารถใช้งานระบบได้แล้ว`
      });
      await sendMainMenu(userId);
      return;
    }
    // จัดการ action ต่างๆ โดยใช้ replyToken เพียงครั้งเดียว
    switch (action) {
      case 'history':
      case 'student_history':
        await handleHistoryRequest(event);
        break;
        
      case 'leave':
      case 'leave_request':
        await handleLeaveRequestMenu(event);
        break;
        
      case 'location':
      case 'bus_location':
        await handleBusLocationRequest(event);
        break;
        
      case 'contact':
      case 'contact_driver':
        await handleContactDriverRequest(event);
        break;
        
      case 'main_menu':
        // ส่งเมนูหลักพร้อมข้อความต้อนรับ
        let roleText = type === 'parent' ? 'ผู้ปกครอง' : 'นักเรียน';
        let nameText = student ? student.student_name : '';
        await sendMainMenu(userId, replyToken, {
          welcomeText: `✅ ผูกบัญชีสำเร็จแล้ว\n\nสวัสดี${roleText === 'ผู้ปกครอง' ? 'ครับ คุณ' : 'ครับ น้อง'}${nameText}\nสถานะ: ${roleText}\n\nคุณสามารถใช้เมนูด้านล่างเพื่อ:\n• ดูประวัตินักเรียน\n• แจ้งลาหยุด\n• ตรวจสอบตำแหน่งรถ\n• ติดต่อคนขับ\n\nหากต้องการเปลี่ยนบัญชี กรุณาติดต่อโรงเรียน`
        });
        break;
        
      default:
        // ส่งเมนูหลัก fallback
        await sendMainMenu(userId, replyToken);
        break;
    }
  } catch (err) {
    console.error('❌ Error in handleMainAction:', err);
    console.error('Error details:', {
      action: action,
      userId: userId,
      replyToken: replyToken,
      message: err.message,
      stack: err.stack
    });
    
    // ตรวจสอบ error state เพื่อป้องกันการส่งข้อความซ้ำ
    const errorKey = `${userId}_${action}_error`;
    const lastErrorTime = userErrorStates.get(errorKey);
    const now = Date.now();
    
    // เพิ่มเวลา cooldown เป็น 60 วินาที เพื่อลดการส่งซ้ำ
    if (lastErrorTime && (now - lastErrorTime) < 60000) {
      console.log('⚠️ Error message already sent recently, skipping to prevent spam');
      return;
    }
    
    // บันทึกเวลาที่ส่งข้อความ error
    userErrorStates.set(errorKey, now);
    
    // ส่งข้อความ error เฉพาะผ่าน reply token เท่านั้น (ไม่ใช้ push message fallback)
    if (replyToken) {
      try {
        await replyLineMessage(replyToken, {
          type: 'text',
          text: 'เกิดข้อผิดพลาดในเมนู กรุณาลองใหม่\n\nหากปัญหายังคงเกิดขึ้น กรุณาติดต่อโรงเรียน'
        });
        console.log('✅ Sent error message via reply token');
      } catch (replyError) {
        console.error('❌ Reply token already used or invalid:', replyError);
        console.log('⚠️ Skipping push message fallback to prevent spam');
      }
    } else {
      console.log('⚠️ Cannot send error message - reply token missing');
    }
    
    // ล้าง error state หลังจาก 10 นาที
    setTimeout(() => {
      userErrorStates.delete(errorKey);
    }, 600000);
  }
}




/**
 * จัดการคำขอตำแหน่งรถ
 * @param {Object} event - LINE webhook event
 */
export async function handleLocationRequest(event) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '🚌 ตำแหน่งรถบัส\n\nฟีเจอร์นี้อยู่ระหว่างการพัฒนา\nกรุณาติดต่อคนขับรถโดยตรง'
  });
}



/**
 * จัดการการผูกบัญชี
 * @param {Object} event - LINE webhook event
 * @param {string} token - Link token
 */
export async function handleAccountLinking(event, token) {
  const userId = event.source.userId;

  try {
    // ตรวจสอบโทเคนในฐานข้อมูล - ค้นหาในทั้งสองตาราง
    let linkData = null;
    let userType = null;

    // ค้นหาในตาราง student_link_tokens ก่อน
    const { data: studentToken, error: studentError } = await supabase
      .from('student_link_tokens')
      .select('*, students(student_name, class)')
      .eq('token', token)
      .is('used_at', null)
      .single();

    if (studentToken && !studentError) {
      linkData = studentToken;
      userType = 'student';
    } else {
      // ถ้าไม่พบในตาราง student ให้ค้นหาในตาราง parent
      const { data: parentToken, error: parentError } = await supabase
        .from('parent_link_tokens')
        .select('*, parents(parent_name)')
        .eq('token', token)
        .is('used_at', null)
        .single();

      if (parentToken && !parentError) {
        linkData = parentToken;
        userType = 'parent';
      }
    }

    if (!linkData) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'โทเคนไม่ถูกต้องหรือหมดอายุแล้ว\nกรุณาขอโทเคนใหม่จากโรงเรียน'
      });
      return;
    }

    // ตรวจสอบว่าหมดอายุหรือไม่
    const now = new Date();
    const expiresAt = new Date(linkData.expires_at);

    if (now > expiresAt) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'โทเคนหมดอายุแล้ว\nกรุณาขอโทเคนใหม่จากโรงเรียน'
      });
      return;
    }

    // สร้างการเชื่อมโยง
    let linkError = null;
    if (userType === 'student') {
      const { error } = await supabase
        .from('student_line_links')
        .insert({
          line_user_id: userId,
          student_id: linkData.student_id,
          active: true,
          linked_at: new Date().toISOString()
        });
      linkError = error;
    } else if (userType === 'parent') {
      const { error } = await supabase
        .from('parent_line_links')
        .insert({
          line_user_id: userId,
          parent_id: linkData.parent_id,
          active: true,
          linked_at: new Date().toISOString()
        });
      linkError = error;
    }

    if (linkError) {
      throw linkError;
    }

    // ทำเครื่องหมายโทเคนว่าใช้แล้ว
    const tableName = userType === 'student' ? 'student_link_tokens' : 'parent_link_tokens';
    await supabase
      .from(tableName)
      .update({ 
        used_at: new Date().toISOString(),
        used_by_line_user_id: userId
      })
      .eq('token', token);

    // ส่งข้อความยืนยัน
    const userName = userType === 'student' 
      ? linkData.students?.student_name 
      : linkData.parents?.parent_name;
    
    const userClass = userType === 'student' 
      ? linkData.students?.class 
      : 'ผู้ปกครอง';

    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `✅ ผูกบัญชีสำเร็จ!\n\n${userType === 'student' ? 'นักเรียน' : 'ผู้ปกครอง'}: ${userName || 'N/A'}\n${userType === 'student' ? 'ชั้น' : 'สถานะ'}: ${userClass || 'N/A'}\n\nสามารถใช้งานระบบได้แล้ว\nพิมพ์ "เมนู" เพื่อเริ่มต้น`
    });

  } catch (error) {
    console.error('Error handling account linking:', error);
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการผูกบัญชี กรุณาลองใหม่อีกครั้ง'
    });
  }
}

/**
 * จัดการการป้อนรหัสนักเรียน
 * @param {Object} event - LINE webhook event
 * @param {string} studentId - Student ID
 */
/**
 * ตรวจสอบการผูกบัญชี
 * @param {string} userId - LINE User ID
 * @returns {boolean} - true หากผูกบัญชีแล้ว
 */
export async function checkAccountLinking(userId) {
  try {
    console.log(`🔍 Checking account linking for user: ${userId}`);

    // ใช้ getStudentByLineId เพื่อความสอดคล้องกัน
    const studentData = await getStudentByLineId(userId);
    
    console.log('👨‍🎓 Student data result:', studentData);

    return !!studentData;
  } catch (error) {
    console.error('Error checking account linking:', error);
    return false;
  }
}

/**
 * จัดการการผูกบัญชีด้วยรหัสนักเรียน 6 หลัก
 * @param {Object} event - LINE webhook event
 * @param {string} studentCode - รหัสนักเรียน 6 หลัก
 */
export async function handleStudentCodeLinking(event, studentCode) {
  const userId = event.source.userId;

  try {
    // ตรวจสอบว่าผูกบัญชีแล้วหรือไม่ และพยายามจับคู่อัตโนมัติ
    const linkStatus = await checkAndAutoMatchLineId(userId);
    if (linkStatus.exists) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'บัญชีของคุณผูกไว้แล้ว\nสามารถใช้งานเมนูได้ทันที'
      });
      await sendMainMenu(userId, null);
      return;
    }

    // ค้นหานักเรียนจากรหัส student_id
    const { data: student, error } = await supabase
      .from('students')
      .select('student_id, student_name, grade, parent_id')
      .eq('student_id', parseInt(studentCode))
      .single();

    if (error || !student) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่พบรหัสนักเรียนในระบบ\nกรุณาตรวจสอบรหัส 6 หลักและลองใหม่อีกครั้ง'
      });
      return;
    }

    // ตรวจสอบ LINE Display ID ที่คนขับเก็บไว้ในฐานข้อมูล
    const lineIdValidation = await validateAndUpdateLineId(userId, student.student_id, student.parent_id);
    
    if (!lineIdValidation.isValid) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: lineIdValidation.message
      });
      return;
    }

    // ตรวจสอบว่าผู้ใช้เป็นนักเรียนหรือผู้ปกครอง
    let linkType = 'parent'; // ค่าเริ่มต้น
    
    // ตรวจสอบใน student_line_links ก่อน
    const { data: studentLineData } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('student_id', student.student_id)
      .eq('line_user_id', userId)
      .eq('active', true)
      .single();

    if (studentLineData) {
      linkType = 'student';
    }

    // ส่งข้อความยืนยันการผูกบัญชีสำเร็จ
    const roleText = linkType === 'student' ? 'นักเรียน' : 'ผู้ปกครอง';
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `✅ ผูกบัญชีสำเร็จ!\n\nสวัสดี ${student.student_name}\nสถานะ: ${roleText}\nชั้น: ${student.grade}\n\n🚌 ระบบ Safety Bus พร้อมให้บริการ\n\nบริการที่มี:\n• ดูประวัตินักเรียน\n• แจ้งลาหยุด\n• ตรวจสอบตำแหน่งรถ\n• ติดต่อคนขับ\n\nกดเมนูด้านล่างเพื่อเริ่มใช้งาน`
    });

    // ส่งเมนูหลักให้ผู้ใช้
    await sendMainMenu(userId, null);

  } catch (error) {
    console.error('Error handling student code linking:', error);
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการตรวจสอบรหัสนักเรียน กรุณาลองใหม่อีกครั้ง'
    });
  }
}

/**
 * ตรวจสอบและอัปเดต LINE User ID ในฐานข้อมูล
 * @param {string} userId - LINE User ID ที่ได้จาก webhook
 * @param {number} studentId - รหัสนักเรียน
 * @param {number} parentId - รหัสผู้ปกครอง
 * @returns {Object} ผลการตรวจสอบ
 */
async function validateAndUpdateLineId(userId, studentId, parentId) {
  try {
    // ตรวจสอบว่า LINE User ID มีรูปแบบที่ถูกต้อง (U + 32 ตัวอักษร/ตัวเลข)
    const lineIdPattern = /^U[a-f0-9]{32}$/i;
    if (!lineIdPattern.test(userId)) {
      return {
        isValid: false,
        message: 'รูปแบบ LINE User ID ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ'
      };
    }

    // ดึง Display ID ของผู้ใช้จาก LINE API
    let userDisplayName;
    try {
      const userProfile = await getUserProfile(userId);
      userDisplayName = userProfile.displayName;
      console.log(`📋 User Display Name: ${userDisplayName}`);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return {
        isValid: false,
        message: 'ไม่สามารถดึงข้อมูลโปรไฟล์ LINE ได้ กรุณาลองใหม่อีกครั้ง'
      };
    }

    // ขั้นตอนที่ 1: ตรวจสอบใน student_line_links ด้วย line_display_id ก่อน
    const { data: studentLineIdData, error: studentLineIdError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('student_id', studentId)
      .eq('line_display_id', userDisplayName)
      .eq('active', true)
      .single();

    if (studentLineIdData && !studentLineIdError) {
      // พบ line_display_id ที่ตรงกัน ให้อัปเดต line_user_id
      const { error: updateError } = await supabase
        .from('student_line_links')
        .update({ 
          line_user_id: userId,
          linked_at: new Date().toISOString()
        })
        .eq('student_id', studentId)
        .eq('line_display_id', userDisplayName)
        .eq('active', true);

      if (updateError) {
        console.error('Error updating student LINE User ID:', updateError);
        return {
          isValid: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดต LINE ID กรุณาลองใหม่อีกครั้ง'
        };
      }

      return { isValid: true, message: `✅ ยืนยันตัวตนสำเร็จ!\nDisplay Name: ${userDisplayName}\nสถานะ: นักเรียน` };
    }

    // ขั้นตอนที่ 2: ตรวจสอบใน parent_line_links ด้วย line_display_id
    const { data: parentLineIdData, error: parentLineIdError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('parent_id', parentId)
      .eq('line_display_id', userDisplayName)
      .eq('active', true)
      .single();

    if (parentLineIdData && !parentLineIdError) {
      // พบ line_display_id ที่ตรงกัน ให้อัปเดต line_user_id
      const { error: updateError } = await supabase
        .from('parent_line_links')
        .update({ 
          line_user_id: userId,
          linked_at: new Date().toISOString()
        })
        .eq('parent_id', parentId)
        .eq('line_display_id', userDisplayName)
        .eq('active', true);

      if (updateError) {
        console.error('Error updating parent LINE User ID:', updateError);
        return {
          isValid: false,
          message: 'เกิดข้อผิดพลาดในการอัปเดต LINE ID กรุณาลองใหม่อีกครั้ง'
        };
      }

      return { isValid: true, message: `✅ ยืนยันตัวตนสำเร็จ!\nDisplay Name: ${userDisplayName}\nสถานะ: ผู้ปกครอง` };
    }

    // ขั้นตอนที่ 3: ถ้าไม่พบ line_display_id ให้ตรวจสอบ line_user_id ที่มีอยู่แล้ว
    // ตรวจสอบใน student_line_links ด้วย line_user_id
    const { data: studentLineData, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('student_id', studentId)
      .eq('active', true)
      .single();

    if (studentLineData && !studentError) {
      // ถ้ามี LINE User ID ที่บันทึกไว้แล้ว ให้ตรวจสอบว่าตรงกันหรือไม่
      if (studentLineData.line_user_id && studentLineData.line_user_id !== userId) {
        return {
          isValid: false,
          message: 'LINE ID ไม่ตรงกับที่บันทึกไว้ในระบบ\nกรุณาติดต่อคนขับหรือโรงเรียนเพื่อตรวจสอบข้อมูล'
        };
      }

      // ถ้า LINE User ID ยังไม่ได้บันทึก หรือเป็นค่าว่าง ให้อัปเดต
      if (!studentLineData.line_user_id || studentLineData.line_user_id.trim() === '') {
        const { error: updateError } = await supabase
          .from('student_line_links')
          .update({ 
            line_user_id: userId,
            linked_at: new Date().toISOString()
          })
          .eq('student_id', studentId)
          .eq('active', true);

        if (updateError) {
          console.error('Error updating student LINE ID:', updateError);
          return {
            isValid: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดต LINE ID กรุณาลองใหม่อีกครั้ง'
          };
        }
      }

      return { isValid: true, message: 'ตรวจสอบ LINE ID สำเร็จ (นักเรียน)' };
    }

    // ขั้นตอนที่ 4: ตรวจสอบใน parent_line_links ด้วย line_user_id
    const { data: parentLineData, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('parent_id', parentId)
      .eq('active', true)
      .single();

    if (parentLineData && !parentError) {
      // ถ้ามี LINE User ID ที่บันทึกไว้แล้ว ให้ตรวจสอบว่าตรงกันหรือไม่
      if (parentLineData.line_user_id && parentLineData.line_user_id !== userId) {
        return {
          isValid: false,
          message: 'LINE ID ไม่ตรงกับที่บันทึกไว้ในระบบ\nกรุณาติดต่อคนขับหรือโรงเรียนเพื่อตรวจสอบข้อมูล'
        };
      }

      // ถ้า LINE User ID ยังไม่ได้บันทึก หรือเป็นค่าว่าง ให้อัปเดต
      if (!parentLineData.line_user_id || parentLineData.line_user_id.trim() === '') {
        const { error: updateError } = await supabase
          .from('parent_line_links')
          .update({ 
            line_user_id: userId,
            linked_at: new Date().toISOString()
          })
          .eq('parent_id', parentId)
          .eq('active', true);

        if (updateError) {
          console.error('Error updating parent LINE ID:', updateError);
          return {
            isValid: false,
            message: 'เกิดข้อผิดพลาดในการอัปเดต LINE ID กรุณาลองใหม่อีกครั้ง'
          };
        }
      }

      return { isValid: true, message: 'ตรวจสอบ LINE ID สำเร็จ (ผู้ปกครอง)' };
    }

    // ถ้าไม่พบข้อมูลในทั้งสองตาราง
    return {
      isValid: false,
      message: `❌ ไม่พบข้อมูล Display Name "${userDisplayName}" ในระบบ\n\nกรุณาติดต่อคนขับเพื่อเพิ่มข้อมูลของคุณในระบบก่อน\nหรือตรวจสอบว่าได้สแกน QR Code ที่ถูกต้องแล้ว`
    };

  } catch (error) {
    console.error('Error validating LINE ID:', error);
    return {
      isValid: false,
      message: 'เกิดข้อผิดพลาดในการตรวจสอบ LINE ID กรุณาลองใหม่อีกครั้ง'
    };
  }
}

/**
 * จัดการคำสั่งสำหรับคนขับ
 * @param {Object} event - LINE webhook event
 */
export async function handleDriverCommand(event) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '🚌 สำหรับคนขับรถ\n\nกรุณาติดต่อโรงเรียนเพื่อขอสิทธิ์การใช้งาน\nหรือส่งรหัสนักเรียนที่ดูแล'
  });
}



/**
 * จัดการการลาด่วน (วันนี้/พรุ่งนี้)
 * @param {Object} event - LINE webhook event
 * @param {string} when - 'today' หรือ 'tomorrow'
 */
export async function handleQuickLeave(event, when) {
  const userId = event.source.userId;

  try {
    const studentData = await getStudentByLineId(userId);

    if (!studentData) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาผูกบัญชีก่อนแจ้งลา\nส่งรหัสนักเรียนเพื่อเริ่มต้น'
      });
      return;
    }

    const currentDate = new Date();
    let leaveDate = new Date(currentDate);

    if (when === 'tomorrow') {
      leaveDate.setDate(leaveDate.getDate() + 1);
    }

    const leaveDateStr = leaveDate.toLocaleDateString('th-TH');
    const submitTimeStr = currentDate.toLocaleString('th-TH');

    // บันทึกการลาลงฐานข้อมูล
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        student_id: studentData.student.student_id,
        leave_type: 'personal',
        leave_date: leaveDate.toISOString().split('T')[0],
        reason: when === 'today' ? 'ลาวันนี้' : 'ลาพรุ่งนี้',
        status: 'approved',
        created_at: currentDate.toISOString()
      })
      .select();

    if (error) {
      throw error;
    }

    // ส่งข้อความยืนยันการลา
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `✅ แจ้งลาสำเร็จ\n\nนักเรียน: ${studentData.student.student_name}\nวันที่ลา: ${leaveDateStr}\nเวลาแจ้ง: ${submitTimeStr}\nสถานะ: บันทึกแล้ว\n\nข้อมูลได้ถูกส่งไปยังคนขับรถแล้ว`
    });

  } catch (error) {
    console.error('Error handling quick leave:', error);
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการแจ้งลา กรุณาลองใหม่อีกครั้ง'
    });
  }
}

/**
 * จัดการคำขอประวัติ
 * @param {Object} event - LINE webhook event
 */
export async function handleHistoryRequest(event) {
  const userId = event.source.userId;

  try {
    // ใช้ getStudentByLineId เพื่อความสอดคล้องกัน
    const studentData = await getStudentByLineId(userId);
    
    if (!studentData || !studentData.student) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาผูกบัญชีก่อนดูประวัติ\nส่งรหัสนักเรียนเพื่อเริ่มต้น'
      });
      return;
    }

    const student = studentData.student;

    // ดึงข้อมูลนักเรียนเพิ่มเติมจาก Supabase
    const { data: fullStudentData, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        start_date,
        end_date,
        parent_id,
        parents:parent_id(
          parent_name
        )
      `)
      .eq('student_id', student.student_id)
      .single();

    // ดึงข้อมูล RFID Card ล่าสุด
    const { data: rfidData, error: rfidError } = await supabase
      .from('rfid_card_assignments')
      .select(`
        rfid_cards(
          rfid_code
        )
      `)
      .eq('student_id', student.student_id)
      .is('valid_to', null)
      .single();

    // Debug: ตรวจสอบข้อมูลที่ดึงมา
    console.log('Full student data:', fullStudentData);
    console.log('Student error:', studentError);
    console.log('RFID data:', rfidData);
    console.log('RFID error:', rfidError);
    
    if (studentError) {
      console.log('ไม่สามารถดึงข้อมูลเพิ่มเติมได้:', studentError);
    }

    // ดึงประวัติการเดินทาง 10 รายการล่าสุด
    const { data: history, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('student_id', student.student_id)
      .order('travel_date', { ascending: false })
      .limit(10);

    // สร้าง Flex Message สำหรับแสดงข้อมูลนักเรียน
    const flexMessage = createStudentInfoBubble(fullStudentData, rfidData, history);

    await replyLineMessage(event.replyToken, flexMessage);
  } catch (error) {
    console.error('Error handling history request:', error);
    // Only reply once - don't use push message as fallback to prevent spam
    try {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในการดึงประวัติ กรุณาลองใหม่อีกครั้ง'
      });
    } catch (replyError) {
      console.error('Reply token already used or invalid:', replyError);
      // Don't use push message fallback to prevent duplicate messages
      console.log('⚠️ Skipping push message fallback to prevent spam');
    }
  }
}

/**
 * จัดการคำขอประวัติ (Push message version)
 * @param {string} userId - LINE User ID
 */
export async function handleHistoryRequestPush(userId) {
  try {
    // ใช้ getStudentByLineId เพื่อความสอดคล้องกัน
    const studentData = await getStudentByLineId(userId);
    
    if (!studentData || !studentData.student) {
      await sendLineMessage(userId, [{
        type: 'text',
        text: 'กรุณาผูกบัญชีก่อนดูประวัติ\nส่งรหัสนักเรียนเพื่อเริ่มต้น'
      }]);
      return;
    }

    const student = studentData.student;

    // ดึงข้อมูลนักเรียนเพิ่มเติมจาก Supabase
    const { data: fullStudentData, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        start_date,
        end_date,
        parent_id,
        parents:parent_id(
          parent_name
        )
      `)
      .eq('student_id', student.student_id)
      .single();

    // ดึงข้อมูล RFID Card ล่าสุด
    const { data: rfidData, error: rfidError } = await supabase
      .from('rfid_card_assignments')
      .select(`
        rfid_cards(
          rfid_code
        )
      `)
      .eq('student_id', student.student_id)
      .is('valid_to', null)
      .single();
    
    // แสดงข้อมูลนักเรียน
    let infoText = `👦 ข้อมูลนักเรียน\n`;
    infoText += `ชื่อ: ${fullStudentData?.student_name || student.student_name || '-'}\n`;
    infoText += `รหัสนักเรียน: ${fullStudentData?.student_id || student.student_id || '-'}\n`;
    infoText += `ชั้นเรียน: ${fullStudentData?.grade || '-'}\n`;
    infoText += `รหัสบัตร RFID: ${rfidData?.rfid_cards?.rfid_code || '-'}\n`;
    infoText += `ชื่อผู้ปกครอง: ${fullStudentData?.parents?.parent_name || '-'}\n`;
    
    const startDate = fullStudentData?.start_date ? 
      new Date(fullStudentData.start_date).toLocaleDateString('th-TH') : '-';
    const endDate = fullStudentData?.end_date ? 
      new Date(fullStudentData.end_date).toLocaleDateString('th-TH') : '-';
    
    infoText += `วันที่เริ่มต้น-สิ้นสุดการใช้บริการรถรับส่ง: ${startDate} - ${endDate}\n`;

    // ดึงประวัติการเดินทาง 10 รายการล่าสุด
    const { data: history, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('student_id', student.student_id)
      .order('travel_date', { ascending: false })
      .limit(10);

    let historyText = '';
    if (history && history.length > 0) {
      historyText = '\n📊 ประวัติการเดินทางล่าสุด\n';
      history.forEach((record, index) => {
        const date = new Date(record.travel_date).toLocaleDateString('th-TH');
        historyText += `${index + 1}. ${date}\n`;
        historyText += `   🚌 ${record.pickup_time || 'N/A'} - ${record.dropoff_time || 'N/A'}\n`;
        historyText += `   📍 ${record.status || 'N/A'}\n`;
      });
    }

    await sendLineMessage(userId, [{
      type: 'text',
      text: infoText + historyText
    }]);
  } catch (error) {
    console.error('Error handling history request push:', error);
    await sendLineMessage(userId, [{
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการดึงประวัติ กรุณาลองใหม่อีกครั้ง'
    }]);
  }
}

/**
 * จัดการเมนูแจ้งลาหยุด
 * @param {Object} event - LINE webhook event
 */
export async function handleLeaveRequestMenu(event) {
  const userId = event.source.userId;

  try {
    // ตรวจสอบสถานะการส่งฟอร์มล่าสุด เพื่อป้องกันการส่งซ้ำ
    const lastSentTime = userLeaveFormStates.get(userId);
    const currentTime = Date.now();
    const cooldownPeriod = 5000; // 5 วินาที (ลดจาก 10 วินาที)
    
    if (lastSentTime && (currentTime - lastSentTime) < cooldownPeriod) {
      const remainingTimeMs = cooldownPeriod - (currentTime - lastSentTime);
      const remainingSeconds = Math.ceil(remainingTimeMs / 1000); // แปลงเป็นวินาที
      console.log(`🚫 Leave form cooldown active for user ${userId}, remaining: ${remainingSeconds} seconds`);
      
      // ส่งข้อความ cooldown เฉพาะเมื่อเหลือเวลามากกว่า 2 วินาที
      if (remainingSeconds > 2) {
        await replyLineMessage(event.replyToken, {
          type: 'text',
          text: `⏰ กรุณารออีก ${remainingSeconds} วินาที ก่อนขอฟอร์มแจ้งลาใหม่`
        });
      }
      return;
    }

    // ดึงข้อมูลนักเรียนจาก LINE ID
    const studentData = await getStudentByLineId(userId);

    if (!studentData) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่พบข้อมูลนักเรียน กรุณาผูกบัญชีใหม่อีกครั้ง'
      });
      return;
    }

    // บันทึกเวลาที่ส่งฟอร์ม
    userLeaveFormStates.set(userId, currentTime);
    console.log(`📝 Leave form sent to user ${userId} at ${new Date(currentTime).toISOString()}`);

    const formUrl = `${config.liffAppUrl}/leave-form?studentId=${studentData.student.student_id}&studentName=${encodeURIComponent(studentData.student.student_name)}&grade=${encodeURIComponent(studentData.student.grade || 'ไม่ระบุ')}`;

    // สร้าง Flex Message สำหรับฟอร์มแจ้งลา
    const flexMessage = createLeaveRequestBubble(studentData, formUrl);

    // ใช้ reply message เพื่อตอบสนองการกดเมนูเท่านั้น
    await replyLineMessage(event.replyToken, flexMessage);

  } catch (error) {
    console.error('Error handling leave request menu:', error);
    // ใช้ reply message เพื่อตอบสนองการกดเมนูเท่านั้น
    if (event.replyToken) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในการเปิดฟอร์มแจ้งลาหยุด กรุณาลองใหม่อีกครั้ง'
      });
    }
  }
}

/**
 * จัดการเมนูแจ้งลาหยุด (Push message version)
 * @param {string} userId - LINE User ID
 */
export async function handleLeaveRequestMenuPush(userId) {
  console.log(`📝 handleLeaveRequestMenuPush called for user: ${userId}`);

  try {
    // ตรวจสอบสถานะการส่งฟอร์มล่าสุด เพื่อป้องกันการส่งซ้ำ
    const lastSentTime = userLeaveFormStates.get(userId);
    const currentTime = Date.now();
    const cooldownPeriod = 5000; // 5 วินาที (ลดจาก 10 วินาที)
    
    if (lastSentTime && (currentTime - lastSentTime) < cooldownPeriod) {
      const remainingTimeMs = cooldownPeriod - (currentTime - lastSentTime);
      const remainingSeconds = Math.ceil(remainingTimeMs / 1000); // แปลงเป็นวินาที
      console.log(`🚫 Leave form cooldown active for user ${userId}, remaining: ${remainingSeconds} seconds`);
      
      // ส่งข้อความ cooldown เฉพาะเมื่อเหลือเวลามากกว่า 2 วินาที
      if (remainingSeconds > 2) {
        await sendLineMessage(userId, {
          type: 'text',
          text: `⏰ กรุณารออีก ${remainingSeconds} วินาที ก่อนขอฟอร์มแจ้งลาใหม่`
        });
      }
      return;
    }

    // ตรวจสอบการผูกบัญชี
    const { linked, student } = await checkLinkStatus(userId);
    if (!linked || !student) {
      await sendLineMessage(userId, {
        type: 'text',
        text: 'กรุณาผูกบัญชีก่อนใช้งาน\nโดยพิมพ์รหัสนักเรียน 6 หลัก'
      });
      return;
    }

    // ดึงข้อมูลนักเรียน
    const studentData = await getStudentByLineId(userId);
    if (!studentData || !studentData.student) {
      await sendLineMessage(userId, {
        type: 'text',
        text: 'ไม่พบข้อมูลนักเรียน กรุณาติดต่อเจ้าหน้าที่'
      });
      return;
    }

    // บันทึกเวลาที่ส่งฟอร์ม
    userLeaveFormStates.set(userId, currentTime);
    console.log(`📝 Leave form sent to user ${userId} at ${new Date(currentTime).toISOString()}`);

    const leaveText = `แจ้งลาหยุด\n\n` +
      `กรุณากดลิงก์ด้านล่างเพื่อเข้าสู่ฟอร์มแจ้งลาหยุด\n\n` +
      `ระบบจะดึงข้อมูลชื่อและรหัสนักเรียนอัตโนมัติ\n` +
      `สามารถเลือกวันที่ลาได้สูงสุด 3 วัน\n\n` +
      `📋 ข้อมูลนักเรียน:\n` +
      `ชื่อ: ${studentData.student.student_name}\n` +
      `รหัส: ${studentData.student.student_id}\n` +
      `ชั้น: ${studentData.student.grade || 'ไม่ระบุ'}\n\n` +
      `🔗 เปิดฟอร์มแจ้งลาหยุด:\n` +
      `${config.liffAppUrl}/leave-form?studentId=${studentData.student.student_id}&studentName=${encodeURIComponent(studentData.student.student_name)}&grade=${encodeURIComponent(studentData.student.grade || 'ไม่ระบุ')}`;

    await sendLineMessage(userId, {
      type: 'text',
      text: leaveText
    });

  } catch (error) {
    console.error('Error handling leave request menu push:', error);
    await sendLineMessage(userId, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการเปิดฟอร์มแจ้งลาหยุด กรุณาลองใหม่อีกครั้ง'
    });
  }
}

/**
 * จัดการคำขอตำแหน่งรถ
 * @param {Object} event - LINE webhook event
 */
export async function handleBusLocationRequest(event) {
  const userId = event.source.userId;
  
  // ตรวจสอบการผูกบัญชี
  const { linked, student } = await checkLinkStatus(userId);
  
  if (!linked) {
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'กรุณาผูกบัญชีก่อนใช้งาน\nโดยพิมพ์รหัสนักเรียน 6 หลัก'
    });
    return;
  }

  // สร้าง URL สำหรับหน้าแผนที่ตำแหน่งรถ
  const baseUrl = config.liffAppUrl;
  const mapUrl = `${baseUrl}/bus-location.html`;

  await replyLineMessage(event.replyToken, {
    type: 'template',
    altText: '🚌 ตำแหน่งรถบัส - ดูแผนที่เรียลไทม์',
    template: {
      type: 'buttons',
      thumbnailImageUrl: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj2gcdtwqdBqnqddViqekDMhnpWWWowbpSiM7ambAAprlMIEE1R6bisb6Ld8ZWvRdsvq5xFv9y1pxpKsG0K3soAqvr_w2E6uZmfvSZ-nNu7daAixhcSbk2TDhyphenhyphen3LuYrC5Awra1_at7xnkCH/s1600/map.png',
      imageAspectRatio: 'rectangle',
      imageSize: 'cover',
      title: '🚌 ตำแหน่งรถบัส',
      text: 'ติดตามตำแหน่งรถโดยสารแบบเรียลไทม์\nดูเส้นทางและสถานะการเดินทาง',
      actions: [
        {
          type: 'uri',
          label: 'ดูแผนที่',
          uri: mapUrl
        }
      ]
    }
  });
}

/**
 * จัดการคำขอตำแหน่งรถ (Push message version)
 * @param {string} userId - LINE User ID
 */
export async function handleBusLocationRequestPush(userId) {
  // ตรวจสอบการผูกบัญชี
  const { linked, student } = await checkLinkStatus(userId);
  
  if (!linked) {
    await sendLineMessage(userId, [{
      type: 'text',
      text: 'กรุณาผูกบัญชีก่อนใช้งาน\nโดยพิมพ์รหัสนักเรียน 6 หลัก'
    }]);
    return;
  }

  // สร้าง URL สำหรับหน้าแผนที่ตำแหน่งรถ
  const baseUrl = config.liffAppUrl;
  const mapUrl = `${baseUrl}/bus-location.html`;

  await sendLineMessage(userId, [{
    type: 'template',
    altText: '🚌 ตำแหน่งรถบัส - ดูแผนที่เรียลไทม์',
    template: {
      type: 'buttons',
      thumbnailImageUrl: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEj2gcdtwqdBqnqddViqekDMhnpWWWowbpSiM7ambAAprlMIEE1R6bisb6Ld8ZWvRdsvq5xFv9y1pxpKsG0K3soAqvr_w2E6uZmfvSZ-nNu7daAixhcSbk2TDhyphenhyphen3LuYrC5Awra1_at7xnkCH/s1600/map.png',
      imageAspectRatio: 'rectangle',
      imageSize: 'cover',
      title: '🚌 ตำแหน่งรถบัส',
      text: 'ติดตามตำแหน่งรถโดยสารแบบเรียลไทม์\nดูเส้นทางและสถานะการเดินทาง',
      actions: [
        {
          type: 'uri',
          label: 'ดูแผนที่',
          uri: mapUrl
        },
        {
          type: 'postback',
          label: '🔄 รีเฟรช',
          data: 'action=location'
        }
      ]
    }
  }]);
}

/**
 * จัดการคำขอติดต่อคนขับ
 * @param {Object} event - LINE webhook event
 */
export async function handleContactDriverRequest(event) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;
  
  try {
    console.log('🔍 [DEBUG] handleContactDriverRequest called for userId:', userId);
    
    // ตรวจสอบ replyToken ก่อน
    if (!replyToken) {
      console.error('❌ No reply token provided');
      return;
    }
    
    console.log('📞 [INFO] Fetching driver ID 1 with route information');
    
    // ดึงข้อมูลคนขับพร้อมข้อมูลเส้นทาง
    const { data: driverData, error: driverError } = await supabase
      .from('driver_bus')
      .select(`
        driver_id,
        driver_name,
        phone_number,
        license_plate,
        route_id,
        routes (
          route_name,
          start_point
        )
      `)
      .eq('driver_id', 1)
      .single();
    
    console.log('🔍 [DEBUG] Driver query result:', { driverData, driverError });
    
    // ถ้าไม่พบข้อมูลคนขับ
    if (driverError || !driverData) {
      console.log('❌ [DEBUG] No driver data found, sending fallback message');
      await replyLineMessage(replyToken, {
        type: 'text',
        text: '📞 ติดต่อคนขับรถ\n\n⚠️ ไม่พบข้อมูลคนขับในระบบ\nกรุณาติดต่อโรงเรียนโดยตรง\n\n📞 โทร: 043-754-321\n⏰ เวลาทำการ: 08:00 - 16:30 น.'
      });
      return;
    }
    
    // เตรียมข้อมูลสำหรับ template
    const contactData = {
      driver_name: driverData.driver_name || 'คนขับรถโรงเรียน',
      phone_number: driverData.phone_number || '043-754-321',
      license_plate: driverData.license_plate || 'ไม่ระบุ',
      start_point: driverData.routes?.start_point || 'ไม่ระบุ'
    };
    
    console.log('🔍 [DEBUG] Contact data prepared:', contactData);
    
    // สร้าง Flex Message
    const flexMessage = createContactDriverBubble(contactData);
    
    // ส่ง Flex Message
    await replyLineMessage(replyToken, flexMessage);
    console.log('✅ [DEBUG] Contact driver Flex Message sent successfully');

  } catch (error) {
    console.error('❌ Error in handleContactDriverRequest:', error);
    
    // ส่งข้อความ error แบบง่าย
    try {
      if (replyToken) {
        await replyLineMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลคนขับ\n\nกรุณาติดต่อโรงเรียนโดยตรง:\n📞 043-754-321\n\nขออภัยในความไม่สะดวก 🙏'
        });
      }
    } catch (replyError) {
      console.error('❌ Failed to send error message:', replyError);
    }
  }
}

/**
 * จัดการคำขอติดต่อคนขับ (Push message version)
 * @param {string} userId - LINE User ID
 */
export async function handleContactDriverRequestPush(userId) {
  try {
    // ดึงข้อมูลคนขับ ID 1 พร้อมข้อมูลเส้นทาง
    const { data: driverData, error } = await supabase
      .from('driver_bus')
      .select(`
        driver_id,
        driver_name,
        phone_number,
        license_plate,
        route_id,
        routes!inner(start_point)
      `)
      .eq('driver_id', 1)
      .single();

    if (error || !driverData) {
      console.error('Error fetching driver data:', error);
      await sendLineMessage(userId, [{
        type: 'text',
        text: '❌ ไม่สามารถดึงข้อมูลคนขับได้ในขณะนี้\nกรุณาลองใหม่อีกครั้ง'
      }]);
      return;
    }

    // สร้าง Flex Message สำหรับข้อมูลคนขับ
    const flexMessage = createContactDriverBubble({
      driverName: driverData.driver_name,
      phoneNumber: driverData.phone_number,
      licensePlate: driverData.license_plate,
      address: driverData.routes?.start_point || 'ไม่ระบุ',
      workingHours: '06:00 - 17:00 น.'
    });

    await sendLineMessage(userId, [flexMessage]);

  } catch (error) {
    console.error('Error in handleContactDriverRequestPush:', error);
    await sendLineMessage(userId, [{
      type: 'text',
      text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลคนขับ\nกรุณาลองใหม่อีกครั้ง'
    }]);
  }
}

/**
 * จัดการการตรวจสอบรหัสเชื่อมโยง
 * @param {Object} event - LINE webhook event
 * @param {string} linkCode - รหัสเชื่อมโยงที่ผู้ใช้ส่งมา
 */
export async function handleLinkCodeVerification(event, linkCode) {
  const userId = event.source.userId;
  const replyToken = event.replyToken;

  console.log(`🔗 Link code verification: ${linkCode} from user: ${userId}`);

  try {
    // ตรวจสอบว่าผู้ใช้ได้เชื่อมโยงบัญชีแล้วหรือไม่
    const { linked } = await checkLinkStatus(userId);
    
    if (linked) {
      await replyLineMessage(replyToken, {
        type: 'text',
        text: '❌ บัญชีของคุณได้เชื่อมโยงแล้ว\nไม่สามารถใช้รหัสเชื่อมโยงใหม่ได้'
      });
      return;
    }

    // เรียก API ตรวจสอบรหัสเชื่อมโยง
    const verifyResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/verify-link-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        linkCode: linkCode,
        lineUserId: userId
      })
    });

    const result = await verifyResponse.json();

    if (result.success) {
      // เชื่อมโยงสำเร็จ
      const userTypeText = result.userType === 'student' ? 'นักเรียน' : 'ผู้ปกครอง';
      
      await replyLineMessage(replyToken, [
        {
          type: 'text',
          text: `✅ เชื่อมโยง LINE ID สำเร็จ!\n\n👤 ชื่อ: ${result.userData.name}\n🆔 รหัส: ${result.userData.id}\n📋 ประเภท: ${userTypeText}\n\n🎉 ยินดีต้อนรับสู่ระบบ Safety Bus!`
        },
        {
          type: 'text',
          text: '🚌 ตอนนี้คุณสามารถใช้งานระบบได้แล้ว\n\n📱 ใช้เมนูด้านล่างเพื่อ:\n• ดูตำแหน่งรถบัส\n• แจ้งลาหยุด\n• ดูประวัติการเดินทาง\n• ติดต่อคนขับรถ'
        }
      ]);

      // ส่งเมนูหลัก
      await sendMainMenu(userId);

    } else {
      // เชื่อมโยงไม่สำเร็จ
      let errorMessage = '❌ ไม่สามารถเชื่อมโยง LINE ID ได้\n\n';
      
      if (result.message.includes('ไม่พบรหัสเชื่อมโยง')) {
        errorMessage += '🔍 ไม่พบรหัสเชื่อมโยงนี้ในระบบ\nกรุณาตรวจสอบรหัสอีกครั้ง';
      } else if (result.message.includes('หมดอายุ')) {
        errorMessage += '⏰ รหัสเชื่อมโยงหมดอายุแล้ว\nกรุณาขอรหัสใหม่จากคนขับรถ';
      } else if (result.message.includes('ถูกใช้งานแล้ว')) {
        errorMessage += '🔄 รหัสนี้ถูกใช้งานแล้ว\nกรุณาขอรหัสใหม่จากคนขับรถ';
      } else if (result.message.includes('ถูกเชื่อมโยงกับบัญชีอื่น')) {
        errorMessage += '👥 LINE ID นี้ถูกเชื่อมโยงกับบัญชีอื่นแล้ว\nกรุณาใช้ LINE ID อื่น';
      } else {
        errorMessage += result.message;
      }

      await replyLineMessage(replyToken, {
        type: 'text',
        text: errorMessage
      });
    }

  } catch (error) {
    console.error('Error in handleLinkCodeVerification:', error);
    
    await replyLineMessage(replyToken, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาดในการตรวจสอบรหัสเชื่อมโยง\nกรุณาลองใหม่อีกครั้งหรือติดต่อคนขับรถ'
    });
  }
}