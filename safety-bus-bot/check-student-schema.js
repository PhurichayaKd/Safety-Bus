import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkStudentSchema() {
  console.log('🔍 ตรวจสอบโครงสร้างตาราง students...');
  
  try {
    // ดึงข้อมูลนักเรียนทั้งหมดเพื่อดูโครงสร้าง
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .limit(3);
    
    if (studentsError) {
      console.log('❌ Error:', studentsError.message);
      return;
    }
    
    console.log('✅ ตัวอย่างข้อมูลนักเรียน:');
    console.log(JSON.stringify(students, null, 2));
    
    if (students && students.length > 0) {
      console.log('\n📋 ฟิลด์ที่มีในตาราง students:');
      console.log(Object.keys(students[0]));
    }
    
    // ตรวจสอบว่ามีฟิลด์ link_code หรือไม่
    console.log('\n🔍 ค้นหาข้อมูลที่มีรหัส 246662...');
    
    // ลองค้นหาด้วยฟิลด์ต่างๆ
    const searchFields = ['student_id', 'link_code', 'student_code', 'code', 'id'];
    
    for (const field of searchFields) {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq(field, '246662')
          .single();
        
        if (!error && data) {
          console.log(`✅ พบข้อมูลในฟิลด์ '${field}':`);
          console.log(JSON.stringify(data, null, 2));
          break;
        } else if (error && error.code !== 'PGRST116') {
          console.log(`❌ Error ในฟิลด์ '${field}':`, error.message);
        } else {
          console.log(`❌ ไม่พบข้อมูลในฟิลด์ '${field}'`);
        }
      } catch (e) {
        console.log(`❌ ไม่สามารถค้นหาในฟิลด์ '${field}':`, e.message);
      }
    }
    
    // ลองค้นหาแบบ LIKE สำหรับฟิลด์ที่เป็น text
    console.log('\n🔍 ค้นหาแบบ LIKE pattern...');
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .or('student_name.ilike.%246662%,link_code.ilike.%246662%,student_code.ilike.%246662%');
      
      if (!error && data && data.length > 0) {
        console.log('✅ พบข้อมูลที่ตรงกับ pattern:');
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log('❌ ไม่พบข้อมูลที่ตรงกับ pattern');
      }
    } catch (e) {
      console.log('❌ Error ในการค้นหา pattern:', e.message);
    }
    
  } catch (error) {
    console.error('💥 เกิดข้อผิดพลาด:', error);
  }
}

checkStudentSchema();