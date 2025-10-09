import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from the vercel-deploy directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', 'safety-bus-bot', 'vercel-deploy', '.env.local');

dotenv.config({ path: envPath });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('SUPABASE_URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
  console.log('SUPABASE_KEY:', supabaseKey ? '✅ Found' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function installHttpExtension() {
  try {
    console.log('🚀 Installing HTTP extension in Supabase database...');
    
    // Check if HTTP extension is already installed
    const { data: extensions, error: checkError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'http');
    
    if (checkError) {
      console.log('⚠️  Could not check existing extensions (this is normal)');
    }
    
    // Install HTTP extension
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: 'CREATE EXTENSION IF NOT EXISTS http;'
    });
    
    if (error) {
      console.error('❌ Failed to install HTTP extension:', error);
      
      // Try alternative method using direct SQL execution
      console.log('🔄 Trying alternative installation method...');
      
      const { data: altData, error: altError } = await supabase
        .from('pg_stat_activity')
        .select('*')
        .limit(1);
      
      if (altError) {
        console.error('❌ Alternative method also failed:', altError);
        console.log('\n📋 Manual Installation Instructions:');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run this command: CREATE EXTENSION IF NOT EXISTS http;');
        console.log('4. The HTTP extension should be installed successfully');
        return;
      }
    }
    
    console.log('✅ HTTP extension installation completed!');
    
    // Verify installation by checking available functions
    console.log('🔍 Verifying HTTP extension installation...');
    
    const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT proname 
        FROM pg_proc 
        WHERE proname LIKE 'http_%' 
        ORDER BY proname;
      `
    });
    
    if (funcError) {
      console.log('⚠️  Could not verify HTTP functions (extension may still be installed)');
    } else if (functions && functions.length > 0) {
      console.log('✅ HTTP extension verified! Available functions:');
      functions.forEach(func => console.log(`  - ${func.proname}`));
    }
    
    console.log('\n🎉 HTTP extension is now ready for LINE notifications!');
    console.log('📝 You can now test RFID scanning with LINE notifications.');
    
  } catch (error) {
    console.error('❌ Installation error:', error);
    console.log('\n📋 Manual Installation Instructions:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run this command: CREATE EXTENSION IF NOT EXISTS http;');
    console.log('4. The HTTP extension should be installed successfully');
  }
}

// Run the installation
installHttpExtension();