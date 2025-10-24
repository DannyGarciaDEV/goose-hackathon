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
      setLetters(letters);
      console.log('Loaded', letters.length, 'letters');
    } catch (error) {
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
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1;

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        updateVoiceStatus();
        console.log('Voice recognition started');
        showStatus('🎤 Voice recognition active - say a command!', 'success');
      };

      recognitionRef.current.onresult = (event) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase().trim();
        console.log(`Voice command received: "${command}"`);
        showStatus(`Heard: "${command}"`, 'info');
        processVoiceCommand(command);
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
        nextLetter();
        return;
      } else if (cleanCommand.includes('previous') || cleanCommand.includes('back')) {
        previousLetter();
        return;
      } else if (cleanCommand.includes('random')) {
        randomLetter();
        return;
      } else if (cleanCommand.includes('repeat')) {
        showLetter(currentLetter);
        showStatus(`Showing letter ${currentLetter.toUpperCase()} again`, 'info');
        return;
      }
    }

    // Quiz mode commands
    if (currentPage === 'quiz') {
      if (cleanCommand.includes('start quiz') || cleanCommand.includes('start') || cleanCommand.includes('begin')) {
        if (!quizActive) {
          startQuiz();
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

    // Check for letter commands - improved matching
    const letterMatch = cleanCommand.match(/\b([a-z])\b/);
    if (letterMatch) {
      const letter = letterMatch[1];
      if (letters.includes(letter)) {
        if (currentPage === 'learning') {
          showLetter(letter);
          showStatus(`Showing letter ${letter.toUpperCase()}`, 'success');
        } else if (currentPage === 'quiz' && quizActive) {
          checkQuizAnswer(letter);
        }
        return;
      }
    }

    // If no command matched, show help
    showStatus(`Command not recognized: "${cleanCommand}". Try saying "next", "previous", "random", or a letter like "A"`, 'error');
  };

  const showLetter = (letter) => {
    setCurrentLetter(letter);
    setCurrentLetterIndex(letters.indexOf(letter));
  };

  const nextLetter = () => {
    const nextIndex = (currentLetterIndex + 1) % letters.length;
    const nextLetter = letters[nextIndex];
    showLetter(nextLetter);
    showStatus(`Next letter: ${nextLetter.toUpperCase()}`, 'info');
  };

  const previousLetter = () => {
    const prevIndex = currentLetterIndex === 0 ? letters.length - 1 : currentLetterIndex - 1;
    const prevLetter = letters[prevIndex];
    showLetter(prevLetter);
    showStatus(`Previous letter: ${prevLetter.toUpperCase()}`, 'info');
  };

  const randomLetter = () => {
    const randomIndex = Math.floor(Math.random() * letters.length);
    const randomLetter = letters[randomIndex];
    showLetter(randomLetter);
    showStatus(`Random letter: ${randomLetter.toUpperCase()}`, 'info');
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
    
    const randomIndex = Math.floor(Math.random() * letters.length);
    const randomLetter = letters[randomIndex];
    setCurrentQuizLetter(randomLetter);
    setQuizTotal(prev => prev + 1);
    showStatus(`Quiz question ${quizTotal + 1}: What letter is this?`, 'info');
  };

  const checkQuizAnswer = (answer) => {
    if (!quizActive || !currentQuizLetter) return;
    
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
    // For local development, we'll use a placeholder or try to load from the dataset
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
              <p><strong>💡 Tip:</strong> You can say letters different ways: "A", "ay", "eh" all work for letter A!</p>
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
              <p><strong>💡 Tip:</strong> You can say letters different ways: "A", "ay", "eh" all work for letter A!</p>
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
