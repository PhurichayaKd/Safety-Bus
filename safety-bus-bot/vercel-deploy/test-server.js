// Test server for local development
import dotenv from 'dotenv';

// Load environment variables FIRST before importing any modules
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Environment check
console.log('Environment variables:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('- LINE_CHANNEL_ACCESS_TOKEN:', process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'Set' : 'Not set');

// API Routes
app.post('/api/submit-leave', async (req, res) => {
  console.log('🚀 Submit Leave API called:', req.method, req.url);
  console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Dynamic import to ensure environment variables are loaded
    const { default: submitLeaveHandler } = await import('./api/submit-leave.js');
    
    // Create a mock request object that matches Vercel's format
    const mockReq = {
      method: 'POST',
      body: req.body,
      headers: req.headers
    };
    
    // Create a mock response object
    const mockRes = {
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        console.log('📤 Response:', JSON.stringify(data, null, 2));
        res.json(data);
        return mockRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return mockRes;
      }
    };
    
    // Call the handler
    await submitLeaveHandler(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Submit Leave API error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      error: error.message 
    });
  }
});

app.post('/api/get-student', async (req, res) => {
  console.log('🚀 Get Student API called:', req.method, req.url);
  console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Dynamic import to ensure environment variables are loaded
    const { default: getStudentHandler } = await import('./api/get-student.js');
    
    // Create a mock request object that matches Vercel's format
    const mockReq = {
      method: 'POST',
      body: req.body,
      headers: req.headers
    };
    
    // Create a mock response object
    const mockRes = {
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        console.log('📤 Response:', JSON.stringify(data, null, 2));
        res.json(data);
        return mockRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return mockRes;
      }
    };
    
    // Call the handler
    await getStudentHandler(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Get Student API error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      error: error.message 
    });
  }
});

app.get('/api/test-students', async (req, res) => {
  console.log('🚀 Test Students API called:', req.method, req.url);
  
  try {
    // Dynamic import to ensure environment variables are loaded
    const { default: testStudentsHandler } = await import('./api/test-students.js');
    
    // Create a mock request object that matches Vercel's format
    const mockReq = {
      method: 'GET',
      headers: req.headers
    };
    
    // Create a mock response object
    const mockRes = {
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        res.json(data);
        return mockRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return mockRes;
      }
    };
    
    // Call the handler
    await testStudentsHandler(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Test Students API error:', error);
    res.status(500).json({ 
      ok: false, 
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      error: error.message 
    });
  }
});

app.get('/api/get-bus-locations', async (req, res) => {
  console.log('🚀 Get Bus Locations API called:', req.method, req.url);
  
  try {
    // Dynamic import to ensure environment variables are loaded
    const { default: getBusLocationsHandler } = await import('./api/get-bus-locations.js');
    
    // Create a mock request object that matches Vercel's format
    const mockReq = {
      method: 'GET',
      headers: req.headers,
      query: req.query
    };
    
    // Create a mock response object
    const mockRes = {
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        console.log('📤 Bus Locations Response:', JSON.stringify(data, null, 2));
        res.json(data);
        return mockRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return mockRes;
      }
    };
    
    // Call the handler
    await getBusLocationsHandler(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Get Bus Locations API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
      error: error.message 
    });
  }
});

// Webhook handler for LINE Bot
app.post('/api/webhook.mjs', async (req, res) => {
  console.log('🚀 Webhook called:', req.method, req.url);
  console.log('📥 Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    // Dynamic import to ensure environment variables are loaded
    const { default: webhookHandler } = await import('./api/webhook.mjs');
    
    // Create a mock request object that matches Vercel's format
    const mockReq = {
      method: 'POST',
      body: req.body,
      headers: req.headers
    };
    
    // Create a mock response object
    const mockRes = {
      status: (code) => {
        res.status(code);
        return mockRes;
      },
      json: (data) => {
        console.log('📤 Response:', JSON.stringify(data, null, 2));
        res.json(data);
        return mockRes;
      },
      send: (data) => {
        console.log('📤 Response:', data);
        res.send(data);
        return mockRes;
      },
      setHeader: (name, value) => {
        res.setHeader(name, value);
        return mockRes;
      },
      end: () => {
        res.end();
        return mockRes;
      }
    };
    
    // Call the webhook handler
    await webhookHandler(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

app.post('/api/webhook-api', async (req, res) => {
  console.log('🚀 Webhook called:', req.method, req.url);
  console.log('❌ Webhook handler not implemented in test server');
  res.status(501).json({ error: 'Webhook not implemented in test server' });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: {
      supabase: !!process.env.SUPABASE_URL,
      line: !!process.env.LINE_CHANNEL_ACCESS_TOKEN
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Server error:', error);
  res.status(500).json({ 
    ok: false, 
    error: 'Internal server error',
    details: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❓ Route not found:', req.method, req.url);
  res.status(404).json({ 
    ok: false, 
    error: 'Route not found',
    method: req.method,
    url: req.url 
  });
});

app.listen(PORT, () => {
  console.log(`🚌 Test server running at http://localhost:${PORT}`);
});

export default app;