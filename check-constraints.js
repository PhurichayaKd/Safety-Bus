import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

console.log('🔍 Checking student_boarding_status table constraints...');
console.log('='.repeat(60));

async function checkConstraints() {
  try {
    // ตรวจสอบ constraint ของตาราง student_boarding_status
    const { data, error } = await supabase.rpc('get_table_constraints', {
      table_name: 'student_boarding_status'
    });

    if (error) {
      console.log('❌ Error getting constraints:', error.message);
      
      // ลองใช้วิธีอื่นในการตรวจสอบ constraint
      console.log('\n🔄 Trying alternative method...');
      
      // ลองดึงข้อมูลตัวอย่างจากตาราง
      const { data: sampleData, error: sampleError } = await supabase
        .from('student_boarding_status')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log('❌ Error getting sample data:', sampleError.message);
      } else {
        console.log('✅ Table exists, sample structure:');
        if (sampleData && sampleData.length > 0) {
          console.log('📊 Available columns:', Object.keys(sampleData[0]));
        } else {
          console.log('📄 No data found in table');
        }
      }

      // ลองทำการ INSERT ที่อาจจะ duplicate เพื่อดู error message
      console.log('\n🧪 Testing duplicate insert to see constraint error...');
      
      const testData = {
        student_id: 'TEST_STUDENT',
        driver_id: 1,
        trip_date: new Date().toISOString().split('T')[0],
        trip_phase: 'go',
        boarding_status: 'waiting'
      };

      // Insert ครั้งแรก
      const { error: firstInsertError } = await supabase
        .from('student_boarding_status')
        .insert(testData);

      if (firstInsertError) {
        console.log('❌ First insert error:', firstInsertError.message);
      } else {
        console.log('✅ First insert successful');
        
        // Insert ครั้งที่สอง (ควรจะ error)
        const { error: secondInsertError } = await supabase
          .from('student_boarding_status')
          .insert(testData);

        if (secondInsertError) {
          console.log('🎯 Duplicate insert error (this shows the constraint):');
          console.log('   Error message:', secondInsertError.message);
          console.log('   Error code:', secondInsertError.code);
          console.log('   Error details:', secondInsertError.details);
        } else {
          console.log('⚠️  Unexpected: Second insert also successful (no unique constraint?)');
        }

        // ลบข้อมูลทดสอบ
        const { error: deleteError } = await supabase
          .from('student_boarding_status')
          .delete()
          .eq('student_id', 'TEST_STUDENT');

        if (deleteError) {
          console.log('⚠️  Warning: Could not delete test data:', deleteError.message);
        } else {
          console.log('🧹 Test data cleaned up');
        }
      }

    } else {
      console.log('✅ Constraints found:', data);
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

checkConstraints();