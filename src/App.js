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
    
    // Navigation commands
    if (cleanCommand.includes('quiz') || cleanCommand.includes('start quiz')) {
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
      setCommandsVisible(false);
      showStatus('Commands hidden. Say "show commands" to bring them back.');
      return;
    }
    
    if (cleanCommand.includes('show commands')) {
      setCommandsVisible(true);
      showStatus('Commands shown!');
      return;
    }
    
    // Quiz controls
    if (cleanCommand.includes('start quiz') && currentPage === 'quiz') {
      startQuiz();
      return;
    }
    
    if (cleanCommand.includes('next question') && quizActive) {
      nextQuizQuestion();
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
      {/* Status Message */}
      {status && (
        <div className="status">
          {status}
        </div>
      )}

      {/* Voice Commands Panel */}
      {commandsVisible && (
        <div className="voice-commands-panel">
          <h4>🎤 Voice Commands</h4>
          <ul>
            <li><strong>Navigation:</strong></li>
            <li>"quiz" → Go to quiz mode</li>
            <li>"learning" → Back to learning</li>
            <li><strong>Quiz:</strong></li>
            <li>"start quiz" → Begin quiz</li>
            <li>"next question" → Next question</li>
            <li><strong>Commands:</strong></li>
            <li>"hide commands" → Hide this panel</li>
            <li>"show commands" → Show this panel</li>
            <li><strong>Letters:</strong></li>
            <li>Say any letter: "A", "B", "C", etc.</li>
          </ul>
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