import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ SUPABASE_URL หรือ SUPABASE_ANON_KEY ใน environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testViewFunction() {
  try {
    console.log('🔍 ทดสอบการรันไฟล์ create-student-today-status-view.sql...');
    
    // อ่านไฟล์ SQL
    const sqlContent = fs.readFileSync('./functions/create-student-today-status-view.sql', 'utf8');
    
    // แยก SQL statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    console.log(`📝 พบ ${statements.length} SQL statements`);
    
    // รัน SQL statements ทีละตัว
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        console.log(`\n🔄 รัน statement ${i + 1}...`);
        console.log(`SQL: ${statement.substring(0, 100)}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          console.error(`❌ Error ใน statement ${i + 1}:`, error);
          return;
        }
        
        console.log(`✅ Statement ${i + 1} สำเร็จ`);
      }
    }
    
    console.log('\n🎉 ทุก SQL statements รันสำเร็จแล้ว!');
    
    // ทดสอบ view
    console.log('\n🔍 ทดสอบ view v_student_today_status...');
    const { data: viewData, error: viewError } = await supabase
      .from('v_student_today_status')
      .select('*')
      .limit(5);
    
    if (viewError) {
      console.error('❌ Error ในการทดสอบ view:', viewError);
    } else {
      console.log('✅ View ทำงานได้ปกติ');
      console.log('ข้อมูลตัวอย่าง:', viewData);
    }
    
    // ทดสอบ function
    console.log('\n🔍 ทดสอบ function get_student_today_status...');
    const { data: funcData, error: funcError } = await supabase
      .rpc('get_student_today_status');
    
    if (funcError) {
      console.error('❌ Error ในการทดสอบ function:', funcError);
    } else {
      console.log('✅ Function ทำงานได้ปกติ');
      console.log('ข้อมูลตัวอย่าง:', funcData?.slice(0, 3));
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
  }
}

testViewFunction();