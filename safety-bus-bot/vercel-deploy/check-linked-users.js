import 'dotenv/config';
import { supabase } from './lib/db.js';

/**
 * ตรวจสอบผู้ใช้ที่ผูกบัญชีแล้วในระบบ
 */
async function checkLinkedUsers() {
  console.log('🔍 Checking for linked users in the database...\n');

  try {
    // ตรวจสอบ student_line_links
    console.log('📚 Student Line Links:');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        *,
        students (
          student_name,
          student_id,
          grade
        )
      `)
      .eq('active', true)
      .not('line_user_id', 'is', null);

    if (studentError) {
      console.error('❌ Error fetching student links:', studentError);
    } else if (studentLinks && studentLinks.length > 0) {
      studentLinks.forEach((link, index) => {
        console.log(`${index + 1}. Student: ${link.students?.student_name || 'Unknown'}`);
        console.log(`   User ID: ${link.line_user_id || 'Not set'}`);
        console.log(`   Display ID: ${link.line_display_id || 'Not set'}`);
        console.log(`   Grade: ${link.students?.grade || 'Unknown'}`);
        console.log(`   Linked At: ${link.linked_at || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('   ไม่พบนักเรียนที่ผูกบัญชีแล้ว');
    }

    // ตรวจสอบ parent_line_links
    console.log('\n👨‍👩‍👧‍👦 Parent Line Links:');
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select(`
        *,
        parents (
          parent_name,
          phone_number
        ),
        students (
          student_name,
          student_id,
          grade
        )
      `)
      .eq('active', true)
      .not('line_user_id', 'is', null);

    if (parentError) {
      console.error('❌ Error fetching parent links:', parentError);
    } else if (parentLinks && parentLinks.length > 0) {
      parentLinks.forEach((link, index) => {
        console.log(`${index + 1}. Parent: ${link.parents?.parent_name || 'Unknown'}`);
        console.log(`   Student: ${link.students?.student_name || 'Unknown'}`);
        console.log(`   User ID: ${link.line_user_id || 'Not set'}`);
        console.log(`   Display ID: ${link.line_display_id || 'Not set'}`);
        console.log(`   Phone: ${link.parents?.phone_number || 'Unknown'}`);
        console.log(`   Linked At: ${link.linked_at || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('   ไม่พบผู้ปกครองที่ผูกบัญชีแล้ว');
    }

    // สรุปผล
    const totalStudents = studentLinks?.length || 0;
    const totalParents = parentLinks?.length || 0;
    const totalLinked = totalStudents + totalParents;

    console.log('\n📊 Summary:');
    console.log(`Total linked students: ${totalStudents}`);
    console.log(`Total linked parents: ${totalParents}`);
    console.log(`Total linked users: ${totalLinked}`);

    if (totalLinked > 0) {
      console.log('\n💡 คุณสามารถใช้ User ID ใดๆ ข้างต้นเพื่อทดสอบเมนูติดต่อคนขับ');
      console.log('   โดยแทนที่ในไฟล์ test-contact-driver-linked-user.js');
    } else {
      console.log('\n⚠️ ไม่พบผู้ใช้ที่ผูกบัญชีแล้วในระบบ');
      console.log('   กรุณาให้ผู้ใช้ผูกบัญชีก่อนทดสอบ');
    }

  } catch (error) {
    console.error('❌ Error checking linked users:', error);
  }
}

// รันการตรวจสอบ
checkLinkedUsers();