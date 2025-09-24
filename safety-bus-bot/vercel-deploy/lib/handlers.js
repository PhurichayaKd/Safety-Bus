import { sendLineMessage, replyLineMessage } from './line.js';
import { supabase } from './db.js';
import { sendMainMenu } from './menu.js';
import { getStudentByLineId } from './student-data.js';
import { config } from './config.js';

// Store user form states (in production, use Redis or database)
const userFormStates = new Map();
// Store user leave form sending states to prevent duplicate sends
const userLeaveFormStates = new Map();
export { userFormStates, userLeaveFormStates };

/**
 * ตรวจสอบสถานะการผูกบัญชีและดึงข้อมูลนักเรียน
 * @param {string} userId
 * @returns {Promise<{linked: boolean, type: string|null, student: object|null}>}
 */
export async function checkLinkStatus(userId) {
  try {
    const studentData = await getStudentByLineId(userId);
    
    if (studentData && studentData.student) {
      return { 
        linked: true, 
        type: studentData.type, 
        student: studentData.student 
      };
    }
    
    return { linked: false, type: null, student: null };
  } catch (error) {
    console.error('Error in checkLinkStatus:', error);
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
  // เพิ่ม log


  // ตรวจสอบการผูกบัญชี: ถ้ามี line_user_id ใน student_line_links หรือ parent_line_links แล้ว ให้ถือว่าผูกบัญชีแล้ว
  let isLinked = false;
  let { data: studentLink } = await supabase
    .from('student_line_links')
    .select('student_id')
    .eq('line_user_id', userId)
    .single();
  if (studentLink && studentLink.student_id) {
    isLinked = true;
  } else {
    let { data: parentLink } = await supabase
      .from('parent_line_links')
      .select('student_id')
      .eq('line_user_id', userId)
      .single();
    if (parentLink && parentLink.student_id) {
      isLinked = true;
    }
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
    await handleContactRequest(event);
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
    console.error('Error in handlePostback:', err);
    if (event.replyToken) {
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในการประมวลผลเมนู กรุณาลองใหม่'
      });
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
      text: `✅ ผูกบัญชีสำเร็จแล้ว\n\nสวัสดี${roleText === 'ผู้ปกครอง' ? 'ครับ คุณ' : 'ครับ น้อง'}${nameText}\nสถานะ: ${roleText}\n\nคุณสามารถใช้เมนูด้านล่างเพื่อ:\n• ดูประวัตินักเรียน\n• แจ้งลาหยุด\n• ตรวจสอบตำแหน่งรถ\n• ติดต่อคนขับ\n\nหากต้องการเปลี่ยนบัญชี กรุณาติดต่อโรงเรียน`
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
    const { linked, type, student } = await checkLinkStatus(userId);
    console.log(`🔗 Account linking status: ${linked}, type: ${type}`);
    if (!linked) {
      if (replyToken) {
        await replyLineMessage(replyToken, {
          type: 'text',
          text: 'กรุณาผูกบัญชีก่อนใช้งาน\nโดยพิมพ์รหัสนักเรียน 6 หลัก'
        });
      }
      return;
    }
    // Track if reply token has been used
    let replyTokenUsed = false;

    // แสดงสิทธิ์การใช้งาน/ข้อความพิเศษตามประเภท
    if (action === 'main_menu') {
      let roleText = type === 'parent' ? 'ผู้ปกครอง' : 'นักเรียน';
      let nameText = student ? student.student_name : '';
      if (replyToken) {
        await replyLineMessage(replyToken, {
          type: 'text',
          text: `✅ ผูกบัญชีสำเร็จแล้ว\n\nสวัสดี${roleText === 'ผู้ปกครอง' ? 'ครับ คุณ' : 'ครับ น้อง'}${nameText}\nสถานะ: ${roleText}\n\nคุณสามารถใช้เมนูด้านล่างเพื่อ:\n• ดูประวัตินักเรียน\n• แจ้งลาหยุด\n• ตรวจสอบตำแหน่งรถ\n• ติดต่อคนขับ\n\nหากต้องการเปลี่ยนบัญชี กรุณาติดต่อโรงเรียน`
        });
        replyTokenUsed = true;
      }
    }

    switch (action) {
      case 'history':
      case 'student_history':
        if (!replyTokenUsed) {
          await handleHistoryRequest(event);
        } else {
          // Use push message instead of reply
          await handleHistoryRequestPush(userId);
        }
        break;
      case 'leave':
      case 'leave_request':
        if (!replyTokenUsed) {
          await handleLeaveRequestMenu(event);
        }
        // ไม่ส่งข้อความเพิ่มเติมเมื่อ replyToken ถูกใช้แล้ว เพื่อป้องกันการส่งซ้ำ
        break;
      case 'location':
      case 'bus_location':
        if (!replyTokenUsed) {
          await handleBusLocationRequest(event);
        } else {
          await handleBusLocationRequestPush(userId);
        }
        break;
      case 'contact':
      case 'contact_driver':
        if (!replyTokenUsed) {
          await handleContactDriverRequest(event);
        } else {
          await handleContactDriverRequestPush(userId);
        }
        break;
      case 'main_menu':
        if (!replyTokenUsed) {
          // ส่งเมนูหลัก (บังคับส่ง replyToken)
          await safeSendMainMenu(userId, replyToken);
        }
        break;
      default:
        if (!replyTokenUsed) {
          // ส่งเมนูหลัก fallback
          await safeSendMainMenu(userId, replyToken);
        }
    }
  } catch (err) {
    console.error('Error in handleMainAction:', err);
    if (replyToken) {
      await replyLineMessage(replyToken, {
        type: 'text',
        text: 'เกิดข้อผิดพลาดในเมนู กรุณาลองใหม่'
      });
    }
  }
}

// ฟังก์ชันช่วย: ส่งเมนูหลัก ถ้าไม่มี replyToken ให้ push message
async function safeSendMainMenu(userId, replyToken) {
  try {
    if (replyToken) {
      await sendMainMenu(userId, replyToken);
    } else {
      // fallback กรณีไม่มี replyToken (เช่น push)
      await sendMainMenu(userId, null);
    }
  } catch (err) {
    console.error('Error in safeSendMainMenu:', err);
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
    let updateField = null;

    if (!student.student_line_id) {
      // ยังไม่มีการผูก LINE ID กับนักเรียน ให้ผูกให้เลย
      linkType = 'student';
      linkTable = 'student_line_links';
      updateField = 'student_line_id';
    } else if (!student.parent_line_id) {
      // ยังไม่มีการผูก LINE ID กับผู้ปกครอง ให้ผูกให้เลย
      linkType = 'parent';
      linkTable = 'parent_line_links';
      updateField = 'parent_line_id';
    } else if (student.student_line_id === userId) {
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

    // อัปเดต students.student_line_id ให้ตรงกับ userId ทุกครั้ง (กันข้อมูลไม่ sync)
    const { error: updateError } = await supabase
      .from('students')
      .update({ student_line_id: userId })
      .eq('student_id', student.student_id);
    if (updateError) {
      console.error('Error updating student_line_id:', updateError);
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
      // ถ้า duplicate ให้ข้าม
      if (linkError.code !== '23505') {
        console.error('Error linking account:', linkError);
        await replyLineMessage(event.replyToken, {
          type: 'text',
          text: 'เกิดข้อผิดพลาดในการผูกบัญชี กรุณาลองใหม่อีกครั้ง'
        });
        return;
      }
    }

    // ส่งข้อความยืนยันการผูกบัญชีสำเร็จ
    const roleText = linkType === 'student' ? 'นักเรียน' : 'ผู้ปกครอง';
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: `✅ ผูกบัญชีสำเร็จ!\n\nสวัสดี ${student.student_name}\nสถานะ: ${roleText}\nชั้น: ${student.grade}\n\n🚌 ระบบ Safety Bus พร้อมให้บริการ\n\nบริการที่มี:\n• ดูประวัตินักเรียน\n• แจ้งลาหยุด\n• ตรวจสอบตำแหน่งรถ\n• ติดต่อคนขับ\n\nกดเมนูด้านล่างเพื่อเริ่มใช้งาน`
    });


    // เพิ่ม delay 1 วินาทีเพื่อให้ Supabase sync ข้อมูลก่อนดึงประวัติ
    setTimeout(async () => {
      try {
        // ดึงข้อมูลนักเรียนจาก students table
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('student_id, student_name, grade, link_code, parent_id')
          .or(`student_line_id.eq.${userId},parent_line_id.eq.${userId}`)
          .single();

        if (!student || studentError) {
          await sendLineMessage(userId, [{ type: 'text', text: 'ไม่พบข้อมูลนักเรียน' }]);
        } else {
          let infoText = `👦 ข้อมูลนักเรียน\n`;
          infoText += `ชื่อ: ${student.student_name}\n`;
          infoText += `ชั้น: ${student.grade}\n`;
          infoText += `รหัสนักเรียน: ${student.link_code || '-'}\n`;

          // ดึงประวัติการเดินทาง 10 รายการล่าสุด
          const { data: history, error } = await supabase
            .from('travel_history')
            .select('*')
            .eq('student_id', student.student_id)
            .order('travel_date', { ascending: false })
            .limit(10);

          let historyText = '';
          if (!history || history.length === 0) {
            historyText = 'ไม่พบประวัติการเดินทาง';
          } else {
            historyText = '📊 ประวัติการเดินทางล่าสุด\n';
            history.forEach((record, index) => {
              const date = new Date(record.travel_date).toLocaleDateString('th-TH');
              historyText += `${index + 1}. ${date}\n`;
              historyText += `   🚌 ${record.pickup_time || 'N/A'} - ${record.dropoff_time || 'N/A'}\n`;
              historyText += `   📍 ${record.status || 'N/A'}\n`;
            });
          }

          await sendLineMessage(userId, [{ type: 'text', text: infoText + '\n' + historyText }]);
        }
      } catch (err) {
        console.error('Error sending student history after code linking:', err);
      }
    }, 1000);

    // ไม่ส่งเมนูเพิ่มเติม เพราะ Rich Menu จะแสดงอยู่แล้ว
    // await sendMainMenu(userId, null);

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
        link_code,
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
    
    // แสดงข้อมูลนักเรียน
    let infoText = `👦 ข้อมูลนักเรียน\n`;
    infoText += `ชื่อ: ${student.student_name}\n`;
    infoText += `รหัสนักเรียน: ${fullStudentData?.link_code || student.link_code || '-'}\n`;
    infoText += `รหัสบัตร RFID: ${rfidData?.rfid_cards?.rfid_code || '-'}\n`;
    infoText += `ชื่อผู้ปกครอง: ${fullStudentData?.parents?.parent_name || '-'}\n`;
    
    const startDate = fullStudentData?.start_date ? 
      new Date(fullStudentData.start_date).toLocaleDateString('th-TH') : '-';
    const endDate = fullStudentData?.end_date ? 
      new Date(fullStudentData.end_date).toLocaleDateString('th-TH') : '-';
    
    infoText += `วันที่เริ่มต้น-สิ้นสุดการใช้บริการรถรับส่ง: ${startDate} - ${endDate}\n`;
    
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

    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: infoText + historyText
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
        link_code,
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
    infoText += `ชื่อ: ${student.student_name}\n`;
    infoText += `รหัสนักเรียน: ${fullStudentData?.link_code || student.link_code || '-'}\n`;
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
    const cooldownPeriod = 60000; // 1 นาที (60 วินาที)
    
    if (lastSentTime && (currentTime - lastSentTime) < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (currentTime - lastSentTime)) / 60000); // แปลงเป็นนาที
      console.log(`🚫 Leave form cooldown active for user ${userId}, remaining: ${remainingTime} minutes`);
      await replyLineMessage(event.replyToken, {
        type: 'text',
        text: `⏰ กรุณารออีก ${remainingTime} นาที ก่อนขอฟอร์มแจ้งลาใหม่\n\nเพื่อป้องกันการส่งซ้ำและลดภาระระบบ`
      });
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

    const leaveText = `📝 แจ้งลาหยุด\n\n` +
      `📋 ข้อมูลนักเรียน:\n` +
      `ชื่อ: ${studentData.student.student_name}\n` +
      `รหัส: ${studentData.student.link_code}\n\n` +
      `🔗 เปิดฟอร์มแจ้งลาหยุด:\n` +
      `${config.liffAppUrl}/?studentId=${studentData.student.student_id}&studentName=${encodeURIComponent(studentData.student.student_name)}`;

    // ใช้ reply message เพื่อตอบสนองการกดเมนูเท่านั้น
    await replyLineMessage(event.replyToken, {
      type: 'text',
      text: leaveText
    });

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
    const cooldownPeriod = 60000; // 1 นาที (60 วินาที)
    
    if (lastSentTime && (currentTime - lastSentTime) < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (currentTime - lastSentTime)) / 60000); // แปลงเป็นนาที
      console.log(`🚫 Leave form cooldown active for user ${userId}, remaining: ${remainingTime} minutes`);
      await sendLineMessage(userId, {
        type: 'text',
        text: `⏰ กรุณารออีก ${remainingTime} นาที ก่อนขอฟอร์มแจ้งลาใหม่\n\nเพื่อป้องกันการส่งซ้ำและลดภาระระบบ`
      });
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

    const leaveText = `📝 แจ้งลาหยุด\n\n` +
      `กรุณากดลิงก์ด้านล่างเพื่อเข้าสู่ฟอร์มแจ้งลาหยุด\n\n` +
      `ระบบจะดึงข้อมูลชื่อและรหัสนักเรียนอัตโนมัติ\n` +
      `สามารถเลือกวันที่ลาได้สูงสุด 3 วัน\n\n` +
      `📋 ข้อมูลนักเรียน:\n` +
      `ชื่อ: ${studentData.student.student_name}\n` +
      `รหัส: ${studentData.student.link_code}\n\n` +
      `🔗 เปิดฟอร์มแจ้งลาหยุด:\n` +
      `${config.liffAppUrl}/?studentId=${studentData.student.student_id}&studentName=${encodeURIComponent(studentData.student.student_name)}`;

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
  await replyLineMessage(event.replyToken, {
    type: 'text',
    text: '🚌 ตำแหน่งรถบัส\n\n⚠️ ฟีเจอร์นี้อยู่ระหว่างการพัฒนา\nจะเปิดให้บริการในเร็วๆ นี้\n\nขออภัยในความไม่สะดวก 🙏'
  });
}

/**
 * จัดการคำขอตำแหน่งรถ (Push message version)
 * @param {string} userId - LINE User ID
 */
export async function handleBusLocationRequestPush(userId) {
  await sendLineMessage(userId, [{
    type: 'text',
    text: '🚌 ตำแหน่งรถบัส\n\n⚠️ ฟีเจอร์นี้อยู่ระหว่างการพัฒนา\nจะเปิดให้บริการในเร็วๆ นี้\n\nขออภัยในความไม่สะดวก 🙏'
  }]);
}

/**
 * จัดการคำขอติดต่อคนขับ
 * @param {Object} event - LINE webhook event
 */
export async function handleContactDriverRequest(event) {
  const messages = [
    {
      type: 'text',
      text: '📞 ติดต่อคนขับรถ\n\n👨‍💼 สมชาย คนขับ\n📱 เบอร์โทร: 081-234-5678\n🚌 ป้ายทะเบียน: 1กก-1234\n\n⏰ เวลาทำการ: 07:00 - 17:00 น.'
    },
    {
      type: 'template',
      altText: 'โทรหาคนขับรถ',
      template: {
        type: 'buttons',
        text: 'คุณต้องการโทรหาคนขับรถหรือไม่?',
        actions: [
          {
            type: 'uri',
            label: '📞 โทรหาคนขับ',
            uri: 'tel:0812345678'
          }
        ]
      }
    }
  ];
  
  await replyLineMessage(event.replyToken, messages);
}

/**
 * จัดการคำขอติดต่อคนขับ (Push message version)
 * @param {string} userId - LINE User ID
 */
export async function handleContactDriverRequestPush(userId) {
  await sendLineMessage(userId, [{
    type: 'text',
    text: '📞 ติดต่อคนขับรถ\n\n⚠️ ฟีเจอร์นี้อยู่ระหว่างการพัฒนา\nจะเปิดให้บริการในเร็วๆ นี้\n\nขออภัยในความไม่สะดวก 🙏'
  }]);
}