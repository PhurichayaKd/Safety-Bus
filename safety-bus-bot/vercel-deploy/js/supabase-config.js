// Supabase Configuration
// Replace these values with your actual Supabase project details

const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Replace with your actual Supabase URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY' // Replace with your actual Supabase anon key
};

// Validation function
function validateSupabaseConfig() {
    if (!SUPABASE_CONFIG.url || SUPABASE_CONFIG.url === 'YOUR_SUPABASE_URL') {
        throw new Error('กรุณาตั้งค่า Supabase URL ในไฟล์ supabase-config.js');
    }
    if (!SUPABASE_CONFIG.anonKey || SUPABASE_CONFIG.anonKey === 'YOUR_SUPABASE_ANON_KEY') {
        throw new Error('กรุณาตั้งค่า Supabase anon key ในไฟล์ supabase-config.js');
    }
    return true;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}