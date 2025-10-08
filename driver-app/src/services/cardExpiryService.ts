import { supabase } from './supabaseClient';

export interface ExpiringStudent {
  student_id: number;
  student_name: string;
  service_end_date: string;
  days_remaining: number;
  card_id: number;
  rfid_code: string;
  parent_line_id: string | null;
}

export interface ExpiredCard {
  student_id: number;
  student_name: string;
  card_id: number;
  rfid_code: string;
  service_end_date: string;
  expired_at: string;
  parent_line_id: string | null;
  days_remaining?: number; // เพิ่มเพื่อให้เข้ากันได้กับ ExpiringStudent
}

export interface ExpiryResult {
  expired_count: number;
  expired_cards: ExpiredCard[];
}

/**
 * ตรวจสอบและยกเลิกบัตรที่หมดอายุ
 */
export async function expireCards(): Promise<ExpiryResult> {
  try {
    const { data, error } = await supabase.rpc('fn_expire_cards');
    
    if (error) {
      console.error('Error expiring cards:', error);
      throw error;
    }

    const result = data?.[0];
    return {
      expired_count: result?.expired_count || 0,
      expired_cards: result?.expired_cards || []
    };
  } catch (error) {
    console.error('Failed to expire cards:', error);
    throw error;
  }
}

/**
 * ดึงรายการนักเรียนที่จะหมดอายุในอีก N วัน
 */
export async function getExpiringStudents(daysAhead: number = 7): Promise<ExpiringStudent[]> {
  try {
    const { data, error } = await supabase.rpc('fn_get_expiring_students', {
      days_ahead: daysAhead
    });
    
    if (error) {
      console.error('Error getting expiring students:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Failed to get expiring students:', error);
    throw error;
  }
}

/**
 * ส่งแจ้งเตือนไลน์เมื่อสิ้นสุดบริการ
 */
export async function sendServiceEndNotification(student: ExpiringStudent | ExpiredCard): Promise<boolean> {
  try {
    if (!student.parent_line_id) {
      console.log(`No Line ID found for student ${student.student_name} (${student.student_id})`);
      return false;
    }

    const isExpired = 'expired_at' in student;
    const message = isExpired 
      ? createServiceEndedMessage(student as ExpiredCard)
      : createServiceEndingMessage(student as ExpiringStudent);

    // ส่งข้อความผ่าน Line API
    const response = await fetch('/api/send-line-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: student.parent_line_id,
        message: message
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send Line message: ${response.statusText}`);
    }

    console.log(`Line notification sent to ${student.parent_line_id} for student ${student.student_name}`);
    return true;
  } catch (error) {
    console.error('Failed to send Line notification:', error);
    return false;
  }
}

/**
 * สร้างข้อความแจ้งเตือนสิ้นสุดบริการ
 */
function createServiceEndedMessage(student: ExpiredCard): string {
  return `🚌 แจ้งเตือนสิ้นสุดบริการรถรับ-ส่ง

สวัสดีครับ/ค่ะ

บริการรถรับ-ส่งของ ${student.student_name} ได้สิ้นสุดลงแล้ว

📅 วันที่สิ้นสุดบริการ: ${formatThaiDate(student.service_end_date)}
🎫 บัตร RFID: ${student.rfid_code}

บัตร RFID ได้ถูกยกเลิกการใช้งานแล้ว และจะกลับมาอยู่ในระบบเพื่อรอการใช้งานใหม่

ขอบคุณที่ใช้บริการรถรับ-ส่งนักเรียน 🙏

หากต้องการต่ออายุบริการ กรุณาติดต่อเจ้าหน้าที่`;
}

/**
 * สร้างข้อความแจ้งเตือนใกล้สิ้นสุดบริการ
 */
function createServiceEndingMessage(student: ExpiringStudent): string {
  const daysText = student.days_remaining === 1 ? 'พรุ่งนี้' : `อีก ${student.days_remaining} วัน`;
  
  return `🚌 แจ้งเตือนใกล้สิ้นสุดบริการรถรับ-ส่ง

สวัสดีครับ/ค่ะ

บริการรถรับ-ส่งของ ${student.student_name} จะสิ้นสุด${daysText}

📅 วันที่สิ้นสุดบริการ: ${formatThaiDate(student.service_end_date)}
🎫 บัตร RFID: ${student.rfid_code}

หากต้องการต่ออายุบริการ กรุณาติดต่อเจ้าหน้าที่ก่อนวันที่สิ้นสุดบริการ

ขอบคุณครับ/ค่ะ 🙏`;
}

/**
 * แปลงวันที่เป็นรูปแบบไทย
 */
function formatThaiDate(dateString: string): string {
  const date = new Date(dateString);
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  
  const day = date.getDate();
  const month = thaiMonths[date.getMonth()];
  const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  
  return `${day} ${month} ${year}`;
}

/**
 * ตรวจสอบและส่งแจ้งเตือนสำหรับนักเรียนที่จะหมดอายุ
 */
export async function checkAndNotifyExpiringStudents(daysAhead: number = 1): Promise<{
  notified: number;
  failed: number;
  students: ExpiringStudent[];
}> {
  try {
    const expiringStudents = await getExpiringStudents(daysAhead);
    let notified = 0;
    let failed = 0;

    for (const student of expiringStudents) {
      const success = await sendServiceEndNotification(student);
      if (success) {
        notified++;
      } else {
        failed++;
      }
      
      // หน่วงเวลาเล็กน้อยระหว่างการส่งข้อความ
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      notified,
      failed,
      students: expiringStudents
    };
  } catch (error) {
    console.error('Failed to check and notify expiring students:', error);
    throw error;
  }
}

/**
 * ตรวจสอบและยกเลิกบัตรที่หมดอายุ พร้อมส่งแจ้งเตือน
 */
export async function expireCardsAndNotify(): Promise<{
  expired: ExpiryResult;
  notified: number;
  failed: number;
}> {
  try {
    // ยกเลิกบัตรที่หมดอายุ
    const expiryResult = await expireCards();
    
    let notified = 0;
    let failed = 0;

    // ส่งแจ้งเตือนสำหรับบัตรที่ถูกยกเลิก
    for (const expiredCard of expiryResult.expired_cards) {
      // ดึงข้อมูล Line ID ของผู้ปกครอง
      const { data: parentData } = await supabase
        .from('parent_line_links')
        .select('line_display_id')
        .eq('student_id', expiredCard.student_id)
        .maybeSingle();

      if (parentData?.line_display_id) {
        const cardWithLineId = {
          ...expiredCard,
          parent_line_id: parentData.line_display_id
        };
        
        const success = await sendServiceEndNotification(cardWithLineId);
        if (success) {
          notified++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }
      
      // หน่วงเวลาเล็กน้อยระหว่างการส่งข้อความ
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return {
      expired: expiryResult,
      notified,
      failed
    };
  } catch (error) {
    console.error('Failed to expire cards and notify:', error);
    throw error;
  }
}