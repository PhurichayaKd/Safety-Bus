const { createClient } = require('@supabase/supabase-js');

// ใช้ค่า Supabase จริง
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLineLinking() {
  try {
    console.log('🧪 Testing LINE linking system...\n');

    // 1. ตรวจสอบสถานะปัจจุบันของ LINE links
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

    // 2. ตรวจสอบ link tokens ที่พร้อมใช้งาน
    console.log('\n🎫 Available Link Tokens:');
    
    const { data: studentTokens } = await supabase
      .from('student_link_tokens')
      .select(`
        token,
        students(student_id, student_name, grade)
      `)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    const { data: parentTokens } = await supabase
      .from('parent_link_tokens')
      .select(`
        token,
        parents(parent_id, parent_name)
      `)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    console.log(`📚 Student tokens available: ${studentTokens?.length || 0}`);
    console.log(`👨‍👩‍👧‍👦 Parent tokens available: ${parentTokens?.length || 0}`);

    // 3. ทดสอบ API verify-link-code
    console.log('\n🔗 Testing verify-link-code API...');
    
    if (studentTokens && studentTokens.length > 0) {
      const testToken = studentTokens[0].token;
      const testLineUserId = 'U' + Math.random().toString(36).substring(2, 15); // สร้าง fake LINE User ID
      
      console.log(`Testing with student token: ${testToken}`);
      console.log(`Fake LINE User ID: ${testLineUserId}`);
      
      try {
        const response = await fetch('https://safety-bus-liff-v4-new.vercel.app/api/verify-link-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            linkCode: testToken,
            lineUserId: testLineUserId
          })
        });

        const result = await response.json();
        console.log('✅ API Response:', result);
        
        if (result.success) {
          console.log('🎉 Link verification successful!');
          
          // ตรวจสอบว่า LINE User ID ถูกบันทึกในฐานข้อมูลหรือไม่
          const { data: updatedLink } = await supabase
            .from('student_line_links')
            .select('*')
            .eq('line_user_id', testLineUserId)
            .single();
            
          if (updatedLink) {
            console.log('✅ LINE User ID saved to database successfully');
          } else {
            console.log('❌ LINE User ID not found in database');
          }
        }
      } catch (error) {
        console.error('❌ API test failed:', error.message);
        console.log('💡 Make sure the Vercel app is deployed and accessible at https://safety-bus-liff-v4-new.vercel.app');
      }
    }

    // 4. ทดสอบการส่ง notification (จำลอง)
    console.log('\n📱 Testing notification system...');
    
    // ดึงข้อมูลผู้ใช้ที่มี LINE User ID
    const usersWithLineId = [
      ...studentsWithLineId.map(link => ({
        type: 'student',
        line_user_id: link.line_user_id,
        student_id: link.student_id
      })),
      ...parentsWithLineId.map(link => ({
        type: 'parent',
        line_user_id: link.line_user_id,
        parent_id: link.parent_id
      }))
    ];

    console.log(`📊 Users ready for notifications: ${usersWithLineId.length}`);
    
    if (usersWithLineId.length > 0) {
      console.log('✅ Notification system ready');
      console.log('📋 Users with LINE User IDs:');
      usersWithLineId.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.type} - LINE ID: ${user.line_user_id}`);
      });
    } else {
      console.log('⚠️  No users with LINE User IDs found');
      console.log('💡 Users need to link their accounts using the tokens above');
    }

    // 5. แสดงคำแนะนำสำหรับการทดสอบ
    console.log('\n📋 Testing Instructions:');
    console.log('1. 🤖 เพิ่มเพื่อน LINE Bot');
    console.log('2. 🎫 ส่งรหัสเชื่อมโยง (token) ใดๆ จากรายการข้างต้น');
    console.log('3. ✅ ตรวจสอบว่าระบบตอบกลับการเชื่อมโยงสำเร็จ');
    console.log('4. 🚨 ทดสอบการส่ง emergency notification');
    console.log('5. 📊 ตรวจสอบ notification logs ในฐานข้อมูล');

    console.log('\n🔧 Next Steps:');
    console.log('- รันสคริปต์นี้อีกครั้งหลังจากมีการเชื่อมโยง LINE User ID');
    console.log('- ทดสอบการส่ง notification จริงผ่าน emergency system');
    console.log('- ตรวจสอบ logs เพื่อยืนยันว่าระบบทำงานถูกต้อง');

  } catch (error) {
    console.error('❌ Error in testLineLinking:', error);
  }
}

testLineLinking();