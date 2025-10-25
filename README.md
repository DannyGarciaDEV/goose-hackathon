# 🤟 ASL Learning App

A React-based American Sign Language learning application with voice recognition capabilities.

## Features

- **🎤 Voice Recognition**: Control the app entirely with your voice
- **📚 Letter Learning**: Learn ASL letters with visual examples
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🔄 Real-time Updates**: Smooth React state management
- **🎨 Modern UI**: Clean interface with floating commands panel

## Voice Commands

### Letter Navigation
- Say **"A"**, **"B"**, **"C"**, etc. → Jump to specific letter
- Say **"ay"**, **"bee"**, **"see"**, etc. → Alternative pronunciations

### App Controls
- Say **"hide commands"** → Hide voice commands panel
- Say **"show commands"** → Show voice commands panel

### Voice Recognition
- Voice recognition starts automatically when the app loads
- Click the voice button to manually start/stop voice recognition

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn
- A modern browser with microphone access (Chrome recommended)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd asl_learning_app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

5. Allow microphone access when prompted

## Usage

1. **Allow Microphone Access**: The app will request microphone permission for voice recognition
2. **Voice Recognition**: The app auto-starts voice recognition after loading
3. **Learning**: Say letters to see their ASL signs
4. **Commands Panel**: Use the floating voice commands panel for reference
5. **Voice Control**: Click the voice button to manually control voice recognition

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Edge**: Full support
- **Firefox**: Limited voice recognition support
- **Safari**: Limited voice recognition support

## Project Structure

```
asl_learning_app/
├── public/
│   ├── index.html
│   └── asl_dataset/          # ASL sign images
├── src/
│   ├── App.js               # Main React component
│   ├── App.css              # Styles
│   └── index.js             # React entry point
├── package.json
└── README.md
```

## Technologies Used

- **React 18**: Modern React with hooks
- **Web Speech API**: Browser voice recognition
- **CSS3**: Modern styling with gradients and animations
- **HTML5**: Semantic markup

## Development

### Available Scripts

- `npm start`: Start development server
- `npm run build`: Build for production
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App

## Deployment

### Netlify Deployment

1. **Build Settings:**
   - Build command: `npm run build`
   - Publish directory: `build`
   - Node version: `18` (or `16`)

2. **Deploy Steps:**
   - Connect your GitHub repository to Netlify
   - Set the build settings above
   - Deploy automatically on git push

3. **Important Notes:**
   - Voice recognition requires HTTPS (Netlify provides this)
   - Users must allow microphone access
   - Chrome/Edge browsers work best

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Acknowledgments

- ASL dataset images for learning materials
- Web Speech API for voice recognition capabilities
- React community for excellent documentation and tools