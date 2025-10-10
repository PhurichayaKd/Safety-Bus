// test-signature.js - Test signature validation
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

function validateLineSignature(body, signature, secret) {
  try {
    console.log('🔐 Validating signature...');
    console.log('- Received signature:', signature);
    console.log('- Channel secret exists:', !!secret);
    console.log('- Channel secret length:', secret ? secret.length : 0);
    console.log('- Body length:', body.length);
    console.log('- Body:', body);

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
    console.log('- Signatures match:', hash === cleanSignature);

    return hash === cleanSignature;
  } catch (error) {
    console.error('❌ Signature validation error:', error);
    return false;
  }
}

// Test with sample data
const testBody = '{"events":[{"type":"message","message":{"type":"text","text":"test"},"source":{"type":"user","userId":"test-user-id"},"replyToken":"test-reply-token"}]}';
const channelSecret = process.env.LINE_CHANNEL_SECRET;

console.log('🧪 Testing signature validation...');
console.log('📍 Channel secret:', channelSecret ? `${channelSecret.substring(0, 10)}...` : 'NOT FOUND');

// Generate correct signature
const correctSignature = crypto
  .createHmac('SHA256', channelSecret)
  .update(testBody, 'utf8')
  .digest('base64');

console.log('✅ Correct signature:', correctSignature);

// Test validation
const isValid = validateLineSignature(testBody, correctSignature, channelSecret);
console.log('📊 Validation result:', isValid ? '✅ VALID' : '❌ INVALID');