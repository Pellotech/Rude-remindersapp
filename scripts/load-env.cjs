// scripts/load-env.js
const fs = require('fs');
const path = require('path');

console.log('🔧 Loading environment variables...');

// Load environment variables from .env file for Replit
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        const value = values.join('=').trim();
        // Set environment variable if not already set
        if (!process.env[key.trim()] && value) {
          process.env[key.trim()] = value;
          console.log(`✅ Loaded ${key.trim()} from .env file`);
        }
      }
    }
  });
} else {
  console.log('📁 No .env file found');
}

// Also ensure Replit's built-in env vars are available
if (process.env.REPLIT_ENV) {
  try {
    const replitEnv = JSON.parse(process.env.REPLIT_ENV);
    Object.entries(replitEnv).forEach(([key, value]) => {
      if (!process.env[key] && value) {
        process.env[key] = value;
        console.log(`✅ Loaded ${key} from REPLIT_ENV`);
      }
    });
  } catch (e) {
    console.log('⚠️  Could not parse REPLIT_ENV');
  }
}

// Ensure consistent Stripe key naming
if (process.env.VITE_STRIPE_PUBLIC_KEY && !process.env.VITE_STRIPE_PUBLISHABLE_KEY) {
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = process.env.VITE_STRIPE_PUBLIC_KEY;
  console.log('✅ Mapped VITE_STRIPE_PUBLIC_KEY to VITE_STRIPE_PUBLISHABLE_KEY');
}

// Check critical environment variables
const requiredVars = ['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY'];
let allFound = true;

console.log('\n🔍 Checking critical environment variables:');
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    const maskedValue = process.env[varName].substring(0, 12) + '...';
    console.log(`✅ ${varName}: ${maskedValue}`);
  } else {
    console.log(`❌ ${varName}: NOT FOUND`);
    allFound = false;
  }
});

if (allFound) {
  console.log('🎉 All environment variables loaded successfully\n');
} else {
  console.log('⚠️  Some environment variables are missing\n');
}
