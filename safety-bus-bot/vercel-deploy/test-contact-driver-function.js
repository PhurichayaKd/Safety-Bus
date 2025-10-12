import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// จำลองฟังก์ชัน replyLineMessage
async function mockReplyLineMessage(replyToken, message) {
  console.log('📤 Mock Reply Message:');
  console.log('🎫 Reply Token:', replyToken);
  console.log('💬 Message:', JSON.stringify(message, null, 2));
  console.log('');
}

// จำลองฟังก์ชัน handleContactDriverRequest
async function simulateHandleContactDriverRequest() {
  const mockEvent = {
    source: { userId: 'U1234567890abcdef1234567890abcdef' },
    replyToken: 'mock-reply-token-' + Date.now()
  };
  
  const userId = mockEvent.source.userId;
  const replyToken = mockEvent.replyToken;
  
  try {
    console.log('🔍 [DEBUG] handleContactDriverRequest called for userId:', userId);
    
    // ตรวจสอบ replyToken ก่อน
    if (!replyToken) {
      console.error('❌ No reply token provided');
      return;
    }
    
    console.log('📞 [INFO] Fetching driver ID 1 via RPC get_driver_current_status');
    
    let driverInfo = null;
    let phoneNumber = null;
    
    // ลองดึงข้อมูลคนขับจาก RPC function ก่อน
    try {
      const { data: driverStatus, error: rpcError } = await supabase
        .rpc('get_driver_current_status', { p_driver_id: 1 });

      console.log('🔍 [DEBUG] RPC get_driver_current_status result:', { driverStatus, rpcError });

      if (!rpcError && driverStatus && driverStatus.success === true) {
        driverInfo = driverStatus;
        phoneNumber = driverStatus.phone_number;
        console.log('✅ [DEBUG] Got driver info from RPC');
      } else {
        console.log('⚠️ [DEBUG] RPC failed or no data, trying fallback...');
      }
    } catch (rpcErr) {
      console.log('⚠️ [DEBUG] RPC exception:', rpcErr.message);
    }
    
    // ถ้า RPC ไม่ได้ผล ให้ลองดึงจากตารางโดยตรง
    if (!driverInfo) {
      try {
        console.log('🔍 [DEBUG] Trying direct database query...');
        const { data: driverRow, error: dbError } = await supabase
          .from('driver_bus')
          .select('driver_id, driver_name, phone_number, license_plate')
          .eq('driver_id', 1)
          .single();
        
        console.log('🔍 [DEBUG] Direct query result:', { driverRow, dbError });
        
        if (!dbError && driverRow) {
          driverInfo = {
            driver_name: driverRow.driver_name,
            license_plate: driverRow.license_plate,
            success: true
          };
          phoneNumber = driverRow.phone_number;
          console.log('✅ [DEBUG] Got driver info from direct query');
        }
      } catch (dbErr) {
        console.log('⚠️ [DEBUG] Direct query exception:', dbErr.message);
      }
    }
    
    // ถ้ายังไม่มีข้อมูลคนขับ ให้ส่งข้อความติดต่อโรงเรียน
    if (!driverInfo) {
      console.log('❌ [DEBUG] No driver info found, sending contact school message');
      await mockReplyLineMessage(replyToken, {
        type: 'text',
        text: '📞 ติดต่อคนขับรถ\n\n⚠️ ไม่พบข้อมูลคนขับในระบบ\nกรุณาติดต่อโรงเรียนโดยตรง\n\n📞 โทร: 043-754-321\n⏰ เวลาทำการ: 08:00 - 16:30 น.'
      });
      return;
    }
    
    // ตรวจสอบและทำความสะอาดข้อมูล
    const driverName = driverInfo.driver_name || 'คนขับรถโรงเรียน';
    const licensePlate = driverInfo.license_plate || 'ไม่ระบุ';
    phoneNumber = phoneNumber || '043-754-321';
    
    console.log('🔍 [DEBUG] Final driver info:', { driverName, phoneNumber, licensePlate });
    
    // ทำความสะอาดเบอร์โทรศัพท์
    const cleanPhoneNumber = phoneNumber.replace(/[-\s]/g, '');
    
    // ลองส่ง template message ก่อน
    try {
      await mockReplyLineMessage(replyToken, {
        type: 'template',
        altText: `📞 ติดต่อคนขับรถ - ${driverName} ${phoneNumber}`,
        template: {
          type: 'buttons',
          thumbnailImageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop',
          imageAspectRatio: 'rectangle',
          imageSize: 'cover',
          title: '📞 ติดต่อคนขับรถ',
          text: `👨‍💼 ${driverName}\n📱 เบอร์โทร: ${phoneNumber}\n🚌 ป้ายทะเบียน: ${licensePlate}\n⏰ เวลาทำการ: 06:00 - 17:00 น.`,
          actions: [
            {
              type: 'uri',
              label: '📞 โทรหาคนขับ',
              uri: `tel:${cleanPhoneNumber}`
            }
          ]
        }
      });
      console.log('✅ [DEBUG] Template message sent successfully');
    } catch (templateError) {
      console.log('⚠️ [DEBUG] Template message failed, trying simple text:', templateError.message);
      
      // ถ้า template message ไม่ได้ ให้ส่งข้อความธรรมดา
      await mockReplyLineMessage(replyToken, {
        type: 'text',
        text: `📞 ติดต่อคนขับรถ\n\n👨‍💼 ${driverName}\n📱 เบอร์โทร: ${phoneNumber}\n🚌 ป้ายทะเบียน: ${licensePlate}\n⏰ เวลาทำการ: 06:00 - 17:00 น.\n\n💡 กดที่เบอร์โทรเพื่อโทรหาคนขับ`
      });
      console.log('✅ [DEBUG] Simple text message sent as fallback');
    }

  } catch (error) {
    console.error('❌ Error in handleContactDriverRequest:', error);
    
    // ส่งข้อความ error แบบง่าย
    try {
      if (replyToken) {
        await mockReplyLineMessage(replyToken, {
          type: 'text',
          text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลคนขับ\n\nกรุณาติดต่อโรงเรียนโดยตรง:\n📞 043-754-321\n\nขออภัยในความไม่สะดวก 🙏'
        });
      }
    } catch (replyError) {
      console.error('❌ Failed to send error message:', replyError);
    }
  }
}

// เรียกใช้ฟังก์ชัน
console.log('🧪 Simulating handleContactDriverRequest function...\n');
simulateHandleContactDriverRequest().then(() => {
  console.log('\n🏁 Simulation completed');
}).catch(error => {
  console.error('💥 Simulation failed:', error);
});