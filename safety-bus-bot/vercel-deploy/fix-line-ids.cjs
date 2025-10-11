const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function fixIncompleteLineIds() {
  console.log('🔧 เริ่มแก้ไขปัญหาการจับคู่ LINE User ID ที่ไม่สมบูรณ์...\n');
  
  try {
    // ตรวจสอบ student_line_links ที่มี line_display_id แต่ไม่มี line_user_id
    const { data: incompleteStudents, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('active', true)
      .not('line_display_id', 'is', null)
      .is('line_user_id', null);
      
    if (studentError) {
      console.error('Error fetching incomplete student links:', studentError);
      return;
    }
    
    console.log(`📊 พบ Students ที่ไม่สมบูรณ์: ${incompleteStudents.length} รายการ`);
    
    // ตรวจสอบ parent_line_links ที่มี line_display_id แต่ไม่มี line_user_id
    const { data: incompleteParents, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('active', true)
      .not('line_display_id', 'is', null)
      .is('line_user_id', null);
      
    if (parentError) {
      console.error('Error fetching incomplete parent links:', parentError);
      return;
    }
    
    console.log(`📊 พบ Parents ที่ไม่สมบูรณ์: ${incompleteParents.length} รายการ`);
    
    // แสดงรายการที่ต้องแก้ไข
    if (incompleteStudents.length > 0) {
      console.log('\n🔍 Students ที่ต้องแก้ไข:');
      incompleteStudents.forEach((link, index) => {
        console.log(`${index + 1}. Student ID: ${link.student_id}, Display ID: ${link.line_display_id}`);
      });
    }
    
    if (incompleteParents.length > 0) {
      console.log('\n🔍 Parents ที่ต้องแก้ไข:');
      incompleteParents.forEach((link, index) => {
        console.log(`${index + 1}. Parent ID: ${link.parent_id}, Display ID: ${link.line_display_id}`);
      });
    }
    
    console.log('\n⚠️ หมายเหตุ: การแก้ไขปัญหานี้ต้องการ LINE User ID จริงจากการที่ผู้ใช้ส่งข้อความมาที่ Bot');
    console.log('💡 แนะนำให้ผู้ใช้ส่งข้อความใดๆ มาที่ Bot เพื่อให้ระบบจับคู่ LINE User ID อัตโนมัติ');
    
    // สร้างฟังก์ชันสำหรับแก้ไขด้วยตนเอง (ถ้าทราบ LINE User ID)
    console.log('\n📝 หากต้องการแก้ไขด้วยตนเอง สามารถใช้ฟังก์ชันด้านล่างนี้:');
    console.log('fixSpecificLineId(displayId, lineUserId, userType)');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// ฟังก์ชันสำหรับแก้ไขรายการเฉพาะ
async function fixSpecificLineId(displayId, lineUserId, userType) {
  try {
    console.log(`🔧 แก้ไข ${userType}: Display ID: ${displayId}, LINE User ID: ${lineUserId}`);
    
    const tableName = userType === 'student' ? 'student_line_links' : 'parent_line_links';
    
    const { error } = await supabase
      .from(tableName)
      .update({
        line_user_id: lineUserId,
        linked_at: new Date().toISOString()
      })
      .eq('line_display_id', displayId)
      .eq('active', true);
      
    if (error) {
      console.error(`Error updating ${userType}:`, error);
      return false;
    }
    
    console.log(`✅ แก้ไข ${userType} สำเร็จ`);
    return true;
    
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

// เรียกใช้ฟังก์ชันหลัก
fixIncompleteLineIds().catch(console.error);

// Export ฟังก์ชันสำหรับใช้งานภายนอก
module.exports = { fixSpecificLineId };