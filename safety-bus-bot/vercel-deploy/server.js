import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Present' : 'Missing');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Handle API routes with middleware
app.use('/api', async (req, res, next) => {
    const apiPath = req.path.substring(1); // Remove leading slash
    const apiFile = path.join(__dirname, 'api', `${apiPath}.js`);
    
    try {
        if (fs.existsSync(apiFile)) {
            // Import the API module
            const apiModule = await import(`file://${apiFile}`);
            const handler = apiModule.default || apiModule;
            
            if (typeof handler === 'function') {
                await handler(req, res);
            } else {
                res.status(500).json({ error: 'Invalid API handler' });
            }
        } else {
            res.status(404).json({ error: 'API endpoint not found' });
        }
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve static files - fallback to index.html for SPA
app.use((req, res) => {
    const filePath = path.join(__dirname, req.path === '/' ? 'index.html' : req.path);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});