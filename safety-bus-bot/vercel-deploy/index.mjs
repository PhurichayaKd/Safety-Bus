// This is a simple entrypoint for Vercel
// The actual API functions are in the /api directory
import express from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = express();

// Middleware
app.use(express.json());

// Serve static files
app.use(express.static('.'));

// Main route - serve index.html
app.get('/', (req, res) => {
  try {
    const indexPath = join(process.cwd(), 'index.html');
    const indexContent = readFileSync(indexPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(indexContent);
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(200).json({
      message: "Safety Bus LIFF App is running",
      timestamp: new Date().toISOString(),
      endpoints: {
        webhook: "/api/webhook",
        leaveForm: "/leave-form"
      }
    });
  }
});

// Export for Vercel
export default app;