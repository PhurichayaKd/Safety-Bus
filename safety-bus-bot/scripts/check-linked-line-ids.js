import dotenv from 'dotenv';
import { supabase } from '../lib/db.js';

dotenv.config();

async function checkLinkedLineIds() {
  try {
    console.log('🔍 ตรวจสอบ LINE ID ที่ผูกไว้ในระบบ\n');
    
    // ตรวจสอบ parent_line_links ทั้งหมด
    console.log('👨‍👩‍👧‍👦 ผู้ปกครองที่ผูก LINE ID (ทั้งหมด):');
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select(`
        line_user_id,
        linked_at,
        active,
        parents(
          parent_name,
          parent_phone
        )
      `)
      .order('linked_at', { ascending: false });
    
    if (parentError) {
      console.error('❌ Error fetching parent links:', parentError);
    } else if (parentLinks && parentLinks.length > 0) {
      parentLinks.forEach((link, index) => {
        console.log(`${index + 1}. LINE ID: ${link.line_user_id}`);
        console.log(`   ชื่อ: ${link.parents?.parent_name || 'ไม่ระบุ'}`);
        console.log(`   เบอร์: ${link.parents?.parent_phone || 'ไม่ระบุ'}`);
        console.log(`   สถานะ: ${link.active ? 'ใช้งาน' : 'ไม่ใช้งาน'}`);
        console.log(`   วันที่ผูก: ${new Date(link.linked_at).toLocaleString('th-TH')}`);
        console.log('');
      });
    } else {
      console.log('   ไม่มีผู้ปกครองที่ผูก LINE ID');
    }
    
    console.log('\n👨‍🎓 นักเรียนที่ผูก LINE ID (ทั้งหมด):');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        line_user_id,
        linked_at,
        active,
        students(
          student_name,
          grade
        )
      `)
      .order('linked_at', { ascending: false });
    
    if (studentError) {
      console.error('❌ Error fetching student links:', studentError);
    } else if (studentLinks && studentLinks.length > 0) {
      studentLinks.forEach((link, index) => {
        console.log(`${index + 1}. LINE ID: ${link.line_user_id}`);
        console.log(`   ชื่อ: ${link.students?.student_name || 'ไม่ระบุ'}`);
        console.log(`   ชั้น: ${link.students?.grade || 'ไม่ระบุ'}`);
        console.log(`   สถานะ: ${link.active ? 'ใช้งาน' : 'ไม่ใช้งาน'}`);
        console.log(`   วันที่ผูก: ${new Date(link.linked_at).toLocaleString('th-TH')}`);
        console.log('');
      });
    } else {
      console.log('   ไม่มีนักเรียนที่ผูก LINE ID');
    }
    
    // สรุปจำนวน
    const activeParents = parentLinks?.filter(link => link.active).length || 0;
    const activeStudents = studentLinks?.filter(link => link.active).length || 0;
    
    console.log('\n📊 สรุป:');
    console.log(`👨‍👩‍👧‍👦 ผู้ปกครองทั้งหมด: ${parentLinks?.length || 0} คน (ใช้งาน: ${activeParents} คน)`);
    console.log(`👨‍🎓 นักเรียนทั้งหมด: ${studentLinks?.length || 0} คน (ใช้งาน: ${activeStudents} คน)`);
    console.log(`🔗 รวมทั้งหมด: ${(parentLinks?.length || 0) + (studentLinks?.length || 0)} การผูก (ใช้งาน: ${activeParents + activeStudents} การผูก)`);
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

checkLinkedLineIds();