import { supabase } from './lib/db.js';

/**
 * สคริปต์สำหรับเพิ่มคอลัมน์ line_display_id ในตาราง student_line_links และ parent_line_links
 */
async function addLineDisplayIdColumn() {
  console.log('🚀 เริ่มต้นการเพิ่มคอลัมน์ line_display_id...');

  try {
    // 1. เพิ่มคอลัมน์ line_display_id ในตาราง student_line_links
    console.log('📝 กำลังเพิ่มคอลัมน์ line_display_id ในตาราง student_line_links...');
    
    const { data: result1, error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'student_line_links' 
            AND column_name = 'line_display_id'
          ) THEN
            ALTER TABLE student_line_links 
            ADD COLUMN line_display_id VARCHAR(255);
            
            CREATE INDEX IF NOT EXISTS idx_student_line_links_line_display_id 
            ON student_line_links(line_display_id);
            
            RAISE NOTICE 'Added line_display_id column to student_line_links';
          ELSE
            RAISE NOTICE 'Column line_display_id already exists in student_line_links';
          END IF;
        END $$;
      `
    });

    if (error1) {
      console.error('❌ ข้อผิดพลาดในการเพิ่มคอลัมน์ student_line_links:', error1);
      
      // ลองใช้วิธีอื่น - ใช้ SQL โดยตรง
      console.log('🔄 ลองใช้วิธีอื่น...');
      const { error: directError1 } = await supabase
        .from('student_line_links')
        .select('line_display_id')
        .limit(1);
      
      if (directError1 && directError1.code === '42703') {
        console.log('📝 ใช้ ALTER TABLE โดยตรง...');
        // ใช้ SQL โดยตรงผ่าน rpc
        const { error: alterError1 } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE student_line_links ADD COLUMN line_display_id VARCHAR(255);'
        });
        
        if (alterError1) {
          console.error('❌ ไม่สามารถเพิ่มคอลัมน์ได้:', alterError1);
        } else {
          console.log('✅ เพิ่มคอลัมน์ student_line_links สำเร็จ');
        }
      } else {
        console.log('✅ คอลัมน์ line_display_id มีอยู่แล้วใน student_line_links');
      }
    } else {
      console.log('✅ เพิ่มคอลัมน์ student_line_links สำเร็จ');
    }

    // 2. เพิ่มคอลัมน์ line_display_id ในตาราง parent_line_links
    console.log('📝 กำลังเพิ่มคอลัมน์ line_display_id ในตาราง parent_line_links...');
    
    const { data: result2, error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'parent_line_links' 
            AND column_name = 'line_display_id'
          ) THEN
            ALTER TABLE parent_line_links 
            ADD COLUMN line_display_id VARCHAR(255);
            
            CREATE INDEX IF NOT EXISTS idx_parent_line_links_line_display_id 
            ON parent_line_links(line_display_id);
            
            RAISE NOTICE 'Added line_display_id column to parent_line_links';
          ELSE
            RAISE NOTICE 'Column line_display_id already exists in parent_line_links';
          END IF;
        END $$;
      `
    });

    if (error2) {
      console.error('❌ ข้อผิดพลาดในการเพิ่มคอลัมน์ parent_line_links:', error2);
      
      // ลองใช้วิธีอื่น
      console.log('🔄 ลองใช้วิธีอื่น...');
      const { error: directError2 } = await supabase
        .from('parent_line_links')
        .select('line_display_id')
        .limit(1);
      
      if (directError2 && directError2.code === '42703') {
        console.log('📝 ใช้ ALTER TABLE โดยตรง...');
        const { error: alterError2 } = await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE parent_line_links ADD COLUMN line_display_id VARCHAR(255);'
        });
        
        if (alterError2) {
          console.error('❌ ไม่สามารถเพิ่มคอลัมน์ได้:', alterError2);
        } else {
          console.log('✅ เพิ่มคอลัมน์ parent_line_links สำเร็จ');
        }
      } else {
        console.log('✅ คอลัมน์ line_display_id มีอยู่แล้วใน parent_line_links');
      }
    } else {
      console.log('✅ เพิ่มคอลัมน์ parent_line_links สำเร็จ');
    }

    // 3. สร้าง index
    console.log('📝 กำลังสร้าง index...');
    
    try {
      await supabase.rpc('exec_sql', {
        sql: `
          CREATE INDEX IF NOT EXISTS idx_student_line_links_line_display_id 
          ON student_line_links(line_display_id);
          
          CREATE INDEX IF NOT EXISTS idx_parent_line_links_line_display_id 
          ON parent_line_links(line_display_id);
        `
      });
      console.log('✅ สร้าง index สำเร็จ');
    } catch (indexError) {
      console.log('⚠️ อาจมี index อยู่แล้ว:', indexError.message);
    }

    console.log('🎉 การเพิ่มคอลัมน์ line_display_id เสร็จสมบูรณ์!');
    
    // ตรวจสอบผลลัพธ์
    console.log('\n📊 ตรวจสอบผลลัพธ์:');
    
    const { data: studentSample } = await supabase
      .from('student_line_links')
      .select('*')
      .limit(1);
    
    const { data: parentSample } = await supabase
      .from('parent_line_links')
      .select('*')
      .limit(1);

    if (studentSample && studentSample[0]) {
      console.log('✅ student_line_links columns:', Object.keys(studentSample[0]));
    }
    
    if (parentSample && parentSample[0]) {
      console.log('✅ parent_line_links columns:', Object.keys(parentSample[0]));
    }

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเพิ่มคอลัมน์:', error);
  }
}

// รันสคริปต์
addLineDisplayIdColumn().then(() => {
  console.log('✅ สคริปต์เสร็จสิ้น');
  process.exit(0);
}).catch((error) => {
  console.error('❌ สคริปต์ล้มเหลว:', error);
  process.exit(1);
});