import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables จาก safety-bus-bot/vercel-deploy/.env.local
dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Checking pickup_dropoff table constraints...');
console.log('='.repeat(60));

async function checkConstraints() {
  try {
    // ตรวจสอบ constraints ของตาราง pickup_dropoff โดยใช้ SQL query
    console.log('📋 Checking pickup_dropoff table constraints...');
    
    // ใช้ raw SQL query เพื่อดู constraint
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'pickup_dropoff')
      .eq('table_schema', 'public');

    if (constraintsError) {
      console.log('❌ Error getting constraints:', constraintsError.message);
    } else {
      console.log('✅ Table constraints found:');
      constraints.forEach(constraint => {
        console.log(`   - ${constraint.constraint_name} (${constraint.constraint_type})`);
      });
    }

    // ตรวจสอบ columns ของตาราง
    console.log('\n📋 Checking table columns...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'pickup_dropoff')
      .eq('table_schema', 'public')
      .order('ordinal_position');

    if (columnsError) {
      console.log('❌ Error getting columns:', columnsError.message);
    } else {
      console.log('✅ Table columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        if (col.column_default) {
          console.log(`     Default: ${col.column_default}`);
        }
      });
    }

    // ทดสอบการ insert เพื่อดู constraint error
    console.log('\n🧪 Testing constraint behavior...');
    
    // ดึง student_id ที่มีจริง
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id')
      .limit(1);

    if (studentsError || !students || students.length === 0) {
      console.log('❌ Cannot get student data:', studentsError?.message || 'No students found');
      return;
    }

    const realStudentId = students[0].student_id;
    console.log('✅ Using real student_id:', realStudentId);

    const testData = {
      student_id: realStudentId,
      driver_id: 1,
      event_type: 'pickup',
      event_time: new Date().toISOString(),
      location_type: 'go'
    };

    console.log('🧪 Test data:', testData);

    // Insert ครั้งแรก
    const { data: firstData, error: firstInsertError } = await supabase
      .from('pickup_dropoff')
      .insert(testData)
      .select();

    if (firstInsertError) {
      console.log('❌ First insert error:', firstInsertError.message);
      console.log('   Error code:', firstInsertError.code);
      console.log('   Error details:', firstInsertError.details);
      return;
    } else {
      console.log('✅ First insert successful');
    }

    // Insert ครั้งที่สอง (ควรจะ error เพราะ constraint)
    const { data: secondData, error: secondInsertError } = await supabase
      .from('pickup_dropoff')
      .insert(testData)
      .select();

    if (secondInsertError) {
      console.log('🎯 Constraint violation detected:');
      console.log('   Error message:', secondInsertError.message);
      console.log('   Error code:', secondInsertError.code);
      console.log('   Error details:', secondInsertError.details);
      
      // วิเคราะห์ error message
      if (secondInsertError.message.includes('no_rapid_rescan')) {
        console.log('✅ Found no_rapid_rescan constraint!');
        console.log('   This is an exclusion constraint that prevents rapid rescanning');
      }
    } else {
      console.log('⚠️  Unexpected: Second insert also successful');
    }

    // ลบข้อมูลทดสอบ
    const { error: deleteError } = await supabase
      .from('pickup_dropoff')
      .delete()
      .eq('student_id', testData.student_id);

    if (deleteError) {
      console.log('⚠️  Warning: Could not delete test data:', deleteError.message);
    } else {
      console.log('🧹 Test data cleaned up');
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    console.log('   Stack:', error.stack);
  }
}

checkConstraints();