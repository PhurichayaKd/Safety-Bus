import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables จาก safety-bus-bot/vercel-deploy/.env.local
dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Checking student_boarding_status table constraints...');
console.log('='.repeat(60));

async function checkConstraints() {
  try {
    console.log('📊 Testing duplicate insert to identify constraint...');
    
    const testData = {
      student_id: 'TEST_STUDENT_' + Date.now(),
      driver_id: 1,
      trip_date: new Date().toISOString().split('T')[0],
      trip_phase: 'go',
      boarding_status: 'waiting'
    };

    console.log('🧪 Test data:', testData);

    // Insert ครั้งแรก
    const { data: firstData, error: firstInsertError } = await supabase
      .from('student_boarding_status')
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
      .from('student_boarding_status')
      .insert(testData)
      .select();

    if (secondInsertError) {
      console.log('🎯 Duplicate insert error (this shows the constraint):');
      console.log('   Error message:', secondInsertError.message);
      console.log('   Error code:', secondInsertError.code);
      console.log('   Error details:', secondInsertError.details);
      
      // วิเคราะห์ error message เพื่อหา constraint name
      if (secondInsertError.message.includes('student_boarding_unique_daily_phase')) {
        console.log('✅ Found constraint: student_boarding_unique_daily_phase');
      } else if (secondInsertError.message.includes('duplicate key')) {
        console.log('🔍 Constraint involves duplicate key, analyzing...');
        console.log('   Full error:', secondInsertError);
      }
    } else {
      console.log('⚠️  Unexpected: Second insert also successful (no unique constraint?)');
    }

    // ลบข้อมูลทดสอบ
    const { error: deleteError } = await supabase
      .from('student_boarding_status')
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
      .from('student_boarding_status')
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

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    console.log('   Stack:', error.stack);
  }
}

checkConstraints();