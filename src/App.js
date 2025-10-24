import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [currentLetter, setCurrentLetter] = useState('a');
  const [letters] = useState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('');
  const [currentPage, setCurrentPage] = useState('learning');
  const [commandsVisible, setCommandsVisible] = useState(true);
  
  // Quiz state
  const [quizActive, setQuizActive] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [currentQuizLetter, setCurrentQuizLetter] = useState('');

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
              console.log('Voice recognition result:', result[0].transcript);
              console.log('Confidence:', result[0].confidence);
              showStatus(`Heard: "${command}"`);
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
    
    // Quiz controls - check these first
    if (cleanCommand.includes('start quiz') || 
        cleanCommand.includes('start the quiz') ||
        cleanCommand.includes('begin quiz') ||
        (cleanCommand.includes('start') && currentPage === 'quiz')) {
      console.log('Starting quiz command detected');
      setCurrentPage('quiz');
      setCommandsVisible(true);
      setTimeout(() => {
        startQuiz();
      }, 100);
      showStatus('Starting quiz...');
      return;
    }
    
    if (cleanCommand.includes('next question') && quizActive) {
      nextQuizQuestion();
      return;
    }
    
    // Navigation commands
    if (cleanCommand.includes('quiz')) {
      setCurrentPage('quiz');
      setCommandsVisible(true);
      showStatus('Going to quiz mode...');
      return;
    }
    
    if (cleanCommand.includes('learning') || cleanCommand.includes('back to learning')) {
      setCurrentPage('learning');
      setQuizActive(false);
      showStatus('Going back to learning mode...');
      return;
    }
    
    // Command visibility controls
    if (cleanCommand.includes('hide commands')) {
      console.log('Hide commands detected');
      setCommandsVisible(false);
      showStatus('Commands hidden. Say "show commands" to bring them back.');
      return;
    }
    
    if (cleanCommand.includes('show commands')) {
      console.log('Show commands detected');
      setCommandsVisible(true);
      showStatus('Commands shown!');
      return;
    }
    
    // Letter detection for both learning and quiz
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
      if (currentPage === 'learning') {
        setCurrentLetter(detectedLetter);
        showStatus(`Showing letter ${detectedLetter.toUpperCase()}`);
      } else if (currentPage === 'quiz' && quizActive) {
        checkQuizAnswer(detectedLetter);
      }
    } else {
      showStatus(`Command not recognized: "${command}"`);
    }
  };

  const startQuiz = () => {
    setQuizActive(true);
    setQuizScore(0);
    setQuizTotal(0);
    nextQuizQuestion();
    showStatus('Quiz started! Look at the ASL sign and say the letter!');
  };

  const nextQuizQuestion = () => {
    if (!quizActive) return;
    
    const randomIndex = Math.floor(Math.random() * letters.length);
    const randomLetter = letters[randomIndex];
    
    if (randomLetter) {
      setCurrentQuizLetter(randomLetter);
      setQuizTotal(prev => prev + 1);
      showStatus(`Quiz question ${quizTotal + 1}: What letter is this?`);
    }
  };

  const checkQuizAnswer = (answer) => {
    if (!quizActive || !currentQuizLetter) return;
    
    const isCorrect = answer.toLowerCase() === currentQuizLetter.toLowerCase();
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      showStatus(`✅ Correct! It was ${currentQuizLetter.toUpperCase()}`);
    } else {
      showStatus(`❌ Wrong! It was ${currentQuizLetter.toUpperCase()}`);
    }
    
    setTimeout(() => {
      nextQuizQuestion();
    }, 2000);
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
        <div className="navbar-nav">
          <div 
            className={`nav-link ${currentPage === 'learning' ? 'active' : ''}`}
            onClick={() => setCurrentPage('learning')}
          >
            📚 Learning
          </div>
          <div 
            className={`nav-link ${currentPage === 'quiz' ? 'active' : ''}`}
            onClick={() => setCurrentPage('quiz')}
          >
            🎯 Quiz
          </div>
        </div>
        <div className="voice-status">
          <span className="voice-icon">{isListening ? '🎤' : '🔇'}</span>
          <span className="voice-text">{isListening ? 'Voice Active' : 'Voice Inactive'}</span>
        </div>
      </nav>

      {/* Status Message */}
      {status && (
        <div className="status">
          {status}
        </div>
      )}

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
              <h5>🧭 Navigation</h5>
              <div className="command-item">
                <span className="command-phrase">"quiz"</span>
                <span className="command-action">Go to quiz mode</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"learning"</span>
                <span className="command-action">Back to learning</span>
              </div>
            </div>
            
            <div className="command-section">
              <h5>🎯 Quiz</h5>
              <div className="command-item">
                <span className="command-phrase">"start quiz"</span>
                <span className="command-action">Begin quiz</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"start"</span>
                <span className="command-action">Start quiz (in quiz mode)</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"begin quiz"</span>
                <span className="command-action">Begin quiz</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"next question"</span>
                <span className="command-action">Next question</span>
              </div>
            </div>
            
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
                <span className="command-action">Show letter or answer</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container">
        {currentPage === 'learning' ? (
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
              <p>Say any letter to see its ASL sign, or say "quiz" to start quizzing!</p>
              <p><strong>💡 Tips:</strong></p>
              <ul>
                <li>Make sure microphone is allowed</li>
                <li>Speak clearly and loudly</li>
                <li>Use Chrome or Edge for best results</li>
                <li>Say "quiz" to start the quiz mode</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="quiz-mode">
            <h1>🎯 ASL Quiz</h1>
            <p className="subtitle">Test your ASL knowledge!</p>
            
            {quizActive ? (
              <div className="quiz-content">
                <div className="quiz-stats">
                  <div className="stat">
                    <span className="stat-label">Score:</span>
                    <span className="stat-value">{quizScore}/{quizTotal}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Accuracy:</span>
                    <span className="stat-value">
                      {quizTotal > 0 ? Math.round((quizScore / quizTotal) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {currentQuizLetter && (
                  <div className="quiz-question">
                    <h3>What letter is this?</h3>
                    <img 
                      src={getImageUrl(currentQuizLetter)} 
                      alt={`ASL sign for ${currentQuizLetter}`}
                      className="asl-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        showStatus(`Image not found for letter ${currentQuizLetter.toUpperCase()}`);
                      }}
                    />
                  </div>
                )}

                <div className="quiz-instructions">
                  <p>Say the letter you see in the ASL sign!</p>
                </div>
              </div>
            ) : (
              <div className="quiz-start">
                <h3>Ready to test your ASL knowledge?</h3>
                <p>Say "start quiz" to begin!</p>
                <div className="quiz-info">
                  <p>• You'll see ASL signs and need to say the letter</p>
                  <p>• Your score will be tracked</p>
                  <p>• Say "learning" to go back to learning mode</p>
                </div>
              </div>
            )}

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
          </div>
        )}
      </div>
    </div>
  );
}

export default App;