import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the vercel-deploy directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');

dotenv.config({ path: envPath });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
  console.log('SUPABASE_KEY:', supabaseKey ? '✅ Found' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRfidAssignment() {
  console.log('🔍 ตรวจสอบการโยงบัตร RFID E398F334 กับนักเรียน 100014...\n');

  try {
    // 1. ตรวจสอบข้อมูลบัตร RFID
    console.log('1️⃣ ตรวจสอบข้อมูลบัตร RFID E398F334:');
    const { data: rfidCard, error: rfidError } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('rfid_code', 'E398F334')
      .single();

    if (rfidError) {
      console.error('❌ ข้อผิดพลาดในการดึงข้อมูลบัตร RFID:', rfidError);
      return;
    }

    if (!rfidCard) {
      console.log('❌ ไม่พบบัตร RFID E398F334 ในระบบ');
      return;
    }

    console.log('✅ พบบัตร RFID:', {
      card_id: rfidCard.card_id,
      rfid_code: rfidCard.rfid_code,
      status: rfidCard.status,
      is_active: rfidCard.is_active,
      created_at: rfidCard.created_at,
      last_seen_at: rfidCard.last_seen_at
    });

    // 2. ตรวจสอบการมอบหมายบัตร
    console.log('\n2️⃣ ตรวจสอบการมอบหมายบัตร:');
    const { data: assignment, error: assignmentError } = await supabase
      .from('rfid_card_assignments')
      .select('*')
      .eq('card_id', rfidCard.card_id)
      .eq('is_active', true)
      .single();

    if (assignmentError) {
      console.error('❌ ข้อผิดพลาดในการดึงข้อมูลการมอบหมาย:', assignmentError);
      return;
    }

    if (!assignment) {
      console.log('❌ ไม่พบการมอบหมายบัตรที่ active');
      return;
    }

    console.log('✅ พบการมอบหมายบัตร:', {
      card_id: assignment.card_id,
      student_id: assignment.student_id,
      valid_from: assignment.valid_from,
      valid_to: assignment.valid_to,
      assigned_by: assignment.assigned_by,
      is_active: assignment.is_active
    });

    // ตรวจสอบว่าโยงกับนักเรียน 100014 หรือไม่
    if (assignment.student_id === 100014) {
      console.log('✅ ยืนยัน: บัตร RFID E398F334 โยงกับนักเรียนรหัส 100014 ถูกต้อง');
    } else {
      console.log(`❌ ข้อผิดพลาด: บัตร RFID E398F334 โยงกับนักเรียนรหัส ${assignment.student_id} ไม่ใช่ 100014`);
      return;
    }

    // 3. ตรวจสอบข้อมูลนักเรียน
    console.log('\n3️⃣ ตรวจสอบข้อมูลนักเรียน 100014:');
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', 100014)
      .single();

    if (studentError) {
      console.error('❌ ข้อผิดพลาดในการดึงข้อมูลนักเรียน:', studentError);
      return;
    }

    if (!student) {
      console.log('❌ ไม่พบข้อมูลนักเรียนรหัส 100014');
      return;
    }

    console.log('✅ ข้อมูลนักเรียน:', {
      student_id: student.student_id,
      student_name: student.student_name,
      grade: student.grade,
      is_active: student.is_active,
      status: student.status,
      start_date: student.start_date,
      end_date: student.end_date,
      parent_id: student.parent_id
    });

    // 4. ตรวจสอบข้อมูลผู้ปกครอง
    if (student.parent_id) {
      console.log('\n4️⃣ ตรวจสอบข้อมูลผู้ปกครอง:');
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('*')
        .eq('parent_id', student.parent_id)
        .single();

      if (parentError) {
        console.error('❌ ข้อผิดพลาดในการดึงข้อมูลผู้ปกครอง:', parentError);
      } else if (parent) {
        console.log('✅ ข้อมูลผู้ปกครอง:', {
          parent_id: parent.parent_id,
          parent_name: parent.parent_name,
          parent_phone: parent.parent_phone
        });

        // ตรวจสอบการเชื่อมโยง Line ของผู้ปกครอง
        console.log('\n5️⃣ ตรวจสอบการเชื่อมโยง Line ของผู้ปกครอง:');
        const { data: parentLineLink, error: parentLineLinkError } = await supabase
          .from('parent_line_links')
          .select('*')
          .eq('parent_id', parent.parent_id)
          .eq('active', true);

        if (parentLineLinkError) {
          console.error('❌ ข้อผิดพลาดในการดึงข้อมูลการเชื่อมโยง Line ผู้ปกครอง:', parentLineLinkError);
        } else if (parentLineLink && parentLineLink.length > 0) {
          console.log('✅ การเชื่อมโยง Line ผู้ปกครอง:', parentLineLink.map(link => ({
            link_id: link.link_id,
            line_user_id: link.line_user_id,
            line_display_id: link.line_display_id,
            linked_at: link.linked_at,
            active: link.active
          })));
        } else {
          console.log('⚠️ ไม่พบการเชื่อมโยง Line ของผู้ปกครอง');
        }
      }
    }

    // 6. ตรวจสอบการเชื่อมโยง Line ของนักเรียน
    console.log('\n6️⃣ ตรวจสอบการเชื่อมโยง Line ของนักเรียน:');
    const { data: studentLineLink, error: studentLineLinkError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('student_id', 100014)
      .eq('active', true);

    if (studentLineLinkError) {
      console.error('❌ ข้อผิดพลาดในการดึงข้อมูลการเชื่อมโยง Line นักเรียน:', studentLineLinkError);
    } else if (studentLineLink && studentLineLink.length > 0) {
      console.log('✅ การเชื่อมโยง Line นักเรียน:', studentLineLink.map(link => ({
        link_id: link.link_id,
        line_user_id: link.line_user_id,
        line_display_id: link.line_display_id,
        linked_at: link.linked_at,
        active: link.active
      })));
    } else {
      console.log('⚠️ ไม่พบการเชื่อมโยง Line ของนักเรียน');
    }

    // 7. ตรวจสอบประวัติการสแกน RFID ล่าสุด
    console.log('\n7️⃣ ตรวจสอบประวัติการสแกน RFID ล่าสุด (5 ครั้งล่าสุด):');
    const { data: scanHistory, error: scanHistoryError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .eq('student_id', 100014)
      .order('event_time', { ascending: false })
      .limit(5);

    if (scanHistoryError) {
      console.error('❌ ข้อผิดพลาดในการดึงประวัติการสแกน:', scanHistoryError);
    } else if (scanHistory && scanHistory.length > 0) {
      console.log('✅ ประวัติการสแกนล่าสุด:');
      scanHistory.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.event_type} - ${record.event_time} (${record.location_type})`);
      });
    } else {
      console.log('⚠️ ไม่พบประวัติการสแกน RFID');
    }

    console.log('\n🎉 การตรวจสอบเสร็จสิ้น!');
    console.log('📋 สรุป:');
    console.log(`   - บัตร RFID: E398F334 (ID: ${rfidCard.card_id})`);
    console.log(`   - นักเรียน: ${student.student_name} (ID: ${student.student_id})`);
    console.log(`   - สถานะบัตร: ${rfidCard.status}`);
    console.log(`   - สถานะการมอบหมาย: ${assignment.is_active ? 'Active' : 'Inactive'}`);

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

// เรียกใช้ฟังก์ชัน
verifyRfidAssignment();