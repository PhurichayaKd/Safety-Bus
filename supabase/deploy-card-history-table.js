import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ตั้งค่า Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployCardHistoryTable() {
  try {
    console.log('🚀 กำลังสร้างตาราง card_history...');
    
    // อ่านไฟล์ SQL
    const sqlPath = path.join(__dirname, 'create-card-history-table.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // ลองใช้ RPC exec_sql ก่อน
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: sqlContent
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ สร้างตาราง card_history สำเร็จผ่าน RPC!');
      
      // ทดสอบการทำงานของตาราง
      await testCardHistoryTable();
      
      return true;
      
    } catch (rpcError) {
      console.log('⚠️  ไม่สามารถใช้ RPC exec_sql ได้:', rpcError.message);
      console.log('📋 กรุณารันคำสั่ง SQL ด้วยตนเองใน Supabase Dashboard:');
      console.log('   1. ไปที่ Supabase Dashboard > SQL Editor');
      console.log('   2. สร้าง query ใหม่และคัดลอกโค้ดจากไฟล์:');
      console.log(`   ${sqlPath}`);
      console.log('   3. รันคำสั่ง SQL');
      console.log('');
      console.log('หรือคัดลอกโค้ดด้านล่างนี้:');
      console.log('=' .repeat(80));
      console.log(sqlContent);
      console.log('=' .repeat(80));
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    
    // แสดงวิธีการติดตั้งด้วยตนเอง
    console.log('');
    console.log('📋 กรุณารันคำสั่ง SQL ด้วยตนเองใน Supabase Dashboard:');
    console.log('   1. ไปที่ Supabase Dashboard > SQL Editor');
    console.log('   2. สร้าง query ใหม่และคัดลอกโค้ดจากไฟล์:');
    console.log(`   ${path.join(__dirname, 'create-card-history-table.sql')}`);
    console.log('   3. รันคำสั่ง SQL');
    
    return false;
  }
}

async function testCardHistoryTable() {
  try {
    console.log('🧪 กำลังทดสอบตาราง card_history...');
    
    // ทดสอบการ insert ข้อมูลทดสอบ
    const { data: insertData, error: insertError } = await supabase
      .from('card_history')
      .insert({
        student_id: 999999, // student_id ที่ไม่มีจริง (สำหรับทดสอบ)
        action_type: 'issue',
        old_status: null,
        new_status: 'assigned',
        reason: 'Test card issuance',
        performed_by: 'test_user',
        metadata: {
          test: true,
          card_id: 'TEST_CARD_001'
        }
      })
      .select();
    
    if (insertError) {
      console.log('⚠️  การทดสอบ insert ล้มเหลว:', insertError.message);
      console.log('   แต่ตารางอาจถูกสร้างสำเร็จแล้ว');
    } else {
      console.log('✅ ทดสอบ insert สำเร็จ!');
      
      // ลบข้อมูลทดสอบ
      const { error: deleteError } = await supabase
        .from('card_history')
        .delete()
        .eq('student_id', 999999);
      
      if (!deleteError) {
        console.log('🧹 ลบข้อมูลทดสอบสำเร็จ');
      }
    }
    
    // ทดสอบฟังก์ชัน get_student_card_history
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_student_card_history', { p_student_id: 999999 });
    
    if (functionError) {
      console.log('⚠️  การทดสอบฟังก์ชัน get_student_card_history ล้มเหลว:', functionError.message);
    } else {
      console.log('✅ ทดสอบฟังก์ชัน get_student_card_history สำเร็จ!');
    }
    
  } catch (error) {
    console.log('⚠️  เกิดข้อผิดพลาดในการทดสอบ:', error.message);
  }
}

// เรียกใช้ฟังก์ชัน
if (require.main === module) {
  deployCardHistoryTable()
    .then(success => {
      if (success) {
        console.log('');
        console.log('🎉 การติดตั้งตาราง card_history เสร็จสิ้น!');
        console.log('');
        console.log('📝 ขั้นตอนต่อไป:');
        console.log('   1. ตรวจสอบว่าตารางถูกสร้างใน Supabase Dashboard');
        console.log('   2. ทดสอบการใช้งานฟังก์ชัน assignRfidCard ใหม่');
        console.log('   3. ตรวจสอบข้อมูลในตาราง card_history หลังจากออกบัตร');
      } else {
        console.log('');
        console.log('⚠️  กรุณาติดตั้งตารางด้วยตนเองตามคำแนะนำข้างต้น');
      }
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ เกิดข้อผิดพลาดร้ายแรง:', error);
      process.exit(1);
    });
}

module.exports = { deployCardHistoryTable, testCardHistoryTable };