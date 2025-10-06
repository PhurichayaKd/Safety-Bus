// api/webhook.mjs - Vercel Serverless Function

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  handleTextMessage,
  handlePostback,
  handleFollow,
} from '../lib/handlers.js';

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// LINE configuration
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// Send LINE message
async function sendLineMessage(replyToken, messages) {
  try {
    const response = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${lineConfig.channelAccessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ LINE API Error:', error);
    } else {
      console.log('✅ Message sent successfully');
    }
  } catch (error) {
    console.error('❌ Error sending message:', error);
  }
}

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

    const hash = crypto
      .createHmac('SHA256', secret)
      .update(body, 'utf8')
      .digest('base64');

    console.log('- Generated hash:', hash);
    console.log('- Signatures match:', hash === signature);

    return hash === signature;
  } catch (error) {
    console.error('❌ Signature validation error:', error);
    return false;
  }
}

// Main handler
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-line-signature');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET requests for testing
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'Webhook is running',
      timestamp: new Date().toISOString(),
      environment: {
        supabase: process.env.SUPABASE_URL ? 'Connected' : 'Missing',
        lineSecret: process.env.LINE_CHANNEL_SECRET ? 'Set' : 'Missing',
        lineToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'Set' : 'Missing',
      },
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get raw body for signature validation
    let bodyString = '';
    if (req.body) {
      bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    } else {
      // Read from stream if body is not parsed
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const rawBody = Buffer.concat(chunks);
      bodyString = rawBody.toString('utf8');
    }

    console.log('🚀 Webhook received:', req.method);
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Raw body length:', bodyString.length);

    const signature = req.headers['x-line-signature'];

    console.log('🔍 Debug info:');
    console.log('- Body preview:', bodyString.substring(0, 100) + '...');
    console.log('- Signature:', signature);
    console.log('- Channel secret exists:', !!lineConfig.channelSecret);

    // Validate signature
    if (!validateLineSignature(bodyString, signature, lineConfig.channelSecret)) {
      console.log('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature validated');

    // Parse JSON body
    const body = JSON.parse(bodyString);
    const { events } = body;

    if (!events || events.length === 0) {
      return res.status(200).json({ message: 'No events to process' });
    }

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
        // Continue processing other events even if one fails
      }
    }

    return res.status(200).json({ message: 'OK' });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Disable body parsing for this API route
export const config = {
  api: {
    bodyParser: false,
  },
};