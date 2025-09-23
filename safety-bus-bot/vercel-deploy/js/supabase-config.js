// Supabase Configuration
// Replace these values with your actual Supabase project details

const SUPABASE_CONFIG = {
    url: 'https://ugkxolufzlnvjsvtpxhp.supabase.co', // Replace with your actual Supabase URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVna3hvbHVmemxudmpzdnRweGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMjE0NzAsImV4cCI6MjA2ODU5NzQ3MH0.lTYy0XgabeQgrNT6jzYUaJzB1GnkuU9CiSrd0fCBEEE' // Replace with your actual Supabase anon key
};

// Validation function
function validateSupabaseConfig() {
    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL_HERE') {
        throw new Error('กรุณาตั้งค่า Supabase URL ในไฟล์ supabase-config.js');
    }
    if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY_HERE') {
        throw new Error('กรุณาตั้งค่า Supabase anon key ในไฟล์ supabase-config.js');
    }
    return true;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}