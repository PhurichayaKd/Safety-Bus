import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createUsersTable() {
    console.log('🚀 Creating users table...');
    
    // Try to create dummy users first
    const dummyUsers = [
        {
            id: '00000000-0000-0000-0000-000000000001',
            email: 'somchai001@example.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        },
        {
            id: '00000000-0000-0000-0000-000000000002',
            email: 'malee002@example.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        }
    ];

    for (const user of dummyUsers) {
        try {
            const { data, error } = await supabase
                .from('users')
                .upsert(user, { onConflict: 'id' })
                .select()
                .single();

            if (error) {
                console.error(`❌ Error inserting user ${user.id}:`, error);
            } else {
                console.log(`✅ User ${user.id} inserted:`, data);
            }
        } catch (err) {
            console.error(`❌ Failed to insert user ${user.id}:`, err.message);
        }
    }
}

createUsersTable();