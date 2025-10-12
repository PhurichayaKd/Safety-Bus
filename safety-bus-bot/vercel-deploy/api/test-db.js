// API endpoint สำหรับทดสอบการเชื่อมต่อฐานข้อมูล
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  console.log('🔥 Test DB API called!');
  
  // ตั้งค่า CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Testing database connection...');
    console.log('📋 SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
    console.log('📋 SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
    
    // ทดสอบการดึงข้อมูลนักเรียน
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('student_id, student_name')
      .limit(5);

    if (studentsError) {
      console.log('❌ Students query error:', studentsError);
      return res.status(500).json({ 
        error: 'Database query failed',
        details: studentsError.message
      });
    }

    console.log('✅ Students found:', students?.length || 0);

    // ทดสอบการดึงข้อมูล LINE links
    const { data: lineLinks, error: linksError } = await supabase
      .from('student_line_links')
      .select('student_id, line_user_id')
      .limit(5);

    if (linksError) {
      console.log('❌ LINE links query error:', linksError);
    } else {
      console.log('✅ LINE links found:', lineLinks?.length || 0);
    }

    return res.status(200).json({
      success: true,
      database: {
        connected: true,
        students_count: students?.length || 0,
        students: students,
        line_links_count: lineLinks?.length || 0,
        line_links: lineLinks
      },
      environment: {
        supabase_url_set: !!process.env.SUPABASE_URL,
        supabase_key_set: !!process.env.SUPABASE_ANON_KEY,
        line_token_set: !!process.env.LINE_CHANNEL_ACCESS_TOKEN
      }
    });

  } catch (error) {
    console.error('🚨 Database test error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}