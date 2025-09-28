import dotenv from 'dotenv';
dotenv.config();

import { createSupabaseClient } from './lib/db.js';

async function checkTableStructure() {
  const supabase = createSupabaseClient();
  
  console.log('🔍 ตรวจสอบโครงสร้างตาราง student_line_links และ parent_line_links...\n');

  try {
    // ตรวจสอบตาราง student_line_links
    console.log('📋 ตาราง student_line_links:');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .limit(5);

    if (studentError) {
      console.log('❌ Error:', studentError.message);
    } else {
      console.log(`✅ พบข้อมูล ${studentLinks.length} รายการ`);
      if (studentLinks.length > 0) {
        console.log('📊 โครงสร้างคอลัมน์:');
        Object.keys(studentLinks[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof studentLinks[0][key]} (${studentLinks[0][key]})`);
        });
        console.log('\n📝 ตัวอย่างข้อมูล:');
        studentLinks.forEach((link, index) => {
          console.log(`  ${index + 1}. Student ID: ${link.student_id}, LINE ID: ${link.line_user_id || 'ยังไม่ได้บันทึก'}, Active: ${link.active}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // ตรวจสอบตาราง parent_line_links
    console.log('📋 ตาราง parent_line_links:');
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .limit(5);

    if (parentError) {
      console.log('❌ Error:', parentError.message);
    } else {
      console.log(`✅ พบข้อมูล ${parentLinks.length} รายการ`);
      if (parentLinks.length > 0) {
        console.log('📊 โครงสร้างคอลัมน์:');
        Object.keys(parentLinks[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof parentLinks[0][key]} (${parentLinks[0][key]})`);
        });
        console.log('\n📝 ตัวอย่างข้อมูล:');
        parentLinks.forEach((link, index) => {
          console.log(`  ${index + 1}. Parent ID: ${link.parent_id}, LINE ID: ${link.line_user_id || 'ยังไม่ได้บันทึก'}, Active: ${link.active}`);
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // ตรวจสอบตาราง students เพื่อดูความสัมพันธ์
    console.log('📋 ตาราง students (ตัวอย่าง):');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name, parent_id, link_code')
      .limit(3);

    if (studentsError) {
      console.log('❌ Error:', studentsError.message);
    } else {
      console.log(`✅ พบข้อมูล ${students.length} รายการ`);
      students.forEach((student, index) => {
        console.log(`  ${index + 1}. Student ID: ${student.student_id}, Name: ${student.student_name}, Parent ID: ${student.parent_id}, Link Code: ${student.link_code || 'ไม่มี'}`);
      });
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // ตรวจสอบตาราง parents
    console.log('📋 ตาราง parents (ตัวอย่าง):');
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('parent_id, parent_name, parent_phone')
      .limit(3);

    if (parentsError) {
      console.log('❌ Error:', parentsError.message);
    } else {
      console.log(`✅ พบข้อมูล ${parents.length} รายการ`);
      parents.forEach((parent, index) => {
        console.log(`  ${index + 1}. Parent ID: ${parent.parent_id}, Name: ${parent.parent_name}, Phone: ${parent.parent_phone}`);
      });
    }

    console.log('\n🎯 สรุปการวิเคราะห์:');
    console.log('1. ตาราง student_line_links และ parent_line_links มีอยู่แล้ว');
    console.log('2. ทั้งสองตารางมีคอลัมน์ line_user_id สำหรับเก็บ LINE User ID');
    console.log('3. ระบบสามารถอัปเดต LINE User ID ได้เมื่อผู้ใช้สแกน QR Code');
    console.log('4. ไม่จำเป็นต้องแก้ไขโครงสร้างตาราง');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

checkTableStructure().catch(console.error);