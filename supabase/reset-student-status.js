const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../safety-bus-bot/vercel-deploy/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ไม่พบ environment variables ที่จำเป็น');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStudentStatus() {
  console.log('🔄 เริ่มรีเซ็ตสถานะนักเรียนทั้งหมด');
  console.log('=' .repeat(60));

  try {
    // 1. ลบข้อมูลการขึ้น-ลงรถทั้งหมด
    console.log('🗑️  ลบข้อมูลการขึ้น-ลงรถทั้งหมด...');
    const { error: deleteError } = await supabase
      .from('student_boarding_status')
      .delete()
      .gte('student_id', 0); // ลบทุกแถวที่มี student_id >= 0

    if (deleteError) {
      console.error('❌ ไม่สามารถลบข้อมูลการขึ้น-ลงรถได้:', deleteError);
      return;
    }

    console.log('✅ ลบข้อมูลการขึ้น-ลงรถทั้งหมดสำเร็จ');

    // 2. รีเซ็ตสถานะคนขับเป็น 'go'
    console.log('🚌 รีเซ็ตสถานะคนขับเป็น "go"...');
    const { error: driverError } = await supabase
      .from('driver_bus')
      .update({ trip_phase: 'go' })
      .neq('driver_id', 0); // อัปเดตทุกคนขับ

    if (driverError) {
      console.error('❌ ไม่สามารถรีเซ็ตสถานะคนขับได้:', driverError);
      return;
    }

    console.log('✅ รีเซ็ตสถานะคนขับเป็น "go" สำเร็จ');

    // 3. รีเซ็ตสถานะการลาของนักเรียน (ถ้ามี)
    console.log('📚 รีเซ็ตสถานะการลาของนักเรียน...');
    const { error: leaveError } = await supabase
      .from('student_leave_requests')
      .delete()
      .gte('leave_date', new Date().toISOString().split('T')[0]); // ลบการลาวันนี้เป็นต้นไป

    if (leaveError) {
      console.log('⚠️  ไม่สามารถลบข้อมูลการลาได้ (อาจไม่มีข้อมูล):', leaveError.message);
    } else {
      console.log('✅ รีเซ็ตสถานะการลาของนักเรียนสำเร็จ');
    }

    // 4. ตรวจสอบผลลัพธ์
    console.log('\n📊 ตรวจสอบผลลัพธ์การรีเซ็ต...');
    
    // ตรวจสอบจำนวนข้อมูลการขึ้น-ลงรถ
    const { count: boardingCount } = await supabase
      .from('student_boarding_status')
      .select('*', { count: 'exact', head: true });

    console.log(`📈 จำนวนข้อมูลการขึ้น-ลงรถที่เหลือ: ${boardingCount || 0}`);

    // ตรวจสอบสถานะคนขับ
    const { data: drivers } = await supabase
      .from('driver_bus')
      .select('driver_name, trip_phase');

    if (drivers && drivers.length > 0) {
      console.log('👨‍💼 สถานะคนขับ:');
      drivers.forEach(driver => {
        console.log(`   - ${driver.driver_name}: ${driver.trip_phase}`);
      });
    }

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 รีเซ็ตสถานะนักเรียนเสร็จสิ้น!');
    console.log('📱 ตอนนี้สามารถใช้งาน Driver App ได้ใหม่');
    console.log('💡 นักเรียนทุกคนจะแสดงสถานะ "ยังไม่ขึ้นรถ"');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการรีเซ็ต:', error);
  }
}

// รันการรีเซ็ต
resetStudentStatus().then(() => {
  console.log('\n✅ การรีเซ็ตเสร็จสิ้น');
  process.exit(0);
}).catch(error => {
  console.error('❌ เกิดข้อผิดพลาด:', error);
  process.exit(1);
});