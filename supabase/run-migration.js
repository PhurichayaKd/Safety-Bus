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

async function runMigration() {
  try {
    console.log('🚀 Starting migration: Add location fields to driver_bus table...');
    
    // First, check if the columns already exist
    console.log('🔍 Checking current table structure...');
    
    try {
      const { data, error } = await supabase
        .from('driver_bus')
        .select('home_latitude, home_longitude, school_latitude, school_longitude')
        .limit(1);
      
      if (!error) {
        console.log('✅ Location fields already exist in driver_bus table!');
        console.log('📊 Migration appears to be already completed.');
        return;
      }
    } catch (checkError) {
      console.log('📝 Location fields do not exist yet, proceeding with migration...');
    }
    
    // Since we can't execute DDL directly through the client, 
    // we'll provide instructions for manual execution
    console.log('📋 Manual Migration Required:');
    console.log('');
    console.log('Please run the following SQL commands in your Supabase SQL Editor:');
    console.log('');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('');
    console.log('-- Add location fields to driver_bus table');
    console.log('ALTER TABLE driver_bus ADD COLUMN IF NOT EXISTS home_latitude DECIMAL(10, 8);');
    console.log('ALTER TABLE driver_bus ADD COLUMN IF NOT EXISTS home_longitude DECIMAL(11, 8);');
    console.log('ALTER TABLE driver_bus ADD COLUMN IF NOT EXISTS school_latitude DECIMAL(10, 8);');
    console.log('ALTER TABLE driver_bus ADD COLUMN IF NOT EXISTS school_longitude DECIMAL(11, 8);');
    console.log('');
    console.log('-- Add constraints');
    console.log('ALTER TABLE driver_bus ADD CONSTRAINT IF NOT EXISTS chk_driver_home_latitude CHECK (home_latitude IS NULL OR (home_latitude >= -90 AND home_latitude <= 90));');
    console.log('ALTER TABLE driver_bus ADD CONSTRAINT IF NOT EXISTS chk_driver_home_longitude CHECK (home_longitude IS NULL OR (home_longitude >= -180 AND home_longitude <= 180));');
    console.log('ALTER TABLE driver_bus ADD CONSTRAINT IF NOT EXISTS chk_driver_school_latitude CHECK (school_latitude IS NULL OR (school_latitude >= -90 AND school_latitude <= 90));');
    console.log('ALTER TABLE driver_bus ADD CONSTRAINT IF NOT EXISTS chk_driver_school_longitude CHECK (school_longitude IS NULL OR (school_longitude >= -180 AND school_longitude <= 180));');
    console.log('');
    console.log('-- Add indexes');
    console.log('CREATE INDEX IF NOT EXISTS idx_driver_bus_home_location ON driver_bus(home_latitude, home_longitude);');
    console.log('CREATE INDEX IF NOT EXISTS idx_driver_bus_school_location ON driver_bus(school_latitude, school_longitude);');
    console.log('');
    console.log('4. Click "Run" to execute the SQL');
    console.log('');
    console.log('📄 Alternatively, you can copy the entire content from:');
    console.log('   d:\\Project-IoT\\supabase\\add-driver-location-fields.sql');
    console.log('');
    
    // Try to verify if we can at least connect to the database
    const { data: testData, error: testError } = await supabase
      .from('driver_bus')
      .select('driver_name')
      .limit(1);
    
    if (testError) {
      console.log('⚠️  Warning: Could not connect to driver_bus table:', testError.message);
    } else {
      console.log('✅ Database connection successful');
      console.log('📊 Found driver_bus table with', testData?.length || 0, 'sample records');
    }
    
  } catch (error) {
    console.error('❌ Migration script failed:', error.message);
    process.exit(1);
  }
}

runMigration();