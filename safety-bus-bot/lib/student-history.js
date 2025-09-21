// lib/student-history.js
import { supabase } from './db.js';
import { lineClient } from './line.js';
import moment from 'moment';
import { checkLinkStatus } from './account-linking.js';

// ตั้งค่า timezone เป็นไทย
moment.locale('th');

/**
 * ดึงประวัติการเดินทางของนักเรียน
 * @param {string} studentId - รหัสนักเรียน
 * @param {Object} options - ตัวเลือกการค้นหา
 * @returns {Promise<Object>} ประวัติการเดินทาง
 */
async function getTravelHistory(studentId, options = {}) {
  const {
    limit = 10,
    days = 7,
    tripType = null, // 'pickup', 'dropoff', หรือ null สำหรับทั้งหมด
    startDate = null,
    endDate = null
  } = options;

  try {
    let query = supabase
      .from('trips')
      .select(`
        id, trip_type, location, coordinates, bus_number,
        created_at, updated_at,
        students(student_name),
        buses(bus_name, license_plate)
      `)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    // กรองตามประเภทการเดินทาง
    if (tripType) {
      query = query.eq('trip_type', tripType);
    }

    // กรองตามช่วงวันที่
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    } else if (days) {
      const daysAgo = moment().subtract(days, 'days').toISOString();
      query = query.gte('created_at', daysAgo);
    }

    // จำกัดจำนวนผลลัพธ์
    query = query.limit(limit);

    const { data: trips, error } = await query;

    if (error) {
      console.error('Error fetching travel history:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลประวัติ'
      };
    }

    return {
      success: true,
      trips: trips || [],
      total: trips ? trips.length : 0
    };

  } catch (error) {
    console.error('Error in getTravelHistory:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในระบบ'
    };
  }
}

/**
 * สร้างข้อความแสดงประวัติการเดินทาง
 * @param {Array} trips - รายการการเดินทาง
 * @param {string} studentName - ชื่อนักเรียน
 * @param {number} days - จำนวนวันที่ค้นหา
 * @returns {string} ข้อความประวัติการเดินทาง
 */
function formatTravelHistoryMessage(trips, studentName, days = 7) {
  if (!trips || trips.length === 0) {
    return `📊 Data History\n\n👦👧 นักเรียน: ${studentName}\n📅 ช่วงเวลา: ${days} วันที่ผ่านมา\n\n❌ ไม่มีข้อมูลการเดินทางในช่วงเวลานี้`;
  }

  let message = `📊 Data History\n\n👦👧 นักเรียน: ${studentName}\n📅 ช่วงเวลา: ${days} วันที่ผ่านมา\n📈 จำนวน: ${trips.length} รายการ\n\n`;

  // จัดกลุ่มตามวันที่
  const tripsByDate = {};
  trips.forEach(trip => {
    const date = moment(trip.created_at).format('DD/MM/YYYY');
    if (!tripsByDate[date]) {
      tripsByDate[date] = [];
    }
    tripsByDate[date].push(trip);
  });

  // แสดงข้อมูลแต่ละวัน
  Object.keys(tripsByDate).forEach(date => {
    message += `📅 ${date}\n`;
    
    tripsByDate[date].forEach(trip => {
      const time = moment(trip.created_at).format('HH:mm');
      const tripIcon = trip.trip_type === 'pickup' ? '🚌' : '🏠';
      const tripText = trip.trip_type === 'pickup' ? 'ขึ้นรถ' : 'ลงรถ';
      const busInfo = trip.buses ? `รถ ${trip.buses.license_plate}` : `รถ ${trip.bus_number}`;
      
      message += `  ${tripIcon} ${time} - ${tripText}\n`;
      message += `     📍 ${trip.location}\n`;
      message += `     🚐 ${busInfo}\n`;
    });
    
    message += '\n';
  });

  return message.trim();
}

/**
 * สร้าง Flex Message สำหรับแสดงประวัติการเดินทาง
 * @param {Array} trips - รายการการเดินทาง
 * @param {string} studentName - ชื่อนักเรียน
 * @param {number} days - จำนวนวันที่ค้นหา
 * @returns {Object} Flex Message
 */
function createTravelHistoryFlexMessage(trips, studentName, days = 7) {
  const contents = [];

  if (!trips || trips.length === 0) {
    return {
      type: 'flex',
      altText: 'Data History',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 Data History',
              weight: 'bold',
              size: 'lg',
              color: '#1DB446'
            }
          ]
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `👦👧 ${studentName}`,
              weight: 'bold',
              margin: 'md'
            },
            {
              type: 'text',
              text: `📅 ${days} วันที่ผ่านมา`,
              size: 'sm',
              color: '#666666'
            },
            {
              type: 'separator',
              margin: 'md'
            },
            {
              type: 'text',
              text: '❌ ไม่มีข้อมูลการเดินทาง',
              align: 'center',
              margin: 'md',
              color: '#999999'
            }
          ]
        }
      }
    };
  }

  // จัดกลุ่มตามวันที่
  const tripsByDate = {};
  trips.forEach(trip => {
    const date = moment(trip.created_at).format('DD/MM/YYYY');
    if (!tripsByDate[date]) {
      tripsByDate[date] = [];
    }
    tripsByDate[date].push(trip);
  });

  // สร้าง bubble สำหรับแต่ละวัน
  Object.keys(tripsByDate).slice(0, 10).forEach(date => { // จำกัดไม่เกิน 10 วัน
    const dayTrips = tripsByDate[date];
    const tripContents = [];

    dayTrips.forEach((trip, index) => {
      const time = moment(trip.created_at).format('HH:mm');
      const tripIcon = trip.trip_type === 'pickup' ? '🚌' : '🏠';
      const tripText = trip.trip_type === 'pickup' ? 'ขึ้นรถ' : 'ลงรถ';
      const busInfo = trip.buses ? trip.buses.license_plate : trip.bus_number;

      if (index > 0) {
        tripContents.push({
          type: 'separator',
          margin: 'sm'
        });
      }

      tripContents.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: tripIcon,
            size: 'sm',
            flex: 1
          },
          {
            type: 'box',
            layout: 'vertical',
            flex: 5,
            contents: [
              {
                type: 'text',
                text: `${time} - ${tripText}`,
                weight: 'bold',
                size: 'sm'
              },
              {
                type: 'text',
                text: `📍 ${trip.location}`,
                size: 'xs',
                color: '#666666'
              },
              {
                type: 'text',
                text: `🚐 ${busInfo}`,
                size: 'xs',
                color: '#666666'
              }
            ]
          }
        ],
        margin: 'sm'
      });
    });

    contents.push({
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `📅 ${date}`,
            weight: 'bold',
            size: 'md',
            color: '#1DB446'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: tripContents
      }
    });
  });

  return {
    type: 'flex',
    altText: `Data History - ${studentName}`,
    contents: {
      type: 'carousel',
      contents: contents
    }
  };
}

/**
 * ส่งข้อมูลนักเรียนและผู้ปกครองให้ผู้ใช้
 * @param {string} lineUserId - LINE User ID
 * @param {Object} options - ตัวเลือกการค้นหา
 */
async function sendTravelHistory(lineUserId, replyToken = null, options = {}) {
  try {
    // ตรวจสอบสถานะการเชื่อมโยง
    const linkStatus = await checkLinkStatus(lineUserId);
    
    if (!linkStatus.isLinked) {
      const message = {
        type: 'text',
        text: '❌ ยังไม่ได้เชื่อมโยงบัญชี\n\nกรุณาเชื่อมโยงบัญชีก่อนดูข้อมูล\nพิมพ์รหัสนักเรียนเพื่อเชื่อมโยงบัญชี'
      };
      
      if (replyToken) {
        await lineClient.replyMessage(replyToken, message);
      } else {
        await lineClient.pushMessage(lineUserId, message);
      }
      return;
    }

    const studentId = linkStatus.student_id;
    
    // ดึงข้อมูลนักเรียนแบบละเอียด
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        student_phone,
        start_date,
        end_date,
        rfid_tag,
        student_guardians!inner(
          relationship,
          is_primary,
          parents(
            parent_name,
            parent_phone
          )
        )
      `)
      .eq('student_id', studentId)
      .single();

    if (studentError || !studentData) {
      throw new Error('ไม่พบข้อมูลนักเรียน');
    }

    // ดึงข้อมูล RFID จากตาราง rfid_assignments
    const { data: rfidData } = await supabase
      .from('rfid_assignments')
      .select(`
        rfid_cards(
          rfid_code
        )
      `)
      .eq('student_id', studentId)
      .eq('active', true)
      .single();

    const rfidCode = rfidData?.rfid_cards?.rfid_code || studentData.rfid_tag || 'ไม่มีข้อมูล';

    // จัดเรียงผู้ปกครอง (หลักก่อน)
    const guardians = studentData.student_guardians
      .sort((a, b) => b.is_primary - a.is_primary)
      .map(g => ({
        name: g.parents?.parent_name || 'ไม่ระบุ',
        phone: g.parents?.parent_phone || 'ไม่ระบุ',
        relationship: g.relationship || 'ไม่ระบุ',
        isPrimary: g.is_primary
      }));

    // สร้างข้อความแสดงข้อมูล
    let message = `📋 ประวัติข้อมูลนักเรียน\n\n`;
    message += `👤 ชื่อเด็ก: ${studentData.student_name}\n`;
    message += `📞 เบอร์เด็ก: ${studentData.student_phone || 'ไม่ระบุ'}\n`;
    message += `🆔 ID: ${studentData.student_id}\n`;
    message += `🏷️ รหัสบัตร RFID: ${rfidCode}\n\n`;
    
    message += `👨‍👩‍👧‍👦 ข้อมูลผู้ปกครอง:\n`;
    guardians.forEach((guardian, index) => {
      const primaryMark = guardian.isPrimary ? ' (หลัก)' : '';
      message += `${index + 1}. ชื่อผู้ปกครอง: ${guardian.name}${primaryMark}\n`;
      message += `   📞 เบอร์ผู้ปกครอง: ${guardian.phone}\n`;
      if (index < guardians.length - 1) message += `\n`;
    });
    
    if (studentData.start_date || studentData.end_date) {
      message += `\n📅 ระยะเวลาใช้บริการ:\n`;
      message += `   เริ่มต้น: ${studentData.start_date ? moment(studentData.start_date).format('DD/MM/YYYY') : 'ไม่ระบุ'}\n`;
      message += `   สิ้นสุด: ${studentData.end_date ? moment(studentData.end_date).format('DD/MM/YYYY') : 'ไม่ระบุ'}`;
    }

    const responseMessage = {
      type: 'text',
      text: message
    };
    
    if (replyToken) {
      await lineClient.replyMessage(replyToken, responseMessage);
    } else {
      await lineClient.pushMessage(lineUserId, responseMessage);
    }
    
  } catch (error) {
    console.error('❌ Error sending student data:', error);
    if (error.response) {
      console.error('❌ LINE API Error Response:', error.response.data);
    }
    
    const errorMessage = {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูล\nกรุณาลองใหม่อีกครั้ง'
    };

    try {
      if (replyToken) {
         await lineClient.replyMessage(replyToken, errorMessage);
      } else {
        await lineClient.pushMessage(lineUserId, errorMessage);
      }
    } catch (sendError) {
      console.error('❌ Error sending error message:', sendError);
      if (sendError.response) {
        console.error('❌ LINE API Error Response (error message):', sendError.response.data);
      }
    }
  }
}

/**
 * ดึงสถิติการเดินทางของนักเรียน
 * @param {string} studentId - รหัสนักเรียน
 * @param {number} days - จำนวนวันที่ต้องการดูสถิติ
 * @returns {Promise<Object>} สถิติการเดินทาง
 */
async function getTravelStatistics(studentId, days = 30) {
  try {
    const daysAgo = moment().subtract(days, 'days').toISOString();
    
    // ดึงข้อมูลการเดินทางทั้งหมด
    const { data: trips, error } = await supabase
      .from('trips')
      .select('trip_type, created_at')
      .eq('student_id', studentId)
      .gte('created_at', daysAgo);
    
    if (error) {
      console.error('Error fetching travel statistics:', error);
      return {
        success: false,
        error: 'เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ'
      };
    }
    
    const pickupTrips = trips.filter(trip => trip.trip_type === 'pickup');
    const dropoffTrips = trips.filter(trip => trip.trip_type === 'dropoff');
    
    // คำนวณวันที่มาเรียน
    const schoolDays = new Set();
    pickupTrips.forEach(trip => {
      const date = moment(trip.created_at).format('YYYY-MM-DD');
      schoolDays.add(date);
    });
    
    // คำนวณเวลาเฉลี่ย
    const pickupTimes = pickupTrips.map(trip => moment(trip.created_at).format('HH:mm'));
    const dropoffTimes = dropoffTrips.map(trip => moment(trip.created_at).format('HH:mm'));
    
    return {
      success: true,
      statistics: {
        total_trips: trips.length,
        pickup_trips: pickupTrips.length,
        dropoff_trips: dropoffTrips.length,
        school_days: schoolDays.size,
        attendance_rate: schoolDays.size > 0 ? Math.round((schoolDays.size / days) * 100) : 0,
        avg_pickup_time: pickupTimes.length > 0 ? calculateAverageTime(pickupTimes) : null,
        avg_dropoff_time: dropoffTimes.length > 0 ? calculateAverageTime(dropoffTimes) : null,
        period_days: days
      }
    };
    
  } catch (error) {
    console.error('Error in getTravelStatistics:', error);
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในระบบ'
    };
  }
}

/**
 * คำนวณเวลาเฉลี่ย
 * @param {Array} times - รายการเวลาในรูปแบบ HH:mm
 * @returns {string} เวลาเฉลี่ย
 */
function calculateAverageTime(times) {
  if (!times || times.length === 0) return null;
  
  const totalMinutes = times.reduce((sum, time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return sum + (hours * 60) + minutes;
  }, 0);
  
  const avgMinutes = Math.round(totalMinutes / times.length);
  const hours = Math.floor(avgMinutes / 60);
  const minutes = avgMinutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * ส่งสถิติการเดินทางให้ผู้ปกครอง
 * @param {string} lineUserId - LINE User ID
 * @param {number} days - จำนวนวันที่ต้องการดูสถิติ
 * @returns {Promise<Object>} ผลลัพธ์การส่ง
 */
async function sendTravelStatistics(lineUserId, days = 30) {
  try {
    // ตรวจสอบการผูกบัญชี
    const linkStatus = await checkLinkStatus(lineUserId);
    
    if (!linkStatus.isLinked) {
      await client.pushMessage(lineUserId, {
        type: 'text',
        text: '❌ ยังไม่ได้ผูกบัญชี\nกรุณาส่งรหัสนักเรียนเพื่อผูกบัญชี'
      });
      return {
        success: false,
        error: 'ไม่ได้ผูกบัญชี'
      };
    }

    // ดึงสถิติการเดินทาง
    const statsResult = await getTravelStatistics(linkStatus.student_id, days);
    
    if (!statsResult.success) {
      await client.pushMessage(lineUserId, {
        type: 'text',
        text: `❌ ${statsResult.error}`
      });
      return statsResult;
    }

    const stats = statsResult.statistics;
    
    const message = `📈 สถิติการเดินทาง\n\n👦👧 นักเรียน: ${linkStatus.student_name}\n📅 ช่วงเวลา: ${days} วันที่ผ่านมา\n\n📊 สรุปข้อมูล:\n🚌 ขึ้นรถ: ${stats.pickup_trips} ครั้ง\n🏠 ลงรถ: ${stats.dropoff_trips} ครั้ง\n📚 วันที่มาเรียน: ${stats.school_days} วัน\n📈 อัตราการมาเรียน: ${stats.attendance_rate}%\n\n⏰ เวลาเฉลี่ย:\n🌅 ขึ้นรถ: ${stats.avg_pickup_time || 'ไม่มีข้อมูล'}\n🌆 ลงรถ: ${stats.avg_dropoff_time || 'ไม่มีข้อมูล'}`;
    
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });

    return {
      success: true,
      statistics: stats
    };

  } catch (error) {
    console.error('Error sending travel statistics:', error);
    
    await client.pushMessage(lineUserId, {
      type: 'text',
      text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถิติ\nกรุณาลองใหม่อีกครั้ง'
    });
    
    return {
      success: false,
      error: 'เกิดข้อผิดพลาดในระบบ'
    };
  }
}

export {
  getTravelHistory,
  sendTravelHistory,
  getTravelStatistics,
  sendTravelStatistics,
  formatTravelHistoryMessage,
  createTravelHistoryFlexMessage
};