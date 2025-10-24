# ASL Learning Assistant 🤟

A modern, interactive web application for learning American Sign Language (ASL) with voice commands and automatic progression.

## Features ✨

- **🎤 Voice Commands**: Navigate through letters using natural speech
- **🎯 Interactive Learning**: Click letters or use voice commands
- **📱 Responsive Design**: Works on desktop, tablet, and mobile


## Quick Start 🚀

### Option 1: Automatic Startup (Recommended)
```bash
# On macOS/Linux:
./start.sh

# On Windows:
start.bat
```

### Option 2: Manual Startup
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Start the backend server
cd backend
python app.py

# 3. Open your browser to:
http://localhost:9000
```

## Voice Commands 🎤

The app responds to these voice commands:

### Navigation
- **"Next"** or **"Next letter"** - Move to the next letter
- **"Previous"** or **"Back"** - Move to the previous letter
- **"Repeat"** or **"Again"** - Show the current letter again
- **"Random"** - Show a random letter

### Direct Access
- **"A"**, **"B"**, **"C"**, etc. - Jump directly to any letter
- **"Go to A"** - Navigate to a specific letter
- **"Show me B"** - Display a specific letter

## Learning Modes 📚

### Auto Mode (Default)
- Letters advance automatically every 5 seconds
- Perfect for continuous learning
- Toggle on/off with the button in the header

### Manual Mode
- Use voice commands or click buttons to navigate
- Take your time with each letter
- Practice at your own pace

## How It Works 🔧

1. **Backend Server**: Flask API serves ASL images and processes voice commands
2. **Frontend Interface**: React-based web app with voice recognition
3. **Dataset Integration**: Uses your `asl_dataset` directory with letter images
4. **Camera Feed**: Optional webcam integration for gesture practice

## File Structure 📁

```
asl_learning_app/
├── asl_dataset/           # Your ASL letter images
│   ├── a/                # Letter A images
│   ├── b/                # Letter B images
│   └── ...               # Other letters
├── backend/
│   └── app.py            # Flask API server
├── frontend/
│   └── index.html        # Web interface
├── start_app.py          # Python startup script
├── start.sh              # Unix/Linux startup script
├── start.bat             # Windows startup script
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Requirements 📋

- Python 3.7+
- Webcam (optional, for gesture practice)
- Microphone (for voice commands)
- Modern web browser with speech recognition support

## Troubleshooting 🔧

### Common Issues

**"Microphone access denied"**
- Allow microphone permissions in your browser
- Check browser settings for site permissions

**"Webcam access denied"**
- Allow camera permissions in your browser
- The app will still work without camera

**"Speech recognition not supported"**
- Use Chrome, Edge, or Safari for best voice support
- Firefox has limited speech recognition

**"Backend server not starting"**
- Check if port 3000 is available
- Run `pip install -r requirements.txt`
- Ensure all dependencies are installed

### Dataset Issues

**"ASL dataset not found"**
- Ensure `asl_dataset` directory exists
- Check that letter subdirectories (a, b, c, etc.) contain images

**"No images found for letter"**
- Verify image files are in correct format (.jpg, .jpeg, .png)
- Check file permissions

## Browser Compatibility 🌐

### Fully Supported
- Chrome 25+
- Edge 79+
- Safari 14.1+

### Limited Support
- Firefox (no speech recognition)
- Older browsers

## Learning Tips 💡

1. **Start with Auto Mode**: Let letters advance automatically to get familiar
2. **Use Voice Commands**: Practice speaking clearly and naturally
3. **Practice Each Sign**: Take time to match the reference images
4. **Use "Repeat"**: Don't hesitate to see a letter again
5. **Try "Random"**: Mix up the order for better retention

## Development 🛠️

### Adding New Features
- Backend API endpoints in `backend/app.py`
- Frontend components in `frontend/index.html`
- Voice commands processed in the React app

### Customizing
- Modify voice command recognition in the frontend
- Add new API endpoints in the backend
- Customize the UI styling and layout

## Support 💬

If you encounter issues:
1. Check the browser console for errors
2. Verify all requirements are installed
3. Ensure microphone/camera permissions are granted
4. Try refreshing the page or restarting the app

## License 📄

This project is open source and available under the MIT License.

---

**Happy Learning!** 🤟 Keep practicing and you'll master ASL in no time!

