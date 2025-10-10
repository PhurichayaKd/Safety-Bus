// Main entrypoint for Vercel serverless function
// The actual API functions are in the /api directory
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

// MIME type mapping
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject'
};

// Main handler function for Vercel
export default function handler(req, res) {
  const { url } = req;
  
  try {
    // Handle root path
    if (url === '/' || url === '/index.html') {
      const indexPath = join(process.cwd(), 'index.html');
      if (existsSync(indexPath)) {
        const indexContent = readFileSync(indexPath, 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        return res.status(200).send(indexContent);
      }
    }
    
    // Handle static files
    const filePath = join(process.cwd(), url.startsWith('/') ? url.slice(1) : url);
    const ext = extname(filePath).toLowerCase();
    
    if (existsSync(filePath) && mimeTypes[ext]) {
      const content = readFileSync(filePath);
      const mimeType = mimeTypes[ext];
      
      res.setHeader('Content-Type', mimeType);
      if (ext === '.html') {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      
      return res.status(200).send(content);
    }
    
    // Default response for unmatched routes
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      message: "Safety Bus LIFF App is running",
      timestamp: new Date().toISOString(),
      path: url,
      endpoints: {
        webhook: "/api/webhook",
        leaveForm: "/leave-form.html",
        leaveRequest: "/leave-request.html",
        busLocation: "/bus-location.html",
        checkStudents: "/check-students.html"
      }
    });
    
  } catch (error) {
    console.error('Error in handler:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}