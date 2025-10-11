import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();
import {
  handleTextMessage,
  handlePostback,
  handleFollow,
} from './lib/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// LINE configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET?.trim(),
};

// Middleware
app.use(cors());
app.use(express.static('.'));

// Validate LINE signature
function validateLineSignature(body, signature, secret) {
  try {
    console.log('🔐 Validating signature...');
    console.log('- Received signature:', signature);
    console.log('- Channel secret exists:', !!secret);

    if (!signature || !secret) {
      console.log('❌ Missing signature or secret');
      return false;
    }

    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.startsWith('sha256=') ? signature.substring(7) : signature;

    const hash = crypto
      .createHmac('SHA256', secret)
      .update(body, 'utf8')
      .digest('base64');

    console.log('- Generated hash:', hash);
    console.log('- Clean signature:', cleanSignature);

    const match1 = hash === cleanSignature;
    const match2 = hash === signature;
    
    console.log('- Match without prefix:', match1);
    console.log('- Match with prefix:', match2);

    return match1 || match2;
  } catch (error) {
    console.error('❌ Signature validation error:', error);
    return false;
  }
}

// Process events asynchronously
async function processEventsAsync(events) {
  for (const event of events) {
    console.log('📨 Processing event:', event.type);

    try {
      switch (event.type) {
        case 'message':
          if (event.message.type === 'text') {
            await handleTextMessage(event);
          }
          break;

        case 'postback':
          await handlePostback(event);
          break;

        case 'follow':
          await handleFollow(event);
          break;

        case 'unfollow':
          console.log(`User ${event.source.userId} unfollowed the bot`);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (eventError) {
      console.error(`Error handling event ${event.type}:`, eventError);
    }
  }
}

// LINE Bot webhook endpoint
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const bodyString = req.body.toString('utf8');
    const signature = req.headers['x-line-signature'];

    console.log('🚀 Webhook received:', req.method);
    console.log('📦 Raw body length:', bodyString.length);
    console.log('📦 Body content preview:', bodyString.substring(0, 100));
    console.log('🔍 Signature:', signature);

    // Validate signature
    if (!validateLineSignature(bodyString, signature, lineConfig.channelSecret)) {
      console.log('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature validated');

    // Parse JSON body
    const body = JSON.parse(bodyString);
    const { events } = body;

    // Send response immediately
    res.status(200).json({ message: 'OK' });

    // Process events asynchronously
    if (events && events.length > 0) {
      processEventsAsync(events);
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook status endpoint
app.get('/api/webhook', (req, res) => {
  res.status(200).json({
    status: 'Webhook is running',
    timestamp: new Date().toISOString(),
    environment: {
      supabase: process.env.SUPABASE_URL ? 'Connected' : 'Missing',
      lineSecret: process.env.LINE_CHANNEL_SECRET ? 'Set' : 'Missing',
      lineToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'Set' : 'Missing',
    },
  });
});

// Use JSON middleware for other routes
app.use(express.json());

// Mock API endpoint for submit-leave
app.post('/api/submit-leave', async (req, res) => {
    try {
        console.log('📨 Received leave request:', req.body);
        
        const { action, userId, studentInfo, leaveDates } = req.body;
        
        if (action === 'getStudentInfo') {
            // Mock student data for testing
            const mockStudent = {
                student_id: 'STU001',
                name: 'นักเรียนทดสอบ',
                class: 'ม.6/1',
                bus_route: 'เส้นทาง A'
            };
            
            console.log('📋 Returning mock student data:', mockStudent);
            return res.json({
                ok: true,
                student: mockStudent
            });
        }
        
        if (action === 'submitLeave') {
            // Validate required fields
            if (!userId || !studentInfo || !leaveDates || leaveDates.length === 0) {
                return res.status(400).json({
                    ok: false,
                    error: 'ข้อมูลไม่ครบถ้วน'
                });
            }
            
            // Mock successful submission
            console.log('✅ Leave request submitted successfully');
            console.log('👤 Student:', studentInfo.name);
            console.log('📅 Dates:', leaveDates);
            
            return res.json({
                ok: true,
                message: 'บันทึกข้อมูลการลาเรียบร้อยแล้ว'
            });
        }
        
        return res.status(400).json({
            ok: false,
            error: 'Invalid action'
        });
        
    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({
            ok: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
        });
    }
});

// Mock API endpoint for student-status-notification
app.post('/api/student-status-notification', async (req, res) => {
    try {
        console.log('📨 Received student status notification:', req.body);
        
        const { student_id, status, driver_id, phase, location } = req.body;
        
        // Validate required fields
        if (!student_id || !status || !driver_id) {
            return res.status(400).json({
                ok: false,
                error: 'ข้อมูลไม่ครบถ้วน'
            });
        }
        
        // Mock successful notification
        console.log('✅ Student status notification processed successfully');
        console.log('👤 Student ID:', student_id);
        console.log('📊 Status:', status);
        console.log('🚌 Driver ID:', driver_id);
        console.log('📍 Phase:', phase);
        console.log('🗺️ Location:', location);
        
        return res.json({
            ok: true,
            message: 'ส่งแจ้งเตือนเรียบร้อยแล้ว'
        });
        
    } catch (error) {
        console.error('❌ Student Status Notification API Error:', error);
        return res.status(500).json({
            ok: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
        });
    }
});

// API routes
app.get('/api/get-bus-locations', (req, res) => {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Mock bus data for testing
        const mockBusData = [
            {
                id: 1,
                bus_number: "MSU-001",
                driver_name: "นายสมชาย ใจดี",
                route_name: "เส้นทาง A - หอพักมหาวิทยาลัย",
                capacity: 30,
                status: "active",
                has_location: true,
                current_latitude: 16.2498137,
                current_longitude: 103.2557912,
                home_latitude: 16.2450000,
                home_longitude: 103.2500000,
                school_latitude: 16.2550000,
                school_longitude: 103.2600000,
                last_seen: new Date().toISOString()
            },
            {
                id: 2,
                bus_number: "MSU-002",
                driver_name: "นายวิชัย รักษ์ดี",
                route_name: "เส้นทาง B - ตัวเมือง",
                capacity: 25,
                status: "active",
                has_location: true,
                current_latitude: 16.2520000,
                current_longitude: 103.2580000,
                home_latitude: 16.2470000,
                home_longitude: 103.2520000,
                school_latitude: 16.2550000,
                school_longitude: 103.2600000,
                last_seen: new Date(Date.now() - 30000).toISOString()
            }
        ];

        const filteredData = mockBusData.filter(bus => bus.status === 'active' && bus.has_location);

        res.json({
            success: true,
            data: filteredData,
            total_buses: mockBusData.length,
            buses_with_location: filteredData.length,
            last_updated: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in bus locations API:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/leave-form', (req, res) => {
    res.sendFile(path.join(__dirname, 'leave-form.html'));
});

app.get('/leave-form.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'leave-form.html'));
});

app.get('/leave-request.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'leave-request.html'));
});

app.get('/bus-location.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'bus-location.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📝 Leave form available at: http://localhost:${PORT}/leave-form.html`);
    console.log(`🤖 LINE Bot webhook available at: http://localhost:${PORT}/api/webhook`);
    console.log(`🔍 Webhook status: http://localhost:${PORT}/api/webhook`);
    
    console.log('\n📋 Environment Check:');
    console.log('- Supabase URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('- LINE Channel Secret:', process.env.LINE_CHANNEL_SECRET ? '✅ Set' : '❌ Missing');
    console.log('- LINE Access Token:', process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅ Set' : '❌ Missing');
});