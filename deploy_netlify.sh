#!/bin/bash
# Deploy ASL Learning App to Netlify

echo "🚀 Deploying ASL Learning App to Netlify..."

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Please install it first:"
    echo "   npm install -g netlify-cli"
    echo "   or visit: https://docs.netlify.com/cli/get-started/"
    exit 1
fi

# Build the app
echo "🔨 Building app..."
./build.sh

# Login to Netlify
echo "🔐 Logging into Netlify..."
netlify login

# Link to your Netlify site
echo "🔗 Linking to Netlify site..."
netlify link --id 64125433c5d83e2718a7444b

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
netlify deploy --prod --dir=dist

echo "✅ Deployment complete!"
echo "🌐 Your app is now live on Netlify!"
echo "📱 Check your Netlify dashboard for the URL"
