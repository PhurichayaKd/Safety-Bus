import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkRealLinkedUsers() {
  console.log('🔍 Checking Real Linked LINE Users in Database...\n');

  try {
    // ตรวจสอบ Student LINE Links ที่มี line_user_id จริง
    console.log('📱 Checking Student LINE Links...');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select(`
        link_id,
        student_id,
        line_user_id,
        line_display_id,
        linked_at,
        active,
        students!inner(student_name, grade, is_active)
      `)
      .eq('active', true)
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    if (studentError) {
      console.error('❌ Error fetching student links:', studentError);
    } else {
      console.log(`📊 Found ${studentLinks?.length || 0} active student LINE links:`);
      if (studentLinks && studentLinks.length > 0) {
        studentLinks.forEach((link, index) => {
          console.log(`   ${index + 1}. ${link.students.student_name} (Grade: ${link.students.grade})`);
          console.log(`      LINE User ID: ${link.line_user_id}`);
          console.log(`      Display ID: ${link.line_display_id || 'N/A'}`);
          console.log(`      Linked: ${new Date(link.linked_at).toLocaleString('th-TH')}`);
          console.log(`      Student Active: ${link.students.is_active}`);
          console.log('');
        });
      }
    }

    // ตรวจสอบ Parent LINE Links ที่มี line_user_id จริง
    console.log('👨‍👩‍👧‍👦 Checking Parent LINE Links...');
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select(`
        link_id,
        parent_id,
        line_user_id,
        line_display_id,
        linked_at,
        active,
        parents!inner(parent_name, parent_phone)
      `)
      .eq('active', true)
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');

    if (parentError) {
      console.error('❌ Error fetching parent links:', parentError);
    } else {
      console.log(`📊 Found ${parentLinks?.length || 0} active parent LINE links:`);
      if (parentLinks && parentLinks.length > 0) {
        parentLinks.forEach((link, index) => {
          console.log(`   ${index + 1}. ${link.parents.parent_name}`);
          console.log(`      Phone: ${link.parents.parent_phone}`);
          console.log(`      LINE User ID: ${link.line_user_id}`);
          console.log(`      Display ID: ${link.line_display_id || 'N/A'}`);
          console.log(`      Linked: ${new Date(link.linked_at).toLocaleString('th-TH')}`);
          console.log('');
        });
      }
    }

    // ตรวจสอบความสัมพันธ์ระหว่าง Student และ Parent
    if (studentLinks && studentLinks.length > 0) {
      console.log('🔗 Checking Student-Parent Relationships...');
      
      for (const studentLink of studentLinks) {
        const { data: guardians, error: guardianError } = await supabase
          .from('student_guardians')
          .select(`
            relationship,
            is_primary,
            parents!inner(parent_name, parent_phone),
            parent_line_links!inner(line_user_id, active)
          `)
          .eq('student_id', studentLink.student_id)
          .eq('parent_line_links.active', true);

        if (!guardianError && guardians && guardians.length > 0) {
          console.log(`   👨‍👩‍👧‍👦 ${studentLink.students.student_name} has ${guardians.length} linked parent(s):`);
          guardians.forEach((guardian, idx) => {
            console.log(`      ${idx + 1}. ${guardian.parents.parent_name} (${guardian.relationship})`);
            console.log(`         Phone: ${guardian.parents.parent_phone}`);
            console.log(`         LINE ID: ${guardian.parent_line_links.line_user_id}`);
            console.log(`         Primary: ${guardian.is_primary}`);
          });
          console.log('');
        }
      }
    }

    // สรุปข้อมูลสำหรับการทดสอบ
    console.log('📋 Summary for Testing:');
    console.log(`   📱 Students with LINE: ${studentLinks?.length || 0}`);
    console.log(`   👨‍👩‍👧‍👦 Parents with LINE: ${parentLinks?.length || 0}`);
    console.log(`   📊 Total LINE Users: ${(studentLinks?.length || 0) + (parentLinks?.length || 0)}`);

    if ((studentLinks?.length || 0) > 0 || (parentLinks?.length || 0) > 0) {
      console.log('\n✅ Ready to test real LINE notifications!');
      
      // แสดงตัวอย่าง LINE User ID สำหรับการทดสอบ
      if (studentLinks && studentLinks.length > 0) {
        console.log(`\n📱 Sample Student LINE User ID: ${studentLinks[0].line_user_id}`);
      }
      if (parentLinks && parentLinks.length > 0) {
        console.log(`👨‍👩‍👧‍👦 Sample Parent LINE User ID: ${parentLinks[0].line_user_id}`);
      }
    } else {
      console.log('\n⚠️ No active LINE users found in database');
    }

  } catch (error) {
    console.error('\n❌ Error checking linked users:', error.message);
  }
}

// รันการตรวจสอบ
checkRealLinkedUsers().catch(console.error);