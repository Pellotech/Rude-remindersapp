#!/usr/bin/env node

/**
 * Stripe API Key Verification Script
 * Run this to check if your Stripe keys are properly configured
 */

const fs = require('fs');
const path = require('path');

// Custom .env loader
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  // Set environment variables for the current process
  envLines.forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
  
  console.log('📁 Environment variables loaded from .env file');
} else {
  console.log('📁 No .env file found, using system environment variables');
}

console.log('🔑 Verifying Stripe API Keys Configuration...\n');

// Check server-side secret key
const secretKey = process.env.STRIPE_SECRET_KEY;
console.log('Server Environment (STRIPE_SECRET_KEY):');
if (secretKey) {
  console.log(`✅ STRIPE_SECRET_KEY found: ${secretKey.substring(0, 12)}...`);
  
  // Validate key format
  if (secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_')) {
    console.log(`✅ Key format valid (${secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE'} mode)`);
  } else {
    console.log('❌ Invalid key format - should start with sk_test_ or sk_live_');
  }
} else {
  console.log('❌ STRIPE_SECRET_KEY not found');
}

// Check frontend publishable key
const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
console.log('\nFrontend Environment (VITE_STRIPE_PUBLISHABLE_KEY):');
if (publishableKey) {
  console.log(`✅ VITE_STRIPE_PUBLISHABLE_KEY found: ${publishableKey.substring(0, 12)}...`);
  
  // Validate key format
  if (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_')) {
    console.log(`✅ Key format valid (${publishableKey.startsWith('pk_test_') ? 'TEST' : 'LIVE'} mode)`);
  } else {
    console.log('❌ Invalid key format - should start with pk_test_ or pk_live_');
  }
} else {
  console.log('❌ VITE_STRIPE_PUBLISHABLE_KEY not found');
}

// Check if keys match environments
if (secretKey && publishableKey) {
  const secretIsTest = secretKey.startsWith('sk_test_');
  const publishableIsTest = publishableKey.startsWith('pk_test_');
  
  console.log('\nKey Environment Matching:');
  if (secretIsTest === publishableIsTest) {
    console.log(`✅ Both keys are in ${secretIsTest ? 'TEST' : 'LIVE'} mode`);
  } else {
    console.log('❌ Key environment mismatch! One is TEST, one is LIVE');
  }
}

console.log('\n📝 Next Steps:');
if (!secretKey) {
  console.log('  1. Add STRIPE_SECRET_KEY to your environment (starts with sk_test_ or sk_live_)');
}
if (!publishableKey) {
  console.log('  2. Add VITE_STRIPE_PUBLISHABLE_KEY to your environment (starts with pk_test_ or pk_live_)');
}

if (secretKey && publishableKey) {
  console.log('  🎉 All Stripe keys are properly configured!');
  console.log('\n🔧 Testing Stripe connection...');
  
  // Test the secret key with a simple API call
  const testStripeConnection = async () => {
    try {
      const https = require('https');
      const options = {
        hostname: 'api.stripe.com',
        path: '/v1/balance',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      };

      return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log('✅ Stripe API connection successful!');
            } else {
              console.log(`❌ Stripe API error: ${res.statusCode} ${res.statusMessage}`);
            }
            resolve();
          });
        });
        
        req.on('error', (error) => {
          console.log(`❌ Network error connecting to Stripe: ${error.message}`);
          resolve();
        });
        
        req.end();
      });
    } catch (error) {
      console.log(`❌ Error testing Stripe connection: ${error.message}`);
    }
  };

  await testStripeConnection();
}

console.log('\n💡 Usage in your code:');
console.log('  Server: process.env.STRIPE_SECRET_KEY');
console.log('  Frontend: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY');