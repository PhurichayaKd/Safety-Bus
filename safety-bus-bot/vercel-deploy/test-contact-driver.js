import { createClient } from '@supabase/supabase-js';

// ใช้ค่าจากไฟล์ .env โดยตรง
const supabaseUrl = 'https://ugkxolufzlnvjsvtpxhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testContactDriverLogic() {
  console.log('🔍 Testing Contact Driver Logic...\n');

  try {
    // 1. เรียก RPC เพื่อดึงข้อมูลคนขับ
    console.log('1. Testing RPC get_driver_current_status...');
    const { data: driverStatus, error: rpcError } = await supabase
      .rpc('get_driver_current_status', { p_driver_id: 1 });

    console.log('RPC Result:', { driverStatus, rpcError });

    if (rpcError || !driverStatus || driverStatus.success !== true) {
      console.log('❌ RPC failed or driver not found');
      return;
    }

    // 2. ตรวจสอบ phone_number จาก RPC
    let phoneNumber = driverStatus.phone_number;
    console.log('🔍 Phone number from RPC:', phoneNumber);
    
    if (!phoneNumber) {
      console.log('📞 No phone number from RPC, trying fallback query...');
      
      // 3. Fallback query
      const { data: phoneRow, error: phoneError } = await supabase
        .from('driver_bus')
        .select('phone_number')
        .eq('driver_id', 1)
        .single();
      
      console.log('🔍 Fallback query result:', { phoneRow, phoneError });
      
      if (!phoneError && phoneRow && phoneRow.phone_number) {
        phoneNumber = phoneRow.phone_number;
        console.log('✅ Got phone number from fallback:', phoneNumber);
      } else {
        console.log('❌ Fallback query failed or no phone number found');
      }
    } else {
      console.log('✅ Using phone number from RPC:', phoneNumber);
    }

    // 4. สร้างข้อความตอบกลับ
    const driverName = driverStatus.driver_name || 'ไม่ระบุชื่อ';
    const licensePlate = driverStatus.license_plate || 'ไม่ระบุทะเบียน';
    const finalPhoneNumber = phoneNumber || 'ไม่ระบุเบอร์';
    
    console.log('\n📊 Final Driver Info:');
    console.log('- Driver Name:', driverName);
    console.log('- Phone Number:', finalPhoneNumber);
    console.log('- License Plate:', licensePlate);
    
    // 5. ทำความสะอาดเบอร์โทรศัพท์
    const cleanPhoneNumber = finalPhoneNumber.replace(/[-\s]/g, '');
    console.log('- Clean Phone Number:', cleanPhoneNumber);
    
    console.log('\n✅ Contact Driver Logic Test Complete!');

  } catch (error) {
    console.error('❌ Error in testContactDriverLogic:', error);
  }
}

testContactDriverLogic();