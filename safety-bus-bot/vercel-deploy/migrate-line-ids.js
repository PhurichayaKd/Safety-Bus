import { supabase } from './lib/db.js';

/**
 * สคริปต์สำหรับย้ายข้อมูล LINE ID ปกติจาก line_user_id ไปยัง line_display_id
 * และล้าง line_user_id เพื่อเตรียมเก็บ LINE User ID จริง
 */
async function migrateLineIds() {
  console.log('🚀 เริ่มต้นการย้ายข้อมูล LINE ID...');

  try {
    // ตรวจสอบโครงสร้างตาราง student_line_links ก่อน
    console.log('🔍 ตรวจสอบโครงสร้างตาราง student_line_links...');
    const { data: studentSample, error: studentSampleError } = await supabase
      .from('student_line_links')
      .select('*')
      .limit(1);

    if (studentSampleError) {
      console.error('❌ ข้อผิดพลาดในการตรวจสอบตาราง student_line_links:', studentSampleError);
      return;
    }

    console.log('📊 ตัวอย่างข้อมูล student_line_links:', studentSample?.[0] || 'ไม่มีข้อมูล');

    // ตรวจสอบโครงสร้างตาราง parent_line_links
    console.log('🔍 ตรวจสอบโครงสร้างตาราง parent_line_links...');
    const { data: parentSample, error: parentSampleError } = await supabase
      .from('parent_line_links')
      .select('*')
      .limit(1);

    if (parentSampleError) {
      console.error('❌ ข้อผิดพลาดในการตรวจสอบตาราง parent_line_links:', parentSampleError);
      return;
    }

    console.log('📊 ตัวอย่างข้อมูล parent_line_links:', parentSample?.[0] || 'ไม่มีข้อมูล');

    // 1. อัปเดตตาราง student_line_links
    console.log('📝 กำลังอัปเดตตาราง student_line_links...');
    
    // ดึงข้อมูลทั้งหมดเพื่อดูโครงสร้าง
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*');

    if (studentError) {
      console.error('❌ ข้อผิดพลาดในการดึงข้อมูล student_line_links:', studentError);
      return;
    }

    console.log(`📊 พบข้อมูล student_line_links ทั้งหมด: ${studentLinks?.length || 0} รายการ`);

    if (studentLinks && studentLinks.length > 0) {
      console.log('📋 คอลัมน์ที่มีในตาราง student_line_links:', Object.keys(studentLinks[0]));
      
      // ตรวจสอบว่ามีคอลัมน์ line_display_id หรือไม่
      const hasLineDisplayId = studentLinks[0].hasOwnProperty('line_display_id');
      console.log(`🔍 มีคอลัมน์ line_display_id: ${hasLineDisplayId}`);

      if (!hasLineDisplayId) {
        console.log('⚠️ ยังไม่มีคอลัมน์ line_display_id ในตาราง student_line_links');
        console.log('📝 กรุณารันสคริปต์ SQL เพื่อเพิ่มคอลัมน์ก่อน');
        return;
      }

      for (const link of studentLinks) {
        // ตรวจสอบว่ามี line_user_id และยังไม่มี line_display_id
        if (link.line_user_id && !link.line_display_id) {
          // ตรวจสอบว่า line_user_id เป็น LINE User ID จริง (U + 32 ตัวอักษร) หรือไม่
          const isRealLineUserId = /^U[a-f0-9]{32}$/i.test(link.line_user_id);
          
          if (isRealLineUserId) {
            // ถ้าเป็น LINE User ID จริง ให้เก็บไว้ใน line_user_id และไม่ต้องย้าย
            console.log(`✅ student_id ${link.student_id}: เป็น LINE User ID จริง - เก็บไว้ใน line_user_id`);
          } else {
            // ถ้าเป็น LINE Display ID ให้ย้ายไป line_display_id และล้าง line_user_id
            const { error: updateError } = await supabase
              .from('student_line_links')
              .update({
                line_display_id: link.line_user_id,
                line_user_id: null
              })
              .eq('student_id', link.student_id);

            if (updateError) {
              console.error(`❌ ข้อผิดพลาดในการอัปเดต student_id ${link.student_id}:`, updateError);
            } else {
              console.log(`✅ อัปเดต student_id ${link.student_id}: ย้าย "${link.line_user_id}" ไป line_display_id`);
            }
          }
        }
      }
    }

    // 2. อัปเดตตาราง parent_line_links
    console.log('📝 กำลังอัปเดตตาราง parent_line_links...');
    
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*');

    if (parentError) {
      console.error('❌ ข้อผิดพลาดในการดึงข้อมูล parent_line_links:', parentError);
      return;
    }

    console.log(`📊 พบข้อมูล parent_line_links ทั้งหมด: ${parentLinks?.length || 0} รายการ`);

    if (parentLinks && parentLinks.length > 0) {
      console.log('📋 คอลัมน์ที่มีในตาราง parent_line_links:', Object.keys(parentLinks[0]));
      
      // ตรวจสอบว่ามีคอลัมน์ line_display_id หรือไม่
      const hasLineDisplayId = parentLinks[0].hasOwnProperty('line_display_id');
      console.log(`🔍 มีคอลัมน์ line_display_id: ${hasLineDisplayId}`);

      if (!hasLineDisplayId) {
        console.log('⚠️ ยังไม่มีคอลัมน์ line_display_id ในตาราง parent_line_links');
        console.log('📝 กรุณารันสคริปต์ SQL เพื่อเพิ่มคอลัมน์ก่อน');
        return;
      }

      for (const link of parentLinks) {
        // ตรวจสอบว่ามี line_user_id และยังไม่มี line_display_id
        if (link.line_user_id && !link.line_display_id) {
          // ตรวจสอบว่า line_user_id เป็น LINE User ID จริง (U + 32 ตัวอักษร) หรือไม่
          const isRealLineUserId = /^U[a-f0-9]{32}$/i.test(link.line_user_id);
          
          if (isRealLineUserId) {
            // ถ้าเป็น LINE User ID จริง ให้เก็บไว้ใน line_user_id และไม่ต้องย้าย
            console.log(`✅ parent_id ${link.parent_id}: เป็น LINE User ID จริง - เก็บไว้ใน line_user_id`);
          } else {
            // ถ้าเป็น LINE Display ID ให้ย้ายไป line_display_id และล้าง line_user_id
            const { error: updateError } = await supabase
              .from('parent_line_links')
              .update({
                line_display_id: link.line_user_id,
                line_user_id: null
              })
              .eq('parent_id', link.parent_id);

            if (updateError) {
              console.error(`❌ ข้อผิดพลาดในการอัปเดต parent_id ${link.parent_id}:`, updateError);
            } else {
              console.log(`✅ อัปเดต parent_id ${link.parent_id}: ย้าย "${link.line_user_id}" ไป line_display_id`);
            }
          }
        }
      }
    }

    console.log('🎉 การย้ายข้อมูล LINE ID เสร็จสมบูรณ์!');
    
    // แสดงสรุปผลลัพธ์
    console.log('\n📊 สรุปผลลัพธ์:');
    
    // ตรวจสอบข้อมูลหลังการอัปเดต
    const { data: finalStudentLinks } = await supabase
      .from('student_line_links')
      .select('line_user_id, line_display_id');
    
    const { data: finalParentLinks } = await supabase
      .from('parent_line_links')
      .select('line_user_id, line_display_id');

    const studentWithDisplayId = finalStudentLinks?.filter(link => link.line_display_id) || [];
    const parentWithDisplayId = finalParentLinks?.filter(link => link.line_display_id) || [];
    const studentWithUserId = finalStudentLinks?.filter(link => link.line_user_id) || [];
    const parentWithUserId = finalParentLinks?.filter(link => link.line_user_id) || [];

    console.log(`✅ student_line_links ที่มี line_display_id: ${studentWithDisplayId.length} รายการ`);
    console.log(`✅ parent_line_links ที่มี line_display_id: ${parentWithDisplayId.length} รายการ`);
    console.log(`✅ student_line_links ที่มี line_user_id: ${studentWithUserId.length} รายการ`);
    console.log(`✅ parent_line_links ที่มี line_user_id: ${parentWithUserId.length} รายการ`);

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการย้ายข้อมูล:', error);
  }
}

// รันสคริปต์
migrateLineIds().then(() => {
  console.log('✅ สคริปต์เสร็จสิ้น');
  process.exit(0);
}).catch((error) => {
  console.error('❌ สคริปต์ล้มเหลว:', error);
  process.exit(1);
});