const { createClient } = require('@supabase/supabase-js');

// ใช้ค่า Supabase จริง
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

// ฟังก์ชันสร้าง random token
function generateLinkToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

async function fixLineLinking() {
  try {
    console.log('🔧 Starting LINE linking fix...\n');

    // 1. ตรวจสอบข้อมูลปัจจุบัน
    console.log('📊 Current LINE linking status:');
    
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('active', true);

    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('active', true);

    if (studentError || parentError) {
      console.error('❌ Error fetching current links:', { studentError, parentError });
      return;
    }

    console.log(`📚 Student links: ${studentLinks.length} total`);
    const studentsWithLineId = studentLinks.filter(link => link.line_user_id && link.line_user_id !== 'null');
    console.log(`   - With LINE User ID: ${studentsWithLineId.length}`);
    console.log(`   - Without LINE User ID: ${studentLinks.length - studentsWithLineId.length}`);

    console.log(`👨‍👩‍👧‍👦 Parent links: ${parentLinks.length} total`);
    const parentsWithLineId = parentLinks.filter(link => link.line_user_id && link.line_user_id !== 'null');
    console.log(`   - With LINE User ID: ${parentsWithLineId.length}`);
    console.log(`   - Without LINE User ID: ${parentLinks.length - parentsWithLineId.length}`);

    // 2. สร้าง link tokens สำหรับนักเรียนที่ยังไม่มี LINE User ID
    console.log('\n🎫 Creating link tokens for students...');
    
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name, grade, parent_id');

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return;
    }

    let studentTokensCreated = 0;
    for (const student of students) {
      // ตรวจสอบว่ามี link token อยู่แล้วหรือไม่
      const { data: existingToken } = await supabase
        .from('student_link_tokens')
        .select('token')
        .eq('student_id', student.student_id)
        .is('used_at', null)
        .single();

      if (!existingToken) {
        const token = generateLinkToken();
        const { error: tokenError } = await supabase
          .from('student_link_tokens')
          .insert({
            student_id: student.student_id,
            token: token,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 วัน
          });

        if (!tokenError) {
          console.log(`✅ Created token for student ${student.student_id} (${student.student_name}): ${token}`);
          studentTokensCreated++;
        } else {
          console.error(`❌ Error creating token for student ${student.student_id}:`, tokenError);
        }
      }
    }

    // 3. สร้าง link tokens สำหรับผู้ปกครอง
    console.log('\n🎫 Creating link tokens for parents...');
    
    // ดึงข้อมูล parents แยกจาก students
    const { data: parents, error: parentsError } = await supabase
      .from('parents')
      .select('parent_id, parent_name');

    if (parentsError) {
      console.error('❌ Error fetching parents:', parentsError);
      return;
    }

    // ดึงข้อมูล student_guardians เพื่อหาความสัมพันธ์
    const { data: guardianRelations, error: guardianError } = await supabase
      .from('student_guardians')
      .select(`
        parent_id,
        student_id,
        students(student_id, student_name, grade)
      `);

    if (guardianError) {
      console.error('❌ Error fetching guardian relations:', guardianError);
      return;
    }

    let parentTokensCreated = 0;
    for (const parent of parents) {
      // ตรวจสอบว่ามี link token อยู่แล้วหรือไม่
      const { data: existingToken } = await supabase
        .from('parent_link_tokens')
        .select('token')
        .eq('parent_id', parent.parent_id)
        .is('used_at', null)
        .single();

      if (!existingToken) {
        const token = generateLinkToken();
        const { error: tokenError } = await supabase
          .from('parent_link_tokens')
          .insert({
            parent_id: parent.parent_id,
            token: token,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 วัน
          });

        if (!tokenError) {
          console.log(`✅ Created token for parent ${parent.parent_id} (${parent.parent_name}): ${token}`);
          parentTokensCreated++;
        } else {
          console.error(`❌ Error creating token for parent ${parent.parent_id}:`, tokenError);
        }
      }
    }

    // 4. แสดงสรุปผล
    console.log('\n📋 Summary:');
    console.log(`🎫 Student tokens created: ${studentTokensCreated}`);
    console.log(`🎫 Parent tokens created: ${parentTokensCreated}`);

    // 5. แสดง link tokens ที่สร้างใหม่
    console.log('\n🔗 Available Link Tokens:');
    
    const { data: allStudentTokens } = await supabase
      .from('student_link_tokens')
      .select(`
        token,
        students(student_id, student_name, grade)
      `)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    const { data: allParentTokens } = await supabase
      .from('parent_link_tokens')
      .select(`
        token,
        parents(parent_id, parent_name)
      `)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    console.log('\n📚 Student Link Tokens:');
    allStudentTokens?.forEach(tokenData => {
      const student = tokenData.students;
      console.log(`   ${student.student_id} (${student.student_name} ชั้น ${student.grade}): ${tokenData.token}`);
    });

    console.log('\n👨‍👩‍👧‍👦 Parent Link Tokens:');
    allParentTokens?.forEach(tokenData => {
      const parent = tokenData.parents;
      console.log(`   ${parent.parent_name} (Parent ID: ${parent.parent_id}): ${tokenData.token}`);
    });

    console.log('\n✅ LINE linking fix completed!');
    console.log('\n📱 Instructions for users:');
    console.log('1. เพิ่มเพื่อน LINE Bot');
    console.log('2. ส่งรหัสเชื่อมโยง (token) ที่ได้รับ');
    console.log('3. ระบบจะเชื่อมโยง LINE User ID อัตโนมัติ');

  } catch (error) {
    console.error('❌ Error in fixLineLinking:', error);
  }
}

fixLineLinking();