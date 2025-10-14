import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStudentsTable() {
  console.log('🔍 ตรวจสอบโครงสร้างตาราง students');
  console.log('=' .repeat(60));

  try {
    // ดึงข้อมูลนักเรียนทั้งหมด
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ ไม่สามารถดึงข้อมูลนักเรียนได้:', error);
      return;
    }

    if (!students || students.length === 0) {
      console.log('⚠️  ไม่พบข้อมูลนักเรียน');
      return;
    }

    console.log(`📊 พบนักเรียนทั้งหมด ${students.length} คน (แสดง 5 คนแรก)`);
    console.log('\n📋 โครงสร้างข้อมูล:');
    console.log('-'.repeat(80));
    
    // แสดงคอลัมน์ทั้งหมด
    const firstStudent = students[0];
    console.log('คอลัมน์ที่มีอยู่:');
    Object.keys(firstStudent).forEach(key => {
      console.log(`- ${key}: ${typeof firstStudent[key]} (${firstStudent[key]})`);
    });

    console.log('\n📋 ข้อมูลนักเรียน 5 คนแรก:');
    console.log('-'.repeat(80));
    students.forEach(student => {
      console.log(`ID: ${student.student_id}, ชื่อ: ${student.student_name}`);
      console.log(`  ข้อมูลทั้งหมด:`, JSON.stringify(student, null, 2));
      console.log('-'.repeat(40));
    });

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

// รันการตรวจสอบ
checkStudentsTable().then(() => {
  console.log('\n✅ การตรวจสอบเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});