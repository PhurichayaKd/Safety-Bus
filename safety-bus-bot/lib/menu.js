// lib/menu.js
import { lineClient } from './line.js';
import { createCanvas } from 'canvas';
import { getStudentByLineId } from './student-data.js';

// Rich Menu สำหรับเมนูหลัก
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
        displayText: "📊 ประวัติข้อมูล"
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
        displayText: "📝 Leave Request"
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
        displayText: "🚌 Bus Location"
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
        displayText: "📞 Contact Driver"
      }
    }
  ]
};

// ฟังก์ชันสร้างรูปภาพ Rich Menu
async function createRichMenuImage() {
  const canvas = createCanvas(2500, 1686);
  const ctx = canvas.getContext('2d');
  
  // พื้นหลังไล่สีสวยงาม
  const gradient = ctx.createLinearGradient(0, 0, 0, 1686);
  gradient.addColorStop(0, '#E3F2FD');
  gradient.addColorStop(0.5, '#F8FBFF');
  gradient.addColorStop(1, '#E8F5E8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2500, 1686);
  
  // ฟังก์ชันวาดกล่องโค้งมน
  function drawRoundedRect(x, y, width, height, radius, fillColor, strokeColor) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  // วาดกล่องเมนูโค้งมนสำหรับแต่ละช่อง
  const margin = 30;
  const cornerRadius = 40;
  
  // กล่องซ้ายบน - Student History
  drawRoundedRect(margin, margin, 1250 - margin * 2, 843 - margin * 2, cornerRadius, 
    'rgba(255, 255, 255, 0.9)', '#B3E5FC');
  
  // กล่องขวาบน - Leave Request  
  drawRoundedRect(1250 + margin, margin, 1250 - margin * 2, 843 - margin * 2, cornerRadius,
    'rgba(255, 255, 255, 0.9)', '#C8E6C9');
  
  // กล่องซ้ายล่าง - Bus Location
  drawRoundedRect(margin, 843 + margin, 1250 - margin * 2, 843 - margin * 2, cornerRadius,
    'rgba(255, 255, 255, 0.9)', '#FFE0B2');
  
  // กล่องขวาล่าง - Contact Driver
  drawRoundedRect(1250 + margin, 843 + margin, 1250 - margin * 2, 843 - margin * 2, cornerRadius,
    'rgba(255, 255, 255, 0.9)', '#F8BBD9');
  
  // ตั้งค่าฟอนต์ที่รองรับภาษาไทย
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // ฟังก์ชันวาดข้อความภาษาไทยที่ปลอดภัย
  function drawThaiText(text, x, y, fontSize, color = '#1565C0', weight = 'normal') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${fontSize}px "Noto Sans Thai", "Sarabun", "Tahoma", "Arial Unicode MS", sans-serif`;
    
    // ใช้ fillText แบบปกติสำหรับข้อความภาษาไทย
    try {
      ctx.fillText(text, x, y);
    } catch (error) {
      // ถ้าเกิดข้อผิดพลาด ใช้ฟอนต์ fallback
      ctx.font = `${weight} ${fontSize}px Arial, sans-serif`;
      ctx.fillText(text, x, y);
    }
  }
  
  // ประวัติการเดินทาง - สีฟ้า
  ctx.fillStyle = '#0277BD';
  ctx.font = 'bold 140px Arial';
  ctx.fillText('📊', 625, 320);
  drawThaiText('ประวัติข้อมูล', 625, 420, 52, '#0277BD', 'bold');
  drawThaiText('View student data', 625, 470, 28, '#555');
  
  // แจ้งลาหยุด - สีเขียว
  ctx.fillStyle = '#2E7D32';
  ctx.font = 'bold 140px Arial';
  ctx.fillText('📝', 1875, 320);
  drawThaiText('Leave Request', 1875, 420, 52, '#2E7D32', 'bold');
  drawThaiText('Report absence', 1875, 470, 28, '#555');
  
  // ตำแหน่งรถบัส - สีส้ม
  ctx.fillStyle = '#F57C00';
  ctx.font = 'bold 140px Arial';
  ctx.fillText('🚌', 625, 1200);
  drawThaiText('Bus Location', 625, 1300, 52, '#F57C00', 'bold');
  drawThaiText('Real-time tracking', 625, 1350, 28, '#555');
  
  // ติดต่อคนขับ - สีชมพู
  ctx.fillStyle = '#C2185B';
  ctx.font = 'bold 140px Arial';
  ctx.fillText('📞', 1875, 1200);
  drawThaiText('Contact Driver', 1875, 1300, 52, '#C2185B', 'bold');
  drawThaiText('Call bus driver', 1875, 1350, 28, '#555');
  
  return canvas.toBuffer('image/png');
}

// Quick Reply สำหรับเมนูหลัก
const mainQuickReply = {
  items: [
    {
      type: "action",
      action: {
        type: "postback",
        label: "📊 ประวัติข้อมูล",
        data: "action=history",
        displayText: "📊 ประวัติข้อมูล"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "📝 Leave Request",
        data: "action=leave",
        displayText: "📝 Leave Request"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "🚌 Bus Location",
        data: "action=location",
        displayText: "🚌 Bus Location"
      }
    },
    {
      type: "action",
      action: {
        type: "postback",
        label: "📞 Contact Driver",
        data: "action=contact",
        displayText: "📞 Contact Driver"
      }
    }
  ]
};

// Quick Reply สำหรับคนขับ
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

// Quick Reply สำหรับเมนูลาหยุด
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

// ฟังก์ชันสร้าง Rich Menu
async function createRichMenu() {
  try {
    const richMenuId = await lineClient.createRichMenu(mainRichMenu);
    console.log('✅ Rich Menu created with ID:', richMenuId);
    
    // สร้างรูปภาพ Rich Menu แบบง่ายๆ (สีพื้นฐาน)
    const imageBuffer = await createRichMenuImage();
    
    // อัปโหลดรูปภาพ Rich Menu
    await lineClient.setRichMenuImage(richMenuId, imageBuffer, 'image/png');
    console.log('✅ Rich Menu image uploaded');
    
    return richMenuId;
  } catch (error) {
    console.error('❌ Error creating Rich Menu:', error);
    throw error;
  }
}

// ฟังก์ชันตั้งค่า Rich Menu เป็นค่าเริ่มต้น
async function setDefaultRichMenu(richMenuId) {
  try {
    await lineClient.setDefaultRichMenu(richMenuId);
    console.log('✅ Default Rich Menu set');
  } catch (error) {
    console.error('❌ Error setting default Rich Menu:', error);
    throw error;
  }
}

// ฟังก์ชันส่งข้อความพร้อม Quick Reply
async function sendMessageWithQuickReply(userId, message, quickReply, replyToken = null) {
  try {
    if (replyToken) {
      // ใช้ replyMessage หากมี replyToken
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: message,
        quickReply: quickReply
      });
    } else {
      // ใช้ pushMessage หากไม่มี replyToken
      await lineClient.pushMessage(userId, {
        type: 'text',
        text: message,
        quickReply: quickReply
      });
    }
  } catch (error) {
    console.error('❌ Error sending message with quick reply:', error);
    throw error;
  }
}

// ฟังก์ชันส่งเมนูหลัก
async function sendMainMenu(userId, replyToken = null) {
  try {
    // ตรวจสอบประเภทผู้ใช้
    const userData = await getStudentByLineId(userId);
    
    let message = '🚍 ยินดีต้อนรับสู่ระบบ Safety Bus\n\n';
    let quickReply = mainQuickReply;
    
    if (userData && userData.success) {
      if (userData.type === 'driver') {
        message += `🚌 สวัสดีคุณ ${userData.driver_name}\n👦👧 นักเรียนที่รับผิดชอบ: ${userData.student_name}\n\n📱 เลือกเมนูด้านล่าง:`;
        quickReply = driverQuickReply;
      } else if (userData.type === 'parent') {
        message += `👨‍👩‍👧‍👦 สวัสดีผู้ปกครอง\n👦👧 นักเรียน: ${userData.student_name}\n\n📱 เลือกเมนูด้านล่าง:`;
      } else if (userData.type === 'student') {
        message += `👦👧 สวัสดี ${userData.student_name}\n\n📱 เลือกเมนูด้านล่าง:`;
      }
    } else {
      message += 'กรุณาเชื่อมโยงบัญชีก่อนใช้งาน\n\n💡 ส่งรหัสนักเรียนหรือพิมพ์ "คนขับ" สำหรับคนขับรถ';
    }
    
    await sendMessageWithQuickReply(userId, message, quickReply, replyToken);
  } catch (error) {
    console.error('❌ Error sending main menu:', error);
    const fallbackMessage = '🚍 ยินดีต้อนรับสู่ระบบ Safety Bus\n\nกรุณาเชื่อมโยงบัญชีก่อนใช้งาน\n\n💡 ส่งรหัสนักเรียนหรือพิมพ์ "คนขับ" สำหรับคนขับรถ';
    
    if (replyToken) {
      await lineClient.replyMessage(replyToken, {
        type: 'text',
        text: fallbackMessage
      });
    } else {
      await lineClient.pushMessage(userId, {
        type: 'text',
        text: fallbackMessage
      });
    }
  }
}

// ฟังก์ชันส่งเมนูแจ้งลาหยุด
async function sendLeaveMenu(userId, replyToken = null) {
  const message = '📝 Leave Request\n\nPlease select leave type:';
  await sendMessageWithQuickReply(userId, message, leaveQuickReply, replyToken);
}

export {
  mainRichMenu,
  mainQuickReply,
  driverQuickReply,
  leaveQuickReply,
  createRichMenu,
  setDefaultRichMenu,
  sendMessageWithQuickReply,
  sendMainMenu,
  sendLeaveMenu
};