require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 ตรวจสอบโครงสร้างตาราง pickup_dropoff...\n');

  try {
    // ลองดึงข้อมูลตัวอย่างเพื่อดูโครงสร้าง
    console.log('📊 ดึงข้อมูลตัวอย่างจากตาราง pickup_dropoff:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('⚠️ Error getting sample data:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log('✅ พบข้อมูลตัวอย่าง:');
      const record = sampleData[0];
      console.log('\n📋 Columns ในตาราง:');
      Object.keys(record).forEach((key, index) => {
        const value = record[key];
        const type = typeof value;
        console.log(`${index + 1}. ${key}: ${value} (${type})`);
      });
    } else {
      console.log('📭 ไม่มีข้อมูลในตาราง - ลองสร้างข้อมูลทดสอบ');
    }

    // ลองใช้ SQL query ผ่าน RPC
    console.log('\n🔍 ตรวจสอบโครงสร้างผ่าน SQL query:');
    
    // สร้าง function ชั่วคราวเพื่อตรวจสอบโครงสร้าง
    const checkStructureSQL = `
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        generation_expression
      FROM information_schema.columns 
      WHERE table_name = 'pickup_dropoff' 
        AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log('📝 SQL Query:', checkStructureSQL);

    // ลองใช้ raw SQL
    const { data: structureData, error: structureError } = await supabase
      .rpc('exec_sql', { sql_query: checkStructureSQL });

    if (structureError) {
      console.log('⚠️ Error with RPC:', structureError.message);
      
      // ลองวิธีอื่น - ใช้ INSERT ทดสอบเพื่อดูข้อผิดพลาด
      console.log('\n🧪 ทดสอบ INSERT เพื่อดูข้อผิดพลาด:');
      const testInsert = await supabase
        .from('pickup_dropoff')
        .insert({
          student_id: 999999,
          driver_id: 1,
          event_time: new Date().toISOString(),
          event_type: 'test',
          location_type: 'test',
          pickup_source: 'test'
        });

      if (testInsert.error) {
        console.log('❌ Test INSERT Error:', testInsert.error.message);
        
        if (testInsert.error.message.includes('event_local_date')) {
          console.log('\n💡 ปัญหาคือ column event_local_date!');
          console.log('   - อาจเป็น GENERATED column หรือมี constraint พิเศษ');
          console.log('   - ต้องแก้ไขฟังก์ชันให้ไม่ส่งค่า event_local_date');
        }
      } else {
        console.log('✅ Test INSERT สำเร็จ');
        // ลบข้อมูลทดสอบ
        await supabase
          .from('pickup_dropoff')
          .delete()
          .eq('student_id', 999999);
      }
      
    } else {
      console.log('✅ โครงสร้างตาราง:', structureData);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkTableStructure();