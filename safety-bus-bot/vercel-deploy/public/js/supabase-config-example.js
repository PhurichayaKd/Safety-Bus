// ตัวอย่างการตั้งค่า Supabase Configuration
// คัดลอกไฟล์นี้เป็น supabase-config.js และแก้ไขค่าจริง

const SUPABASE_CONFIG = {
    // ตัวอย่าง URL: https://abcdefghijklmnop.supabase.co
    url: 'https://your-project-url.supabase.co',
    
    // ตัวอย่าง anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    anonKey: 'your-anon-key'
};

// Validation function
function validateSupabaseConfig() {
    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'https://your-project-url.supabase.co') {
        throw new Error('กรุณาตั้งค่า Supabase URL ในไฟล์ supabase-config.js');
    }
    if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'your-anon-key') {
        throw new Error('กรุณาตั้งค่า Supabase anon key ในไฟล์ supabase-config.js');
    }
    return true;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}

/* 
ขั้นตอนการตั้งค่า:
1. ไปที่ https://supabase.com/dashboard
2. เลือกโปรเจกต์ของคุณ
3. ไปที่ Settings > API
4. คัดลอก Project URL และ anon public key
5. แทนที่ค่าใน SUPABASE_CONFIG ด้านบน
6. บันทึกไฟล์เป็น supabase-config.js
*/