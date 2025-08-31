#!/usr/bin/env node

// Script to setup AdMob configuration for production builds
// This replaces the capacitor.config.json with the real AdMob App ID from environment variables

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, '..', 'capacitor.config.json');

// Read the current config
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Update with environment variable if available
if (process.env.ADMOB_APP_ID) {
  config.plugins.AdMob.appId = process.env.ADMOB_APP_ID;
  config.plugins.AdMob.initializeForTesting = false;
  
  console.log('✅ Updated Capacitor config with production AdMob App ID');
  
  // Write the updated config
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
} else {
  console.log('ℹ️ No ADMOB_APP_ID found, using test configuration');
}

console.log('AdMob App ID:', config.plugins.AdMob.appId);
console.log('Testing mode:', config.plugins.AdMob.initializeForTesting);