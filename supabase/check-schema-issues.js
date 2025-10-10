require('dotenv').config({ path: '../driver-app/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableSchema(tableName) {
  console.log(`\n🔍 ตรวจสอบโครงสร้างตาราง "${tableName}"...`);
  
  try {
    // ลองดึงข้อมูล 1 แถวเพื่อดู columns ที่มีอยู่
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (sampleError) {
      console.log(`❌ ตาราง "${tableName}" ไม่พบ:`, sampleError.message);
      return;
    }

    console.log(`✅ ตาราง "${tableName}" พบแล้ว`);
    
    if (sampleData && sampleData.length > 0) {
      console.log(`📋 Columns ที่พบในตาราง "${tableName}":`);
      const columns = Object.keys(sampleData[0]);
      columns.forEach(col => {
        console.log(`  - ${col}`);
      });
    } else {
      console.log(`📋 ตาราง "${tableName}" ว่างเปล่า - ลองดึง schema อีกวิธี...`);
      
      // ลองใช้ select * limit 0 เพื่อดู columns
      const { data: emptyData, error: emptyError } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
        
      if (!emptyError) {
        console.log(`✅ สามารถเข้าถึงตาราง "${tableName}" ได้`);
      }
    }
  } catch (err) {
    console.log(`❌ ข้อผิดพลาดในการตรวจสอบตาราง "${tableName}":`, err.message);
  }
}

async function checkProblematicTables() {
  console.log('🔍 ตรวจสอบตารางที่มีปัญหา...\n');

  const problematicTables = [
    'live_driver_locations',
    'route_students', 
    'driver_bus'
  ];

  for (const table of problematicTables) {
    await checkTableSchema(table);
  }

  // ตรวจสอบตารางอื่นๆ ที่เกี่ยวข้อง
  console.log('\n🔍 ตรวจสอบตารางอื่นๆ ที่เกี่ยวข้อง...');
  const relatedTables = ['drivers', 'students', 'buses'];
  
  for (const table of relatedTables) {
    await checkTableSchema(table);
  }
}

checkProblematicTables().catch(console.error);