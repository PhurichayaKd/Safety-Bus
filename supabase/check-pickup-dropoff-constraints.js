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

async function checkPickupDropoffConstraints() {
  try {
    // ดึง student_id ที่มีจริงจากฐานข้อมูล
    console.log('📋 Getting real student_id from database...');
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

    console.log('📊 Testing duplicate insert to identify constraint...');
    
    const testData = {
      student_id: realStudentId,
      driver_id: 1,
      event_type: 'dropoff',
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

    // Insert ครั้งที่สอง (ควรจะ error เพราะ duplicate)
    const { data: secondData, error: secondInsertError } = await supabase
      .from('pickup_dropoff')
      .insert(testData)
      .select();

    if (secondInsertError) {
      console.log('🎯 Duplicate insert error (this shows the constraint):');
      console.log('   Error message:', secondInsertError.message);
      console.log('   Error code:', secondInsertError.code);
      console.log('   Error details:', secondInsertError.details);
      
      // วิเคราะห์ error message เพื่อหา constraint name
      if (secondInsertError.message.includes('unique')) {
        console.log('✅ Found unique constraint in error message');
      } else if (secondInsertError.message.includes('duplicate key')) {
        console.log('🔍 Constraint involves duplicate key, analyzing...');
        console.log('   Full error:', secondInsertError);
      }
    } else {
      console.log('⚠️  Unexpected: Second insert also successful (no unique constraint?)');
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

    // ตรวจสอบโครงสร้างตาราง
    console.log('\n📋 Checking table structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Error getting sample data:', sampleError.message);
    } else {
      console.log('✅ Table structure (columns):');
      if (sampleData && sampleData.length > 0) {
        Object.keys(sampleData[0]).forEach(col => {
          console.log(`   - ${col}: ${typeof sampleData[0][col]}`);
        });
      } else {
        console.log('   No data in table to show structure');
      }
    }

    // ทดสอบ upsert ที่ใช้ในแอป
    console.log('\n🔄 Testing upsert operation...');
    const upsertData = {
      student_id: realStudentId,
      driver_id: 1,
      event_type: 'pickup', // ใช้ event_type ที่แตกต่างกัน
      event_time: new Date().toISOString(),
      location_type: 'go'
    };

    const { data: upsertResult, error: upsertError } = await supabase
      .from('pickup_dropoff')
      .upsert(upsertData, {
        onConflict: 'student_id,event_type,location_type,event_time'
      });

    if (upsertError) {
      console.log('❌ Upsert error:', upsertError.message);
      console.log('   Error code:', upsertError.code);
      console.log('   Error details:', upsertError.details);
    } else {
      console.log('✅ Upsert successful');
    }

    // ลบข้อมูลทดสอบ upsert
    await supabase
      .from('pickup_dropoff')
      .delete()
      .eq('student_id', upsertData.student_id);

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    console.log('   Stack:', error.stack);
  }
}

checkPickupDropoffConstraints();