import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testContactDriverLogic() {
    console.log('🧪 Testing Contact Driver Logic Directly...\n');
    
    const studentId = 1;
    
    try {
        console.log('🔍 Step 1: Testing with hardcoded driver_id = 1 (same as in handleContactDriverRequest)...');
        
        // ใช้ driver_id = 1 เหมือนกับในฟังก์ชัน handleContactDriverRequest
        const driverId = 1;
        
        console.log('🔍 Step 2: Getting driver status via RPC...');
        const { data: driverStatus, error: rpcError } = await supabase
          .rpc('get_driver_current_status', { p_driver_id: driverId });

        console.log('📊 RPC Result:');
        console.log('- Data:', driverStatus);
        console.log('- Error:', rpcError);

        if (rpcError || !driverStatus || driverStatus.success !== true) {
          console.log('❌ RPC failed, testing fallback...');
          
          const { data: phoneRow, error: phoneError } = await supabase
            .from('driver_bus')
            .select('phone_number')
            .eq('driver_id', driverId)
            .single();

          console.log('📞 Fallback Result:');
          console.log('- Data:', phoneRow);
          console.log('- Error:', phoneError);
          
          if (phoneError || !phoneRow) {
            console.log('❌ Both RPC and fallback failed');
            return;
          }
          
          console.log('✅ Fallback successful, phone:', phoneRow.phone_number);
          return;
        }
        
        let phoneNumber = driverStatus?.phone_number;
        console.log('📞 Phone number from RPC:', phoneNumber);
        
        if (!phoneNumber) {
            console.log('🔍 Step 3: Fallback - Getting phone from driver_bus table...');
            const { data: phoneRow, error: phoneError } = await supabase
                .from('driver_bus')
                .select('phone_number')
                .eq('driver_id', driverId)
                .single();
                
            console.log('📊 Fallback Query Result:');
            console.log('- Data:', phoneRow);
            console.log('- Error:', phoneError);
            
            if (phoneRow?.phone_number) {
                phoneNumber = phoneRow.phone_number;
                console.log('✅ Got phone number from fallback:', phoneNumber);
            }
        }
        
        if (phoneNumber) {
            const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
            
            console.log('\n📊 Final Result:');
            console.log('- Driver Name:', driverStatus?.driver_name || 'Unknown');
            console.log('- Phone Number:', phoneNumber);
            console.log('- Clean Phone Number:', cleanPhoneNumber);
            console.log('- License Plate:', driverStatus?.license_plate || 'Unknown');
            console.log('- Current Status:', driverStatus?.current_status || 'Unknown');
            
            const message = `🚌 ข้อมูลคนขับรถ\n\n` +
                          `👤 ชื่อ: ${driverStatus?.driver_name || 'ไม่ระบุ'}\n` +
                          `📞 เบอร์โทร: ${phoneNumber}\n` +
                          `🚗 ทะเบียนรถ: ${driverStatus?.license_plate || 'ไม่ระบุ'}\n` +
                          `📍 สถานะ: ${driverStatus?.current_status === 'active' ? 'ปฏิบัติงาน' : 'ไม่ปฏิบัติงาน'}\n\n` +
                          `💡 คุณสามารถโทรติดต่อคนขับได้โดยตรง`;
                          
            console.log('\n📱 Message to send:');
            console.log(message);
            
            console.log('\n✅ Contact Driver Logic Test SUCCESSFUL!');
        } else {
            console.log('\n❌ Could not get phone number from either RPC or fallback');
        }
        
    } catch (error) {
        console.error('❌ Error testing contact driver logic:', error);
    }
}

testContactDriverLogic();