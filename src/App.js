import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [currentLetter, setCurrentLetter] = useState('a');
  const [letters] = useState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']);
  const [isListening, setIsListening] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(true);

  const recognitionRef = useRef(null);

  // Start voice recognition
  useEffect(() => {
    setupVoiceRecognition();
    setTimeout(() => {
      if (recognitionRef.current && !isListening) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setStatus('Voice recognition active! Say a letter like "A", "B", "C"...');
        } catch (error) {
          console.log('Voice recognition already started or error:', error);
        }
      }
    }, 1000);
  }, []);


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
              console.log('Voice recognition result:', result[0].transcript);
              console.log('Confidence:', result[0].confidence);
              processVoiceCommand(command);
            }
          };

      recognitionRef.current.onerror = (event) => {
        console.log('Voice recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'no-speech') {
          setTimeout(() => {
            if (recognitionRef.current && !isListening) {
              try {
                recognitionRef.current.start();
                setIsListening(true);
              } catch (error) {
                console.log('Error restarting voice recognition:', error);
              }
            }
          }, 2000);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Voice recognition ended');
        if (isListening) {
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.log('Error restarting voice recognition:', error);
              }
            }
          }, 500);
        }
      };
    }
  };

  const processVoiceCommand = (command) => {
    const cleanCommand = command.toLowerCase().trim();
    console.log('Processing voice command:', cleanCommand);
    
    // Command visibility controls
    if (cleanCommand.includes('hide commands')) {
      console.log('Hide commands detected');
      setCommandsVisible(false);
      return;
    }
    
    if (cleanCommand.includes('show commands')) {
      console.log('Show commands detected');
      setCommandsVisible(true);
      return;
    }
    
    // Letter detection
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
      console.log('Letter detected:', detectedLetter);
      setCurrentLetter(detectedLetter);
    } else {
      console.log('No letter detected or letter not in letters array');
    }
  };

  const getImageUrl = (letter) => {
    return `/asl_dataset/${letter}/hand1_${letter}_bot_seg_1_cropped.jpeg`;
  };

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-brand">
          🤟 ASL Learning
        </div>
        <div className="voice-status">
          <span className="voice-icon">{isListening ? '🎤' : '🔇'}</span>
          <span className="voice-text">{isListening ? 'Voice Active' : 'Voice Inactive'}</span>
        </div>
      </nav>


      {/* Voice Commands Panel */}
      {commandsVisible && (
        <div className="voice-commands-panel">
          <div className="commands-header">
            <h4>🎤 Voice Commands</h4>
            <button 
              className="close-commands"
              onClick={() => setCommandsVisible(false)}
            >
              ✕
            </button>
          </div>
          <div className="commands-content">
            <div className="command-section">
              <h5>⚙️ Controls</h5>
              <div className="command-item">
                <span className="command-phrase">"hide commands"</span>
                <span className="command-action">Hide this panel</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"show commands"</span>
                <span className="command-action">Show this panel</span>
              </div>
            </div>
            
            <div className="command-section">
              <h5>🔤 Letters</h5>
              <div className="command-item">
                <span className="command-phrase">"A", "B", "C"...</span>
                <span className="command-action">Show ASL letter</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"ay", "bee", "see"...</span>
                <span className="command-action">Alternative pronunciations</span>
              </div>
            </div>
          </div>
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
                }}
              />
            </div>

            <div className="voice-button-container">
              <button 
                className={`voice-button ${isListening ? 'listening' : ''}`}
                onClick={() => {
                  if (isListening) {
                    try {
                      recognitionRef.current.stop();
                      setIsListening(false);
                    } catch (error) {
                      console.log('Error stopping voice recognition:', error);
                    }
                  } else {
                    try {
                      recognitionRef.current.start();
                      setIsListening(true);
                    } catch (error) {
                      console.log('Error starting voice recognition:', error);
                    }
                  }
                }}
              >
                {isListening ? '🔇 Stop Voice' : '🎤 Start Voice'}
              </button>
            </div>

            <div className="instructions">
              <h3>🎤 Voice Commands:</h3>
              <p>Say any letter to see its ASL sign!</p>
              <p><strong>💡 Tips:</strong></p>
              <ul>
                <li>Make sure microphone is allowed</li>
                <li>Speak clearly and loudly</li>
                <li>Use Chrome or Edge for best results</li>
                <li>Say "hide commands" to hide the commands panel</li>
              </ul>
            </div>
          </div>
      </div>
    </div>
  );
}

export default App;