import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [currentLetter, setCurrentLetter] = useState('a');
  const [letters, setLetters] = useState([]);
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('info');
  const [commandsVisible, setCommandsVisible] = useState(true);
  const [quizActive, setQuizActive] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTotal, setQuizTotal] = useState(0);
  const [currentQuizLetter, setCurrentQuizLetter] = useState('');
  const [currentPage, setCurrentPage] = useState('learning');

  const recognitionRef = useRef(null);
  const statusTimeoutRef = useRef(null);

  // Load available letters
  useEffect(() => {
    loadLetters();
  }, []);

  // Auto-start voice recognition
  useEffect(() => {
    const timer = setTimeout(() => {
      setupVoiceRecognition();
      if (recognitionRef.current) {
        toggleVoiceRecognition();
        showStatus('🎤 Voice recognition started! Say "quiz" to go to quiz mode, or say letters to learn!', 'info');
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const loadLetters = async () => {
    try {
      // For local development, use the dataset directly
      const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
      
      if (letters && letters.length > 0) {
        setLetters(letters);
        console.log('Loaded', letters.length, 'letters');
        showStatus(`Loaded ${letters.length} ASL letters`, 'success');
      } else {
        showStatus('Error: No letters loaded', 'error');
      }
    } catch (error) {
      console.error('Error loading letters:', error);
      showStatus('Error loading letters: ' + error.message, 'error');
    }
  };

  const showStatus = (message, type = 'info') => {
    setStatus(message);
    setStatusType(type);
    
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    
    statusTimeoutRef.current = setTimeout(() => {
      setStatus('');
    }, 3000);
  };

  const setupVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true; // Enable interim results for better letter detection
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 3; // Increase alternatives for better letter recognition

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        updateVoiceStatus();
        console.log('Voice recognition started');
        showStatus('🎤 Voice recognition active - say a command!', 'success');
      };

      recognitionRef.current.onresult = (event) => {
        // Process the most recent result
        const last = event.results.length - 1;
        const result = event.results[last];
        
        // Only process final results, not interim ones
        if (result.isFinal) {
          const command = result[0].transcript.toLowerCase().trim();
          console.log(`Voice command received: "${command}"`);
          showStatus(`Heard: "${command}"`, 'info');
          processVoiceCommand(command);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        updateVoiceStatus();
        
        if (event.error === 'no-speech') {
          showStatus('No speech detected. Try again!', 'error');
          // Restart after a delay
          setTimeout(() => {
            if (isListening) {
              recognitionRef.current.start();
            }
          }, 2000);
        } else if (event.error === 'not-allowed') {
          showStatus('Microphone access denied. Please allow microphone access.', 'error');
        } else {
          showStatus(`Voice error: ${event.error}`, 'error');
        }
      };

      recognitionRef.current.onend = () => {
        console.log('Voice recognition ended');
        if (isListening) {
          // Restart recognition if it ended unexpectedly
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
            }
          }, 500);
        } else {
          setIsListening(false);
          updateVoiceStatus();
        }
      };
    } else {
      showStatus('Voice recognition not supported in this browser. Please use Chrome or Edge.', 'error');
    }
  };

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) {
      setupVoiceRecognition();
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
    updateVoiceStatus();
  };

  const updateVoiceStatus = () => {
    // This will be handled by the status indicator component
  };

  const processVoiceCommand = (command) => {
    if (!command || typeof command !== 'string') {
      console.error('Invalid command:', command);
      showStatus('Error: Invalid voice command', 'error');
      return;
    }
    
    const cleanCommand = command.toLowerCase().trim();
    console.log('Processing command:', cleanCommand);

    // Check for navigation commands first
    if (cleanCommand.includes('quiz') || cleanCommand.includes('test') || cleanCommand.includes('challenge')) {
      showStatus('🎯 Going to quiz mode...', 'info');
      setTimeout(() => {
        setCurrentPage('quiz');
      }, 1000);
      return;
    } else if (cleanCommand.includes('learning') || cleanCommand.includes('back') || cleanCommand.includes('home')) {
      showStatus('📚 Going back to learning mode...', 'info');
      setTimeout(() => {
        setCurrentPage('learning');
      }, 1000);
      return;
    }

    // Learning mode commands
    if (currentPage === 'learning') {
      if (cleanCommand.includes('next')) {
        if (letters.length > 0) {
          nextLetter();
        } else {
          showStatus('Error: No letters available', 'error');
        }
        return;
      } else if (cleanCommand.includes('previous') || cleanCommand.includes('back')) {
        if (letters.length > 0) {
          previousLetter();
        } else {
          showStatus('Error: No letters available', 'error');
        }
        return;
      } else if (cleanCommand.includes('random')) {
        if (letters.length > 0) {
          randomLetter();
        } else {
          showStatus('Error: No letters available', 'error');
        }
        return;
      } else if (cleanCommand.includes('repeat')) {
        if (currentLetter && letters.includes(currentLetter)) {
          showLetter(currentLetter);
          showStatus(`Showing letter ${currentLetter.toUpperCase()} again`, 'info');
        } else {
          showStatus('Error: No current letter to repeat', 'error');
        }
        return;
      }
    }

    // Quiz mode commands
    if (currentPage === 'quiz') {
      if (cleanCommand.includes('start quiz') || cleanCommand.includes('start') || cleanCommand.includes('begin')) {
        if (!quizActive) {
          if (letters.length > 0) {
            startQuiz();
          } else {
            showStatus('Error: No letters available for quiz', 'error');
          }
          return;
        }
      } else if (cleanCommand.includes('next') || cleanCommand.includes('next question')) {
        if (quizActive) {
          nextQuizQuestion();
          return;
        }
      }
    }

    // Voice control commands
    if (cleanCommand.includes('start voice') || cleanCommand.includes('activate voice') || cleanCommand.includes('enable voice')) {
      if (!isListening) {
        toggleVoiceRecognition();
        showStatus('🎤 Voice recognition activated!', 'success');
      } else {
        showStatus('🎤 Voice recognition is already active!', 'info');
      }
      return;
    } else if (cleanCommand.includes('stop voice') || cleanCommand.includes('deactivate voice') || cleanCommand.includes('disable voice')) {
      if (isListening) {
        toggleVoiceRecognition();
        showStatus('🔇 Voice recognition deactivated!', 'info');
      } else {
        showStatus('🔇 Voice recognition is already inactive!', 'info');
      }
      return;
    } else if (cleanCommand.includes('hide commands') || cleanCommand.includes('hide')) {
      setCommandsVisible(false);
      showStatus('Commands hidden. Say "show commands" to bring them back.', 'info');
      return;
    } else if (cleanCommand.includes('show commands') || cleanCommand.includes('show')) {
      setCommandsVisible(true);
      showStatus('Commands shown!', 'success');
      return;
    }

    // Enhanced letter detection - try multiple patterns
    let detectedLetter = null;
    
    // Pattern 1: Single letter word boundaries
    const letterMatch1 = cleanCommand.match(/\b([a-z])\b/);
    if (letterMatch1) {
      detectedLetter = letterMatch1[1];
    }
    
    // Pattern 2: Letter at start of command
    if (!detectedLetter) {
      const letterMatch2 = cleanCommand.match(/^([a-z])\b/);
      if (letterMatch2) {
        detectedLetter = letterMatch2[1];
      }
    }
    
    // Pattern 3: Letter followed by space or end
    if (!detectedLetter) {
      const letterMatch3 = cleanCommand.match(/([a-z])(?:\s|$)/);
      if (letterMatch3) {
        detectedLetter = letterMatch3[1];
      }
    }
    
    // Pattern 4: Common letter pronunciations
    const letterPronunciations = {
      'ay': 'a', 'eh': 'a', 'ah': 'a',
      'bee': 'b', 'be': 'b',
      'see': 'c', 'cee': 'c',
      'dee': 'd', 'de': 'd',
      'ee': 'e', 'eh': 'e',
      'ef': 'f', 'eff': 'f',
      'jee': 'g', 'ge': 'g',
      'aitch': 'h', 'h': 'h',
      'eye': 'i', 'ai': 'i',
      'jay': 'j', 'je': 'j',
      'kay': 'k', 'ke': 'k',
      'el': 'l', 'ell': 'l',
      'em': 'm', 'emm': 'm',
      'en': 'n', 'enn': 'n',
      'oh': 'o', 'owe': 'o',
      'pee': 'p', 'pe': 'p',
      'cue': 'q', 'qu': 'q',
      'ar': 'r', 'arr': 'r',
      'es': 's', 'ess': 's',
      'tee': 't', 'te': 't',
      'you': 'u', 'yu': 'u',
      'vee': 'v', 've': 'v',
      'double you': 'w', 'dubya': 'w',
      'ex': 'x', 'ecks': 'x',
      'why': 'y', 'wy': 'y',
      'zee': 'z', 'zed': 'z'
    };
    
    if (!detectedLetter) {
      for (const [pronunciation, letter] of Object.entries(letterPronunciations)) {
        if (cleanCommand.includes(pronunciation)) {
          detectedLetter = letter;
          break;
        }
      }
    }

    if (detectedLetter && letters.includes(detectedLetter)) {
      if (currentPage === 'learning') {
        showLetter(detectedLetter);
        showStatus(`Showing letter ${detectedLetter.toUpperCase()}`, 'success');
      } else if (currentPage === 'quiz' && quizActive) {
        checkQuizAnswer(detectedLetter);
      }
      return;
    }

    // If no command matched, show help
    showStatus(`Command not recognized: "${cleanCommand}". Try saying "next", "previous", "random", or a letter like "A"`, 'error');
  };

  const showLetter = (letter) => {
    if (letter && letters.includes(letter)) {
      setCurrentLetter(letter);
      setCurrentLetterIndex(letters.indexOf(letter));
    } else {
      console.error('Invalid letter:', letter);
      showStatus(`Error: Invalid letter "${letter}"`, 'error');
    }
  };

  const nextLetter = () => {
    const nextIndex = (currentLetterIndex + 1) % letters.length;
    const nextLetter = letters[nextIndex];
    if (nextLetter) {
      showLetter(nextLetter);
      showStatus(`Next letter: ${nextLetter.toUpperCase()}`, 'info');
    } else {
      showStatus('Error: No next letter available', 'error');
    }
  };

  const previousLetter = () => {
    const prevIndex = currentLetterIndex === 0 ? letters.length - 1 : currentLetterIndex - 1;
    const prevLetter = letters[prevIndex];
    if (prevLetter) {
      showLetter(prevLetter);
      showStatus(`Previous letter: ${prevLetter.toUpperCase()}`, 'info');
    } else {
      showStatus('Error: No previous letter available', 'error');
    }
  };

  const randomLetter = () => {
    const randomIndex = Math.floor(Math.random() * letters.length);
    const randomLetter = letters[randomIndex];
    if (randomLetter) {
      showLetter(randomLetter);
      showStatus(`Random letter: ${randomLetter.toUpperCase()}`, 'info');
    } else {
      showStatus('Error: No random letter available', 'error');
    }
  };

  const startQuiz = () => {
    setQuizActive(true);
    setQuizScore(0);
    setQuizTotal(0);
    nextQuizQuestion();
    showStatus('🎯 Quiz started! Look at the ASL sign and say the letter!', 'success');
  };

  const nextQuizQuestion = () => {
    if (!quizActive) return;
    
    if (letters.length === 0) {
      showStatus('Error: No letters available for quiz', 'error');
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * letters.length);
    const randomLetter = letters[randomIndex];
    
    if (randomLetter) {
      setCurrentQuizLetter(randomLetter);
      setQuizTotal(prev => prev + 1);
      showStatus(`Quiz question ${quizTotal + 1}: What letter is this?`, 'info');
    } else {
      showStatus('Error: Could not generate quiz question', 'error');
    }
  };

  const checkQuizAnswer = (answer) => {
    if (!quizActive || !currentQuizLetter) return;
    
    if (!answer) {
      showStatus('Error: No answer provided', 'error');
      return;
    }
    
    const isCorrect = answer.toLowerCase() === currentQuizLetter.toLowerCase();
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
      showStatus(`✅ Correct! It was ${currentQuizLetter.toUpperCase()}`, 'success');
    } else {
      showStatus(`❌ Wrong! It was ${currentQuizLetter.toUpperCase()}`, 'error');
    }
    
    setTimeout(() => {
      nextQuizQuestion();
    }, 2000);
  };

  const getImageUrl = (letter) => {
    if (!letter) {
      console.error('No letter provided to getImageUrl');
      return '/asl_dataset/a/hand1_a_bot_seg_1_cropped.jpeg'; // Default fallback
    }
    
    // For local development, we'll use the dataset directly
    // In production, this would use the Netlify functions
    return `/asl_dataset/${letter}/hand1_${letter}_bot_seg_1_cropped.jpeg`;
  };

  const toggleCommandsPanel = () => {
    setCommandsVisible(!commandsVisible);
  };

  return (
    <div className="app">
      {/* Navigation Bar */}
      <nav className="navbar">
        <a href="#" className="navbar-brand" onClick={() => setCurrentPage('learning')}>
          🤟 ASL Learning
        </a>
        <div className="navbar-nav">
          <a 
            href="#" 
            className={`nav-link ${currentPage === 'learning' ? 'active' : ''}`}
            onClick={() => setCurrentPage('learning')}
          >
            📚 Learning
          </a>
          <a 
            href="#" 
            className={`nav-link quiz ${currentPage === 'quiz' ? 'active' : ''}`}
            onClick={() => setCurrentPage('quiz')}
          >
            🎯 Quiz
          </a>
        </div>
      </nav>

      {/* Voice Status Indicator */}
      <div className={`voice-status ${isListening ? 'active' : 'inactive'}`}>
        <span className="voice-status-icon">{isListening ? '🎤' : '🔇'}</span>
        <span>{isListening ? 'Voice Active' : 'Voice Inactive'}</span>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`status ${statusType}`}>
          {status}
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
                  showStatus(`Image not found for letter ${currentLetter.toUpperCase()}`, 'error');
                }}
              />
            </div>

            <div className="voice-button-container">
              <button 
                className={`voice-button ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceRecognition}
              >
                {isListening ? '🔇 Stop Voice' : '🎤 Start Voice'}
              </button>
            </div>

            <div className="instructions">
              <h3>🎤 Voice Commands:</h3>
              <ul>
                <li>Say <strong>"next"</strong> → Next letter</li>
                <li>Say <strong>"previous"</strong> → Previous letter</li>
                <li>Say <strong>"random"</strong> → Random letter</li>
                <li>Say <strong>"repeat"</strong> → Show current letter again</li>
                <li>Say <strong>"quiz"</strong> → Go to quiz mode</li>
                <li>Say <strong>"A"</strong>, <strong>"B"</strong>, <strong>"C"</strong>, etc. → Jump to letter</li>
              </ul>
              <p><strong>💡 Letter Tips:</strong> You can say letters many ways!</p>
              <ul>
                <li><strong>A:</strong> "A", "ay", "eh", "ah"</li>
                <li><strong>B:</strong> "B", "bee", "be"</li>
                <li><strong>C:</strong> "C", "see", "cee"</li>
                <li><strong>D:</strong> "D", "dee", "de"</li>
                <li><strong>E:</strong> "E", "ee", "eh"</li>
                <li><strong>F:</strong> "F", "ef", "eff"</li>
                <li><strong>G:</strong> "G", "jee", "ge"</li>
                <li><strong>H:</strong> "H", "aitch"</li>
                <li><strong>I:</strong> "I", "eye", "ai"</li>
                <li><strong>J:</strong> "J", "jay", "je"</li>
                <li><strong>K:</strong> "K", "kay", "ke"</li>
                <li><strong>L:</strong> "L", "el", "ell"</li>
                <li><strong>M:</strong> "M", "em", "emm"</li>
                <li><strong>N:</strong> "N", "en", "enn"</li>
                <li><strong>O:</strong> "O", "oh", "owe"</li>
                <li><strong>P:</strong> "P", "pee", "pe"</li>
                <li><strong>Q:</strong> "Q", "cue", "qu"</li>
                <li><strong>R:</strong> "R", "ar", "arr"</li>
                <li><strong>S:</strong> "S", "es", "ess"</li>
                <li><strong>T:</strong> "T", "tee", "te"</li>
                <li><strong>U:</strong> "U", "you", "yu"</li>
                <li><strong>V:</strong> "V", "vee", "ve"</li>
                <li><strong>W:</strong> "W", "double you", "dubya"</li>
                <li><strong>X:</strong> "X", "ex", "ecks"</li>
                <li><strong>Y:</strong> "Y", "why", "wy"</li>
                <li><strong>Z:</strong> "Z", "zee", "zed"</li>
              </ul>
              <p><strong>🎯 Quiz:</strong> Say "quiz", "test", or "challenge" to start quizzing!</p>
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
                      alt="ASL sign to identify"
                      className="asl-image quiz-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        showStatus(`Quiz image not found`, 'error');
                      }}
                    />
                  </div>
                )}

                <div className="quiz-instructions">
                  <p>Look at the ASL sign and say the letter you think it represents!</p>
                </div>
              </div>
            ) : (
              <div className="quiz-start">
                <h3>Ready to test your ASL knowledge?</h3>
                <p>Say "start quiz" to begin!</p>
                <button 
                  className="quiz-start-button"
                  onClick={startQuiz}
                >
                  🎯 Start Quiz
                </button>
              </div>
            )}

            <div className="instructions">
              <h3>🎯 How to Play:</h3>
              <ul>
                <li>Say <strong>"start quiz"</strong> to begin</li>
                <li>Look at the ASL sign image</li>
                <li>Say the letter you think it represents</li>
                <li>Say <strong>"next"</strong> for next question</li>
                <li>Say <strong>"learning"</strong> to go back to learning mode</li>
              </ul>
              <p><strong>💡 Letter Tips:</strong> You can say letters many ways!</p>
              <p><strong>Examples:</strong> "A" or "ay" or "eh" all work for letter A!</p>
              <p><strong>🎤 Voice Commands:</strong> Say "start quiz", "next", "learning", or any letter!</p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Voice Commands Panel */}
      {commandsVisible && (
        <div className="voice-commands-panel">
          <h3>🎤 Voice Commands</h3>
          <ul>
            <li>
              <span className="command-keyword">next</span>
              <span className="command-action">Next letter</span>
            </li>
            <li>
              <span className="command-keyword">previous</span>
              <span className="command-action">Previous letter</span>
            </li>
            <li>
              <span className="command-keyword">random</span>
              <span className="command-action">Random letter</span>
            </li>
            <li>
              <span className="command-keyword">repeat</span>
              <span className="command-action">Show again</span>
            </li>
            <li>
              <span className="command-keyword">quiz</span>
              <span className="command-action">Go to quiz</span>
            </li>
            <li>
              <span className="command-keyword">A-Z</span>
              <span className="command-action">Jump to letter</span>
            </li>
            <li>
              <span className="command-keyword">hide</span>
              <span className="command-action">Hide commands</span>
            </li>
            <li>
              <span className="command-keyword">stop voice</span>
              <span className="command-action">Deactivate voice</span>
            </li>
          </ul>
          <div className="tip">
            💡 Say "start voice" to activate, "show commands" to show panel!
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
