import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [currentLetter, setCurrentLetter] = useState('a');
  const [letters] = useState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('');

  const recognitionRef = useRef(null);

  // Start voice recognition
  useEffect(() => {
    setupVoiceRecognition();
    setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        setStatus('Voice recognition active! Say a letter like "A", "B", "C"...');
      }
    }, 1000);
  }, []);

  const showStatus = (message) => {
    setStatus(message);
    setTimeout(() => setStatus(''), 3000);
  };

  const setupVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        const last = event.results.length - 1;
        const result = event.results[last];
        
        if (result.isFinal) {
          const command = result[0].transcript.toLowerCase().trim();
          showStatus(`Heard: "${command}"`);
          processVoiceCommand(command);
        }
      };

      recognitionRef.current.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'no-speech') {
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              setIsListening(true);
            }
          }, 2000);
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 500);
        }
      };
    }
  };

  const processVoiceCommand = (command) => {
    const cleanCommand = command.toLowerCase().trim();
    
    // Simple letter detection
    let detectedLetter = null;
    
    // Check if it's a single letter
    if (cleanCommand.length === 1 && /[a-zA-Z]/.test(cleanCommand)) {
      detectedLetter = cleanCommand.toLowerCase();
    }
    
    // Check for letter at start of command
    if (!detectedLetter) {
      const match = cleanCommand.match(/^([a-zA-Z])/);
      if (match) {
        detectedLetter = match[1].toLowerCase();
      }
    }
    
    // Check for common pronunciations
    if (!detectedLetter) {
      const pronunciations = {
        'ay': 'a', 'bee': 'b', 'see': 'c', 'dee': 'd', 'ee': 'e',
        'ef': 'f', 'jee': 'g', 'aitch': 'h', 'eye': 'i', 'jay': 'j',
        'kay': 'k', 'el': 'l', 'em': 'm', 'en': 'n', 'oh': 'o',
        'pee': 'p', 'cue': 'q', 'ar': 'r', 'es': 's', 'tee': 't',
        'you': 'u', 'vee': 'v', 'double you': 'w', 'ex': 'x',
        'why': 'y', 'zee': 'z'
      };
      
      for (const [pronunciation, letter] of Object.entries(pronunciations)) {
        if (cleanCommand.includes(pronunciation)) {
          detectedLetter = letter;
          break;
        }
      }
    }
    
    if (detectedLetter && letters.includes(detectedLetter)) {
      setCurrentLetter(detectedLetter);
      showStatus(`Showing letter ${detectedLetter.toUpperCase()}`);
    } else {
      showStatus(`Letter not recognized: "${command}"`);
    }
  };

  const getImageUrl = (letter) => {
    return `/asl_dataset/${letter}/hand1_${letter}_bot_seg_1_cropped.jpeg`;
  };

  return (
    <div className="app">
      {/* Status Message */}
      {status && (
        <div className="status">
          {status}
        </div>
      )}

      {/* Main Content */}
      <div className="container">
        <div className="learning-mode">
          <h1>🤟 ASL Learning</h1>
          <p className="subtitle">Learn American Sign Language with your voice!</p>
          
          <div className="current-letter">
            <h2>{currentLetter.toUpperCase()}</h2>
            <img 
              src={getImageUrl(currentLetter)} 
              alt={`ASL sign for ${currentLetter}`}
              className="asl-image"
              onError={(e) => {
                e.target.style.display = 'none';
                showStatus(`Image not found for letter ${currentLetter.toUpperCase()}`);
              }}
            />
          </div>

          <div className="voice-button-container">
            <button 
              className={`voice-button ${isListening ? 'listening' : ''}`}
              onClick={() => {
                if (isListening) {
                  recognitionRef.current.stop();
                  setIsListening(false);
                } else {
                  recognitionRef.current.start();
                  setIsListening(true);
                }
              }}
            >
              {isListening ? '🔇 Stop Voice' : '🎤 Start Voice'}
            </button>
          </div>

          <div className="instructions">
            <h3>🎤 Voice Commands:</h3>
            <p>Say any letter to see its ASL sign:</p>
            <ul>
              <li><strong>A:</strong> "A", "ay"</li>
              <li><strong>B:</strong> "B", "bee"</li>
              <li><strong>C:</strong> "C", "see"</li>
              <li><strong>D:</strong> "D", "dee"</li>
              <li><strong>E:</strong> "E", "ee"</li>
              <li><strong>F:</strong> "F", "ef"</li>
              <li><strong>G:</strong> "G", "jee"</li>
              <li><strong>H:</strong> "H", "aitch"</li>
              <li><strong>I:</strong> "I", "eye"</li>
              <li><strong>J:</strong> "J", "jay"</li>
              <li><strong>K:</strong> "K", "kay"</li>
              <li><strong>L:</strong> "L", "el"</li>
              <li><strong>M:</strong> "M", "em"</li>
              <li><strong>N:</strong> "N", "en"</li>
              <li><strong>O:</strong> "O", "oh"</li>
              <li><strong>P:</strong> "P", "pee"</li>
              <li><strong>Q:</strong> "Q", "cue"</li>
              <li><strong>R:</strong> "R", "ar"</li>
              <li><strong>S:</strong> "S", "es"</li>
              <li><strong>T:</strong> "T", "tee"</li>
              <li><strong>U:</strong> "U", "you"</li>
              <li><strong>V:</strong> "V", "vee"</li>
              <li><strong>W:</strong> "W", "double you"</li>
              <li><strong>X:</strong> "X", "ex"</li>
              <li><strong>Y:</strong> "Y", "why"</li>
              <li><strong>Z:</strong> "Z", "zee"</li>
            </ul>
            <p><strong>💡 Tips:</strong></p>
            <ul>
              <li>Make sure microphone is allowed</li>
              <li>Speak clearly and loudly</li>
              <li>Use Chrome or Edge for best results</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;