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
        
        // Handle new format from leave form
        const { student_id, leave_dates, line_user_id } = req.body;
        
        if (student_id && leave_dates) {
            // Validate required fields
            if (!student_id || !leave_dates || !Array.isArray(leave_dates) || leave_dates.length === 0) {
                return res.status(400).json({ 
                    error: 'Missing required fields: student_id and leave_dates array' 
                });
            }

            // Validate maximum 3 days
            if (leave_dates.length > 3) {
                return res.status(400).json({ 
                    error: 'Cannot request leave for more than 3 days' 
                });
            }

            // Validate date format and ensure dates are not in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const validDates = [];
            for (const dateStr of leave_dates) {
                const leaveDate = new Date(dateStr);
                if (isNaN(leaveDate.getTime())) {
                    return res.status(400).json({ 
                        error: `Invalid date format: ${dateStr}` 
                    });
                }
                
                leaveDate.setHours(0, 0, 0, 0);
                if (leaveDate < today) {
                    return res.status(400).json({ 
                        error: `Cannot request leave for past dates: ${dateStr}` 
                    });
                }
                
                validDates.push(dateStr);
            }

            // Check if student exists and is active
            const { data: student, error: studentError } = await supabase
                .from('students')
                .select('student_id, student_name, is_active')
                .eq('student_id', student_id)
                .single();

            if (studentError || !student) {
                return res.status(404).json({ error: 'Student not found' });
            }

            if (!student.is_active) {
                return res.status(403).json({ error: 'Student account is inactive' });
            }

            // Check for duplicate leave requests
            const { data: existingLeaves, error: checkError } = await supabase
                .from('leave_requests')
                .select('leave_date')
                .eq('student_id', student_id)
                .in('leave_date', validDates)
                .eq('status', 'approved');

            if (checkError) {
                console.error('Error checking existing leaves:', checkError);
                return res.status(500).json({ error: 'Database error while checking existing leaves' });
            }

            if (existingLeaves && existingLeaves.length > 0) {
                const duplicateDates = existingLeaves.map(leave => leave.leave_date);
                return res.status(409).json({ 
                    error: 'Leave already requested for these dates',
                    duplicate_dates: duplicateDates
                });
            }

            // Prepare leave requests data
            const leaveRequests = validDates.map(date => ({
                student_id: student_id,
                leave_date: date,
                status: 'approved',
                leave_type: 'personal',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            // Insert leave requests
            const { data: insertedLeaves, error: insertError } = await supabase
                .from('leave_requests')
                .insert(leaveRequests)
                .select();

            if (insertError) {
                console.error('Error inserting leave requests:', insertError);
                return res.status(500).json({ error: 'Failed to submit leave requests' });
            }

            console.log('Leave requests submitted successfully:', {
                student_id,
                student_name: student.student_name,
                leave_dates: validDates,
                line_user_id
            });

            return res.status(201).json({
                success: true,
                message: 'Leave requests submitted successfully',
                data: {
                    student_id,
                    student_name: student.student_name,
                    leave_requests: insertedLeaves,
                    submitted_dates: validDates
                }
            });
        }
        
        // Handle legacy format for backward compatibility
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
            error: 'Invalid action or missing required fields'
        });
        
    } catch (error) {
        console.error('❌ API Error:', error);
        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Student Status Notification API endpoint
app.post('/api/student-status-notification', async (req, res) => {
    try {
        // Import the handler function
        const { default: studentStatusHandler } = await import('./api/student-status-notification.js');
        
        // Call the handler
        await studentStatusHandler(req, res);
    } catch (error) {
        console.error('❌ Student Status Notification API Error:', error);
        return res.status(500).json({
            ok: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
        });
    }
});

// Driver Status Notification API endpoint
app.post('/api/driver-status-notification', async (req, res) => {
    try {
        // Import the handler function
        const { default: driverStatusHandler } = await import('./api/driver-status-notification.js');
        
        // Call the handler
        await driverStatusHandler(req, res);
    } catch (error) {
        console.error('❌ Driver Status Notification API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ' + error.message
        });
    }
});

// Get Driver Status API endpoint
app.get('/api/get-driver-status', async (req, res) => {
    try {
        // Import the handler function
        const { default: getDriverStatusHandler } = await import('./api/get-driver-status.js');
        
        // Call the handler
        await getDriverStatusHandler(req, res);
    } catch (error) {
        console.error('❌ Get Driver Status API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ' + error.message
        });
    }
});

app.post('/api/get-driver-status', async (req, res) => {
    try {
        // Import the handler function
        const { default: getDriverStatusHandler } = await import('./api/get-driver-status.js');
        
        // Call the handler
        await getDriverStatusHandler(req, res);
    } catch (error) {
        console.error('❌ Get Driver Status API Error:', error);
        return res.status(500).json({
            success: false,
            error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์: ' + error.message
        });
    }
});

// API routes
app.get('/api/get-bus-locations', async (req, res) => {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Query real data from database
        const { data: driversData, error: driversError } = await supabase
            .from('driver_bus')
            .select(`
                driver_id,
                driver_name,
                license_plate,
                capacity,
                current_status,
                home_latitude,
                home_longitude,
                school_latitude,
                school_longitude,
                current_latitude,
                current_longitude,
                current_updated_at,
                routes(route_name)
            `)
            .eq('is_active', true);

        if (driversError) {
            console.error('Error fetching drivers:', driversError);
            return res.status(500).json({
                success: false,
                error: 'ไม่สามารถดึงข้อมูลคนขับได้'
            });
        }

        // Query live locations
        const { data: liveLocations, error: liveError } = await supabase
            .from('live_driver_locations')
            .select('*');

        if (liveError) {
            console.error('Error fetching live locations:', liveError);
        }

        // Combine data
        const busData = driversData.map(driver => {
            const liveLocation = liveLocations?.find(loc => loc.driver_id === driver.driver_id);
            
            return {
                id: driver.driver_id,
                bus_number: driver.license_plate,
                driver_name: driver.driver_name,
                route_name: driver.routes?.route_name || 'ไม่ระบุเส้นทาง',
                capacity: driver.capacity,
                status: driver.current_status,
                has_location: !!(liveLocation || (driver.current_latitude && driver.current_longitude)),
                current_latitude: liveLocation?.latitude || driver.current_latitude,
                current_longitude: liveLocation?.longitude || driver.current_longitude,
                home_latitude: driver.home_latitude,
                home_longitude: driver.home_longitude,
                school_latitude: driver.school_latitude,
                school_longitude: driver.school_longitude,
                last_seen: liveLocation?.last_updated || driver.current_updated_at || new Date().toISOString()
            };
        });

        // Filter only active buses with location data
        const filteredData = busData.filter(bus => 
            bus.status === 'active' && 
            (bus.has_location || bus.home_latitude || bus.school_latitude)
        );

        res.json({
            success: true,
            data: filteredData,
            total_buses: busData.length,
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