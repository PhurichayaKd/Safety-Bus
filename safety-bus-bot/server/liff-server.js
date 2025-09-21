// LIFF Server สำหรับ serve LIFF app
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.LIFF_PORT || 3001;

// Serve static files จากโฟลเดอร์ liff
app.use('/liff', express.static(path.join(__dirname, '../liff')));

// Serve static files จากโฟลเดอร์ vercel-deploy สำหรับ cancel-leave
app.use('/css', express.static(path.join(__dirname, '../vercel-deploy/css')));
app.use('/js', express.static(path.join(__dirname, '../vercel-deploy/js')));
app.use('/api', express.static(path.join(__dirname, '../vercel-deploy/api')));

// Route สำหรับ LIFF app
app.get('/liff/date-picker', (req, res) => {
  res.sendFile(path.join(__dirname, '../liff/index.html'));
});

// Route สำหรับ Cancel Leave LIFF app
app.get('/liff/cancel-leave', (req, res) => {
  res.sendFile(path.join(__dirname, '../vercel-deploy/cancel-leave.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('LIFF Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LIFF Server running on port ${PORT}`);
  console.log(`📱 LIFF App URL: http://localhost:${PORT}/liff/date-picker`);
  console.log(`🔗 Add this URL to your LINE Developers Console LIFF settings`);
});

export default app;