import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkTableConstraints() {
  console.log('🔍 Checking pickup_dropoff table constraints...\n');

  try {
    // ตรวจสอบ pickup_source ที่ใช้ได้
    const { data: pickupSources, error: sourceError } = await supabase
      .from('pickup_dropoff')
      .select('pickup_source')
      .not('pickup_source', 'is', null);

    if (sourceError) {
      console.error('❌ Error fetching pickup_source data:', sourceError);
    } else {
      const uniqueSources = [...new Set(pickupSources.map(item => item.pickup_source))];
      console.log('📊 Available pickup_source values:', uniqueSources);
    }

    // ตรวจสอบ location_type ที่ใช้ได้
    const { data: locationTypes, error: locationError } = await supabase
      .from('pickup_dropoff')
      .select('location_type')
      .not('location_type', 'is', null);

    if (locationError) {
      console.error('❌ Error fetching location_type data:', locationError);
    } else {
      const uniqueTypes = [...new Set(locationTypes.map(item => item.location_type))];
      console.log('📊 Available location_type values:', uniqueTypes);
    }

    // ตรวจสอบ event_type ที่ใช้ได้
    const { data: eventTypes, error: eventError } = await supabase
      .from('pickup_dropoff')
      .select('event_type')
      .not('event_type', 'is', null);

    if (eventError) {
      console.error('❌ Error fetching event_type data:', eventError);
    } else {
      const uniqueEvents = [...new Set(eventTypes.map(item => item.event_type))];
      console.log('📊 Available event_type values:', uniqueEvents);
    }

  } catch (error) {
    console.error('❌ Error checking constraints:', error);
  }
}

// Run the check
checkTableConstraints().catch(console.error);