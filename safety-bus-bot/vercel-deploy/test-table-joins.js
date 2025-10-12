import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

console.log('🔍 Testing Table Joins for Student and Parent Names');
console.log('='.repeat(60));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ทดสอบการ join student_line_links กับ students
console.log('👥 Testing student_line_links join with students table...');
try {
  const { data: studentLinks, error: studentError } = await supabase
    .from('student_line_links')
    .select(`
      line_user_id, 
      student_id,
      line_display_id,
      students!inner(student_name)
    `)
    .not('line_user_id', 'is', null)
    .neq('line_user_id', '');

  if (studentError) {
    console.log('❌ Error with student join:', studentError.message);
    
    // ลองใช้วิธีอื่น - ดึงข้อมูลแยกแล้วค่อย join
    console.log('🔄 Trying alternative approach...');
    
    const { data: studentLinksSimple, error: simpleError } = await supabase
      .from('student_line_links')
      .select('line_user_id, student_id, line_display_id')
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');
    
    if (simpleError) {
      console.log('❌ Simple query also failed:', simpleError.message);
    } else {
      console.log('✅ Simple query successful, found', studentLinksSimple.length, 'linked students');
      
      // ลองดึงข้อมูลนักเรียนแยก
      if (studentLinksSimple.length > 0) {
        const studentIds = studentLinksSimple.map(s => s.student_id);
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('student_id, student_name')
          .in('student_id', studentIds);
        
        if (studentsError) {
          console.log('❌ Error fetching students:', studentsError.message);
        } else {
          console.log('✅ Students data:', students);
          
          // Manual join
          const joinedData = studentLinksSimple.map(link => {
            const student = students.find(s => s.student_id === link.student_id);
            return {
              ...link,
              student_name: student?.student_name || link.line_display_id || 'Unknown'
            };
          });
          
          console.log('✅ Manually joined data:', joinedData);
        }
      }
    }
  } else {
    console.log('✅ Student join successful:', studentLinks);
  }
} catch (error) {
  console.log('❌ Error testing student join:', error.message);
}

console.log('\n' + '='.repeat(60));

// ทดสอบการ join parent_line_links กับ parents และ students
console.log('👨‍👩‍👧‍👦 Testing parent_line_links join...');
try {
  const { data: parentLinks, error: parentError } = await supabase
    .from('parent_line_links')
    .select(`
      line_user_id, 
      parent_id,
      line_display_id,
      parents!inner(parent_name)
    `)
    .not('line_user_id', 'is', null)
    .neq('line_user_id', '');

  if (parentError) {
    console.log('❌ Error with parent join:', parentError.message);
    
    // ลองใช้วิธีอื่น
    console.log('🔄 Trying alternative approach for parents...');
    
    const { data: parentLinksSimple, error: simpleParentError } = await supabase
      .from('parent_line_links')
      .select('line_user_id, parent_id, line_display_id')
      .not('line_user_id', 'is', null)
      .neq('line_user_id', '');
    
    if (simpleParentError) {
      console.log('❌ Simple parent query failed:', simpleParentError.message);
    } else {
      console.log('✅ Simple parent query successful, found', parentLinksSimple.length, 'linked parents');
    }
  } else {
    console.log('✅ Parent join successful:', parentLinks);
  }
} catch (error) {
  console.log('❌ Error testing parent join:', error.message);
}

console.log('\n' + '='.repeat(60));

// ตรวจสอบว่าตาราง students และ parents มีอยู่หรือไม่
console.log('📋 Checking if students and parents tables exist...');

try {
  const { data: studentsTest, error: studentsTestError } = await supabase
    .from('students')
    .select('student_id, student_name')
    .limit(3);
    
  if (studentsTestError) {
    console.log('❌ Students table error:', studentsTestError.message);
  } else {
    console.log('✅ Students table exists, sample data:', studentsTest);
  }
} catch (error) {
  console.log('❌ Error checking students table:', error.message);
}

try {
  const { data: parentsTest, error: parentsTestError } = await supabase
    .from('parents')
    .select('parent_id, parent_name')
    .limit(3);
    
  if (parentsTestError) {
    console.log('❌ Parents table error:', parentsTestError.message);
  } else {
    console.log('✅ Parents table exists, sample data:', parentsTest);
  }
} catch (error) {
  console.log('❌ Error checking parents table:', error.message);
}

console.log('\n' + '='.repeat(60));
console.log('🏁 Table Join Test Complete!');