// lib/db.js
import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

function createSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  // Prefer service role key for server-side operations if available
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Lazy initialization
function getSupabase() {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient();
  }
  return supabaseInstance;
}

// Export getter function as supabase for backward compatibility
export const supabase = new Proxy({}, {
  get(target, prop) {
    return getSupabase()[prop];
  }
});

export { createSupabaseClient };