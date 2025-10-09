import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// โหลด environment variables
dotenv.config({ path: path.join(process.cwd(), '../safety-bus-bot/vercel-deploy/.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingRecords() {
  console.log('🔍 ตรวจสอบข้อมูลในตาราง pickup_dropoff...\n');

  try {
    // ตรวจสอบข้อมูลทั้งหมดในตาราง
    console.log('📋 ข้อมูลทั้งหมดในตาราง pickup_dropoff:');
    const { data: allData, error: allError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .order('event_time', { ascending: false });

    if (allError) {
      console.error('❌ Error:', allError.message);
      return;
    }

    if (allData && allData.length > 0) {
      console.log(`✅ พบข้อมูล ${allData.length} รายการ:`);
      allData.forEach((record, index) => {
        console.log(`\n--- Record ${index + 1} ---`);
        console.log(`Record ID: ${record.record_id}`);
        console.log(`Student ID: ${record.student_id}`);
        console.log(`Driver ID: ${record.driver_id}`);
        console.log(`Event Type: ${record.event_type}`);
        console.log(`Location Type: ${record.location_type}`);
        console.log(`Event Time: ${record.event_time}`);
        console.log(`Event Local Date: ${record.event_local_date}`);
        console.log(`Pickup Source: ${record.pickup_source}`);
      });
    } else {
      console.log('📭 ไม่มีข้อมูลในตาราง');
    }

    // ตรวจสอบข้อมูลของนักเรียน 100014 วันนี้โดยเฉพาะ
    const today = new Date().toISOString().split('T')[0];
    console.log(`\n🎯 ตรวจสอบข้อมูลของนักเรียน 100014 ในวันที่ ${today}:`);
    
    const { data: todayData, error: todayError } = await supabase
      .from('pickup_dropoff')
      .select('*')
      .eq('student_id', 100014)
      .eq('event_local_date', today);

    if (todayError) {
      console.error('❌ Error:', todayError.message);
    } else if (todayData && todayData.length > 0) {
      console.log(`⚠️ พบข้อมูลของนักเรียน 100014 วันนี้ ${todayData.length} รายการ:`);
      todayData.forEach((record, index) => {
        console.log(`${index + 1}. Record ID: ${record.record_id}, Event Type: ${record.event_type}, Location Type: ${record.location_type}, Time: ${record.event_time}`);
      });
    } else {
      console.log('✅ ไม่มีข้อมูลของนักเรียน 100014 วันนี้');
    }

    // ลองลบข้อมูลของนักเรียน 100014 ทั้งหมด
    console.log('\n🧹 ลบข้อมูลของนักเรียน 100014 ทั้งหมด...');
    const { error: deleteError } = await supabase
      .from('pickup_dropoff')
      .delete()
      .eq('student_id', 100014);

    if (deleteError) {
      console.error('❌ Error deleting:', deleteError.message);
    } else {
      console.log('✅ ลบข้อมูลสำเร็จ');
    }

  } catch (error) {
    console.error('❌ ข้อผิดพลาดทั่วไป:', error);
  }
}

checkExistingRecords();