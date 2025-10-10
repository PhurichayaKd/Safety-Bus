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
  channelSecret: process.env.LINE_CHANNEL_SECRET?.trim(),
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
    console.log('- Body length:', body.length);
    console.log('- Body first 100 chars:', body.substring(0, 100));

    if (!signature || !secret) {
      console.log('❌ Missing signature or secret');
      return false;
    }

    // Remove 'sha256=' prefix if present (some implementations include it)
    const cleanSignature = signature.startsWith('sha256=') ? signature.substring(7) : signature;

    const hash = crypto
      .createHmac('SHA256', secret)
      .update(body, 'utf8')
      .digest('base64');

    console.log('- Generated hash:', hash);
    console.log('- Clean signature:', cleanSignature);
    console.log('- Signatures match:', hash === cleanSignature);

    // Try both with and without sha256= prefix
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
      // Continue processing other events even if one fails
    }
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
    let rawBody = null;

    // Since bodyParser is disabled, we need to read from the stream
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    rawBody = Buffer.concat(chunks);
    bodyString = rawBody.toString('utf8');

    console.log('🚀 Webhook received:', req.method);
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📦 Raw body length:', bodyString.length);
    console.log('📦 Body content preview:', bodyString.substring(0, 100));

    const signature = req.headers['x-line-signature'];

    console.log('🔍 Debug info:');
    console.log('- Body preview:', bodyString.substring(0, 200) + '...');
    console.log('- Signature:', signature);
    console.log('- Channel secret exists:', !!lineConfig.channelSecret);
    console.log('- Channel secret length:', lineConfig.channelSecret ? lineConfig.channelSecret.length : 0);

    // Validate signature
    if (!validateLineSignature(bodyString, signature, lineConfig.channelSecret)) {
      console.log('❌ Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log('✅ Signature validated');

    // Parse JSON body
    const body = JSON.parse(bodyString);
    const { events } = body;

    // Send response immediately to prevent timeout
    res.status(200).json({ message: 'OK' });

    // Process events asynchronously after sending response
    if (events && events.length > 0) {
      // Don't await this - let it run in background
      processEventsAsync(events);
    }

    return;
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