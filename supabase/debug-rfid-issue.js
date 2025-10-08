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
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
  console.log('SUPABASE_KEY:', supabaseKey ? '✅ Found' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRfidIssue() {
  try {
    console.log('🔍 Starting RFID debugging...\n');
    
    // 1. ตรวจสอบตาราง rfid_cards
    console.log('📋 1. ตรวจสอบตาราง rfid_cards:');
    const { data: allCards, error: cardsError } = await supabase
      .from('rfid_cards')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (cardsError) {
      console.error('❌ Error fetching rfid_cards:', cardsError);
    } else {
      console.log(`✅ พบบัตร RFID ทั้งหมด: ${allCards.length} บัตร`);
      
      // แสดงบัตรที่ active
      const activeCards = allCards.filter(card => card.is_active);
      console.log(`✅ บัตรที่ active: ${activeCards.length} บัตร`);
      
      if (activeCards.length > 0) {
        console.log('\n📝 รายการบัตรที่ active:');
        activeCards.forEach((card, index) => {
          console.log(`   ${index + 1}. Card ID: ${card.card_id}, RFID Code: ${card.rfid_code}, Status: ${card.status || 'N/A'}`);
        });
      }
      
      // แสดงบัตรที่ไม่ active
      const inactiveCards = allCards.filter(card => !card.is_active);
      if (inactiveCards.length > 0) {
        console.log(`\n⚠️  บัตรที่ไม่ active: ${inactiveCards.length} บัตร`);
        inactiveCards.forEach((card, index) => {
          console.log(`   ${index + 1}. Card ID: ${card.card_id}, RFID Code: ${card.rfid_code}, Status: ${card.status || 'N/A'}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 2. ตรวจสอบตาราง rfid_card_assignments
    console.log('📋 2. ตรวจสอบตาราง rfid_card_assignments:');
    const { data: allAssignments, error: assignmentsError } = await supabase
      .from('rfid_card_assignments')
      .select(`
        *,
        rfid_cards(card_id, rfid_code, is_active),
        students(student_id, student_name, is_active)
      `)
      .order('valid_from', { ascending: false });
    
    if (assignmentsError) {
      console.error('❌ Error fetching rfid_card_assignments:', assignmentsError);
    } else {
      console.log(`✅ พบการมอบหมายบัตรทั้งหมด: ${allAssignments.length} รายการ`);
      
      // แสดงการมอบหมายที่ active
      const now = new Date().toISOString();
      const activeAssignments = allAssignments.filter(assignment => 
        assignment.is_active && 
        assignment.valid_from <= now && 
        (!assignment.valid_to || assignment.valid_to >= now)
      );
      
      console.log(`✅ การมอบหมายที่ active: ${activeAssignments.length} รายการ`);
      
      if (activeAssignments.length > 0) {
        console.log('\n📝 รายการการมอบหมายที่ active:');
        activeAssignments.forEach((assignment, index) => {
          const card = assignment.rfid_cards;
          const student = assignment.students;
          console.log(`   ${index + 1}. RFID: ${card?.rfid_code}, Student: ${student?.student_name}, Card Active: ${card?.is_active}, Student Active: ${student?.is_active}`);
        });
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 3. ตรวจสอบการเชื่อมต่อระหว่างตาราง
    console.log('📋 3. ตรวจสอบความสัมพันธ์ระหว่างตาราง:');
    
    if (allCards && allAssignments) {
      // หาบัตรที่มีอยู่แต่ไม่ได้ถูกมอบหมาย
      const assignedCardIds = allAssignments.map(a => a.card_id);
      const unassignedCards = allCards.filter(card => !assignedCardIds.includes(card.card_id) && card.is_active);
      
      if (unassignedCards.length > 0) {
        console.log(`⚠️  บัตรที่ยังไม่ได้มอบหมาย: ${unassignedCards.length} บัตร`);
        unassignedCards.forEach((card, index) => {
          console.log(`   ${index + 1}. Card ID: ${card.card_id}, RFID Code: ${card.rfid_code}`);
        });
      } else {
        console.log('✅ บัตรทั้งหมดได้ถูกมอบหมายแล้ว');
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 4. ทดสอบการค้นหาบัตรตามรูปแบบที่ API ใช้
    console.log('📋 4. ทดสอบการค้นหาบัตรตามรูปแบบ API:');
    
    if (allCards && allCards.length > 0) {
      // ทดสอบกับบัตรแรกที่ active
      const testCard = allCards.find(card => card.is_active);
      
      if (testCard) {
        console.log(`🧪 ทดสอบกับบัตร: ${testCard.rfid_code}`);
        
        // ทดสอบการค้นหาบัตร (ขั้นตอนที่ 1 ของ API)
        const { data: cardData, error: cardError } = await supabase
          .from('rfid_cards')
          .select('card_id, rfid_code, is_active')
          .eq('rfid_code', testCard.rfid_code)
          .eq('is_active', true)
          .single();
        
        if (cardError || !cardData) {
          console.log('❌ ขั้นตอนที่ 1: ไม่พบบัตรหรือบัตรไม่ active');
          console.log('Error:', cardError);
        } else {
          console.log('✅ ขั้นตอนที่ 1: พบบัตรแล้ว');
          
          // ทดสอบการค้นหาการมอบหมาย (ขั้นตอนที่ 2 ของ API)
          const { data: assignmentData, error: assignmentError } = await supabase
            .from('rfid_card_assignments')
            .select(`
              student_id,
              students!inner(
                student_id,
                student_name,
                is_active
              )
            `)
            .eq('card_id', cardData.card_id)
            .eq('is_active', true)
            .lte('valid_from', new Date().toISOString())
            .or('valid_to.is.null,valid_to.gte.' + new Date().toISOString())
            .single();
          
          if (assignmentError || !assignmentData) {
            console.log('❌ ขั้นตอนที่ 2: ไม่พบการมอบหมายที่ active สำหรับบัตรนี้');
            console.log('Error:', assignmentError);
            
            // ตรวจสอบการมอบหมายทั้งหมดสำหรับบัตรนี้
            const { data: allCardAssignments } = await supabase
              .from('rfid_card_assignments')
              .select('*')
              .eq('card_id', cardData.card_id);
            
            console.log(`📊 การมอบหมายทั้งหมดสำหรับบัตรนี้: ${allCardAssignments?.length || 0} รายการ`);
            if (allCardAssignments && allCardAssignments.length > 0) {
              allCardAssignments.forEach((assignment, index) => {
                console.log(`   ${index + 1}. Student ID: ${assignment.student_id}, Active: ${assignment.is_active}, Valid From: ${assignment.valid_from}, Valid To: ${assignment.valid_to || 'ไม่จำกัด'}`);
              });
            }
          } else {
            console.log('✅ ขั้นตอนที่ 2: พบการมอบหมายแล้ว');
            
            const student = assignmentData.students;
            if (!student.is_active) {
              console.log('❌ ขั้นตอนที่ 3: นักเรียนไม่ active');
            } else {
              console.log('✅ ขั้นตอนที่ 3: นักเรียน active');
              console.log(`👤 นักเรียน: ${student.student_name} (ID: ${student.student_id})`);
              console.log('🎉 บัตรนี้ควรทำงานได้ปกติ!');
            }
          }
        }
      } else {
        console.log('❌ ไม่พบบัตรที่ active สำหรับทดสอบ');
      }
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // 5. แนะนำการแก้ไข
    console.log('💡 5. แนะนำการแก้ไข:');
    console.log('');
    console.log('หากบัตรยังไม่ทำงาน ให้ตรวจสอบ:');
    console.log('1. ✅ บัตร RFID มี is_active = true ในตาราง rfid_cards');
    console.log('2. ✅ มีการมอบหมายในตาราง rfid_card_assignments ที่:');
    console.log('   - is_active = true');
    console.log('   - valid_from <= วันที่ปัจจุบัน');
    console.log('   - valid_to = null หรือ >= วันที่ปัจจุบัน');
    console.log('3. ✅ นักเรียนมี is_active = true ในตาราง students');
    console.log('4. ✅ รหัส RFID ที่อ่านได้ตรงกับที่เก็บในฐานข้อมูล');
    console.log('');
    console.log('🔧 หากต้องการเพิ่มบัตรใหม่ ให้ใช้แอป Driver App หน้า "จัดการบัตร" > "ออกบัตรใหม่"');
    
  } catch (error) {
    console.error('❌ Debugging failed:', error);
  }
}

// Run the debugging
debugRfidIssue();