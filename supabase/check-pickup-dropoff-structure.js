require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPickupDropoffStructure() {
  console.log('🔍 ตรวจสอบโครงสร้างตาราง pickup_dropoff...\n');

  try {
    // ตรวจสอบโครงสร้างตาราง
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'pickup_dropoff')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error getting columns:', columnsError.message);
      return;
    }

    console.log('📋 โครงสร้างตาราง pickup_dropoff:');
    console.log('┌─────────────────────────┬─────────────────┬─────────────┬─────────────────────────┐');
    console.log('│ Column Name             │ Data Type       │ Nullable    │ Default                 │');
    console.log('├─────────────────────────┼─────────────────┼─────────────┼─────────────────────────┤');
    
    columns.forEach(col => {
      const name = col.column_name.padEnd(23);
      const type = col.data_type.padEnd(15);
      const nullable = col.is_nullable.padEnd(11);
      const defaultVal = (col.column_default || 'NULL').padEnd(23);
      console.log(`│ ${name} │ ${type} │ ${nullable} │ ${defaultVal} │`);
    });
    
    console.log('└─────────────────────────┴─────────────────┴─────────────┴─────────────────────────┘');

    // ตรวจสอบข้อมูลตัวอย่างในตาราง
    console.log('\n📊 ข้อมูลตัวอย่างในตาราง pickup_dropoff:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .limit(3);

    if (sampleError) {
      console.log('⚠️ Error getting sample data:', sampleError.message);
    } else if (sampleData && sampleData.length > 0) {
      console.log('✅ พบข้อมูล', sampleData.length, 'รายการ:');
      sampleData.forEach((record, index) => {
        console.log(`\n--- Record ${index + 1} ---`);
        Object.keys(record).forEach(key => {
          console.log(`${key}: ${record[key]}`);
        });
      });
    } else {
      console.log('📭 ไม่มีข้อมูลในตาราง');
    }

    // ตรวจสอบ constraints
    console.log('\n🔒 ตรวจสอบ constraints:');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'pickup_dropoff');

    if (constraints && constraints.length > 0) {
      constraints.forEach(constraint => {
        console.log(`- ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    } else {
      console.log('ไม่พบ constraints');
    }

    // ตรวจสอบ column event_local_date โดยเฉพาะ
    console.log('\n🎯 ตรวจสอบ column event_local_date โดยเฉพาะ:');
    const eventLocalDateCol = columns.find(col => col.column_name === 'event_local_date');
    if (eventLocalDateCol) {
      console.log('✅ พบ column event_local_date:');
      console.log(`   - Data Type: ${eventLocalDateCol.data_type}`);
      console.log(`   - Nullable: ${eventLocalDateCol.is_nullable}`);
      console.log(`   - Default: ${eventLocalDateCol.column_default || 'NULL'}`);
      
      if (eventLocalDateCol.column_default && eventLocalDateCol.column_default.includes('GENERATED')) {
        console.log('⚠️ Column นี้เป็น GENERATED column - ไม่สามารถ INSERT ค่าได้โดยตรง!');
      }
    } else {
      console.log('❌ ไม่พบ column event_local_date');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkPickupDropoffStructure();