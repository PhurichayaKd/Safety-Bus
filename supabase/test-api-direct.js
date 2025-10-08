import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');

dotenv.config({ path: envPath });

async function testApiDirect() {
  try {
    console.log('🔍 ทดสอบ API endpoint โดยตรง...\n');
    
    // ทดสอบกับรหัสบัตรที่มีในฐานข้อมูล
    const testCases = [
      { rfid_code: '63A17E34', driver_id: 1, location_type: 'go' },
      { rfid_code: 'F3C9DC34', driver_id: 1, location_type: 'go' },
      { rfid_code: 'INVALID123', driver_id: 1, location_type: 'go' } // ทดสอบบัตรที่ไม่มี
    ];
    
    const apiUrl = 'https://safety-bus-liff-v4-bi3u3anjx-phurichayakds-projects.vercel.app/api/rfid-scan';
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`🧪 ทดสอบที่ ${i + 1}: ${testCase.rfid_code}`);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testCase)
        });
        
        const responseText = await response.text();
        console.log(`📊 HTTP Status: ${response.status}`);
        console.log(`📋 Response: ${responseText}`);
        
        if (response.ok) {
          try {
            const jsonData = JSON.parse(responseText);
            if (jsonData.access_granted) {
              console.log('✅ การเข้าถึง: อนุญาต');
              if (jsonData.student) {
                console.log(`👤 นักเรียน: ${jsonData.student.name || 'ไม่ระบุชื่อ'}`);
              }
            } else {
              console.log('❌ การเข้าถึง: ไม่อนุญาต');
            }
          } catch (parseError) {
            console.log('⚠️  ไม่สามารถแปลง JSON ได้');
          }
        } else {
          console.log('❌ API Error');
        }
        
      } catch (fetchError) {
        console.error(`❌ Network Error: ${fetchError.message}`);
      }
      
      console.log(''.padEnd(50, '-'));
    }
    
    console.log('\n💡 สรุป:');
    console.log('- ถ้า API ตอบกลับ 200 และ access_granted: true แสดงว่า API ทำงานปกติ');
    console.log('- ถ้า API ตอบกลับ 404 หรือ access_granted: false แสดงว่าบัตรไม่รู้จัก');
    console.log('- ถ้ามี Network Error แสดงว่าปัญหาอยู่ที่การเชื่อมต่อ');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testApiDirect();