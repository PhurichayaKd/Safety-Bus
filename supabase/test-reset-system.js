const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testResetSystem() {
  console.log('🧪 เริ่มทดสอบระบบการรีเซ็ตข้อมูลการขึ้นรถ-ลงรถ');
  console.log('=' .repeat(60));

  try {
    // 1. ดึงข้อมูลคนขับคนแรก
    const { data: drivers, error: driverError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name')
      .limit(1);

    if (driverError || !drivers || drivers.length === 0) {
      console.error('❌ ไม่สามารถดึงข้อมูลคนขับได้:', driverError);
      return;
    }

    const driver = drivers[0];
    console.log(`👨‍💼 ใช้ข้อมูลคนขับ: ${driver.driver_name} (ID: ${driver.driver_id})`);

    // 2. ตรวจสอบสถานะปัจจุบัน
    const { data: currentStatus } = await supabase
      .from('driver_bus')
      .select('trip_phase')
      .eq('driver_id', driver.driver_id)
      .single();

    console.log(`📊 สถานะปัจจุบัน: ${currentStatus?.trip_phase || 'ไม่ระบุ'}`);

    // 3. ทดสอบการเปลี่ยนจาก 'go' เป็น 'return'
    console.log('\n🔄 ทดสอบการเปลี่ยนจาก "go" เป็น "return"');
    
    // ตั้งค่าเป็น 'go' ก่อน
    const { error: setGoError } = await supabase.rpc('update_driver_trip_phase', {
      p_driver_id: driver.driver_id,
      p_trip_phase: 'go'
    });

    if (setGoError) {
      console.error('❌ ไม่สามารถตั้งค่า trip_phase เป็น "go" ได้:', setGoError);
      return;
    }

    console.log('✅ ตั้งค่า trip_phase เป็น "go" สำเร็จ');

    // รอสักครู่
    await new Promise(resolve => setTimeout(resolve, 1000));

    // เปลี่ยนเป็น 'return'
    const { error: setReturnError } = await supabase.rpc('update_driver_trip_phase', {
      p_driver_id: driver.driver_id,
      p_trip_phase: 'return'
    });

    if (setReturnError) {
      console.error('❌ ไม่สามารถเปลี่ยน trip_phase เป็น "return" ได้:', setReturnError);
      return;
    }

    console.log('✅ เปลี่ยน trip_phase เป็น "return" สำเร็จ');

    // 4. ตรวจสอบสถานะหลังการเปลี่ยน
    const { data: newStatus } = await supabase
      .from('driver_bus')
      .select('trip_phase')
      .eq('driver_id', driver.driver_id)
      .single();

    console.log(`📊 สถานะหลังการเปลี่ยน: ${newStatus?.trip_phase || 'ไม่ระบุ'}`);

    // 5. ทดสอบการเปลี่ยนกลับเป็น 'go'
    console.log('\n🔄 ทดสอบการเปลี่ยนกลับเป็น "go"');
    
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: setGoAgainError } = await supabase.rpc('update_driver_trip_phase', {
      p_driver_id: driver.driver_id,
      p_trip_phase: 'go'
    });

    if (setGoAgainError) {
      console.error('❌ ไม่สามารถเปลี่ยน trip_phase กลับเป็น "go" ได้:', setGoAgainError);
      return;
    }

    console.log('✅ เปลี่ยน trip_phase กลับเป็น "go" สำเร็จ');

    // 6. ตรวจสอบสถานะสุดท้าย
    const { data: finalStatus } = await supabase
      .from('driver_bus')
      .select('trip_phase')
      .eq('driver_id', driver.driver_id)
      .single();

    console.log(`📊 สถานะสุดท้าย: ${finalStatus?.trip_phase || 'ไม่ระบุ'}`);

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 การทดสอบระบบการรีเซ็ตเสร็จสิ้น');
    console.log('📝 หมายเหตุ: ระบบการรีเซ็ตข้อมูลการขึ้นรถ-ลงรถจะทำงานใน mobile app');
    console.log('    เมื่อมีการเปลี่ยน trip_phase และ app ตรวจพบการเปลี่ยนแปลง');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', error);
  }
}

// รันการทดสอบ
testResetSystem().then(() => {
  console.log('\n✅ การทดสอบเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});