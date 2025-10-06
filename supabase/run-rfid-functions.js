import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

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

async function runRfidFunctions() {
  try {
    console.log('🚀 Starting RFID functions creation...');
    
    // Read the migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20251010000000_add_rfid_functions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Executing RFID functions migration...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Error executing migration:', error);
      
      // Try alternative approach - execute functions individually
      console.log('🔄 Trying alternative approach...');
      
      // Test if functions exist by calling them
      try {
        const { data: testData, error: testError } = await supabase.rpc('assign_rfid_card', {
          p_student_id: 999999,
          p_card_id: 999999,
          p_assigned_by: 1
        });
        
        if (testError && testError.code === 'PGRST202') {
          console.log('❌ Functions do not exist. Manual creation required.');
          console.log('📋 Please execute the following SQL manually in your Supabase dashboard:');
          console.log('');
          console.log(migrationSQL);
          console.log('');
          console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
        } else {
          console.log('✅ Functions already exist!');
        }
      } catch (funcError) {
        console.log('❌ Functions do not exist. Manual creation required.');
        console.log('📋 Please execute the following SQL manually in your Supabase dashboard:');
        console.log('');
        console.log(migrationSQL);
        console.log('');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
      }
    } else {
      console.log('✅ RFID functions created successfully!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Provide manual instructions
    console.log('📋 Manual Migration Required:');
    console.log('');
    console.log('Please execute the following SQL in your Supabase dashboard:');
    console.log('🔗 Go to: https://supabase.com/dashboard/project/[your-project]/sql');
    console.log('');
    
    try {
      const migrationPath = join(__dirname, 'supabase', 'migrations', '20251010000000_add_rfid_functions.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log(migrationSQL);
    } catch (readError) {
      console.log('❌ Could not read migration file');
    }
  }
}

// Run the migration
runRfidFunctions();