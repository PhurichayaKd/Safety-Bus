const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

console.log('🔍 Testing Supabase Connection...\n');

// ตรวจสอบ environment variables
console.log('📋 Environment Variables:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'Set (hidden)' : 'Not set');
console.log('');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// สร้าง Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // ไม่ persist session สำหรับการทดสอบ
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'driver-app-test',
    },
  },
});

async function testConnection() {
  try {
    console.log('🌐 Testing basic connection...');
    
    // ทดสอบการเชื่อมต่อพื้นฐาน
    const { data, error } = await supabase
      .from('driver_bus')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.error('Error details:', error);
      return false;
    }
    
    console.log('✅ Basic connection successful');
    
    // ทดสอบการ query ข้อมูล
    console.log('\n📊 Testing data query...');
    const { data: drivers, error: queryError } = await supabase
      .from('driver_bus')
      .select('driver_id, driver_name')
      .limit(3);
    
    if (queryError) {
      console.error('❌ Query failed:', queryError.message);
      return false;
    }
    
    console.log('✅ Data query successful');
    console.log('Sample drivers:', drivers);
    
    // ทดสอบ auth endpoint
    console.log('\n🔐 Testing auth endpoint...');
    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) {
        console.warn('⚠️ Auth endpoint warning:', authError.message);
      } else {
        console.log('✅ Auth endpoint accessible');
      }
    } catch (authErr) {
      console.warn('⚠️ Auth endpoint error:', authErr.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

async function testNetworkConnectivity() {
  console.log('\n🌍 Testing network connectivity...');
  
  try {
    // ทดสอบ DNS resolution
    const dns = require('dns').promises;
    const hostname = new URL(supabaseUrl).hostname;
    
    console.log(`🔍 Resolving DNS for ${hostname}...`);
    const addresses = await dns.resolve4(hostname);
    console.log('✅ DNS resolution successful:', addresses[0]);
    
    // ทดสอบ HTTP connection
    const https = require('https');
    const url = require('url');
    
    return new Promise((resolve) => {
      const options = url.parse(supabaseUrl + '/rest/v1/');
      options.method = 'HEAD';
      options.timeout = 10000;
      
      const req = https.request(options, (res) => {
        console.log('✅ HTTP connection successful, status:', res.statusCode);
        resolve(true);
      });
      
      req.on('error', (error) => {
        console.error('❌ HTTP connection failed:', error.message);
        resolve(false);
      });
      
      req.on('timeout', () => {
        console.error('❌ HTTP connection timeout');
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
    
  } catch (error) {
    console.error('❌ Network test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive Supabase connection test...\n');
  
  // ทดสอบ network connectivity ก่อน
  const networkOk = await testNetworkConnectivity();
  
  if (!networkOk) {
    console.log('\n❌ Network connectivity issues detected');
    console.log('💡 Possible solutions:');
    console.log('   - Check your internet connection');
    console.log('   - Check DNS settings');
    console.log('   - Try using a different network');
    console.log('   - Check if firewall is blocking the connection');
    return;
  }
  
  // ทดสอบ Supabase connection
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    console.log('\n🎉 All tests passed! Supabase connection is working properly.');
  } else {
    console.log('\n❌ Supabase connection tests failed');
    console.log('💡 Possible solutions:');
    console.log('   - Check Supabase URL and API key');
    console.log('   - Verify Supabase project is active');
    console.log('   - Check network connectivity');
    console.log('   - Try restarting the application');
  }
}

main().catch(console.error);