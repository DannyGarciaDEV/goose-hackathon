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
    console.log('🚀 Component mounted, loading letters...');
    console.log('📊 Initial letters state:', letters);
    console.log('📊 Initial currentLetter state:', currentLetter);
    
    // Load letters immediately
    loadLetters();
    
    // Also try loading again after a delay to ensure it works
    setTimeout(() => {
      console.log('🔄 Retry loading letters...');
      if (letters.length === 0) {
        loadLetters();
      }
    }, 1000);
  }, []);

  // Auto-start voice recognition
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🚀 Auto-starting voice recognition...');
      
      // Check if browser supports speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        console.log('✅ Speech recognition supported');
        setupVoiceRecognition();
        
        // Start recognition after a short delay
        setTimeout(() => {
          if (recognitionRef.current) {
            console.log('🎤 Starting voice recognition...');
            try {
              recognitionRef.current.start();
              setIsListening(true);
              showStatus('🎤 Voice recognition active! Say commands like "next", "previous", "random", or letters like "A", "B", "C"', 'success');
            } catch (error) {
              console.error('❌ Error starting voice recognition:', error);
              showStatus('❌ Error starting voice recognition. Please allow microphone access.', 'error');
            }
          } else {
            console.error('❌ Voice recognition not initialized');
            showStatus('❌ Voice recognition not initialized', 'error');
          }
        }, 500);
      } else {
        console.error('❌ Speech recognition not supported');
        showStatus('❌ Voice recognition not available. Please use Chrome or Edge browser.', 'error');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const loadLetters = async () => {
    try {
      console.log('🔄 Loading letters...');
      
      // For local development, use the dataset directly
      const lettersArray = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
      
      console.log('📝 Letters array:', lettersArray);
      console.log('📊 Letters length:', lettersArray.length);
      
      if (lettersArray && lettersArray.length > 0) {
        console.log('🔄 Setting letters state...');
        setLetters(lettersArray);
        
        // Force a small delay to ensure state is set
        setTimeout(() => {
          console.log('✅ Successfully loaded', lettersArray.length, 'letters');
          showStatus(`✅ Loaded ${lettersArray.length} ASL letters`, 'success');
          
          // Set initial letter if not already set
          if (!currentLetter || currentLetter === '') {
            console.log('🔄 Setting initial letter to A...');
            setCurrentLetter('a');
            setCurrentLetterIndex(0);
            console.log('✅ Set initial letter to A');
          }
        }, 100);
      } else {
        console.error('❌ No letters loaded');
        showStatus('❌ Error: No letters loaded', 'error');
      }
    } catch (error) {
      console.error('❌ Error loading letters:', error);
      showStatus('❌ Error loading letters: ' + error.message, 'error');
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
      recognitionRef.current.interimResults = false; // Disable interim results for cleaner detection
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.maxAlternatives = 1; // Reduce to 1 for simpler processing

      recognitionRef.current.onstart = () => {
        console.log('✅ Voice recognition started');
        setIsListening(true);
        updateVoiceStatus();
        showStatus('🎤 Voice recognition active - say a command!', 'success');
      };

      recognitionRef.current.onresult = (event) => {
        console.log('🎤 Voice recognition result:', event);
        console.log('📊 Results length:', event.results.length);
        
        // Process the most recent result
        const last = event.results.length - 1;
        const result = event.results[last];
        
        console.log('📝 Last result:', result);
        console.log('🔍 Is final:', result.isFinal);
        console.log('📄 Transcript:', result[0].transcript);
        console.log('📊 Confidence:', result[0].confidence);
        
        if (result.isFinal) {
          const command = result[0].transcript.toLowerCase().trim();
          console.log(`🎯 Final voice command: "${command}"`);
          showStatus(`🎤 Heard: "${command}"`, 'info');
          processVoiceCommand(command);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('❌ Speech recognition error:', event.error);
        setIsListening(false);
        updateVoiceStatus();
        
        if (event.error === 'no-speech') {
          console.log('🔄 No speech detected, restarting...');
          showStatus('No speech detected. Try speaking louder!', 'error');
          // Restart after a delay
          setTimeout(() => {
            if (recognitionRef.current) {
              console.log('🔄 Restarting voice recognition...');
              recognitionRef.current.start();
              setIsListening(true);
            }
          }, 2000);
        } else if (event.error === 'not-allowed') {
          console.log('❌ Microphone access denied');
          showStatus('Microphone access denied. Please allow microphone access and refresh the page.', 'error');
        } else if (event.error === 'network') {
          console.log('❌ Network error');
          showStatus('Network error. Check your internet connection.', 'error');
        } else if (event.error === 'aborted') {
          console.log('🔄 Voice recognition aborted, restarting...');
          // Restart after a delay
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              setIsListening(true);
            }
          }, 1000);
        } else {
          console.log('❌ Unknown voice error:', event.error);
          showStatus(`Voice error: ${event.error}. Try refreshing the page.`, 'error');
        }
      };

      recognitionRef.current.onend = () => {
        console.log('🔄 Voice recognition ended');
        if (isListening) {
          // Restart recognition if it ended unexpectedly
          console.log('🔄 Restarting voice recognition...');
          setTimeout(() => {
            if (recognitionRef.current && isListening) {
              recognitionRef.current.start();
              console.log('✅ Voice recognition restarted');
            }
          }, 500);
        } else {
          console.log('🔇 Voice recognition stopped by user');
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
    console.log('🎤 VOICE COMMAND RECEIVED:', command);
    
    if (!command || typeof command !== 'string') {
      console.error('❌ Invalid command:', command);
      showStatus('Error: Invalid voice command', 'error');
      return;
    }
    
    const cleanCommand = command.toLowerCase().trim();
    console.log('🧹 Cleaned command:', cleanCommand);
    console.log('📊 Current state:', {
      lettersLength: letters.length,
      currentPage: currentPage,
      isListening: isListening,
      currentLetter: currentLetter
    });

    // Check if letters are loaded first
    if (letters.length === 0) {
      console.log('⚠️ Letters not loaded yet, loading...');
      loadLetters();
      showStatus('Loading letters, please wait...', 'info');
      
      // For navigation commands, try to load letters and retry
      if (cleanCommand.includes('next') || cleanCommand.includes('previous') || cleanCommand.includes('random')) {
        setTimeout(() => {
          if (letters.length > 0) {
            processVoiceCommand(command);
          }
        }, 1000);
      }
      return;
    }

    // EXACT MATCH COMMANDS (most reliable)
    const exactCommands = {
      'next': () => {
        console.log('✅ NEXT command detected');
        nextLetter();
        return true;
      },
      'previous': () => {
        console.log('✅ PREVIOUS command detected');
        previousLetter();
        return true;
      },
      'random': () => {
        console.log('✅ RANDOM command detected');
        randomLetter();
        return true;
      },
      'repeat': () => {
        console.log('✅ REPEAT command detected');
        if (currentLetter) {
          showLetter(currentLetter);
          showStatus(`Showing letter ${currentLetter.toUpperCase()} again`, 'info');
        }
        return true;
      },
      'quiz': () => {
        console.log('✅ QUIZ command detected');
        showStatus('🎯 Going to quiz mode...', 'info');
        setTimeout(() => setCurrentPage('quiz'), 1000);
        return true;
      },
      'start practice': () => {
        console.log('✅ START PRACTICE command detected');
        showStatus('🎯 Starting quiz practice...', 'info');
        setTimeout(() => {
          setCurrentPage('quiz');
          startQuiz();
        }, 1000);
        return true;
      },
      'practice': () => {
        console.log('✅ PRACTICE command detected');
        showStatus('🎯 Starting quiz practice...', 'info');
        setTimeout(() => {
          setCurrentPage('quiz');
          startQuiz();
        }, 1000);
        return true;
      },
      'learning': () => {
        console.log('✅ LEARNING command detected');
        showStatus('📚 Going back to learning mode...', 'info');
        setTimeout(() => setCurrentPage('learning'), 1000);
        return true;
      },
      'hide': () => {
        console.log('✅ HIDE commands detected');
        setCommandsVisible(false);
        showStatus('Commands hidden. Say "show" to bring them back.', 'info');
        return true;
      },
      'show': () => {
        console.log('✅ SHOW commands detected');
        setCommandsVisible(true);
        showStatus('Commands shown!', 'success');
        return true;
      },
      'stop voice': () => {
        console.log('✅ STOP VOICE command detected');
        if (isListening) {
          toggleVoiceRecognition();
          showStatus('🔇 Voice recognition deactivated!', 'info');
        }
        return true;
      },
      'start voice': () => {
        console.log('✅ START VOICE command detected');
        if (!isListening) {
          toggleVoiceRecognition();
          showStatus('🎤 Voice recognition activated!', 'success');
        }
        return true;
      }
    };

    // Check exact matches first
    for (const [cmd, handler] of Object.entries(exactCommands)) {
      if (cleanCommand === cmd) {
        return handler();
      }
    }

    // CONTAINS MATCHES (for partial matches)
    if (cleanCommand.includes('next')) {
      console.log('✅ NEXT (contains) command detected');
      nextLetter();
      return;
    }
    
    if (cleanCommand.includes('previous')) {
      console.log('✅ PREVIOUS (contains) command detected');
      previousLetter();
      return;
    }
    
    if (cleanCommand.includes('random')) {
      console.log('✅ RANDOM (contains) command detected');
      randomLetter();
      return;
    }
    
    if (cleanCommand.includes('repeat')) {
      console.log('✅ REPEAT (contains) command detected');
      if (currentLetter) {
        showLetter(currentLetter);
        showStatus(`Showing letter ${currentLetter.toUpperCase()} again`, 'info');
      }
      return;
    }
    
    if (cleanCommand.includes('quiz')) {
      console.log('✅ QUIZ (contains) command detected');
      showStatus('🎯 Going to quiz mode...', 'info');
      setTimeout(() => setCurrentPage('quiz'), 1000);
      return;
    }
    
    if (cleanCommand.includes('start practice') || cleanCommand.includes('practice')) {
      console.log('✅ START PRACTICE (contains) command detected');
      showStatus('🎯 Starting quiz practice...', 'info');
      setTimeout(() => {
        setCurrentPage('quiz');
        startQuiz();
      }, 1000);
      return;
    }
    
    if (cleanCommand.includes('learning') || cleanCommand.includes('back') || cleanCommand.includes('home')) {
      console.log('✅ LEARNING (contains) command detected');
      showStatus('📚 Going back to learning mode...', 'info');
      setTimeout(() => setCurrentPage('learning'), 1000);
      return;
    }
    
    if (cleanCommand.includes('hide')) {
      console.log('✅ HIDE (contains) command detected');
      setCommandsVisible(false);
      showStatus('Commands hidden. Say "show" to bring them back.', 'info');
      return;
    }
    
    if (cleanCommand.includes('show')) {
      console.log('✅ SHOW (contains) command detected');
      setCommandsVisible(true);
      showStatus('Commands shown!', 'success');
      return;
    }
    
    if (cleanCommand.includes('stop voice') || cleanCommand.includes('deactivate voice')) {
      console.log('✅ STOP VOICE (contains) command detected');
      if (isListening) {
        toggleVoiceRecognition();
        showStatus('🔇 Voice recognition deactivated!', 'info');
      }
      return;
    }
    
    if (cleanCommand.includes('start voice') || cleanCommand.includes('activate voice')) {
      console.log('✅ START VOICE (contains) command detected');
      if (!isListening) {
        toggleVoiceRecognition();
        showStatus('🎤 Voice recognition activated!', 'success');
      }
      return;
    }

    // LETTER DETECTION
    console.log('🔤 Looking for letter in command:', cleanCommand);
    
    let detectedLetter = null;
    
    // Pattern 1: Single letter (most reliable)
    if (cleanCommand.length === 1 && /[a-zA-Z]/.test(cleanCommand)) {
      detectedLetter = cleanCommand.toLowerCase();
      console.log('✅ Direct single letter match:', detectedLetter);
    }
    
    // Pattern 2: Letter at start
    if (!detectedLetter) {
      const startMatch = cleanCommand.match(/^([a-zA-Z])/);
      if (startMatch) {
        detectedLetter = startMatch[1].toLowerCase();
        console.log('✅ Letter at start match:', detectedLetter);
      }
    }
    
    // Pattern 3: Letter with word boundaries
    if (!detectedLetter) {
      const letterMatch = cleanCommand.match(/\b([a-zA-Z])\b/);
      if (letterMatch) {
        detectedLetter = letterMatch[1].toLowerCase();
        console.log('✅ Word boundary letter match:', detectedLetter);
      }
    }
    
    // Pattern 4: Common pronunciations
    if (!detectedLetter) {
      const pronunciations = {
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
      
      for (const [pronunciation, letter] of Object.entries(pronunciations)) {
        if (cleanCommand.includes(pronunciation)) {
          detectedLetter = letter;
          console.log('✅ Pronunciation match:', pronunciation, '->', letter);
          break;
        }
      }
    }
    
    console.log('🎯 Final detected letter:', detectedLetter);

    if (detectedLetter && letters.includes(detectedLetter)) {
      console.log('✅ Valid letter detected:', detectedLetter);
      if (currentPage === 'learning') {
        showLetter(detectedLetter);
        showStatus(`Showing letter ${detectedLetter.toUpperCase()}`, 'success');
      } else if (currentPage === 'quiz' && quizActive) {
        checkQuizAnswer(detectedLetter);
      }
      return;
    }

    // No command matched
    console.log('❌ No command matched:', cleanCommand);
    showStatus(`Command not recognized: "${cleanCommand}". Try: "next", "previous", "random", "quiz", or a letter like "A"`, 'error');
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
              <h2>{currentLetter ? currentLetter.toUpperCase() : 'Loading...'}</h2>
              {currentLetter && (
                <img 
                  src={getImageUrl(currentLetter)} 
                  alt={`ASL sign for ${currentLetter}`}
                  className="asl-image"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    showStatus(`Image not found for letter ${currentLetter.toUpperCase()}`, 'error');
                  }}
                />
              )}
            </div>

            {/* Debug Info */}
            <div style={{textAlign: 'center', margin: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '8px'}}>
              <p><strong>Debug Info:</strong></p>
              <p>Letters loaded: {letters.length}</p>
              <p>Current letter: {currentLetter || 'None'}</p>
              <p>Current page: {currentPage}</p>
              <p>Voice active: {isListening ? 'Yes' : 'No'}</p>
              <button 
                onClick={() => {
                  console.log('🔍 DEBUG STATE:', {
                    letters: letters,
                    lettersLength: letters.length,
                    currentLetter: currentLetter,
                    currentLetterIndex: currentLetterIndex,
                    isListening: isListening,
                    currentPage: currentPage,
                    quizActive: quizActive
                  });
                  showStatus('Debug info logged to console (F12)', 'info');
                }}
                style={{padding: '8px 16px', margin: '5px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
              >
                🔍 Debug State
              </button>
              <button 
                onClick={() => {
                  console.log('🔄 Force loading letters...');
                  loadLetters();
                }}
                style={{padding: '8px 16px', margin: '5px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
              >
                🔄 Reload Letters
              </button>
            </div>


            <div className="voice-button-container">
              <button 
                className={`voice-button ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceRecognition}
              >
                {isListening ? '🔇 Stop Voice' : '🎤 Start Voice'}
              </button>
              
              {/* Debug button for testing */}
              <button 
                className="voice-button"
                onClick={() => {
                  console.log('Testing voice recognition...');
                  console.log('Current letters:', letters);
                  console.log('Current letter:', currentLetter);
                  console.log('Is listening:', isListening);
                  showStatus('Debug info logged to console', 'info');
                }}
                style={{ marginLeft: '10px', fontSize: '0.9rem', padding: '0.5rem 1rem' }}
              >
                🔍 Debug
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
                <li><strong>A:</strong> "A", "a", "ay", "eh", "ah", "AY", "EH", "AH"</li>
                <li><strong>B:</strong> "B", "b", "bee", "be", "BEE", "BE"</li>
                <li><strong>C:</strong> "C", "c", "see", "cee", "SEE", "CEE"</li>
                <li><strong>D:</strong> "D", "d", "dee", "de", "DEE", "DE"</li>
                <li><strong>E:</strong> "E", "e", "ee", "eh", "EE", "EH"</li>
                <li><strong>F:</strong> "F", "f", "ef", "eff", "EF", "EFF"</li>
                <li><strong>G:</strong> "G", "g", "jee", "ge", "JEE", "GE"</li>
                <li><strong>H:</strong> "H", "h", "aitch", "AITCH"</li>
                <li><strong>I:</strong> "I", "i", "eye", "ai", "EYE", "AI"</li>
                <li><strong>J:</strong> "J", "j", "jay", "je", "JAY", "JE"</li>
                <li><strong>K:</strong> "K", "k", "kay", "ke", "KAY", "KE"</li>
                <li><strong>L:</strong> "L", "l", "el", "ell", "EL", "ELL"</li>
                <li><strong>M:</strong> "M", "m", "em", "emm", "EM", "EMM"</li>
                <li><strong>N:</strong> "N", "n", "en", "enn", "EN", "ENN"</li>
                <li><strong>O:</strong> "O", "o", "oh", "owe", "OH", "OWE"</li>
                <li><strong>P:</strong> "P", "p", "pee", "pe", "PEE", "PE"</li>
                <li><strong>Q:</strong> "Q", "q", "cue", "qu", "CUE", "QU"</li>
                <li><strong>R:</strong> "R", "r", "ar", "arr", "AR", "ARR"</li>
                <li><strong>S:</strong> "S", "s", "es", "ess", "ES", "ESS"</li>
                <li><strong>T:</strong> "T", "t", "tee", "te", "TEE", "TE"</li>
                <li><strong>U:</strong> "U", "u", "you", "yu", "YOU", "YU"</li>
                <li><strong>V:</strong> "V", "v", "vee", "ve", "VEE", "VE"</li>
                <li><strong>W:</strong> "W", "w", "double you", "dubya", "DOUBLE YOU", "DUBYA"</li>
                <li><strong>X:</strong> "X", "x", "ex", "ecks", "EX", "ECKS"</li>
                <li><strong>Y:</strong> "Y", "y", "why", "wy", "WHY", "WY"</li>
                <li><strong>Z:</strong> "Z", "z", "zee", "zed", "ZEE", "ZED"</li>
              </ul>
              <p><strong>🎯 Quiz:</strong> Say "quiz", "test", or "challenge" to start quizzing!</p>
              <p><strong>🔧 Troubleshooting:</strong></p>
              <ul>
                <li>Make sure microphone is allowed</li>
                <li>Speak clearly and loudly</li>
                <li>Try saying just the letter: "A", "B", "C"</li>
                <li>Check browser console (F12) for debug info</li>
                <li>Use Chrome or Edge for best results</li>
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
              <p><strong>Examples:</strong> "A" or "a" or "ay" or "AY" or "eh" all work for letter A!</p>
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
