# 🌐 Netlify Deployment Guide for ASL Learning App

## Quick Deploy to Netlify

### Prerequisites
1. **Netlify Account**: Sign up at netlify.com
2. **Netlify CLI**: Install with `npm install -g netlify-cli`

### Your Netlify Site ID
**Site ID**: `YOUR_SITE_ID` (replace with your actual site ID)

## Deployment Methods

### Method 1: One-Click Deploy (Recommended)
```bash
# First, copy the template and add your site ID
cp deploy_netlify_template.sh deploy_netlify.sh
# Edit deploy_netlify.sh and replace YOUR_SITE_ID with your actual site ID
# Then run:
./deploy_netlify.sh
```

### Method 2: Manual Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build the app
./build.sh

# Login to Netlify
netlify login

# Link to your site
netlify link --id YOUR_SITE_ID

# Deploy
netlify deploy --prod --dir=dist
```

### Method 3: Git Integration
1. **Push to GitHub**: Upload your code to GitHub
2. **Connect to Netlify**: 
   - Go to netlify.com
   - Click "New site from Git"
   - Connect your GitHub repo
   - Use site ID: `YOUR_SITE_ID`

## Netlify Configuration

### Files Created:
- **`netlify.toml`** - Main configuration
- **`package.json`** - Node.js configuration
- **`build.sh`** - Build script
- **`deploy_netlify.sh`** - Deployment script

### Netlify Functions:
- **`netlify/functions/letters.py`** - Get available letters
- **`netlify/functions/letter.py`** - Serve ASL images
- **`netlify/functions/quiz-random.py`** - Random quiz images
- **`netlify/functions/quiz-check.py`** - Check quiz answers

## Build Process

### What Happens During Build:
1. **Frontend Files**: Copied to `dist/` directory
2. **ASL Dataset**: Copied to `dist/asl_dataset/`
3. **Netlify Functions**: Copied to `dist/netlify/functions/`
4. **Index File**: `voice_only.html` becomes `index.html`

### Directory Structure After Build:
```
dist/
├── index.html (main learning page)
├── quiz.html (quiz page)
├── asl_dataset/ (all ASL images)
└── netlify/
    └── functions/
        ├── letters.py
        ├── letter.py
        ├── quiz-random.py
        └── quiz-check.py
```

## API Endpoints

### Available Endpoints:
- **`/api/letters`** → Get available ASL letters
- **`/api/letter/{letter}`** → Get ASL image for letter
- **`/api/quiz/random`** → Get random quiz image
- **`/api/quiz/check/{letter}`** → Check quiz answer

## Features

### ✅ What Works on Netlify:
- **Voice Recognition**: Full voice control
- **ASL Images**: All 26 letters with multiple images
- **Quiz Mode**: Interactive quiz functionality
- **Responsive Design**: Works on all devices
- **HTTPS**: Required for microphone access
- **Fast Loading**: Global CDN

### 🎤 Voice Commands:
- **Navigation**: "next", "previous", "random", "quiz"
- **Letters**: "A", "B", "C", etc.
- **Voice Control**: "start voice", "stop voice"
- **Commands Panel**: "show commands", "hide commands"

## Troubleshooting

### Common Issues:

#### Voice Recognition Not Working:
- ✅ **HTTPS Required**: Netlify provides HTTPS automatically
- ✅ **Browser Permissions**: Allow microphone access
- ✅ **Modern Browser**: Use Chrome/Firefox

#### Images Not Loading:
- ✅ **Check Paths**: Ensure `asl_dataset/` is in `dist/`
- ✅ **File Permissions**: Verify image files are accessible
- ✅ **Function Logs**: Check Netlify function logs

#### API Errors:
- ✅ **Function Logs**: Check Netlify dashboard
- ✅ **CORS Headers**: Functions include CORS headers
- ✅ **Error Handling**: Functions return proper error responses

## Post-Deployment

### Testing Checklist:
- [ ] **Main Page**: Voice recognition works
- [ ] **ASL Images**: All letters display correctly
- [ ] **Quiz Mode**: Quiz functionality works
- [ ] **Voice Commands**: All commands work
- [ ] **Mobile**: Responsive design works
- [ ] **HTTPS**: Site loads with HTTPS

### Monitoring:
- **Netlify Dashboard**: Monitor function logs
- **Analytics**: Track usage in Netlify
- **Performance**: Monitor site speed

## Cost

### Netlify Pricing:
- **Free Tier**: 
  - 100GB bandwidth/month
  - 300 build minutes/month
  - Unlimited sites
  - Perfect for your ASL app!

## Support

### If You Need Help:
1. **Netlify Docs**: https://docs.netlify.com/
2. **Function Logs**: Check Netlify dashboard
3. **Community**: Netlify community forums

## Next Steps

1. **Run**: `./deploy_netlify.sh`
2. **Test**: Visit your Netlify URL
3. **Share**: Share with students and teachers!

Your ASL Learning App will be live at: `https://your-site-name.netlify.app`
