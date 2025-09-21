// check-existing-links.js
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// โหลด environment variables
dotenv.config();

// สร้าง Supabase client โดยตรง
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkExistingLinks() {
  try {
    const existingLineUserIds = ['dd333_', 'kkk11_'];
    
    console.log('🔍 ตรวจสอบ LINE User ID ที่มีการผูกอยู่แล้ว:');
    
    for (const lineUserId of existingLineUserIds) {
      console.log(`\n📱 ตรวจสอบ LINE User ID: ${lineUserId}`);
      
      // ตรวจสอบการผูกในตาราง parent_line_links
      const { data: parentLinks, error: parentError } = await supabase
        .from('parent_line_links')
        .select('*')
        .eq('line_user_id', lineUserId);
      
      if (parentError) {
        console.error('❌ Error:', parentError);
        continue;
      }
      
      if (parentLinks && parentLinks.length > 0) {
        console.log('✅ พบการผูกในตาราง parent_line_links:');
        console.log('📋 รายละเอียด:', JSON.stringify(parentLinks, null, 2));
        
        // ดึงข้อมูลผู้ปกครองและนักเรียน
        for (const link of parentLinks) {
          if (link.active) {
            const { data: parent, error: parentErr } = await supabase
              .from('parents')
              .select('*')
              .eq('parent_id', link.parent_id)
              .single();
            
            if (parent) {
              console.log(`👨‍👩‍👧‍👦 ผู้ปกครอง: ${parent.parent_name} (${parent.parent_phone})`);
              
              // ข้อมูลนักเรียนที่เกี่ยวข้อง
              const { data: students, error: studentsErr } = await supabase
                .from('students')
                .select('*')
                .eq('parent_id', link.parent_id);
              
              if (students && students.length > 0) {
                console.log('👦👧 นักเรียนที่เกี่ยวข้อง:');
                students.forEach(student => {
                  console.log(`  - ${student.student_name} (รหัส: ${student.link_code}, ชั้น: ${student.grade})`);
                });
              }
            }
          }
        }
      } else {
        console.log('❌ ไม่พบการผูกในตาราง parent_line_links');
      }
      
      // ตรวจสอบการผูกในตาราง student_line_links
      const { data: studentLinks, error: studentError } = await supabase
        .from('student_line_links')
        .select('*')
        .eq('line_user_id', lineUserId);
      
      if (studentError) {
        console.error('❌ Error in student_line_links:', studentError);
      } else if (studentLinks && studentLinks.length > 0) {
        console.log('✅ พบการผูกในตาราง student_line_links:');
        console.log('📋 รายละเอียด:', JSON.stringify(studentLinks, null, 2));
      }
    }
    
    // ตรวจสอบข้อมูลทั้งหมดในตาราง parent_line_links
    console.log('\n📊 ข้อมูลการผูกทั้งหมดในระบบ:');
    const { data: allLinks, error: allLinksError } = await supabase
      .from('parent_line_links')
      .select('*')
      .order('linked_at', { ascending: false });
    
    if (allLinksError) {
      console.error('❌ Error:', allLinksError);
    } else {
      console.log(`✅ จำนวนการผูกทั้งหมด: ${allLinks?.length || 0}`);
      if (allLinks && allLinks.length > 0) {
        allLinks.forEach(link => {
          const status = link.active ? '✅ ใช้งาน' : '❌ ไม่ใช้งาน';
          console.log(`${status} - LINE ID: ${link.line_user_id}, Parent ID: ${link.parent_id}, วันที่ผูก: ${link.linked_at}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

checkExistingLinks();