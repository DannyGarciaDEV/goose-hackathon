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

# Copy netlify functions
echo "📁 Copying Netlify functions..."
cp -r netlify dist/

# Create index.html from voice_only.html
echo "📄 Creating index.html..."
cp frontend/voice_only.html dist/index.html

# Create quiz.html
echo "📄 Creating quiz.html..."
cp frontend/quiz.html dist/quiz.html

# Remove problematic requirements.txt from dist to prevent pip install
echo "🧹 Cleaning up dependencies..."
rm -f dist/requirements.txt

echo "✅ Build complete!"
echo "📁 Files ready in dist/ directory"
echo "🌐 Ready for Netlify deployment!"
