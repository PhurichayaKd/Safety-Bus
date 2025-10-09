import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// โหลด environment variables
dotenv.config({ path: path.join(process.cwd(), '../safety-bus-bot/vercel-deploy/.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPickupSourceConstraint() {
  console.log('🔍 ตรวจสอบ constraint สำหรับ pickup_source...\n');

  try {
    // ตรวจสอบ check constraints
    console.log('📋 ตรวจสอบ check constraints:');
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .like('check_clause', '%pickup_source%');

    if (constraintsError) {
      console.log('⚠️ Error getting constraints:', constraintsError.message);
    } else if (constraints && constraints.length > 0) {
      console.log('✅ พบ constraints สำหรับ pickup_source:');
      constraints.forEach(constraint => {
        console.log(`- ${constraint.constraint_name}:`);
        console.log(`  ${constraint.check_clause}`);
      });
    } else {
      console.log('📭 ไม่พบ check constraints สำหรับ pickup_source');
    }

    // ตรวจสอบ table constraints ทั้งหมดของ pickup_dropoff
    console.log('\n🔒 ตรวจสอบ constraints ทั้งหมดของตาราง pickup_dropoff:');
    const { data: tableConstraints, error: tableError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'pickup_dropoff');

    if (tableConstraints && tableConstraints.length > 0) {
      tableConstraints.forEach(constraint => {
        console.log(`- ${constraint.constraint_name}: ${constraint.constraint_type}`);
      });
    }

    // ลองทดสอบค่าต่างๆ สำหรับ pickup_source
    console.log('\n🧪 ทดสอบค่าต่างๆ สำหรับ pickup_source:');
    
    const testValues = [
      null,
      'rfid_device',
      'manual',
      'app',
      'scanner',
      'driver_app',
      'mobile_app'
    ];

    for (const testValue of testValues) {
      try {
        console.log(`\n🔍 ทดสอบค่า: ${testValue === null ? 'NULL' : `"${testValue}"`}`);
        
        const testData = {
          student_id: 100014,
          driver_id: 1,
          event_type: 'pickup',
          location_type: 'go',
          event_time: new Date().toISOString(),
          last_scan_time: new Date().toISOString(),
          pickup_source: testValue,
          gps_latitude: null,
          gps_longitude: null
        };

        const { data: testResult, error: testError } = await supabase
          .from('pickup_dropoff')
          .insert(testData)
          .select()
          .single();

        if (testError) {
          console.log(`❌ ข้อผิดพลาด: ${testError.message}`);
        } else {
          console.log(`✅ สำเร็จ! Record ID: ${testResult.record_id}`);
          
          // ลบ record ทดสอบ
          await supabase
            .from('pickup_dropoff')
            .delete()
            .eq('record_id', testResult.record_id);
          console.log('🗑️ ลบ record ทดสอบแล้ว');
        }
      } catch (error) {
        console.log(`❌ ข้อผิดพลาดทั่วไป: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

checkPickupSourceConstraint();