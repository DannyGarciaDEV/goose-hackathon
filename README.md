# 🤟 ASL Learning App

A React-based American Sign Language learning application with voice recognition capabilities.

## Features

- **🎤 Voice Recognition**: Control the app entirely with your voice
- **📚 Learning Mode**: Learn ASL letters with visual examples
- **🎯 Quiz Mode**: Test your ASL knowledge
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🔄 Real-time Updates**: Smooth React state management

## Voice Commands

### Learning Mode
- Say **"next"** → Next letter
- Say **"previous"** → Previous letter  
- Say **"random"** → Random letter
- Say **"repeat"** → Show current letter again
- Say **"quiz"** → Go to quiz mode
- Say **"A"**, **"B"**, **"C"**, etc. → Jump to letter

### Quiz Mode
- Say **"start quiz"** → Begin quiz
- Say **"next"** → Next question
- Say **"learning"** → Back to learning mode
- Say any letter → Answer the quiz

### General Commands
- Say **"hide commands"** → Hide voice panel
- Say **"show commands"** → Show voice panel
- Say **"stop voice"** → Deactivate voice
- Say **"start voice"** → Activate voice

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
3. **Learning**: Say letters or navigation commands to learn ASL signs
4. **Quiz**: Say "quiz" to test your knowledge
5. **Voice Panel**: Use the floating voice commands panel for reference

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

### Building for Production

```bash
npm run build
```

This creates a `build` folder with optimized production files.

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