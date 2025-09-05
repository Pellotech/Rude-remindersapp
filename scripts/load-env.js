// scripts/load-env.js
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file for Replit
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      const value = values.join('=').trim();
      // Set environment variable if not already set
      if (!process.env[key] && value) {
        process.env[key] = value;
        console.log(`Loaded ${key} from .env file`);
      }
    }
  });
}

// Also ensure Replit's built-in env vars are available
if (process.env.REPLIT_ENV) {
  try {
    const replitEnv = JSON.parse(process.env.REPLIT_ENV);
    Object.entries(replitEnv).forEach(([key, value]) => {
      if (!process.env[key] && value) {
        process.env[key] = value;
      }
    });
  } catch (e) {
    console.log('Could not parse REPLIT_ENV');
  }
}
