// Simple Express server for development
import dotenv from 'dotenv';

// Load .env.local for development
dotenv.config({ path: '.env.local' });
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// Import API handlers
import submitLeaveHandler from './api/submit-leave.js';
import getLeaveRequestsHandler from './api/get-leave-requests.js';
import cancelLeaveHandler from './api/cancel-leave.js';
import getStudentHandler from './api/get-student.js';
import getDriverHandler from './api/get-driver.js';
import webhookHandler from './api/webhook.mjs';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// Serve static files
app.use(express.static('.'));

// API routes
app.use('/api/submit-leave', submitLeaveHandler);
app.use('/api/get-leave-requests', getLeaveRequestsHandler);
app.use('/api/cancel-leave', cancelLeaveHandler);
app.use('/api/get-student', getStudentHandler);
app.use('/api/get-driver', getDriverHandler);
app.use('/api/webhook', webhookHandler);


// Serve index.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📱 LIFF App: http://localhost:${PORT}`);
    console.log(`🔗 API endpoints available at /api/*`);
});