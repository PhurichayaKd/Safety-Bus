// API สำหรับการส่งการแจ้งเตือนฉุกเฉินและการตอบสนองของคนขับ
import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// ตั้งค่า LINE Bot
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// สร้าง LINE client
let lineClient = null;
try {
  if (config.channelAccessToken && config.channelSecret) {
    lineClient = new Client(config);
    console.log('✅ LINE client initialized successfully');
  } else {
    console.warn('⚠️ LINE credentials not found');
  }
} catch (error) {
  console.error('❌ Failed to initialize LINE client:', error.message);
}

// ตั้งค่า Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully');
  } else {
    console.warn('⚠️ Supabase credentials not found');
  }
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
}

// ข้อความสำหรับเหตุการณ์ฉุกเฉิน
const EMERGENCY_MESSAGES = {
  DRIVER_PANIC: {
    emoji: '🚨',
    title: 'คนขับแจ้งเหตุฉุกเฉิน‼️',
    message: '🔻 สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: คนขับกดปุ่มฉุกเฉินด้วยตนเอง',
    priority: 'CRITICAL',
    sendToLine: true,
    sensorType: 'manual_driver_emergency'
  },
  MOVEMENT_DETECTED: {
    emoji: '🚨',
    title: 'ตรวจพบการเคลื่อนไหวหลังจอดรถ 🗣‼️',
    message: '🔻สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด : เซ็นเซอร์ตรวจพบการเคลื่อนไหวหลังจากจอดรถแล้ว',
    priority: 'HIGH',
    sendToLine: true,
    sensorType: 'motion_sensor'
  },
  HIGH_TEMPERATURE: {
    emoji: '🚨',
    title: 'ตรวจพบการอุณหภูมิสูง 🌡‼️',
    message: '🔻สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด : เซ็นเซอร์ตรวจพบอุณหภูมิสูง {temperature}°C',
    priority: 'HIGH',
    sendToLine: true,
    sensorType: 'temperature_sensor'
  },
  SMOKE_AND_HEAT: {
    emoji: '🚨',
    title: 'ตรวจพบการอุณหภูมิสูงและควันจำนวนมาก 🧯‼️',
    message: '🔻 สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด : เซ็นเซอร์ตรวจพบอุณหภูมิสูง {temperature}°C และควัน {smokeLevel}%',
    priority: 'CRITICAL',
    sendToLine: true,
    sensorType: 'smoke_heat_sensor'
  },
  STUDENT_SWITCH: {
    emoji: '👶',
    title: 'นักเรียนกดสวิตช์',
    message: 'นักเรียนได้กดสวิตช์บนรถ (ไม่ส่งแจ้งเตือน LINE)',
    priority: 'LOW',
    sendToLine: false,
    sensorType: 'student_switch'
  }
};

// ข้อความสำหรับการตอบสนองของคนขับ (ปรับปรุงให้ระบุประเภทเซ็นเซอร์)
const DRIVER_RESPONSE_MESSAGES = {
  CHECKED: {
    emoji: '✅',
    title: 'คนขับตรวจสอบเรียบร้อย',
    message: 'คนขับได้ทำการตรวจสอบเหตุการณ์แล้ว สถานการณ์กลับสู่ปกติ',
    sendToLine: true,
    templates: {
      motion_sensor: 'คนขับได้ตรวจสอบการเคลื่อนไหวแล้ว สถานการณ์กลับสู่ปกติ (เซ็นเซอร์การเคลื่อนไหว)',
      temperature_sensor: 'คนขับได้ตรวจสอบอุณหภูมิแล้ว สถานการณ์กลับสู่ปกติ (เซ็นเซอร์อุณหภูมิ)',
      smoke_heat_sensor: 'คนขับได้ตรวจสอบควันและอุณหภูมิแล้ว สถานการณ์กลับสู่ปกติ (เซ็นเซอร์ควันและความร้อน)',
      manual_driver_emergency: 'คนขับได้ตรวจสอบเหตุการณ์ฉุกเฉินแล้ว สถานการณ์กลับสู่ปกติ (ปุ่มฉุกเฉินคนขับ)',
      student_switch: 'คนขับได้ตรวจสอบกดสวิตช์ของนักเรียนแล้ว สถานการณ์กลับสู่ปกติ (สวิตช์นักเรียน)'
    }
  },
  EMERGENCY: {
    emoji: '🚨',
    title: 'คนขับแจ้งเหตุฉุกเฉิน‼️',
    message: '🔻 สถานะ : คนขับแจ้งเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: คนขับยืนยันเหตุการณ์ฉุกเฉิน',
    sendToLine: true,
    templates: {
      motion_sensor: '🔻 สถานะ : คนขับยืนยันเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: ยืนยันเหตุการณ์จากเซ็นเซอร์การเคลื่อนไหว',
      temperature_sensor: '🔻 สถานะ : คนขับยืนยันเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: ยืนยันเหตุการณ์จากเซ็นเซอร์อุณหภูมิสูง',
      smoke_heat_sensor: '🔻 สถานะ : คนขับยืนยันเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: ยืนยันเหตุการณ์จากเซ็นเซอร์ควันและความร้อน',
      manual_driver_emergency: '🔻 สถานะ : คนขับยืนยันเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: คนขับกดปุ่มฉุกเฉินด้วยตนเอง',
      student_switch: '🔻 สถานะ : คนขับยืนยันเหตุฉุกเฉิน กำลังดำเนินการให้นักเรียนลงจากรถเพื่อความปลอดภัย\n\nรายละเอียด: ยืนยันเหตุการณ์จากสวิตช์นักเรียน'
    }
  },
  CONFIRMED_NORMAL: {
    emoji: '✅️',
    title: 'สถานการ์กลับสู่ปกติแล้ว ✅️',
    message: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว',
    sendToLine: true,
    templates: {
      motion_sensor: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว\n\n📍 เหตุการณ์: เซ็นเซอร์การเคลื่อนไหว',
      temperature_sensor: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว\n\n📍 เหตุการณ์: เซ็นเซอร์อุณหภูมิสูง',
      smoke_heat_sensor: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว\n\n📍 เหตุการณ์: เซ็นเซอร์ควันและความร้อน',
      manual_driver_emergency: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว\n\n📍 เหตุการณ์: ปุ่มฉุกเฉินคนขับ',
      student_switch: 'สถานะ : คนขับยืนยันสถานการณ์กลับสู่ปกติ\n               นักเรียนทุกคนเช็คว่าปลอดภัยแล้ว\n\n📍 เหตุการณ์: สวิตช์นักเรียน'
    }
  }
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // ตั้งค่า CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      // สำหรับ emergency notification
      eventType, 
      eventId, 
      description, 
      location,
      sensorType,
      temperature,
      smokeLevel,
      humidity,
      // สำหรับ driver response
      responseType,
      emergencyLogId,
      driverId,
      busId,
      isStudentEmergency = false,
      // เพิ่มการติดตาม original sensor type สำหรับ driver response
      originalSensorType,
      originalEventType,
      // ทั่วไป
      notes,
      timestamp
    } = req.body;

    console.log('📥 Emergency notification request:', {
      eventType,
      responseType,
      eventId,
      emergencyLogId,
      driverId,
      busId,
      isStudentEmergency,
      sensorType,
      originalSensorType,
      originalEventType
    });

    // Validate required fields
    if (!eventType && !responseType) {
      return res.status(400).json({ 
        error: 'Either eventType or responseType is required' 
      });
    }

    // ตรวจสอบการตั้งค่า LINE และ Supabase
    if (!lineClient) {
      console.error('LINE client not initialized');
      return res.status(500).json({ 
        error: 'LINE messaging service not available' 
      });
    }

    if (!supabase) {
      console.error('Supabase client not initialized');
      return res.status(500).json({ 
        error: 'Database service not available' 
      });
    }

    let messageInfo;
    let shouldSendToLine = true;
    let detectedSensorType = null; // ประกาศตัวแปรเพื่อเก็บประเภทเซ็นเซอร์ที่ตรวจพบ
    
    // ฟังก์ชันตรวจสอบ cooldown สำหรับเซ็นเซอร์ (5 นาที)
    const checkSensorCooldown = async (sensorType, busId) => {
      if (!sensorType) {
        console.log('🚫 No sensorType provided for cooldown check');
        return { allowed: true };
      }
      
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        console.log(`🔍 Cooldown check query parameters:`, {
          sensorType,
          fiveMinutesAgo,
          currentTime: new Date().toISOString()
        });
        
        // ตรวจสอบ cooldown โดยใช้เฉพาะ sensor_type (ไม่แยกตาม driver เพื่อป้องกันการส่งซ้ำจากเซ็นเซอร์เดียวกัน)
        const { data: recentEvents, error } = await supabase
          .from('emergency_logs')
          .select('event_time, sensor_type, event_type, driver_id')
          .eq('sensor_type', sensorType)
          .gte('event_time', fiveMinutesAgo)
          .order('event_time', { ascending: false })
          .limit(1);

        console.log(`🔍 Database query result:`, {
          error,
          recentEventsCount: recentEvents ? recentEvents.length : 0,
          recentEvents
        });

        if (error) {
          console.error('Error checking sensor cooldown:', error);
          return { allowed: true }; // ถ้าเกิดข้อผิดพลาด ให้อนุญาตส่งแจ้งเตือน
        }

        if (recentEvents && recentEvents.length > 0) {
          const lastEvent = recentEvents[0];
          const lastEventTime = new Date(lastEvent.event_time);
          const timeDiff = Date.now() - lastEventTime.getTime();
          const remainingCooldown = Math.ceil((5 * 60 * 1000 - timeDiff) / 1000); // วินาทีที่เหลือ
          
          console.log(`🕒 Sensor cooldown check for ${sensorType}:`, {
            lastEventTime: lastEvent.event_time,
            timeDiffSeconds: Math.floor(timeDiff / 1000),
            remainingCooldownSeconds: remainingCooldown,
            allowed: remainingCooldown <= 0
          });
          
          return {
            allowed: remainingCooldown <= 0,
            remainingSeconds: remainingCooldown > 0 ? remainingCooldown : 0,
            lastEventTime: lastEvent.event_time
          };
        }

        console.log(`✅ No recent events found for sensor ${sensorType}, allowing notification`);
        return { allowed: true }; // ไม่มีเหตุการณ์ล่าสุด อนุญาตส่งแจ้งเตือน
      } catch (error) {
        console.error('Error in sensor cooldown check:', error);
        return { allowed: true }; // ถ้าเกิดข้อผิดพลาด ให้อนุญาตส่งแจ้งเตือน
      }
    };
    
    // กำหนดข้อความตามประเภท
    if (eventType) {
      // เหตุการณ์ฉุกเฉิน - ตรวจสอบประเภทเซ็นเซอร์
      if (sensorType) {
        // ตรวจสอบประเภทเซ็นเซอร์และกำหนด eventType ที่เหมาะสม
        if (sensorType === 'motion_detected_after_trip' || sensorType === 'motion_detected_at_school') {
          messageInfo = EMERGENCY_MESSAGES['MOVEMENT_DETECTED'];
          detectedSensorType = 'motion_sensor';
        } else if (sensorType === 'smoke_heat' && temperature && smokeLevel) {
          messageInfo = EMERGENCY_MESSAGES['SMOKE_AND_HEAT'];
          detectedSensorType = 'smoke_heat_sensor';
        } else if (sensorType === 'temp_only' && temperature) {
          messageInfo = EMERGENCY_MESSAGES['HIGH_TEMPERATURE'];
          detectedSensorType = 'temperature_sensor';
        } else if (sensorType === 'manual_driver_emergency' || eventType === 'DRIVER_PANIC') {
          messageInfo = EMERGENCY_MESSAGES['DRIVER_PANIC'];
          detectedSensorType = 'manual_driver_emergency';
        } else if (sensorType === 'student_switch') {
          messageInfo = EMERGENCY_MESSAGES['STUDENT_SWITCH'];
          detectedSensorType = 'student_switch';
        } else {
          messageInfo = EMERGENCY_MESSAGES[eventType];
          detectedSensorType = sensorType || 'unknown';
        }
      } else {
        messageInfo = EMERGENCY_MESSAGES[eventType];
        // กำหนด default sensor type ตาม eventType
        if (eventType === 'DRIVER_PANIC') {
          detectedSensorType = 'manual_driver_emergency';
        } else if (eventType === 'MOVEMENT_DETECTED') {
          detectedSensorType = 'motion_sensor';
        } else if (eventType === 'HIGH_TEMPERATURE') {
          detectedSensorType = 'temperature_sensor';
        } else if (eventType === 'SMOKE_AND_HEAT') {
          detectedSensorType = 'smoke_heat_sensor';
        } else if (eventType === 'STUDENT_SWITCH') {
          detectedSensorType = 'student_switch';
        }
      }
      
      // ไม่ส่งแจ้งเตือน LINE สำหรับ STUDENT_SWITCH
      if (eventType === 'STUDENT_SWITCH') {
        shouldSendToLine = false;
      }
    } else if (responseType) {
      // การตอบสนองของคนขับ
      if (responseType === 'EMERGENCY') {
        // เมื่อคนขับกดปุ่มฉุกเฉิน ให้ใช้ EMERGENCY_MESSAGES ตามประเภทเซ็นเซอร์
        if (originalEventType) {
          messageInfo = EMERGENCY_MESSAGES[originalEventType];
          // กำหนด sensor type ตาม eventType
          const eventToSensorMap = {
            'DRIVER_PANIC': 'manual_driver_emergency',
            'MOVEMENT_DETECTED': 'motion_sensor',
            'HIGH_TEMPERATURE': 'temperature_sensor',
            'SMOKE_AND_HEAT': 'smoke_heat_sensor',
            'STUDENT_SWITCH': 'student_switch'
          };
          detectedSensorType = eventToSensorMap[originalEventType] || 'manual_driver_emergency';
        } else if (originalSensorType) {
          // ถ้ามี originalSensorType ให้แปลงเป็น eventType
          const sensorToEventMap = {
            'manual_driver_emergency': 'DRIVER_PANIC',
            'motion_sensor': 'MOVEMENT_DETECTED',
            'temperature_sensor': 'HIGH_TEMPERATURE',
            'smoke_heat_sensor': 'SMOKE_AND_HEAT',
            'student_switch': 'STUDENT_SWITCH'
          };
          const mappedEventType = sensorToEventMap[originalSensorType] || 'DRIVER_PANIC';
          messageInfo = EMERGENCY_MESSAGES[mappedEventType];
          detectedSensorType = originalSensorType;
        } else {
          // ถ้าไม่มีข้อมูลเซ็นเซอร์ ให้ใช้ DRIVER_PANIC เป็นค่าเริ่มต้น
          messageInfo = EMERGENCY_MESSAGES['DRIVER_PANIC'];
          detectedSensorType = 'manual_driver_emergency';
        }
      } else {
        // การตอบสนองอื่นๆ (CHECKED, CONFIRMED_NORMAL) - ใช้ DRIVER_RESPONSE_MESSAGES
        messageInfo = DRIVER_RESPONSE_MESSAGES[responseType];
        
        // ถ้ามี originalSensorType หรือ originalEventType ให้ใช้ข้อความที่เฉพาะเจาะจง
        if (originalSensorType && messageInfo.templates && messageInfo.templates[originalSensorType]) {
          messageInfo = {
            ...messageInfo,
            message: messageInfo.templates[originalSensorType]
          };
          detectedSensorType = originalSensorType;
        } else if (originalEventType) {
          // แปลง originalEventType เป็น sensor type
          const eventToSensorMap = {
            'DRIVER_PANIC': 'manual_driver_emergency',
            'MOVEMENT_DETECTED': 'motion_sensor',
            'HIGH_TEMPERATURE': 'temperature_sensor',
            'SMOKE_AND_HEAT': 'smoke_heat_sensor',
            'STUDENT_SWITCH': 'student_switch'
          };
          const mappedSensorType = eventToSensorMap[originalEventType];
          if (mappedSensorType && messageInfo.templates && messageInfo.templates[mappedSensorType]) {
            messageInfo = {
              ...messageInfo,
              message: messageInfo.templates[mappedSensorType]
            };
            detectedSensorType = mappedSensorType;
          }
        } else if (emergencyLogId) {
          // ถ้าไม่มี originalSensorType ให้ดึงจากฐานข้อมูล
          try {
            const { data: emergencyLog, error: logError } = await supabase
            .from('emergency_logs')
            .select('event_type, sensor_type, sensor_data')
            .eq('event_id', emergencyLogId)
            .single();

          if (!logError && emergencyLog) {
            const dbSensorType = emergencyLog.sensor_type;
            const dbEventType = emergencyLog.event_type;
            
            // แปลง database sensor type เป็น template key
            let templateKey = null;
            if (dbSensorType) {
              if (dbSensorType.includes('motion')) {
                templateKey = 'motion_sensor';
              } else if (dbSensorType.includes('temp') && dbSensorType.includes('smoke')) {
                templateKey = 'smoke_heat_sensor';
              } else if (dbSensorType.includes('temp')) {
                templateKey = 'temperature_sensor';
              } else if (dbSensorType.includes('student')) {
                templateKey = 'student_switch';
              } else if (dbSensorType.includes('manual') || dbSensorType.includes('driver')) {
                templateKey = 'manual_driver_emergency';
              }
            } else if (dbEventType) {
              const eventToSensorMap = {
                'DRIVER_PANIC': 'manual_driver_emergency',
                'MOVEMENT_DETECTED': 'motion_sensor',
                'HIGH_TEMPERATURE': 'temperature_sensor',
                'SMOKE_AND_HEAT': 'smoke_heat_sensor',
                'STUDENT_SWITCH': 'student_switch'
              };
              templateKey = eventToSensorMap[dbEventType];
            }

            if (templateKey && messageInfo.templates && messageInfo.templates[templateKey]) {
              messageInfo = {
                ...messageInfo,
                message: messageInfo.templates[templateKey]
              };
              detectedSensorType = templateKey;
            }
          }
        } catch (error) {
          console.error('Error fetching emergency log for sensor type:', error);
        }
      }
      }
    }

    if (!messageInfo) {
      return res.status(400).json({ 
        error: 'Invalid event type or response type' 
      });
    }

    // อัปเดต shouldSendToLine ตาม messageInfo
    if (messageInfo.sendToLine !== undefined) {
      shouldSendToLine = messageInfo.sendToLine;
    }

    // สร้างข้อความ
    const currentTime = new Date(timestamp || Date.now()).toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let messageText = `${messageInfo.emoji} ${messageInfo.title}\n\n${messageInfo.message}`;
    
    // แทนที่ค่าอุณหภูมิและควันในข้อความ
    if (temperature) {
      messageText = messageText.replace('{temperature}', temperature);
    }
    if (smokeLevel) {
      messageText = messageText.replace('{smokeLevel}', smokeLevel);
    }
    
    if (description) {
      messageText += `\n\nรายละเอียด: ${description}`;
    }
    
    if (location) {
      messageText += `\n📍 ตำแหน่ง: ${location}`;
    }
    
    if (notes) {
      messageText += `\n📝 หมายเหตุ: ${notes}`;
    }
    
    // เพิ่มข้อมูลนักเรียนที่อยู่บนรถ
    let studentInfo = '';
    if (busId && shouldSendToLine) {
      try {
        // ดึงข้อมูลนักเรียนที่อยู่บนรถ (trip_phase = 'go' หรือ 'at_school')
        const { data: studentsOnBus, error: studentError } = await supabase
          .from('student_boarding_status')
          .select(`
            student_id,
            students!inner(student_name, class_name, parent_phone)
          `)
          .eq('bus_id', busId)
          .in('trip_phase', ['go', 'at_school'])
          .eq('boarding_status', 'on_bus');

        if (!studentError && studentsOnBus && studentsOnBus.length > 0) {
          const studentNames = studentsOnBus.map(s => 
            `• ${s.students.student_name} (${s.students.class_name})`
          ).join('\n');
          
          studentInfo = `\n\n👥 นักเรียนบนรถ (${studentsOnBus.length} คน):\n${studentNames}`;
          
          // เพิ่มข้อมูลการติดต่อผู้ปกครอง
          const parentContacts = studentsOnBus
            .filter(s => s.students.parent_phone)
            .map(s => `${s.students.student_name}: ${s.students.parent_phone}`)
            .join('\n');
          
          if (parentContacts) {
            studentInfo += `\n\n📞 ติดต่อผู้ปกครอง:\n${parentContacts}`;
          }
        } else if (studentsOnBus && studentsOnBus.length === 0) {
          studentInfo = '\n\n👥 ไม่มีนักเรียนบนรถในขณะนี้';
        }
      } catch (error) {
        console.error('Error fetching student data:', error);
        studentInfo = '\n\n👥 ไม่สามารถดึงข้อมูลนักเรียนได้';
      }
    }

    messageText += studentInfo;
    messageText += `\n\n⏰ เวลา: ${currentTime}`;
    
    if (eventId) {
      messageText += `\n🆔 รหัสเหตุการณ์: ${eventId}`;
    } else if (emergencyLogId) {
      messageText += `\n🆔 รหัสเหตุการณ์: ${emergencyLogId}`;
    }

    // เพิ่มข้อมูลประเภทเซ็นเซอร์ในข้อความ (สำหรับ debug)
    if (detectedSensorType && (eventType || responseType)) {
      console.log(`🔍 Detected sensor type: ${detectedSensorType} for ${eventType || responseType}`);
    }

    // ทำความสะอาดข้อความ
    const cleanMessageText = messageText
      .replace(/[^\u0000-\u007F\u0E00-\u0E7F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const lineMessage = {
      type: 'text',
      text: cleanMessageText
    };

    let notificationResults = [];

    // ส่งแจ้งเตือน LINE เฉพาะเมื่อ shouldSendToLine เป็น true
    if (shouldSendToLine) {
      // เพิ่ม debug log
      console.log(`🔍 Cooldown check parameters:`, {
        detectedSensorType,
        sensorType,
        eventType,
        shouldCheckCooldown: detectedSensorType && detectedSensorType !== 'manual_driver_emergency'
      });
      
      // ตรวจสอบ cooldown สำหรับเซ็นเซอร์ก่อนส่งแจ้งเตือน
      if (detectedSensorType && detectedSensorType !== 'manual_driver_emergency') {
        // แปลง sensor type ให้ตรงกับ constraint ของฐานข้อมูลสำหรับ cooldown check
        const sensorTypeMapping = {
          'motion_sensor': 'MOTION',
          'temperature_sensor': 'TEMPERATURE', 
          'smoke_heat_sensor': 'SMOKE',
          'manual_driver_emergency': 'PIR', // ใช้ PIR เป็นตัวแทน
          'student_switch': 'PIR'
        };
        const mappedSensorType = sensorTypeMapping[detectedSensorType] || 'MOTION';
        
        console.log(`🕒 Checking cooldown for sensor: ${detectedSensorType} (mapped to: ${mappedSensorType})`);
        const cooldownCheck = await checkSensorCooldown(mappedSensorType, busId || 'default_bus');
        console.log(`🕒 Cooldown check result:`, cooldownCheck);
        
        if (!cooldownCheck.allowed) {
          console.log(`⏰ Sensor ${detectedSensorType} is in cooldown. Remaining: ${cooldownCheck.remainingSeconds} seconds`);
          return res.status(200).json({
            success: true,
            message: `Sensor notification blocked due to cooldown. Remaining: ${cooldownCheck.remainingSeconds} seconds`,
            cooldown: {
              active: true,
              remainingTime: cooldownCheck.remainingSeconds,
              sensorType: detectedSensorType,
              lastEventTime: cooldownCheck.lastEventTime
            }
          });
        } else {
          console.log(`✅ Cooldown check passed for sensor: ${detectedSensorType}`);
        }
      }

      try {
        // ดึงข้อมูลจาก student_line_links
        const { data: studentLinks, error: studentError } = await supabase
          .from('student_line_links')
          .select('line_user_id, student_id, line_display_id')
          .not('line_user_id', 'is', null)
          .neq('line_user_id', '')
          .eq('active', true);

        if (studentError) {
          console.error('Error fetching student links:', studentError);
        } else if (studentLinks && studentLinks.length > 0) {
          // ส่งข้อความไปยังนักเรียนทุกคน
          for (const student of studentLinks) {
            try {
              // ตรวจสอบให้แน่ใจว่า line_user_id เป็น string และไม่ใช่ null
              const lineUserId = String(student.line_user_id).trim();
              if (!lineUserId || lineUserId === 'null' || lineUserId === 'undefined') {
                console.warn(`⚠️ Invalid line_user_id for student ${student.student_id}: ${student.line_user_id}`);
                notificationResults.push({
                  lineUserId: student.line_user_id,
                  studentId: student.student_id,
                  lineDisplayId: student.line_display_id,
                  type: 'student',
                  status: 'failed',
                  error: 'Invalid line_user_id'
                });
                continue;
              }

              await lineClient.pushMessage(lineUserId, lineMessage);
              notificationResults.push({
                lineUserId: lineUserId,
                studentId: student.student_id,
                lineDisplayId: student.line_display_id,
                type: 'student',
                status: 'success'
              });
              console.log(`✅ Emergency notification sent to student ${student.student_id} (${lineUserId})`);
            } catch (error) {
              console.error(`❌ Failed to send to student ${student.student_id}:`, error.message);
              notificationResults.push({
                lineUserId: student.line_user_id,
                studentId: student.student_id,
                lineDisplayId: student.line_display_id,
                type: 'student',
                status: 'failed',
                error: error.message
              });
            }
          }
        }

        // ดึงข้อมูลจาก parent_line_links
        const { data: parentLinks, error: parentError } = await supabase
          .from('parent_line_links')
          .select('line_user_id, parent_id, line_display_id')
          .not('line_user_id', 'is', null)
          .neq('line_user_id', '')
          .eq('active', true);

        if (parentError) {
          console.error('Error fetching parent links:', parentError);
        } else if (parentLinks && parentLinks.length > 0) {
          // ส่งข้อความไปยังผู้ปกครองทุกคน
          for (const parent of parentLinks) {
            try {
              // ตรวจสอบให้แน่ใจว่า line_user_id เป็น string และไม่ใช่ null
              const lineUserId = String(parent.line_user_id).trim();
              if (!lineUserId || lineUserId === 'null' || lineUserId === 'undefined') {
                console.warn(`⚠️ Invalid line_user_id for parent ${parent.parent_id}: ${parent.line_user_id}`);
                notificationResults.push({
                  lineUserId: parent.line_user_id,
                  parentId: parent.parent_id,
                  lineDisplayId: parent.line_display_id,
                  type: 'parent',
                  status: 'failed',
                  error: 'Invalid line_user_id'
                });
                continue;
              }

              await lineClient.pushMessage(lineUserId, lineMessage);
              notificationResults.push({
                lineUserId: lineUserId,
                parentId: parent.parent_id,
                lineDisplayId: parent.line_display_id,
                type: 'parent',
                status: 'success'
              });
              console.log(`✅ Emergency notification sent to parent ${parent.parent_id} (${lineUserId})`);
            } catch (error) {
              console.error(`❌ Failed to send to parent ${parent.parent_id}:`, error.message);
              notificationResults.push({
                lineUserId: parent.line_user_id,
                parentId: parent.parent_id,
                lineDisplayId: parent.line_display_id,
                type: 'parent',
                status: 'failed',
                error: error.message
              });
            }
          }
        }
      } catch (error) {
        console.error('Database query error:', error);
      }
    }

    // บันทึกข้อมูลเหตุการณ์ฉุกเฉินลงใน emergency_logs (สำหรับ eventType เพื่อให้ cooldown ทำงาน)
    if (eventType && shouldSendToLine && notificationResults.length > 0) {
      try {
        // แปลง sensor type ให้ตรงกับ constraint ของฐานข้อมูล
        const sensorTypeMapping = {
          'motion_sensor': 'MOTION',
          'temperature_sensor': 'TEMPERATURE', 
          'smoke_heat_sensor': 'SMOKE',
          'manual_driver_emergency': 'PIR', // ใช้ PIR เป็นตัวแทน
          'student_switch': 'PIR'
        };
        
        // ข้อมูลที่จะ INSERT ลงใน emergency_logs ตามโครงสร้างตารางที่ถูกต้อง
        const emergencyLogData = {
          driver_id: parseInt(busId), // busId จริงๆ แล้วคือ driver_id
          event_time: new Date(timestamp || Date.now()).toISOString(),
          event_type: 'SENSOR_ALERT', // ใช้ค่าที่อนุญาตในฐานข้อมูล
          triggered_by: 'sensor',
          sensor_type: sensorTypeMapping[detectedSensorType] || 'MOTION', // ใช้ mapping ที่ถูกต้อง
          status: 'pending'
        };

        // เพิ่มข้อมูลเซ็นเซอร์ในรูปแบบ JSON
        const sensorData = {};
        if (temperature) sensorData.temperature = temperature;
        if (smokeLevel) sensorData.smokeLevel = smokeLevel;
        if (humidity) sensorData.humidity = humidity;
        if (sensorData && Object.keys(sensorData).length > 0) {
          emergencyLogData.sensor_data = sensorData;
        }

        // เพิ่มรายละเอียดในรูปแบบ JSON
        const details = {};
        if (description) details.description = description;
        if (location) details.location = location;
        details.originalEventType = eventType;
        emergencyLogData.details = details;

        console.log('🔄 Inserting emergency log for cooldown:', emergencyLogData);

        const { data: insertedLog, error: insertError } = await supabase
          .from('emergency_logs')
          .insert(emergencyLogData)
          .select();

        if (insertError) {
          console.error('❌ Error inserting emergency log:', insertError);
        } else {
          console.log('✅ Emergency log inserted successfully for cooldown:', insertedLog);
        }
      } catch (error) {
        console.error('❌ Database insert operation error:', error);
      }
    }

    // บันทึกข้อมูลลงฐานข้อมูล (เฉพาะ driver response)
    if (responseType && emergencyLogId) {
      try {
        const { data: responseData, error: responseError } = await supabase
          .from('emergency_responses')
          .insert({
            event_id: emergencyLogId,
            driver_id: driverId,
            response_type: responseType,
            sensor_type: detectedSensorType || originalSensorType,
            original_event_type: originalEventType,
            notes: notes,
            created_at: new Date(timestamp || Date.now()).toISOString()
          })
          .select();

        if (responseError) {
          console.error('Error saving emergency response:', responseError);
        } else {
          console.log('✅ Emergency response saved to database:', responseData);
        }

        // อัปเดตสถานะใน emergency_logs
        const updateData = {
          driver_response_type: responseType,
          driver_response_time: new Date(timestamp || Date.now()).toISOString(),
          driver_response_notes: notes,
          status: responseType === 'EMERGENCY' ? 'emergency_confirmed' : 
                 responseType === 'CONFIRMED_NORMAL' ? 'resolved' : 'checked'
        };

        // เพิ่มข้อมูล sensor type ถ้ามี
        if (detectedSensorType || originalSensorType) {
          updateData.driver_response_sensor_type = detectedSensorType || originalSensorType;
        }

        const { error: updateError } = await supabase
          .from('emergency_logs')
          .update(updateData)
          .eq('event_id', emergencyLogId);

        if (updateError) {
          console.error('Error updating emergency log:', updateError);
        } else {
          console.log('✅ Emergency log updated successfully');
        }
      } catch (error) {
        console.error('Database operation error:', error);
      }
    }

    // บันทึกข้อมูลเหตุการณ์ฉุกเฉิน (สำหรับ eventType)
    if (eventType && eventId) {
      try {
        // อัปเดตข้อมูลใน emergency_logs ถ้ามี
        const updateEventData = {
          sensor_type: detectedSensorType || sensorType,
          event_type: eventType,
          updated_at: new Date(timestamp || Date.now()).toISOString()
        };

        if (temperature) updateEventData.temperature = temperature;
        if (smokeLevel) updateEventData.smoke_level = smokeLevel;
        if (humidity) updateEventData.humidity = humidity;
        if (description) updateEventData.description = description;
        if (location) updateEventData.location = location;

        const { error: updateEventError } = await supabase
          .from('emergency_logs')
          .update(updateEventData)
          .eq('event_id', eventId);

        if (updateEventError) {
          console.error('Error updating emergency event log:', updateEventError);
        } else {
          console.log('✅ Emergency event log updated successfully');
        }
      } catch (error) {
        console.error('Database event operation error:', error);
      }
    }

    // Log การส่งข้อความ
    console.log(`📤 Emergency notification/response processed:`, {
      eventType,
      responseType,
      eventId,
      emergencyLogId,
      driverId,
      busId,
      isStudentEmergency,
      shouldSendToLine,
      detectedSensorType,
      originalSensorType,
      originalEventType,
      recipientCount: notificationResults.length,
      timestamp: currentTime
    });

    // ตรวจสอบและกำหนดค่า detectedSensorType หากยังเป็น null
    if (!detectedSensorType) {
      if (originalSensorType) {
        detectedSensorType = originalSensorType;
      } else if (sensorType) {
        detectedSensorType = sensorType;
      } else if (eventType === 'DRIVER_PANIC') {
        detectedSensorType = 'manual_driver_emergency';
      } else {
        detectedSensorType = 'unknown';
      }
    }

    return res.status(200).json({
      success: true,
      message: shouldSendToLine ? 
        (eventType ? 'Emergency notification sent successfully' : 'Driver response sent successfully') : 
        (eventType ? 'Event logged (no LINE notification sent)' : 'Driver response logged (no LINE notification sent)'),
      eventType,
      responseType,
      eventId,
      emergencyLogId,
      driverId,
      busId,
      isStudentEmergency,
      shouldSendToLine,
      detectedSensorType,
      originalSensorType,
      originalEventType,
      notificationResults,
      timestamp: currentTime
    });
  } catch (error) {
    console.error('❌ Emergency notification/response error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process emergency notification/response',
      details: error.message
    });
  }
}