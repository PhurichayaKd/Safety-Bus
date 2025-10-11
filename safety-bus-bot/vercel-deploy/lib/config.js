// Configuration file for Safety Bus Bot

// LIFF App URL - Update this when deploying to new environment
export const LIFF_APP_URL = process.env.BASE_URL || process.env.LIFF_APP_URL || 'https://safety-bus-liff-v4-ba8bepcjg-phurichayakds-projects.vercel.app';

// Other configuration
export const config = {
  liffAppUrl: LIFF_APP_URL,
  maxLeaveDays: 3,
  timeoutDuration: 10000 // 10 seconds
};