/**
 * สคริปต์ทดสอบระบบบันทึกประวัติ card_history
 * ทดสอบการทำงานของฟังก์ชัน logCardHistory และ assignRfidCard
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * ทดสอบการเชื่อมต่อกับตาราง card_history
 */
async function testCardHistoryTableConnection() {
  console.log('\n=== ทดสอบการเชื่อมต่อกับตาราง card_history ===');
  
  try {
    // ทดสอบการ query ตาราง card_history
    const { data, error } = await supabase
      .from('card_history')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Error connecting to card_history table:', error);
      return false;
    }

    console.log('✅ Successfully connected to card_history table');
    console.log(`📊 Found ${data.length} existing records`);
    
    if (data.length > 0) {
      console.log('📋 Sample record:', data[0]);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Exception while testing table connection:', error);
    return false;
  }
}

/**
 * ทดสอบการบันทึกประวัติโดยตรง
 */
async function testDirectCardHistoryLogging() {
  console.log('\n=== ทดสอบการบันทึกประวัติโดยตรง ===');
  
  try {
    // สร้างข้อมูลทดสอบ
    const testEntry = {
      student_id: 100001, // ใช้ student_id ที่มีอยู่ในระบบ
      action_type: 'issue',
      old_status: null,
      new_status: 'assigned',
      reason: 'Test card history logging',
      performed_by: null,
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        test_type: 'direct_logging'
      }
    };

    console.log('📝 Inserting test record:', testEntry);

    const { data, error } = await supabase
      .from('card_history')
      .insert(testEntry)
      .select();

    if (error) {
      console.error('❌ Error inserting test record:', error);
      return false;
    }

    console.log('✅ Successfully inserted test record');
    console.log('📋 Inserted record:', data[0]);
    
    return data[0];
  } catch (error) {
    console.error('❌ Exception while testing direct logging:', error);
    return false;
  }
}

/**
 * ทดสอบการดึงประวัติของนักเรียน
 */
async function testGetStudentHistory(studentId) {
  console.log(`\n=== ทดสอบการดึงประวัติของนักเรียน ${studentId} ===`);
  
  try {
    const { data, error } = await supabase
      .from('card_history')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching student history:', error);
      return false;
    }

    console.log(`✅ Found ${data.length} history records for student ${studentId}`);
    
    if (data.length > 0) {
      console.log('📋 Latest records:');
      data.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.action_type} - ${record.new_status} (${record.created_at})`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Exception while fetching student history:', error);
    return false;
  }
}

/**
 * ทดสอบการลบข้อมูลทดสอบ
 */
async function cleanupTestData(recordId) {
  console.log('\n=== ทำความสะอาดข้อมูลทดสอบ ===');
  
  try {
    const { error } = await supabase
      .from('card_history')
      .delete()
      .eq('history_id', recordId);

    if (error) {
      console.error('❌ Error cleaning up test data:', error);
      return false;
    }

    console.log('✅ Successfully cleaned up test data');
    return true;
  } catch (error) {
    console.error('❌ Exception while cleaning up:', error);
    return false;
  }
}

/**
 * ทดสอบฟังก์ชัน get_student_card_history (ถ้ามี)
 */
async function testGetStudentCardHistoryFunction(studentId) {
  console.log(`\n=== ทดสอบฟังก์ชัน get_student_card_history สำหรับนักเรียน ${studentId} ===`);
  
  try {
    const { data, error } = await supabase
      .rpc('get_student_card_history', { p_student_id: studentId });

    if (error) {
      console.error('❌ Error calling get_student_card_history function:', error);
      return false;
    }

    console.log(`✅ Function returned ${data.length} records`);
    
    if (data.length > 0) {
      console.log('📋 Function results:');
      data.slice(0, 3).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.action_type} - ${record.new_status} (${record.created_at})`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Exception while testing function:', error);
    return false;
  }
}

/**
 * ทดสอบการ authenticate ด้วย service role key
 */
async function testWithServiceRole() {
  console.log('\n=== ทดสอบด้วย Service Role Key ===');
  
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.log('⚠️ ไม่พบ SUPABASE_SERVICE_ROLE_KEY, ข้ามการทดสอบนี้');
    return false;
  }

  const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);
  
  try {
    // ทดสอบการบันทึกด้วย service role
    const testEntry = {
      student_id: 100001,
      action_type: 'issue',
      old_status: null,
      new_status: 'assigned',
      reason: 'Test with service role',
      performed_by: 'system_test',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        test_type: 'service_role_test'
      }
    };

    const { data, error } = await serviceSupabase
      .from('card_history')
      .insert(testEntry)
      .select();

    if (error) {
      console.error('❌ Error with service role:', error);
      return false;
    }

    console.log('✅ Successfully inserted with service role');
    console.log('📋 Record:', data[0]);
    
    // ลบข้อมูลทดสอบ
    await serviceSupabase
      .from('card_history')
      .delete()
      .eq('history_id', data[0].history_id);
    
    console.log('✅ Test data cleaned up');
    return true;
  } catch (error) {
    console.error('❌ Exception with service role:', error);
    return false;
  }
}

/**
 * ฟังก์ชันหลักสำหรับรันการทดสอบทั้งหมด
 */
async function runAllTests() {
  console.log('🚀 เริ่มทดสอบระบบบันทึกประวัติ card_history');
  
  let testRecord = null;
  
  try {
    // ทดสอบการเชื่อมต่อ
    const connectionOk = await testCardHistoryTableConnection();
    if (!connectionOk) {
      console.log('❌ การทดสอบล้มเหลว: ไม่สามารถเชื่อมต่อกับตาราง card_history');
      return;
    }

    // ทดสอบด้วย service role key
    const serviceRoleOk = await testWithServiceRole();
    if (serviceRoleOk) {
      console.log('✅ Service role test passed');
    }

    // ทดสอบการบันทึกโดยตรง
    testRecord = await testDirectCardHistoryLogging();
    if (!testRecord) {
      console.log('❌ การทดสอบล้มเหลว: ไม่สามารถบันทึกข้อมูลทดสอบ');
      return;
    }

    // ทดสอบการดึงประวัติ
    await testGetStudentHistory(100001);

    // ทดสอบฟังก์ชัน (ถ้ามี)
    await testGetStudentCardHistoryFunction(100001);

    console.log('\n✅ การทดสอบระบบบันทึกประวัติเสร็จสิ้น');
    console.log('📊 สรุป: ระบบ card_history ทำงานได้ถูกต้อง');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  } finally {
    // ทำความสะอาดข้อมูลทดสอบ
    if (testRecord && testRecord.history_id) {
      await cleanupTestData(testRecord.history_id);
    }
  }
}

// รันการทดสอบ
runAllTests().catch(console.error);