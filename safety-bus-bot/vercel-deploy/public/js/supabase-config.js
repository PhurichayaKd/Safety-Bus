// Supabase Configuration
// This will be populated by the server with actual values

let SUPABASE_CONFIG = {
    url: null,
    anonKey: null
};

// Function to fetch config from server
async function fetchSupabaseConfig() {
    try {
        const response = await fetch('/api/get-supabase-config');
        if (response.ok) {
            const config = await response.json();
            SUPABASE_CONFIG = config;
            return config;
        } else {
            throw new Error('Failed to fetch Supabase config');
        }
    } catch (error) {
        console.error('Error fetching Supabase config:', error);
        throw error;
    }
}

// Validation function
function validateSupabaseConfig() {
    if (!SUPABASE_CONFIG.url) {
        throw new Error('Supabase URL not configured');
    }
    if (!SUPABASE_CONFIG.anonKey) {
        throw new Error('Supabase anon key not configured');
    }
    return true;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SUPABASE_CONFIG, fetchSupabaseConfig, validateSupabaseConfig };
} else {
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.fetchSupabaseConfig = fetchSupabaseConfig;
    window.validateSupabaseConfig = validateSupabaseConfig;
}