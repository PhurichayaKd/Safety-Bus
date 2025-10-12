const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkStudent() {
  console.log('🔍 Checking student ID 100017...');
  
  const { data: student, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', 100017)
    .single();
    
  if (error) {
    console.log('❌ Error:', error.message);
    
    // Check all students to see what IDs exist
    const { data: allStudents, error: allError } = await supabase
      .from('students')
      .select('student_id, student_name')
      .order('student_id');
      
    if (allError) {
      console.log('❌ Error getting all students:', allError.message);
    } else {
      console.log('📋 Available student IDs:');
      allStudents.forEach(s => console.log(`  - ${s.student_id}: ${s.student_name}`));
    }
  } else {
    console.log('✅ Student found:', student);
  }
}

checkStudent().catch(console.error);