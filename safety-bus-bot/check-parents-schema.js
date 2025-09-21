// ตรวจสอบโครงสร้างตาราง parents
import { supabase } from './lib/db.js';

async function checkParentsSchema() {
  try {
    console.log('🔍 ตรวจสอบข้อมูลในตาราง parents...');
    
    // ดึงข้อมูลทั้งหมดจากตาราง parents
    const { data: parents, error } = await supabase
      .from('parents')
      .select('*');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📊 ข้อมูลในตาราง parents:');
    console.log(JSON.stringify(parents, null, 2));
    
    if (parents && parents.length > 0) {
      console.log('\n📋 ฟิลด์ที่มีในตาราง parents:');
      console.log(Object.keys(parents[0]));
    }
    
    // ค้นหาผู้ปกครองที่มี id = 12
    console.log('\n🔍 ค้นหาผู้ปกครองที่มี id = 12...');
    const { data: parent12, error: parent12Error } = await supabase
      .from('parents')
      .select('*')
      .eq('id', 12)
      .single();
    
    if (parent12Error) {
      console.log('❌ ไม่พบผู้ปกครองที่มี id = 12:', parent12Error);
    } else {
      console.log('✅ พบผู้ปกครองที่มี id = 12:');
      console.log(JSON.stringify(parent12, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkParentsSchema();