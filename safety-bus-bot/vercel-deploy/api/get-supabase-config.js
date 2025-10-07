// API endpoint to provide Supabase configuration to client-side
export default function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({
                success: false,
                error: 'Supabase configuration not found'
            });
        }

        res.status(200).json({
            url: supabaseUrl,
            anonKey: supabaseKey
        });
    } catch (error) {
        console.error('Error providing Supabase config:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}