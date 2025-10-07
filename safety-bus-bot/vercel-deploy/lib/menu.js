import { sendLineMessage, replyLineMessage } from './line.js';
import { getStudentByLineId } from './student-data.js';

// Rich Menu configuration
const mainRichMenu = {
  size: {
    width: 2500,
    height: 1686
  },
  selected: false,
  name: "Safety Bus Main Menu",
  chatBarText: "Menu",
  areas: [
    {
      bounds: {
        x: 0,
        y: 0,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=history",
        displayText: "📊 ประวัตินักเรียน"
      }
    },
    {
      bounds: {
        x: 1250,
        y: 0,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=leave",
        displayText: "📝 ฟอร์มแจ้งลา"
      }
    },
    {
      bounds: {
        x: 0,
        y: 843,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=location",
        displayText: "🚌 ตำแหน่งรถ"
      }
    },
    {
      bounds: {
        x: 1250,
        y: 843,
        width: 1250,
        height: 843
      },
      action: {
        type: "postback",
        data: "action=contact",
        displayText: "📞 ติดต่อคนขับ"
      }
    }
  ]
};

// Quick Reply objects (เก็บไว้สำหรับฟีเจอร์อื่นๆ ที่ยังต้องใช้)

const driverQuickReply = {
  items: [
    {
      type: "action",
      action: {
        type: "postback",
        label: "📊 ดูข้อมูลนักเรียน",
        data: "action=driver_student_info",
        displayText: "📊 ดูข้อมูลนักเรียน"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "🚌 ตำแหน่งรถบัส",
        data: "action=location",
        displayText: "🚌 ตำแหน่งรถบัส"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "📞 ติดต่อโรงเรียน",
        data: "action=contact",
        displayText: "📞 ติดต่อโรงเรียน"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "🔄 เปลี่ยนนักเรียน",
        data: "action=change_student",
        displayText: "🔄 เปลี่ยนนักเรียน"
      }
    }
  ]
};

const leaveQuickReply = {
  items: [
    {
      type: "action",
      action: {
        type: "postback",
        label: "🤒 Sick Leave",
        data: "leave_type=sick",
        displayText: "🤒 Sick Leave"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "📚 Personal Leave",
        data: "leave_type=personal",
        displayText: "📚 Personal Leave"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "🏠 Absent",
        data: "leave_type=absent",
        displayText: "🏠 Absent"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "🔙 Back to Main Menu",
        data: "action=main_menu",
        displayText: "🔙 Back to Main Menu"
      }
    }
  ]
};

/**
 * ส่งข้อความพร้อม Quick Reply
 * @param {string} userId - LINE User ID
 * @param {Object} message - ข้อความที่จะส่ง
 * @param {Object} quickReply - Quick Reply object
 * @param {string} replyToken - Reply token (optional)
 */
export async function sendMessageWithQuickReply(userId, message, quickReply, replyToken = null) {
  const messageWithQuickReply = {
    ...message,
    quickReply: quickReply
  };

  if (replyToken) {
    return await replyLineMessage(replyToken, messageWithQuickReply);
  } else {
    return await sendLineMessage(userId, messageWithQuickReply);
  }
}



/**
 * ส่งข้อความแจ้งให้ใช้ Rich Menu
 * @param {string} userId - LINE User ID
 * @param {string} replyToken - Reply token (optional)
 * @param {Object} options - Additional options (optional)
 */
export async function sendMainMenu(userId, replyToken, options = {}) {
  console.log(`sendMainMenu called for user: ${userId}, replyToken: ${replyToken}`);
  
  let menuText = '🚌 เมนูหลัก\n\n1. ประวัติ\n2. แจ้งลาหยุด\n3. ตำแหน่งรถ\n4. ติดต่อคนขับ\n\nเลือกเมนูโดยพิมพ์ หรือกดปุ่ม';
  
  // ถ้ามี welcomeText ให้แสดงก่อนเมนู
  if (options.welcomeText) {
    menuText = options.welcomeText + '\n\n' + menuText;
  }
  
  const menuMessage = {
    type: 'text',
    text: menuText
    // ...สามารถเพิ่ม quick reply หรือ rich menu ได้...
  };
  
  try {
    if (replyToken) {
      await replyLineMessage(replyToken, menuMessage);
    } else {
      // fallback: push message
      await sendLineMessage(userId, menuMessage);
    }
  } catch (err) {
    console.error('Error in sendMainMenu:', err);
  }
}



export {
  mainRichMenu,
  driverQuickReply,
  leaveQuickReply
};