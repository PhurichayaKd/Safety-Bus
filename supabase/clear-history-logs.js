import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearHistoryLogs() {
  console.log('🧹 เริ่มล้างข้อมูล History และ Logs');
  console.log('=' .repeat(60));

  try {
    // 1. ล้างข้อมูล card_history
    console.log('🗑️  ล้างข้อมูล card_history...');
    const { error: cardHistoryError } = await supabase
      .from('card_history')
      .delete()
      .gte('id', 0); // ลบทุกแถว

    if (cardHistoryError) {
      console.error('❌ ไม่สามารถล้างข้อมูล card_history ได้:', cardHistoryError);
    } else {
      console.log('✅ ล้างข้อมูล card_history สำเร็จ');
    }

    // 2. ล้างข้อมูล notification_logs
    console.log('🗑️  ล้างข้อมูล notification_logs...');
    const { error: notificationLogsError } = await supabase
      .from('notification_logs')
      .delete()
      .gte('id', 0); // ลบทุกแถว

    if (notificationLogsError) {
      console.error('❌ ไม่สามารถล้างข้อมูล notification_logs ได้:', notificationLogsError);
    } else {
      console.log('✅ ล้างข้อมูล notification_logs สำเร็จ');
    }

    // 3. ตรวจสอบผลลัพธ์
    console.log('\n📊 ตรวจสอบผลลัพธ์การล้างข้อมูล...');
    
    // ตรวจสอบจำนวนข้อมูล card_history
    const { count: cardHistoryCount } = await supabase
      .from('card_history')
      .select('*', { count: 'exact', head: true });

    console.log(`📈 จำนวนข้อมูล card_history ที่เหลือ: ${cardHistoryCount || 0}`);

    // ตรวจสอบจำนวนข้อมูล notification_logs
    const { count: notificationLogsCount } = await supabase
      .from('notification_logs')
      .select('*', { count: 'exact', head: true });

    console.log(`📈 จำนวนข้อมูล notification_logs ที่เหลือ: ${notificationLogsCount || 0}`);

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 ล้างข้อมูล History และ Logs เสร็จสิ้น!');
    console.log('📱 ระบบพร้อมใช้งานใหม่โดยไม่มีข้อมูลเก่า');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการล้างข้อมูล:', error);
  }
}

// รันการล้างข้อมูล
clearHistoryLogs().then(() => {
  console.log('\n✅ การล้างข้อมูลเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});