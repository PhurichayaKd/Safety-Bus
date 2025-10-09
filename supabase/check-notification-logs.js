require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_ANON_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNotificationLogsTable() {
  console.log('🔍 ตรวจสอบโครงสร้างตาราง notification_logs...\n');

  try {
    // ตรวจสอบโครงสร้างตาราง
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'notification_logs' })
      .single();

    if (columnsError) {
      console.log('⚠️ ไม่สามารถใช้ RPC function ได้, ลองวิธีอื่น...');
      
      // ลองดึงข้อมูลตัวอย่างเพื่อดูโครงสร้าง
      const { data: sampleData, error: sampleError } = await supabase
        .from('notification_logs')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Error accessing notification_logs:', sampleError.message);
        
        // ตรวจสอบว่าตารางมีอยู่หรือไม่
        const { data: tableExists, error: tableError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', 'notification_logs')
          .eq('table_schema', 'public');

        if (tableError) {
          console.error('❌ Error checking table existence:', tableError.message);
        } else if (tableExists && tableExists.length > 0) {
          console.log('✅ ตาราง notification_logs มีอยู่');
        } else {
          console.log('❌ ตาราง notification_logs ไม่มีอยู่');
        }
      } else {
        console.log('✅ ตาราง notification_logs มีอยู่');
        if (sampleData && sampleData.length > 0) {
          console.log('📋 Columns ที่พบ:', Object.keys(sampleData[0]));
        } else {
          console.log('📋 ตารางว่าง - ไม่สามารถดู columns ได้');
        }
      }
    } else {
      console.log('✅ โครงสร้างตาราง:', columns);
    }

    // ลองสร้างข้อมูลทดสอบเพื่อดูว่า column ไหนขาด
    console.log('\n🧪 ทดสอบการ insert ข้อมูล...');
    const testData = {
      student_id: 'test_student',
      driver_id: 1,
      notification_type: 'test',
      message: 'Test message',
      status: 'test'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('notification_logs')
      .insert(testData)
      .select();

    if (insertError) {
      console.error('❌ Insert Error:', insertError.message);
      console.log('💡 ข้อผิดพลาดนี้จะช่วยบอกว่า column ไหนขาด');
    } else {
      console.log('✅ Insert สำเร็จ:', insertData);
      
      // ลบข้อมูลทดสอบ
      await supabase
        .from('notification_logs')
        .delete()
        .eq('message', 'Test message');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkNotificationLogsTable();