const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// อ่านค่า environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixNotificationLogsTable() {
    try {
        console.log('🔧 กำลังแก้ไขปัญหา notification_logs table...');
        
        // อ่านไฟล์ SQL
        const sqlPath = path.join(__dirname, 'fix-notification-logs.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        
        // รัน SQL
        const { data, error } = await supabase.rpc('exec_sql', {
            sql_query: sqlContent
        });
        
        if (error) {
            console.error('❌ เกิดข้อผิดพลาด:', error);
            
            // ลองรันทีละคำสั่ง
            console.log('🔄 กำลังลองรันทีละคำสั่ง...');
            
            const commands = sqlContent
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd && !cmd.startsWith('--'));
            
            for (const command of commands) {
                if (command) {
                    try {
                        console.log(`📝 รันคำสั่ง: ${command.substring(0, 50)}...`);
                        const { error: cmdError } = await supabase.rpc('exec_sql', {
                            sql_query: command + ';'
                        });
                        
                        if (cmdError) {
                            console.error(`❌ ข้อผิดพลาดในคำสั่ง: ${cmdError.message}`);
                        } else {
                            console.log('✅ สำเร็จ');
                        }
                    } catch (err) {
                        console.error(`❌ ข้อผิดพลาด: ${err.message}`);
                    }
                }
            }
        } else {
            console.log('✅ แก้ไข notification_logs table สำเร็จ!');
            console.log('📊 ผลลัพธ์:', data);
        }
        
        // ตรวจสอบว่าตารางถูกสร้างแล้ว
        console.log('🔍 ตรวจสอบโครงสร้างตาราง...');
        const { data: tableInfo, error: tableError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable')
            .eq('table_name', 'notification_logs')
            .order('ordinal_position');
            
        if (tableError) {
            console.error('❌ ไม่สามารถตรวจสอบโครงสร้างตารางได้:', tableError);
        } else {
            console.log('📋 โครงสร้างตาราง notification_logs:');
            tableInfo.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
            });
        }
        
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาดในการแก้ไข:', error);
    }
}

// รันการแก้ไข
fixNotificationLogsTable();