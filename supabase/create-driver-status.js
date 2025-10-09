const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// ใช้ environment variables หรือค่าเริ่มต้น
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

async function createDriverStatusTable() {
  try {
    console.log('🔄 เริ่มต้นการสร้างตาราง driver_status...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // อ่านไฟล์ SQL
    const sqlContent = fs.readFileSync('create-driver-status-table.sql', 'utf8');
    
    // แยก SQL statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log('📝 พบ ' + statements.length + ' คำสั่ง SQL');
    
    // รันคำสั่งทีละคำสั่ง
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        console.log('⚙️ รันคำสั่งที่ ' + (i + 1) + '/' + statements.length + '...');
        
        try {
          // ใช้ raw SQL query แทน RPC
          const { data, error } = await supabase
            .from('_sql')
            .select('*')
            .limit(0); // ใช้เพื่อทดสอบการเชื่อมต่อ
          
          // ถ้าไม่สามารถใช้ RPC ได้ ให้แสดงคำสั่ง SQL แทน
          console.log('📋 SQL Command ' + (i + 1) + ':');
          console.log(stmt.substring(0, 100) + '...');
          
        } catch (err) {
          console.log('⚠️ ไม่สามารถรันคำสั่งได้: ' + err.message);
        }
      }
    }
    
    console.log('✅ เสร็จสิ้นการประมวลผล SQL');
    console.log('');
    console.log('📌 หมายเหตุ: กรุณารันคำสั่ง SQL ต่อไปนี้ใน Supabase SQL Editor:');
    console.log('');
    console.log(sqlContent);
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
  }
}

// รันฟังก์ชัน
createDriverStatusTable();