import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');

dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRfidFormats() {
  try {
    console.log('🔍 ทดสอบรูปแบบรหัส RFID...\n');
    
    // ดึงรหัส RFID ทั้งหมดจากฐานข้อมูล
    const { data: cards, error } = await supabase
      .from('rfid_cards')
      .select('rfid_code')
      .eq('is_active', true)
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log('📋 รหัส RFID ในฐานข้อมูล:');
    cards.forEach((card, index) => {
      const code = card.rfid_code;
      console.log(`${index + 1}. ${code}`);
      console.log(`   - ความยาว: ${code.length} ตัวอักษร`);
      console.log(`   - มี colon (:): ${code.includes(':') ? 'ใช่' : 'ไม่'}`);
      console.log(`   - รูปแบบ: ${code.includes(':') ? 'XX:XX:XX:XX' : 'XXXXXXXX'}`);
      
      // แปลงรูปแบบ
      if (code.includes(':')) {
        const withoutColon = code.replace(/:/g, '');
        console.log(`   - ไม่มี colon: ${withoutColon}`);
      } else {
        const withColon = code.match(/.{2}/g)?.join(':') || code;
        console.log(`   - มี colon: ${withColon}`);
      }
      console.log('');
    });
    
    console.log('💡 ข้อสังเกต:');
    console.log('- Arduino ตั้งค่า PRINT_WITH_COLON = false');
    console.log('- หมายความว่า Arduino จะส่งรหัสแบบ XXXXXXXX (ไม่มี colon)');
    console.log('- ถ้าฐานข้อมูลเก็บแบบ XX:XX:XX:XX จะไม่ตรงกัน');
    console.log('');
    
    // ทดสอบการค้นหาด้วยรูปแบบต่างๆ
    const testCode = cards[0]?.rfid_code;
    if (testCode) {
      console.log(`🧪 ทดสอบการค้นหาด้วยรหัส: ${testCode}`);
      
      // ทดสอบค้นหาตรงๆ
      const { data: exact } = await supabase
        .from('rfid_cards')
        .select('rfid_code')
        .eq('rfid_code', testCode)
        .maybeSingle();
      
      console.log(`✅ ค้นหาตรงๆ: ${exact ? 'พบ' : 'ไม่พบ'}`);
      
      // ทดสอบค้นหาแบบไม่มี colon
      const withoutColon = testCode.replace(/:/g, '');
      const { data: noColon } = await supabase
        .from('rfid_cards')
        .select('rfid_code')
        .eq('rfid_code', withoutColon)
        .maybeSingle();
      
      console.log(`🔍 ค้นหาแบบไม่มี colon (${withoutColon}): ${noColon ? 'พบ' : 'ไม่พบ'}`);
      
      // ทดสอบค้นหาแบบมี colon
      const withColon = testCode.includes(':') ? testCode : testCode.match(/.{2}/g)?.join(':');
      if (withColon && withColon !== testCode) {
        const { data: hasColon } = await supabase
          .from('rfid_cards')
          .select('rfid_code')
          .eq('rfid_code', withColon)
          .maybeSingle();
        
        console.log(`🔍 ค้นหาแบบมี colon (${withColon}): ${hasColon ? 'พบ' : 'ไม่พบ'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testRfidFormats();