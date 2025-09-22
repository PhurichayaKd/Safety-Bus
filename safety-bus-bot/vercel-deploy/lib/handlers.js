import { sendLineMessage, replyLineMessage } from './line.js';
import { supabase } from './db.js';
import { sendMainMenu } from './menu.js';
import { getStudentByLineId } from './student-data.js';

// Store user form states (in production, use Redis or database)
const userFormStates = new Map();

/**
 * จัดการข้อความที่ส่งมา
 * @param {Object} event - LINE webhook event
 */
export async function handleTextMessage(event) {
  const userId = event.source.userId;
  const text = event.message.text.trim();
  
  console.log(`📝 Text message from ${userId}: ${text}`);
  
  // ตรวจสอบการผูกบัญชีก่อน
  const isLinked = await checkAccountLinking(userId);
  
  // ตรวจสอบว่าเป็นรหัสนักเรียน 6 หลัก (สำหรับผูกบัญชี)
  if (/^[0-9]{6}$/.test(text)) {
    await handleStudentCodeLinking(event, text);
    return;
  }
  
  // หากยังไม่ผูกบัญชี ให้แนะนำการผูกบัญชี
  if (!isLinked) {
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `สวัสดีครับ! 👋\n\nยินดีต้อนรับสู่ระบบ Safety Bus\n\nเพื่อใช้งานระบบ กรุณาผูกบัญชีก่อน\nโดยพิมพ์รหัสนักเรียน 6 หลัก\n\nตัวอย่าง: 123456\n\n📝 หมายเหตุ: รหัสนักเรียนคือรหัส 6 หลักที่ใช้ในโรงเรียน`
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
  
  // ตรวจสอบคำสั่งติดต่อ
  if (text.includes('ติดต่อ') || text.includes('contact') || text.includes('โทร')) {
    await handleContactRequest(event);
    return;
  }
  
  // ตรวจสอบคำสั่งการลาหยุด
  if (text.includes('ลา') || text.includes('absence') || text.includes('ขาด')) {
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
  
  console.log(`🔄 Postback from ${userId}: ${data}`);
  console.log('📋 Full event data:', JSON.stringify(event, null, 2));
  
  // แยกประเภท action
  if (data.startsWith('action=')) {
    const action = data.split('=')[1];
    await handleMainAction(event, action);
  } else if (data.startsWith('leave_type=')) {
    const leaveType = data.split('=')[1];
    await handleLeaveRequest(event, leaveType);
  } else if (data.startsWith('confirm_leave=')) {
    const leaveId = data.split('=')[1];
    await handleLeaveConfirmation(event, leaveId);
  } else if (data.startsWith('leave_form_')) {
    await handleLeaveFormPostback(event, data);
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
  const isLinked = await checkAccountLinking(userId);
  
  if (isLinked) {
    // หากผูกบัญชีแล้ว ให้แสดงเมนูทันที
    const welcomeMessage = {
      type: 'text',
      text: `ยินดีต้อนรับกลับสู่ระบบ Safety Bus! 🚌\n\nระบบพร้อมให้บริการแล้ว\nกดเมนูด้านล่างเพื่อเริ่มใช้งาน`
    };
    
    await replyLineMessage(event.replyToken, welcomeMessage);
    await sendMainMenu(userId, null);
  } else {
    // หากยังไม่ผูกบัญชี ให้แนะนำการผูกบัญชี
    const welcomeMessage = {
      type: 'text',
      text: `ยินดีต้อนรับสู่ระบบ Safety Bus! 🚌\n\nเพื่อใช้งานระบบ กรุณาผูกบัญชีก่อน\nโดยพิมพ์รหัสนักเรียน 6 หลัก\n\nตัวอย่าง: 123456\n\n📝 หมายเหตุ: รหัสนักเรียนคือรหัส 6 หลักที่ใช้ในโรงเรียน\n\nระบบจะช่วยคุณ:\n• แจ้งลาหยุดเรียน\n• ตรวจสอบประวัติการเดินทาง\n• ดูตำแหน่งรถบัส\n• ติดต่อคนขับรถ`
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
  
  console.log(`🎯 Main action called: ${action} for user: ${userId}`);
  
  // ตรวจสอบการผูกบัญชีก่อนใช้งานเมนู
  const isLinked = await checkAccountLinking(userId);
  console.log(`🔗 Account linking status: ${isLinked}`);
  if (!isLinked) {
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'กรุณาผูกบัญชีก่อนใช้งาน\nโดยพิมพ์รหัสนักเรียน 6 หลัก'
    });
    return;
  }
  
  switch (action) {
    case 'history':
    case 'student_history':
      await handleStudentHistoryRequest(event);
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
      await sendMainMenu(event.source.userId, event.replyToken);
      break;
    default:
      await sendMainMenu(event.source.userId, event.replyToken);
  }
}

/**
 * จัดการคำขอประวัติ
 * @param {Object} event - LINE webhook event
 */
export async function handleHistoryRequest(event) {
  const userId = event.source.userId;
  
  try {
    const studentData = await getStudentByLineId(userId);
    
    if (!studentData) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาผูกบัญชีก่อนดูประวัติ\nส่งรหัสนักเรียนเพื่อเริ่มต้น'
      });
      return;
    }
    
    // ดึงประวัติการเดินทาง 7 วันล่าสุด
    const { data: history, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('student_id', studentData.student.student_id)
      .order('travel_date', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (!history || history.length === 0) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่พบประวัติการเดินทาง'
      });
      return;
    }
    
    let historyText = `📊 ประวัติการเดินทาง\n${studentData.student.student_name}\n\n`;
    
    history.forEach((record, index) => {
      const date = new Date(record.travel_date).toLocaleDateString('th-TH');
      historyText += `${index + 1}. ${date}\n`;
      historyText += `   🚌 ${record.pickup_time || 'N/A'} - ${record.dropoff_time || 'N/A'}\n`;
      historyText += `   📍 ${record.status || 'N/A'}\n\n`;
    });
    
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: historyText
    });
    
  } catch (error) {
    console.error('Error handling history request:', error);
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการดึงประวัติ กรุณาลองใหม่อีกครั้ง'
    });
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
 * จัดการคำขอติดต่อ
 * @param {Object} event - LINE webhook event
 */
export async function handleContactRequest(event) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '📞 ติดต่อคนขับรถ\n\nโทร: 02-XXX-XXXX\nหรือติดต่อผ่านโรงเรียนโดยตรง\n\nเวลาทำการ: 07:00 - 17:00 น.'
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
    // ตรวจสอบโทเคนในฐานข้อมูล
    const { data: linkData, error } = await supabase
      .from('link_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();
    
    if (error || !linkData) {
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
    const { error: linkError } = await supabase
      .from('parent_line_links')
      .insert({
        line_user_id: userId,
        parent_id: linkData.parent_id,
        active: true,
        linked_at: new Date().toISOString()
      });
    
    if (linkError) {
      throw linkError;
    }
    
    // ทำเครื่องหมายโทเคนว่าใช้แล้ว
    await supabase
      .from('link_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', token);
    
    // ดึงข้อมูลนักเรียน
    const studentData = await getStudentByLineId(userId);
    
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `✅ ผูกบัญชีสำเร็จ!\n\nนักเรียน: ${studentData?.student?.student_name || 'N/A'}\nชั้น: ${studentData?.student?.class || 'N/A'}\n\nสามารถใช้งานระบบได้แล้ว\nพิมพ์ "เมนู" เพื่อเริ่มต้น`
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
    
    // ตรวจสอบในตาราง student_line_links
    const { data: studentLink, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('line_user_id', userId)
      .single();
    
    console.log('👨‍🎓 Student link result:', { studentLink, studentError });
    
    if (studentLink) return true;
    
    // ตรวจสอบในตาราง parent_line_links
    const { data: parentLink, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('line_user_id', userId)
      .single();
    
    console.log('👨‍👩‍👧‍👦 Parent link result:', { parentLink, parentError });
    
    return !!parentLink;
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
    // ตรวจสอบว่าผูกบัญชีแล้วหรือไม่
    const isLinked = await checkAccountLinking(userId);
    if (isLinked) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'บัญชีของคุณผูกไว้แล้ว\nสามารถใช้งานเมนูได้ทันที'
      });
      await sendMainMenu(userId, null);
      return;
    }
    
    // ค้นหานักเรียนจากรหัส link_code
    const { data: student, error } = await supabase
      .from('students')
      .select('student_id, student_name, grade, parent_id, student_line_id, parent_line_id')
      .eq('link_code', studentCode)
      .single();
    
    if (error || !student) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่พบรหัสนักเรียนในระบบ\nกรุณาตรวจสอบรหัส 6 หลักและลองใหม่อีกครั้ง'
      });
      return;
    }
    
    // ตรวจสอบว่า LINE ID ตรงกับนักเรียนหรือผู้ปกครอง
    let linkType = null;
    let linkTable = null;
    
    if (student.student_line_id === userId) {
      linkType = 'student';
      linkTable = 'student_line_links';
    } else if (student.parent_line_id === userId) {
      linkType = 'parent';
      linkTable = 'parent_line_links';
    } else {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'LINE ID ของคุณไม่ตรงกับข้อมูลในระบบ\nกรุณาติดต่อโรงเรียนเพื่อตรวจสอบข้อมูล'
      });
      return;
    }
    
    // บันทึกการผูกบัญชี
    const linkData = {
      line_user_id: userId,
      student_id: student.student_id,
      linked_at: new Date().toISOString()
    };
    
    const { error: linkError } = await supabase
      .from(linkTable)
      .insert(linkData);
    
    if (linkError) {
      console.error('Error linking account:', linkError);
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในการผูกบัญชี กรุณาลองใหม่อีกครั้ง'
      });
      return;
    }
    
    // ส่งข้อความยืนยันการผูกบัญชีสำเร็จ
    const roleText = linkType === 'student' ? 'นักเรียน' : 'ผู้ปกครอง';
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `✅ ผูกบัญชีสำเร็จ!\n\nสวัสดี ${student.student_name}\nสถานะ: ${roleText}\nชั้น: ${student.grade}\n\n🚌 ระบบ Safety Bus พร้อมให้บริการ\n\nบริการที่มี:\n• ดูประวัตินักเรียน\n• แจ้งลาหยุด\n• ตรวจสอบตำแหน่งรถ\n• ติดต่อคนขับ\n\nกดเมนูด้านล่างเพื่อเริ่มใช้งาน`
    });
    
    // ส่งเมนูหลัก
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
 * จัดการคำขอลาหยุด
 * @param {Object} event - LINE webhook event
 * @param {string} leaveType - ประเภทการลา
 */
export async function handleLeaveRequest(event, leaveType) {
  const userId = event.source.userId;
  
  try {
    const studentData = await getStudentByLineId(userId);
    
    if (!studentData) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาผูกบัญชีก่อนแจ้งลาหยุด\nส่งรหัสนักเรียนเพื่อเริ่มต้น'
      });
      return;
    }
    
    // เก็บสถานะฟอร์มการลา
    userFormStates.set(userId, {
      type: 'leave_form',
      leaveType: leaveType,
      studentId: studentData.student.student_id,
      step: 'reason'
    });
    
    const leaveTypeText = {
      'sick': '🤒 ลาป่วย',
      'personal': '📚 ลากิจ',
      'absent': '🏠 ขาดเรียน'
    };
    
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `${leaveTypeText[leaveType] || 'การลา'}\n\nกรุณาระบุเหตุผลการลา:`
    });
    
  } catch (error) {
    console.error('Error handling leave request:', error);
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการแจ้งลาหยุด กรุณาลองใหม่อีกครั้ง'
    });
  }
}

/**
 * ประมวลผลข้อมูลการลา
 * @param {Object} event - LINE webhook event
 * @returns {boolean} true ถ้าเป็นข้อมูลการลา
 */
export async function processAbsenceData(event) {
  const userId = event.source.userId;
  const text = event.message.text;
  
  const formState = userFormStates.get(userId);
  
  if (!formState || formState.type !== 'leave_form') {
    return false;
  }
  
  try {
    if (formState.step === 'reason') {
      // บันทึกเหตุผลและขอวันที่
      formState.reason = text;
      formState.step = 'date';
      userFormStates.set(userId, formState);
      
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาระบุวันที่ลา (รูปแบบ: DD/MM/YYYY)\nเช่น: 25/12/2024'
      });
      
      return true;
    } else if (formState.step === 'date') {
      // ตรวจสอบรูปแบบวันที่
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = text.match(dateRegex);
      
      if (!match) {
        await replyLineMessage(event.replyToken, {
          type: 'text',
          text: 'รูปแบบวันที่ไม่ถูกต้อง\nกรุณาระบุในรูปแบบ DD/MM/YYYY\nเช่น: 25/12/2024'
        });
        return true;
      }
      
      const [, day, month, year] = match;
      const leaveDate = new Date(year, month - 1, day);
      
      // บันทึกข้อมูลการลา
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          student_id: formState.studentId,
          leave_type: formState.leaveType,
          leave_date: leaveDate.toISOString().split('T')[0],
          reason: formState.reason,
          status: 'approved',
          created_at: new Date().toISOString()
        });
      
      if (error) {
        throw error;
      }
      
      // ลบสถานะฟอร์ม
      userFormStates.delete(userId);
      
      const leaveTypeText = {
        'sick': '🤒 ลาป่วย',
        'personal': '📚 ลากิจ',
        'absent': '🏠 ขาดเรียน'
      };
      
      // ดึงข้อมูลนักเรียนเพื่อแสดงในข้อความยืนยัน
      const studentData = await getStudentByLineId(userId);
      const submitTimeStr = new Date().toLocaleString('th-TH');
      
      // ส่งข้อความยืนยันการลา
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: `✅ บันทึกการลาเรียบร้อยแล้ว\n\n${leaveTypeText[formState.leaveType]}\nวันที่: ${day}/${month}/${year}\nเหตุผล: ${formState.reason}\n\nสถานะ: บันทึกแล้ว`
      });
      
      return true;
    }
  } catch (error) {
    console.error('Error processing absence data:', error);
    userFormStates.delete(userId);
    
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง'
    });
  }
  
  return false;
}

// Placeholder functions for driver-related features
export async function handleDriverStudentInfo(event) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '📊 ข้อมูลนักเรียน\n\nฟีเจอร์นี้อยู่ระหว่างการพัฒนา'
  });
}

export async function handleChangeStudent(event) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '🔄 เปลี่ยนนักเรียน\n\nฟีเจอร์นี้อยู่ระหว่างการพัฒนา'
  });
}

export async function handleLeaveFormPostback(event, data) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: 'ฟีเจอร์นี้อยู่ระหว่างการพัฒนา'
  });
}

export async function handleLeaveConfirmation(event, leaveId) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: 'ฟีเจอร์นี้อยู่ระหว่างการพัฒนา'
  });
}

/**
 * จัดการคำขอประวัตินักเรียน
 * @param {Object} event - LINE webhook event
 */
export async function handleStudentHistoryRequest(event) {
  const userId = event.source.userId;
  
  try {
    // ดึงข้อมูลนักเรียนจาก LINE ID
    const studentData = await getStudentByLineId(userId);
    
    if (!studentData) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่พบข้อมูลนักเรียน กรุณาผูกบัญชีใหม่อีกครั้ง'
      });
      return;
    }
    
    // ดึงข้อมูลเพิ่มเติมจากตาราง students
    const { data: fullStudentData, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        rfid_card,
        parent_id,
        service_start_date,
        service_end_date,
        parents!inner(parent_name)
      `)
      .eq('student_id', studentData.student_id)
      .single();
    
    if (studentError) {
      console.error('Error fetching full student data:', studentError);
    }
    
    // ดึงข้อมูลประวัติการเดินทางจากฐานข้อมูล
    const { data: historyData, error } = await supabase
      .from('travel_history')
      .select('*')
      .eq('student_id', studentData.student_id)
      .order('travel_date', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Error fetching travel history:', error);
    }
    
    // สร้างข้อความแสดงข้อมูลประวัติ
    let historyText = `📊 ประวัตินักเรียน\n\n`;
    
    // ข้อมูลพื้นฐาน
    historyText += `👤 ชื่อ: ${fullStudentData?.student_name || studentData.student_name}\n`;
    historyText += `🆔 รหัสนักเรียน: ${fullStudentData?.student_id || studentData.student_id}\n`;
    historyText += `💳 รหัสบัตร RFID: ${fullStudentData?.rfid_card || 'ไม่ระบุ'}\n`;
    historyText += `📚 ชั้น: ${fullStudentData?.grade || studentData.grade || 'ไม่ระบุ'}\n`;
    historyText += `👨‍👩‍👧‍👦 ผู้ปกครอง: ${fullStudentData?.parents?.parent_name || 'ไม่ระบุ'}\n\n`;
    
    // วันที่ใช้บริการ
    if (fullStudentData?.service_start_date || fullStudentData?.service_end_date) {
      historyText += `📅 ระยะเวลาใช้บริการ:\n`;
      if (fullStudentData.service_start_date) {
        const startDate = new Date(fullStudentData.service_start_date).toLocaleDateString('th-TH');
        historyText += `เริ่มต้น: ${startDate}\n`;
      }
      if (fullStudentData.service_end_date) {
        const endDate = new Date(fullStudentData.service_end_date).toLocaleDateString('th-TH');
        historyText += `สิ้นสุด: ${endDate}\n`;
      } else {
        historyText += `สิ้นสุด: ยังไม่กำหนด\n`;
      }
      historyText += `\n`;
    }
    
    // ประวัติการเดินทาง
    if (historyData && historyData.length > 0) {
      historyText += `🚌 ประวัติการเดินทาง (5 ครั้งล่าสุด):\n`;
      historyData.forEach((record, index) => {
        const date = new Date(record.travel_date).toLocaleDateString('th-TH');
        const time = new Date(record.travel_date).toLocaleTimeString('th-TH', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        historyText += `${index + 1}. ${date} ${time} - ${record.status || 'ปกติ'}\n`;
      });
    } else {
      historyText += `🚌 ยังไม่มีประวัติการเดินทาง`;
    }
    
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: historyText
    });
    
  } catch (error) {
    console.error('Error handling student history request:', error);
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ กรุณาลองใหม่อีกครั้ง'
    });
  }
}

/**
 * จัดการเมนูแจ้งลาหยุด
 * @param {Object} event - LINE webhook event
 */
export async function handleLeaveRequestMenu(event) {
  const userId = event.source.userId;
  
  try {
    // ดึงข้อมูลนักเรียนจาก LINE ID
    const studentData = await getStudentByLineId(userId);
    
    if (!studentData) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'ไม่พบข้อมูลนักเรียน กรุณาผูกบัญชีใหม่อีกครั้ง'
      });
      return;
    }
    
    const leaveText = `📝 แจ้งลาหยุด\n\n` +
      `กรุณากดลิงก์ด้านล่างเพื่อเข้าสู่ฟอร์มแจ้งลาหยุด\n\n` +
      `ระบบจะดึงข้อมูลชื่อและรหัสนักเรียนอัตโนมัติ\n` +
      `สามารถเลือกวันที่ลาได้สูงสุด 3 วัน\n\n` +
      `📋 ข้อมูลนักเรียน:\n` +
      `ชื่อ: ${studentData.student_name}\n` +
      `รหัส: ${studentData.student_id}\n\n` +
      `🔗 เปิดฟอร์มแจ้งลาหยุด:\n` +
      `https://safety-bus-liff-v4-new.vercel.app/?studentId=${studentData.student_id}&studentName=${encodeURIComponent(studentData.student_name)}`;
    
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: leaveText
    });
    
  } catch (error) {
    console.error('Error handling leave request menu:', error);
    await replyLineMessage(event.replyToken, {
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
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '🚌 ตำแหน่งรถบัส\n\n⚠️ ฟีเจอร์นี้อยู่ระหว่างการพัฒนา\nจะเปิดให้บริการในเร็วๆ นี้\n\nขออภัยในความไม่สะดวก 🙏'
  });
}

/**
 * จัดการคำขอติดต่อคนขับ
 * @param {Object} event - LINE webhook event
 */
export async function handleContactDriverRequest(event) {
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '📞 ติดต่อคนขับรถ\n\n⚠️ ฟีเจอร์นี้อยู่ระหว่างการพัฒนา\nจะเปิดให้บริการในเร็วๆ นี้\n\nขออภัยในความไม่สะดวก 🙏'
  });
}

export { userFormStates };