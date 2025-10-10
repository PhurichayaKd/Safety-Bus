const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDuplicateParents() {
  try {
    console.log('🔍 ตรวจสอบข้อมูลซ้ำในตาราง parents...');
    
    // ค้นหาเบอร์โทรที่ซ้ำกัน
    const { data: duplicates, error } = await supabase
      .rpc('get_duplicate_parent_phones');

    if (error) {
      console.error('❌ Error checking duplicates:', error);
      console.log('ลองใช้ query ธรรมดาแทน...');
      
      // ใช้ query ธรรมดาแทน
      const { data: allParents, error: allError } = await supabase
        .from('parents')
        .select('parent_id, parent_name, parent_phone')
        .order('parent_phone');

      if (allError) {
        console.error('❌ Error getting all parents:', allError);
        return;
      }

      // หาข้อมูลซ้ำด้วย JavaScript
      const phoneGroups = {};
      allParents.forEach(parent => {
        if (parent.parent_phone) {
          if (!phoneGroups[parent.parent_phone]) {
            phoneGroups[parent.parent_phone] = [];
          }
          phoneGroups[parent.parent_phone].push(parent);
        }
      });

      const duplicatePhones = Object.keys(phoneGroups).filter(phone => phoneGroups[phone].length > 1);
      
      if (duplicatePhones.length > 0) {
        console.log('⚠️  พบเบอร์โทรซ้ำ:', duplicatePhones.length, 'เบอร์');
        
        duplicatePhones.forEach(phone => {
          console.log(`\n📞 เบอร์โทร: ${phone} (${phoneGroups[phone].length} รายการ)`);
          phoneGroups[phone].forEach((parent, index) => {
            console.log(`  ${index + 1}. ID: ${parent.parent_id}, ชื่อ: ${parent.parent_name}`);
          });
        });
      } else {
        console.log('✅ ไม่พบเบอร์โทรซ้ำในตาราง parents');
      }
      return;
    }

    if (duplicates && duplicates.length > 0) {
      console.log('⚠️  พบเบอร์โทรซ้ำ:', duplicates.length, 'รายการ');
      
      for (const dup of duplicates) {
        console.log(`\n📞 เบอร์โทร: ${dup.parent_phone} (${dup.count} รายการ)`);
        
        // ดูรายละเอียดของแต่ละรายการ
        const { data: details, error: detailError } = await supabase
          .from('parents')
          .select('parent_id, parent_name, parent_phone')
          .eq('parent_phone', dup.parent_phone)
          .order('parent_id');

        if (detailError) {
          console.error('❌ Error getting details:', detailError);
          continue;
        }

        details.forEach((parent, index) => {
          console.log(`  ${index + 1}. ID: ${parent.parent_id}, ชื่อ: ${parent.parent_name}`);
        });
      }
    } else {
      console.log('✅ ไม่พบเบอร์โทรซ้ำในตาราง parents');
    }

    // ตรวจสอบข้อมูลว่างหรือ null
    const { data: nullPhones, error: nullError } = await supabase
      .from('parents')
      .select('parent_id, parent_name, parent_phone')
      .or('parent_phone.is.null,parent_phone.eq.')
      .order('parent_id');

    if (nullError) {
      console.error('❌ Error checking null phones:', nullError);
    } else if (nullPhones && nullPhones.length > 0) {
      console.log(`\n⚠️  พบข้อมูลเบอร์โทรว่าง/null: ${nullPhones.length} รายการ`);
      nullPhones.forEach(parent => {
        console.log(`  ID: ${parent.parent_id}, ชื่อ: ${parent.parent_name}, เบอร์: ${parent.parent_phone || 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDuplicateParents();