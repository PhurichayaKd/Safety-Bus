import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// โหลด environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deployUpdatedFunction() {
    try {
        console.log('🔄 Deploying updated RPC function...');
        
        // อ่านไฟล์ SQL
        const sqlContent = fs.readFileSync('../../supabase/functions/get-driver-current-status.sql', 'utf8');
        
        console.log('📝 SQL Content:');
        console.log(sqlContent.substring(0, 500) + '...');
        
        // ใช้ raw SQL query เพื่ออัปเดต function
        const { data, error } = await supabase
            .from('dummy') // ใช้ dummy table เพื่อให้ query ทำงาน
            .select('*')
            .limit(0);
            
        // ใช้ rpc ที่มีอยู่แล้วในระบบ
        const { data: result, error: rpcError } = await supabase.rpc('sql', {
            query: sqlContent
        });
        
        if (rpcError) {
            console.log('❌ RPC Error:', rpcError);
            
            // ลองใช้วิธีอื่น - ใช้ REST API
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`,
                    'apikey': supabaseServiceKey
                },
                body: JSON.stringify({
                    query: sqlContent
                })
            });
            
            if (!response.ok) {
                console.log('❌ REST API Error:', await response.text());
                console.log('⚠️  Manual deployment required. Please run the SQL in Supabase SQL Editor:');
                console.log('📋 SQL to execute:');
                console.log(sqlContent);
                return;
            }
            
            console.log('✅ Function deployed via REST API');
        } else {
            console.log('✅ Function deployed via RPC');
        }
        
        // ทดสอบ function ที่อัปเดตแล้ว
        console.log('\n🧪 Testing updated function...');
        const { data: testResult, error: testError } = await supabase
            .rpc('get_driver_current_status', { p_driver_id: 1 });
            
        if (testError) {
            console.log('❌ Test Error:', testError);
        } else {
            console.log('✅ Test Result:');
            console.log(JSON.stringify(testResult, null, 2));
            
            if (testResult.phone_number) {
                console.log('🎉 SUCCESS! phone_number is now returned:', testResult.phone_number);
            } else {
                console.log('⚠️  phone_number is still missing from the result');
            }
        }
        
    } catch (error) {
        console.error('❌ Exception:', error);
    }
}

deployUpdatedFunction();