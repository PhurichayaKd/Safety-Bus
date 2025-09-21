// check-user-links.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// โหลด environment variables
dotenv.config();

// สร้าง Supabase client โดยตรง
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkUserLinks() {
  try {
    const lineUserId = 'Uab3ef44e1dfaa1e269f44c5e97dcd7ba';
    const studentCode = '246662';
    
    console.log('🔍 ตรวจสอบการผูกบัญชีสำหรับ LINE User ID:', lineUserId);
    console.log('🔍 ตรวจสอบข้อมูลนักเรียนรหัส:', studentCode);
    
    // ตรวจสอบการผูกในตาราง parent_line_links
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('line_user_id', lineUserId);
    
    console.log('\n📊 ผลการค้นหาในตาราง parent_line_links:');
    if (parentError) {
      console.error('❌ Error:', parentError);
    } else {
      console.log('✅ จำนวนรายการที่พบ:', parentLinks?.length || 0);
      if (parentLinks && parentLinks.length > 0) {
        console.log('📋 รายละเอียด:', JSON.stringify(parentLinks, null, 2));
      } else {
        console.log('❌ ไม่พบการผูกบัญชีสำหรับ LINE User ID นี้');
      }
    }
    
    // ตรวจสอบการผูกในตาราง student_line_links
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('line_user_id', lineUserId);
    
    console.log('\n📊 ผลการค้นหาในตาราง student_line_links:');
    if (studentError) {
      console.error('❌ Error:', studentError);
    } else {
      console.log('✅ จำนวนรายการที่พบ:', studentLinks?.length || 0);
      if (studentLinks && studentLinks.length > 0) {
        console.log('📋 รายละเอียด:', JSON.stringify(studentLinks, null, 2));
      }
    }
    
    // ตรวจสอบข้อมูลนักเรียนรหัส 246662
    console.log('\n🔍 ตรวจสอบข้อมูลนักเรียนรหัส 246662:');
    const { data: student, error: studentDataError } = await supabase
      .from('students')
      .select('*')
      .eq('link_code', studentCode)
      .single();
    
    if (studentDataError) {
      console.error('❌ Error:', studentDataError);
    } else if (student) {
      console.log('✅ พบข้อมูลนักเรียน:', student);
      
      // ตรวจสอบข้อมูลผู้ปกครองของนักเรียนคนนี้
      const { data: parent, error: parentDataError } = await supabase
        .from('parents')
        .select('*')
        .eq('parent_id', student.parent_id)
        .single();
      
      if (parent) {
        console.log('👨‍👩‍👧‍👦 ข้อมูลผู้ปกครอง:', parent);
        
        // ตรวจสอบว่าผู้ปกครองคนนี้มีการผูกกับ LINE อื่นหรือไม่
        const { data: existingLinks, error: linkError } = await supabase
          .from('parent_line_links')
          .select('*')
          .eq('parent_id', student.parent_id);
        
        console.log('\n🔗 การผูกบัญชีที่มีอยู่ของผู้ปกครองคนนี้:');
        if (existingLinks && existingLinks.length > 0) {
          console.log('📋 รายการการผูก:', JSON.stringify(existingLinks, null, 2));
          
          existingLinks.forEach(link => {
            if (link.active) {
              console.log(`✅ การผูกที่ใช้งานอยู่: LINE User ID ${link.line_user_id}`);
            } else {
              console.log(`❌ การผูกที่ไม่ใช้งาน: LINE User ID ${link.line_user_id}`);
            }
          });
        } else {
          console.log('❌ ไม่พบการผูกบัญชีใดๆ สำหรับผู้ปกครองคนนี้');
        }
      }
    } else {
      console.log('❌ ไม่พบข้อมูลนักเรียนรหัส 246662');
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

checkUserLinks();