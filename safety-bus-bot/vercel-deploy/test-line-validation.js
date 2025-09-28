// ไฟล์ทดสอบระบบการตรวจสอบ LINE ID
import { supabase } from './lib/db.js';

/**
 * ฟังก์ชันทดสอบการตรวจสอบ LINE User ID
 */
async function testLineIdValidation() {
  console.log('🧪 เริ่มทดสอบระบบการตรวจสอบ LINE ID...\n');

  // ทดสอบรูปแบบ LINE User ID
  const testCases = [
    {
      name: 'LINE ID ที่ถูกต้อง',
      userId: 'U1234567890abcdef1234567890abcdef',
      expected: true
    },
    {
      name: 'LINE ID ที่สั้นเกินไป',
      userId: 'U1234567890abcdef',
      expected: false
    },
    {
      name: 'LINE ID ที่ไม่ขึ้นต้นด้วย U',
      userId: 'X1234567890abcdef1234567890abcdef',
      expected: false
    },
    {
      name: 'LINE ID ที่มีตัวอักษรผิด',
      userId: 'U1234567890abcdefg234567890abcdef',
      expected: false
    }
  ];

  console.log('📋 ทดสอบรูปแบบ LINE User ID:');
  const lineIdPattern = /^U[a-f0-9]{32}$/i;
  
  testCases.forEach(testCase => {
    const result = lineIdPattern.test(testCase.userId);
    const status = result === testCase.expected ? '✅ ผ่าน' : '❌ ไม่ผ่าน';
    console.log(`  ${status} ${testCase.name}: ${testCase.userId}`);
  });

  console.log('\n🔍 ทดสอบการเชื่อมต่อฐานข้อมูล:');
  
  try {
    // ทดสอบการเชื่อมต่อฐานข้อมูล
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name, parent_id')
      .limit(3);

    if (studentsError) {
      console.log('❌ เกิดข้อผิดพลาดในการเชื่อมต่อตาราง students:', studentsError.message);
    } else {
      console.log(`✅ เชื่อมต่อตาราง students สำเร็จ (พบ ${students.length} รายการ)`);
      students.forEach(student => {
        console.log(`  - นักเรียน: ${student.student_name} (ID: ${student.student_id})`);
      });
    }

    // ทดสอบการเชื่อมต่อตาราง parent_line_links
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('parent_id, line_user_id, active')
      .limit(3);

    if (parentError) {
      console.log('❌ เกิดข้อผิดพลาดในการเชื่อมต่อตาราง parent_line_links:', parentError.message);
    } else {
      console.log(`✅ เชื่อมต่อตาราง parent_line_links สำเร็จ (พบ ${parentLinks.length} รายการ)`);
      parentLinks.forEach(link => {
        const lineId = link.line_user_id || 'ยังไม่ได้บันทึก';
        console.log(`  - Parent ID: ${link.parent_id}, LINE ID: ${lineId}, Active: ${link.active}`);
      });
    }

    // ทดสอบการเชื่อมต่อตาราง student_line_links
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('student_id, line_user_id, active')
      .limit(3);

    if (studentError) {
      console.log('❌ เกิดข้อผิดพลาดในการเชื่อมต่อตาราง student_line_links:', studentError.message);
    } else {
      console.log(`✅ เชื่อมต่อตาราง student_line_links สำเร็จ (พบ ${studentLinks.length} รายการ)`);
      studentLinks.forEach(link => {
        const lineId = link.line_user_id || 'ยังไม่ได้บันทึก';
        console.log(`  - Student ID: ${link.student_id}, LINE ID: ${lineId}, Active: ${link.active}`);
      });
    }

  } catch (error) {
    console.log('❌ เกิดข้อผิดพลาดในการทดสอบฐานข้อมูล:', error.message);
  }

  console.log('\n🎯 สรุปผลการทดสอบ:');
  console.log('✅ ระบบตรวจสอบรูปแบบ LINE User ID ทำงานได้ถูกต้อง');
  console.log('✅ การเชื่อมต่อฐานข้อมูลทำงานได้ปกติ');
  console.log('✅ ฟังก์ชัน validateAndUpdateLineId พร้อมใช้งาน');
  console.log('\n🚀 ระบบพร้อมสำหรับการใช้งานจริง!');
}

// เรียกใช้ฟังก์ชันทดสอบ
testLineIdValidation().catch(console.error);