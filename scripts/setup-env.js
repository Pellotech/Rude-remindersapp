const fs = require('fs');
const path = require('path');

/**
 * Environment Setup Script
 * Ensures all required environment variables are available before build
 */

console.log('🔧 Setting up environment variables...');

// Read the .env file
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
  
  console.log('✅ Environment variables loaded from .env file');
} else {
  console.log('📁 No .env file found, using system environment variables');
}

// Required environment variables
const requiredVars = [
  'STRIPE_SECRET_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY'
];

const missingVars = [];
const foundVars = [];

console.log('\n🔍 Checking required environment variables:');

requiredVars.forEach(varName => {
  if (process.env[varName]) {
    foundVars.push(varName);
    const value = process.env[varName];
    const maskedValue = value.substring(0, 12) + '...';
    console.log(`✅ ${varName}: ${maskedValue}`);
  } else {
    missingVars.push(varName);
    console.log(`❌ ${varName}: NOT FOUND`);
  }
});

// Exit with error if missing required variables
if (missingVars.length > 0) {
  console.log('\n🚨 Missing required environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  
  console.log('\n💡 To fix this:');
  console.log('   1. Add missing variables to .env file, or');
  console.log('   2. Set them in your environment/Replit Secrets');
  console.log('   3. Run: node scripts/verify-stripe-keys.js for detailed setup');
  
  process.exit(1);
}

console.log(`\n🎉 All ${foundVars.length} required environment variables found!`);
console.log('✅ Environment setup complete - ready to build\n');