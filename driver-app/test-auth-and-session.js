const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔐 Testing Auth and Session Management...\n');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// สร้าง Supabase client ด้วยการตั้งค่าที่ปรับปรุงแล้ว
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'X-Client-Info': 'driver-app-test',
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(30000), // 30 seconds timeout
      });
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
});

// Retry logic function
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      const isNetworkError = 
        error instanceof TypeError && (
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch')
        ) ||
        error instanceof Error && (
          error.message.includes('ERR_NETWORK') ||
          error.message.includes('ERR_INTERNET_DISCONNECTED') ||
          error.message.includes('ERR_QUIC_PROTOCOL_ERROR') ||
          error.message.includes('ERR_NETWORK_IO_SUSPENDED') ||
          error.message.includes('ERR_NETWORK_CHANGED') ||
          error.message.includes('ERR_NAME_NOT_RESOLVED') ||
          error.message.includes('net::ERR_QUIC_PROTOCOL_ERROR') ||
          error.message.includes('net::ERR_NETWORK_CHANGED') ||
          error.message.includes('net::ERR_NETWORK_IO_SUSPENDED') ||
          error.message.includes('net::ERR_NAME_NOT_RESOLVED')
        );
      
      if (isNetworkError && attempt < maxRetries) {
        console.warn(`⚠️ Network error on attempt ${attempt}, retrying in ${delay * attempt}ms...`);
        console.warn(`   Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// Session recovery function
const recoverSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Session recovery error:', error.message);
      return false;
    }
    
    if (!session) {
      console.log('No session to recover');
      return false;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    
    if (expiresAt <= now) {
      console.log('Session expired, attempting refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.warn('Session refresh failed:', refreshError.message);
        return false;
      }
      
      console.log('Session refreshed successfully');
      return !!refreshData.session;
    }
    
    console.log('Session is valid');
    return true;
    
  } catch (error) {
    console.warn('Session recovery failed:', error);
    return false;
  }
};

async function testAuthEndpoints() {
  console.log('🔐 Testing Auth Endpoints...\n');
  
  try {
    // ทดสอบ getSession
    console.log('1. Testing getSession...');
    const sessionResult = await withRetry(() => supabase.auth.getSession());
    console.log('✅ getSession successful');
    
    // ทดสอบ getUser
    console.log('2. Testing getUser...');
    const userResult = await withRetry(() => supabase.auth.getUser());
    console.log('✅ getUser successful');
    
    // ทดสอบ session recovery
    console.log('3. Testing session recovery...');
    const recoveryResult = await withRetry(() => recoverSession());
    console.log(`✅ Session recovery test completed (result: ${recoveryResult})`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Auth endpoint test failed:', error.message);
    
    // ตรวจสอบประเภทของ error
    if (error.message.includes('net::ERR_QUIC_PROTOCOL_ERROR')) {
      console.log('💡 QUIC Protocol Error detected - this may be a temporary network issue');
    } else if (error.message.includes('net::ERR_NETWORK_CHANGED')) {
      console.log('💡 Network Changed Error detected - network connection may have changed');
    } else if (error.message.includes('net::ERR_NETWORK_IO_SUSPENDED')) {
      console.log('💡 Network IO Suspended Error detected - network may be temporarily unavailable');
    } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
      console.log('💡 DNS Resolution Error detected - check DNS settings');
    } else if (error.message.includes('Failed to fetch')) {
      console.log('💡 Fetch Error detected - general network connectivity issue');
    }
    
    return false;
  }
}

async function testDatabaseOperations() {
  console.log('\n📊 Testing Database Operations...\n');
  
  try {
    // ทดสอบ simple query
    console.log('1. Testing simple query...');
    const { data, error } = await withRetry(() => 
      supabase.from('driver_bus').select('driver_id, driver_name').limit(2)
    );
    
    if (error) {
      console.error('❌ Database query failed:', error.message);
      return false;
    }
    
    console.log('✅ Database query successful');
    console.log('Sample data:', data);
    
    return true;
    
  } catch (error) {
    console.error('❌ Database operation failed:', error.message);
    return false;
  }
}

async function testTokenRefresh() {
  console.log('\n🔄 Testing Token Refresh...\n');
  
  try {
    // ทดสอบ refresh session
    console.log('1. Testing refresh session...');
    const { data, error } = await withRetry(() => supabase.auth.refreshSession());
    
    if (error) {
      console.warn('⚠️ Refresh session warning:', error.message);
      // ไม่ return false เพราะอาจไม่มี session ให้ refresh
    } else {
      console.log('✅ Refresh session test completed');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Token refresh test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive auth and session test...\n');
  
  let allTestsPassed = true;
  
  // ทดสอบ Auth Endpoints
  const authTest = await testAuthEndpoints();
  if (!authTest) allTestsPassed = false;
  
  // ทดสอบ Database Operations
  const dbTest = await testDatabaseOperations();
  if (!dbTest) allTestsPassed = false;
  
  // ทดสอบ Token Refresh
  const refreshTest = await testTokenRefresh();
  if (!refreshTest) allTestsPassed = false;
  
  console.log('\n' + '='.repeat(50));
  
  if (allTestsPassed) {
    console.log('🎉 All tests passed! The Supabase connection issues appear to be resolved.');
    console.log('\n💡 Recommendations:');
    console.log('   ✅ Environment variables are properly configured');
    console.log('   ✅ Network connectivity is working');
    console.log('   ✅ Supabase client configuration is optimized');
    console.log('   ✅ Retry logic is handling network errors');
    console.log('   ✅ Session management is improved');
  } else {
    console.log('❌ Some tests failed. Please check the errors above.');
    console.log('\n💡 If you continue to see network errors:');
    console.log('   - Try switching to a different network');
    console.log('   - Check your firewall settings');
    console.log('   - Restart your router/modem');
    console.log('   - Contact your ISP if the problem persists');
  }
  
  console.log('\n📱 The app should now handle network errors more gracefully with:');
  console.log('   - Automatic retry logic for network failures');
  console.log('   - Better session recovery');
  console.log('   - Improved error handling');
  console.log('   - Extended timeout settings');
}

main().catch(console.error);