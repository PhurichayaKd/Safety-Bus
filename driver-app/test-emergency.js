// ไฟล์ทดสอบสำหรับจำลองการสร้าง emergency_log จากคนขับ
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ixqjqjqjqjqjqjqjqjqj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4cWpxanFqcWpxanFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1MjQ0MDAsImV4cCI6MjA1MDEwMDQwMH0.example';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestEmergency() {
  try {
    console.log('🚨 สร้าง emergency_log ทดสอบ...');
    
    const { data, error } = await supabase
      .from('emergency_logs')
      .insert({
        driver_id: 1,
        triggered_by: 'driver',
        emergency_type: 'BUTTON_PRESS',
        location: 'ทดสอบจากแอป',
        notes: 'ทดสอบการกดปุ่มฉุกเฉินจากอุปกรณ์ IoT',
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ เกิดข้อผิดพลาด:', error);
    } else {
      console.log('✅ สร้าง emergency_log สำเร็จ:', data);
      console.log('📱 ตอนนี้แอปควรจะแสดง Modal ยืนยันเหตุฉุกเฉิน');
    }
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// เรียกใช้ฟังก์ชันทดสอบ
createTestEmergency();