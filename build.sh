#!/bin/bash
# Build script for Netlify deployment

echo "🚀 Building ASL Learning App for Netlify..."

# Create dist directory
mkdir -p dist

# Copy frontend files to dist
echo "📁 Copying frontend files..."
cp -r frontend/* dist/

# Copy ASL dataset to dist
echo "📁 Copying ASL dataset..."
cp -r asl_dataset dist/

# Copy ASL dataset to root for Netlify functions
echo "📁 Copying ASL dataset to root for functions..."
cp -r asl_dataset .

# Copy ASL dataset to netlify directory for functions to access
echo "📁 Copying ASL dataset to netlify directory..."
cp -r asl_dataset netlify/

# Create index.html from voice_only.html
echo "📄 Creating index.html..."
cp frontend/voice_only.html dist/index.html

# Create quiz.html
echo "📄 Creating quiz.html..."
cp frontend/quiz.html dist/quiz.html

# Create debug.html
echo "📄 Creating debug.html..."
cp frontend/debug.html dist/debug.html

# Remove problematic requirements.txt from dist to prevent pip install
echo "🧹 Cleaning up dependencies..."
rm -f dist/requirements.txt

# Clean up any dataset that might have been copied to netlify/functions
echo "🧹 Cleaning up netlify/functions directory..."
rm -rf netlify/functions/asl_dataset

echo "✅ Build complete!"
echo "📁 Files ready in dist/ directory"
echo "📁 ASL dataset copied to root for functions"
echo "🌐 Ready for Netlify deployment!"
