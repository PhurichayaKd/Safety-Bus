import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the vercel-deploy directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');

dotenv.config({ path: envPath });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestRfidCard() {
  try {
    console.log('🔧 Creating test RFID card E398F334...\n');
    
    // 1. สร้างบัตร RFID E398F334
    console.log('📋 1. Creating RFID card E398F334...');
    let { data: cardData, error: cardError } = await supabase
      .from('rfid_cards')
      .insert({
        rfid_code: 'E398F334',
        is_active: true,
        status: 'available'
      })
      .select()
      .single();
    
    if (cardError) {
      if (cardError.code === '23505') {
        console.log('⚠️  RFID card E398F334 already exists, fetching existing card...');
        const { data: existingCard, error: fetchError } = await supabase
          .from('rfid_cards')
          .select('*')
          .eq('rfid_code', 'E398F334')
          .single();
        
        if (fetchError) {
          console.error('❌ Error fetching existing card:', fetchError);
          return;
        }
        
        console.log('✅ Found existing card:', existingCard);
        cardData = existingCard;
      } else {
        console.error('❌ Error creating RFID card:', cardError);
        return;
      }
    } else {
      console.log('✅ RFID card created successfully:', cardData);
    }
    
    // 2. ค้นหานักเรียนที่ยังไม่มีบัตร RFID
    console.log('\n📋 2. Finding student without RFID card...');
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        student_id,
        student_name,
        grade,
        is_active
      `)
      .eq('is_active', true)
      .limit(10);
    
    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      return;
    }
    
    // หานักเรียนที่ยังไม่มีบัตร RFID
    let targetStudent = null;
    for (const student of studentsData) {
      const { data: existingAssignment, error: assignmentError } = await supabase
        .from('rfid_card_assignments')
        .select('student_id')
        .eq('student_id', student.student_id)
        .eq('is_active', true)
        .is('valid_to', null)
        .maybeSingle();
      
      if (assignmentError && assignmentError.code !== 'PGRST116') {
        console.error('Error checking assignment for student:', student.student_id, assignmentError);
        continue;
      }
      
      if (!existingAssignment) {
        targetStudent = student;
        break;
      }
    }
    
    if (!targetStudent) {
      console.log('⚠️  No student without RFID card found. Using first student for testing...');
      targetStudent = studentsData[0];
    }
    
    console.log('✅ Target student:', targetStudent);
    
    // 3. มอบหมายบัตรให้นักเรียน
    console.log('\n📋 3. Assigning RFID card to student...');
    
    // ตรวจสอบว่านักเรียนมีบัตรอยู่แล้วหรือไม่ และยกเลิกการมอบหมายเก่า
    const { data: oldAssignments, error: oldAssignmentError } = await supabase
      .from('rfid_card_assignments')
      .select('*')
      .eq('student_id', targetStudent.student_id)
      .eq('is_active', true)
      .is('valid_to', null);
    
    if (oldAssignmentError) {
      console.error('❌ Error checking old assignments:', oldAssignmentError);
      return;
    }
    
    if (oldAssignments && oldAssignments.length > 0) {
      console.log('⚠️  Student already has RFID card(s), deactivating old assignments...');
      const { error: deactivateError } = await supabase
        .from('rfid_card_assignments')
        .update({ 
          is_active: false,
          valid_to: new Date().toISOString()
        })
        .eq('student_id', targetStudent.student_id)
        .eq('is_active', true)
        .is('valid_to', null);
      
      if (deactivateError) {
        console.error('❌ Error deactivating old assignments:', deactivateError);
        return;
      }
      console.log('✅ Old assignments deactivated');
    }
    
    // สร้างการมอบหมายใหม่
    const { data: assignmentData, error: assignmentError } = await supabase
      .from('rfid_card_assignments')
      .insert({
        card_id: cardData.card_id,
        student_id: targetStudent.student_id,
        assigned_by: 1, // Default admin user
        valid_from: new Date().toISOString(),
        valid_to: null,
        is_active: true
      })
      .select()
      .single();
    
    if (assignmentError) {
      console.error('❌ Error creating assignment:', assignmentError);
      return;
    }
    
    console.log('✅ RFID card assigned successfully:', assignmentData);
    
    // 4. อัปเดตสถานะบัตรเป็น assigned
    const { error: updateCardError } = await supabase
      .from('rfid_cards')
      .update({ status: 'assigned' })
      .eq('card_id', cardData.card_id);
    
    if (updateCardError) {
      console.error('❌ Error updating card status:', updateCardError);
      return;
    }
    
    console.log('✅ Card status updated to assigned');
    
    console.log('\n🎉 Test setup completed successfully!');
    console.log('📝 Summary:');
    console.log(`   - RFID Card: E398F334 (ID: ${cardData.card_id})`);
    console.log(`   - Student: ${targetStudent.student_name} (ID: ${targetStudent.student_id})`);
    console.log(`   - Assignment ID: ${assignmentData.assignment_id}`);
    console.log('\n✅ Ready for RFID scanning test!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createTestRfidCard();