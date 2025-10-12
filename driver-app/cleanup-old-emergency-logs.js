const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupOldEmergencyLogs() {
  try {
    console.log('🧹 Starting cleanup of old emergency logs...');
    
    // Get current count
    const { count: beforeCount } = await supabase
      .from('emergency_logs')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', 1)
      .is('driver_response_type', null);
    
    console.log(`📊 Current unresolved logs: ${beforeCount}`);
    
    // Option 1: Mark old logs as resolved (safer approach)
    console.log('\n🔄 Marking old logs as resolved...');
    
    // Get logs older than 24 hours that are unresolved
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { data: oldLogs, error: fetchError } = await supabase
      .from('emergency_logs')
      .select('event_id, event_time, event_type')
      .eq('driver_id', 1)
      .is('driver_response_type', null)
      .lt('event_time', oneDayAgo.toISOString())
      .order('event_time', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Error fetching old logs:', fetchError);
      return;
    }
    
    console.log(`📋 Found ${oldLogs?.length || 0} old logs to resolve`);
    
    if (oldLogs && oldLogs.length > 0) {
      // Show some examples
      console.log('📄 Examples of logs to be resolved:');
      oldLogs.slice(0, 3).forEach(log => {
        console.log(`  - ID: ${log.event_id}, Time: ${log.event_time}, Type: ${log.event_type}`);
      });
      
      // Mark them as auto-resolved
      const { error: updateError } = await supabase
        .from('emergency_logs')
        .update({
          driver_response_type: 'CHECKED',
          driver_response_time: new Date().toISOString(),
          driver_response_notes: 'Auto-resolved: Old emergency log cleaned up by system'
        })
        .eq('driver_id', 1)
        .is('driver_response_type', null)
        .lt('event_time', oneDayAgo.toISOString());
      
      if (updateError) {
        console.error('❌ Error updating logs:', updateError);
      } else {
        console.log('✅ Successfully marked old logs as resolved');
      }
    }
    
    // Get new count
    const { count: afterCount } = await supabase
      .from('emergency_logs')
      .select('*', { count: 'exact', head: true })
      .eq('driver_id', 1)
      .is('driver_response_type', null);
    
    console.log(`📊 Remaining unresolved logs: ${afterCount}`);
    console.log(`🎯 Cleaned up: ${beforeCount - afterCount} logs`);
    
    // Show remaining recent logs
    const { data: recentLogs } = await supabase
      .from('emergency_logs')
      .select('event_id, event_time, event_type, details')
      .eq('driver_id', 1)
      .is('driver_response_type', null)
      .order('event_time', { ascending: false })
      .limit(5);
    
    if (recentLogs && recentLogs.length > 0) {
      console.log('\n📋 Recent unresolved logs:');
      recentLogs.forEach(log => {
        console.log(`  - ID: ${log.event_id}, Time: ${log.event_time}, Type: ${log.event_type}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Ask for confirmation
console.log('⚠️  This script will mark old emergency logs as AUTO_RESOLVED');
console.log('📅 Logs older than 24 hours will be cleaned up');
console.log('🔄 Starting in 3 seconds...');

setTimeout(() => {
  cleanupOldEmergencyLogs();
}, 3000);