#!/bin/bash

# Rude Reminders - Mobile Setup Script
# This script automates the mobile setup process to avoid manual work

echo "🚀 Setting up Rude Reminders mobile development..."

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Install iOS platform if not already installed
if [ ! -d "node_modules/@capacitor/ios" ]; then
    echo "📱 Installing iOS platform..."
    npm install @capacitor/ios
fi

# Build web assets
echo "🔨 Building web assets..."
npm run build

# Sync both platforms
echo "🔄 Syncing mobile platforms..."
npx cap sync ios
npx cap sync android

echo "✅ Mobile setup complete!"
echo ""
echo "Next steps:"
echo "  iOS: npx cap open ios"
echo "  Android: npx cap open android"
echo ""
echo "AdMob App IDs already configured:"
echo "  Android: ca-app-pub-2730939178232394~9135087475"
echo "  iOS: ca-app-pub-2730939178232394~3691189109"