import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config({ path: '../safety-bus-bot/vercel-deploy/.env.local', debug: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFixMigration() {
  try {
    console.log('🚀 Starting fix migration for updated_at function...');
    
    // อ่านไฟล์ migration
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '20251210000000_fix_updated_at_function.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration SQL...');
    
    // รัน migration
    const { data, error } = await supabase.rpc('exec', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Result:', data);
    
  } catch (error) {
    console.error('💥 Error running migration:', error);
    process.exit(1);
  }
}

runFixMigration();