const { createClient } = require('@supabase/supabase-js');

// ใช้ค่า Supabase จริง
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLineUsers() {
  try {
    console.log('🔍 Checking LINE user data...\n');
    
    // ตรวจสอบ student_line_links
    console.log('📚 Student LINE Links:');
    const { data: studentLinks, error: studentError } = await supabase
      .from('student_line_links')
      .select('*')
      .eq('active', true);

    if (studentError) {
      console.error('❌ Error fetching student links:', studentError);
    } else {
      console.log(`Total active student links: ${studentLinks.length}`);
      studentLinks.forEach((link, index) => {
        console.log(`${index + 1}. Student ID: ${link.student_id}, LINE User ID: ${link.line_user_id}, Display ID: ${link.line_display_id}`);
      });
    }

    console.log('\n👨‍👩‍👧‍👦 Parent LINE Links:');
    // ตรวจสอบ parent_line_links
    const { data: parentLinks, error: parentError } = await supabase
      .from('parent_line_links')
      .select('*')
      .eq('active', true);

    if (parentError) {
      console.error('❌ Error fetching parent links:', parentError);
    } else {
      console.log(`Total active parent links: ${parentLinks.length}`);
      parentLinks.forEach((link, index) => {
        console.log(`${index + 1}. Parent ID: ${link.parent_id}, LINE User ID: ${link.line_user_id}, Display ID: ${link.line_display_id}`);
      });
    }

    // ตรวจสอบ notification_logs ล่าสุด
    console.log('\n📋 Recent Notification Logs:');
    const { data: notificationLogs, error: notificationError } = await supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (notificationError) {
      console.error('❌ Error fetching notification logs:', notificationError);
    } else {
      console.log(`Recent notification logs: ${notificationLogs.length}`);
      notificationLogs.forEach((log, index) => {
        console.log(`${index + 1}. Type: ${log.notification_type}, Status: ${log.status}, Recipient: ${log.recipient_id}, Time: ${log.created_at}`);
        if (log.error_details) {
          console.log(`   Error: ${JSON.stringify(log.error_details)}`);
        }
      });
    }

    // ตรวจสอบ emergency_logs ล่าสุด
    console.log('\n🚨 Recent Emergency Logs:');
    const { data: emergencyLogs, error: emergencyError } = await supabase
      .from('emergency_logs')
      .select('*')
      .order('event_time', { ascending: false })
      .limit(5);

    if (emergencyError) {
      console.error('❌ Error fetching emergency logs:', emergencyError);
    } else {
      console.log(`Recent emergency logs: ${emergencyLogs.length}`);
      emergencyLogs.forEach((log, index) => {
        console.log(`${index + 1}. Event ID: ${log.event_id}, Type: ${log.event_type}, Status: ${log.status}, Response: ${log.driver_response_type}, Time: ${log.event_time}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLineUsers();