/**
 * Utility Script: Test Email Service
 * 
 * Tests the Resend email service configuration
 * 
 * Usage:
 *   cd apps/api
 *   node ../../scripts/dev/test-email.js
 * 
 * Requirements:
 *   - RESEND_API_KEY environment variable
 *   - RESEND_FROM_EMAIL environment variable
 */

import { Resend } from 'resend';
import { readFileSync } from 'fs';

// Load environment variables manually
const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const resend = new Resend(envVars.RESEND_API_KEY);

async function testEmail() {
  console.log('Testing Resend Email Service...');
  console.log('API Key:', envVars.RESEND_API_KEY ? envVars.RESEND_API_KEY.substring(0, 10) + '...' : 'Missing');
  console.log('From Email:', envVars.RESEND_FROM_EMAIL);
  console.log('Frontend URL:', envVars.FRONTEND_URL);
  
  try {
    const response = await resend.emails.send({
      from: envVars.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: 'delivered@resend.dev', // Resend's test email
      subject: 'Test Email from TestTrack Pro',
      html: '<p>This is a test email to verify Resend integration.</p>',
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('\n❌ Email sending failed!');
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testEmail();
