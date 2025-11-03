import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [currentLetter, setCurrentLetter] = useState('a');
  const [letters] = useState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']);
  const [isListening, setIsListening] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(true);
  const [handTrackingActive, setHandTrackingActive] = useState(false);
  const [handDetected, setHandDetected] = useState(false);
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [similarityScore, setSimilarityScore] = useState(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [datasetEmbeddings, setDatasetEmbeddings] = useState({});

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handLandmarkerRef = useRef(null);
  const imageEmbedderRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const runningModeRef = useRef("IMAGE");
  const classificationIntervalRef = useRef(null);
  const webcamRunningRef = useRef(false);
  const hasMovedToNextRef = useRef(false);

  // Initialize MediaPipe - Hand Landmarker + Image Embedder (using official example pattern)
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const { HandLandmarker, ImageEmbedder, FilesetResolver } = await import('@mediapipe/tasks-vision');
        
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        // Initialize Hand Landmarker (matching official example)
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          numHands: 2
        });
        
        // Initialize Image Embedder
        const imageEmbedder = await ImageEmbedder.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite`,
            delegate: "GPU"
          },
          runningMode: "IMAGE",
          l2Normalize: true
        });
        
        handLandmarkerRef.current = handLandmarker;
        imageEmbedderRef.current = imageEmbedder;
        setMediapipeReady(true);
        console.log('✅ MediaPipe ready (Hand Landmarker + Image Embedder)');
        
        // Pre-load dataset embeddings
        loadDatasetEmbeddings(imageEmbedder);
      } catch (error) {
        console.error('MediaPipe init error:', error);
      }
    };

    initMediaPipe();
  }, []);

  // Pre-load ASL dataset embeddings
  const loadDatasetEmbeddings = async (imageEmbedder) => {
    console.log('Loading ASL dataset embeddings...');
    const embeddings = {};
    
    try {
      for (const letter of letters) {
        const imageUrl = getImageUrl(letter);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
          img.onload = async () => {
            try {
              const result = imageEmbedder.embed(img);
              if (result.embeddings && result.embeddings.length > 0) {
                embeddings[letter] = result.embeddings[0];
                console.log(`✅ Loaded embedding for letter: ${letter}`);
              }
              resolve();
            } catch (err) {
              console.error(`Error embedding ${letter}:`, err);
              resolve(); // Continue with other letters
            }
          };
          img.onerror = () => {
            console.warn(`Failed to load image for ${letter}`);
            resolve(); // Continue with other letters
          };
          img.src = imageUrl;
        });
      }
      
      setDatasetEmbeddings(embeddings);
      console.log('✅ Dataset embeddings loaded:', Object.keys(embeddings).length);
    } catch (error) {
      console.error('Error loading dataset embeddings:', error);
    }
  };

  // Classify user's gesture by comparing with dataset
  const classifyGesture = async () => {
    if (!imageEmbedderRef.current || !videoRef.current || !handDetected) {
      return;
    }

    try {
      setIsClassifying(true);
      const video = videoRef.current;
      
      // Create a temporary canvas to capture current frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      
      // Generate embedding for user's gesture
      const userResult = imageEmbedderRef.current.embed(tempCanvas);
      
      if (!userResult.embeddings || userResult.embeddings.length === 0) {
        setIsClassifying(false);
        return;
      }
      
      const userEmbedding = userResult.embeddings[0];
      const targetLetter = currentLetter;
      
      // Compare with target letter embedding
      if (datasetEmbeddings[targetLetter]) {
        // Import ImageEmbedder for cosineSimilarity
        const { ImageEmbedder } = await import('@mediapipe/tasks-vision');
        const similarity = ImageEmbedder.cosineSimilarity(
          userEmbedding,
          datasetEmbeddings[targetLetter]
        );
        
        setSimilarityScore(similarity);
        console.log(`Similarity with ${targetLetter.toUpperCase()}: ${(similarity * 100).toFixed(1)}%`);
        
        // Check if approved (27%+ similarity) and move to next letter
        if (similarity > 0.27 && !hasMovedToNextRef.current) {
          hasMovedToNextRef.current = true;
          console.log(`✅ Approved! Moving to next letter...`);
          
          // Find current letter index
          const currentIndex = letters.indexOf(currentLetter);
          if (currentIndex !== -1 && currentIndex < letters.length - 1) {
            // Move to next letter after a short delay
            setTimeout(() => {
              setCurrentLetter(letters[currentIndex + 1]);
              setSimilarityScore(null); // Reset similarity score
              hasMovedToNextRef.current = false; // Reset flag for next letter
              console.log(`✅ Now learning letter: ${letters[currentIndex + 1].toUpperCase()}`);
            }, 1500); // 1.5 second delay before moving
          } else {
            // All letters completed!
            console.log('🎉 All letters completed!');
          }
        }
        
        // Compare with all letters to find best match
        let bestMatch = targetLetter;
        let bestScore = similarity;
        
        for (const [letter, embedding] of Object.entries(datasetEmbeddings)) {
          const score = ImageEmbedder.cosineSimilarity(userEmbedding, embedding);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = letter;
          }
        }
        
        if (bestMatch !== targetLetter) {
          console.log(`Best match: ${bestMatch.toUpperCase()} (${(bestScore * 100).toFixed(1)}%)`);
        }
      }
    } catch (error) {
      console.error('Classification error:', error);
    } finally {
      setIsClassifying(false);
    }
  };

  // Start automatic classification when hand is detected
  useEffect(() => {
    if (handTrackingActive && handDetected && Object.keys(datasetEmbeddings).length > 0) {
      // Classify every 2 seconds
      classificationIntervalRef.current = setInterval(() => {
        classifyGesture();
      }, 2000);
      
      return () => {
        if (classificationIntervalRef.current) {
          clearInterval(classificationIntervalRef.current);
        }
      };
    } else {
      if (classificationIntervalRef.current) {
        clearInterval(classificationIntervalRef.current);
      }
    }
  }, [handTrackingActive, handDetected, datasetEmbeddings, currentLetter]);

  // Start voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event) => {
        const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log('🎤 Voice recognized:', command);
        processVoiceCommand(command);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => {
        if (isListening) {
          setTimeout(() => recognitionRef.current?.start(), 500);
        }
      };

      setTimeout(() => {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {}
      }, 1000);
    }
  }, []);

  // Start webcam
  const startWebcam = async () => {
    try {
      if (handTrackingActive) {
        console.log('Camera already active');
        return;
      }

      console.log('Starting webcam...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('✅ Got stream:', stream);

      // CRITICAL: Set handTrackingActive FIRST so video element exists in DOM
      setHandTrackingActive(true);
      
      // Wait for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Now get the video element (it should be in DOM now)
      const video = videoRef.current;
      if (!video) {
        console.error('❌ Video element still not available after state update!');
        stream.getTracks().forEach(track => track.stop());
        setHandTrackingActive(false);
        return;
      }
      
      console.log('✅ Video element found after render:', video);
      console.log('Video parent:', video.parentElement);
      console.log('Video in DOM:', document.body.contains(video));
      
      // Set video styles FIRST
      video.style.cssText = `
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        height: auto !important;
        background-color: #000 !important;
        transform: rotateY(180deg) !important;
        -webkit-transform: rotateY(180deg) !important;
        -moz-transform: rotateY(180deg) !important;
        min-height: 300px !important;
        position: relative !important;
        z-index: 1 !important;
      `;
      
      console.log('✅ Video styles set');
      
      // Set srcObject (matching CodePen example exactly)
      video.srcObject = stream;
      
      // Set webcamRunning flag and initialize (matching CodePen)
      webcamRunningRef.current = true;
      lastVideoTimeRef.current = -1;
      runningModeRef.current = "IMAGE";
      
      // Add loadeddata event listener (matching CodePen example exactly)
      video.addEventListener('loadeddata', detectHands, { once: true });
    } catch (error) {
      console.error('❌ Webcam error:', error);
      alert('Please allow camera access. Error: ' + error.message);
    }
  };

  const stopWebcam = () => {
    webcamRunningRef.current = false;
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setHandTrackingActive(false);
    setHandDetected(false);
  };

  // Hand detection - Matching CodePen gOKBGPN EXACTLY
  const detectHands = async () => {
    if (!webcamRunningRef.current || !videoRef.current || !canvasRef.current || !handLandmarkerRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions (matching CodePen exactly)
    canvas.style.width = video.videoWidth + 'px';
    canvas.style.height = video.videoHeight + 'px';
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Switch to VIDEO mode if needed (matching CodePen)
    if (runningModeRef.current === "IMAGE") {
      runningModeRef.current = "VIDEO";
      await handLandmarkerRef.current.setOptions({ runningMode: "VIDEO" });
    }

    // Use performance.now() for timestamp (matching CodePen exactly)
    const startTimeMs = performance.now();

    // Only process when video time changes (matching CodePen exactly)
    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;

      // Detect hands (matching CodePen exactly)
      const results = handLandmarkerRef.current.detectForVideo(video, startTimeMs);

      // Clear and draw (matching CodePen exactly)
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw landmarks if detected (matching CodePen exactly)
      if (results && results.landmarks) {
        setHandDetected(results.landmarks.length > 0);

        // Use MediaPipe drawing utilities (matching CodePen exactly)
        try {
          const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = await import('@mediapipe/drawing_utils');
          
          // Draw for each hand (matching CodePen EXACTLY)
          for (const landmarks of results.landmarks) {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
              color: "#00FF00",
              lineWidth: 5
            });
            drawLandmarks(ctx, landmarks, { 
              color: "#FF0000", 
              lineWidth: 2 
            });
          }
        } catch (drawError) {
          console.warn('Drawing utils failed, using fallback:', drawError);
          // Fallback drawing
          for (const landmarks of results.landmarks) {
            if (landmarks && landmarks.length >= 21) {
              const connections = [
                [0,1],[1,2],[2,3],[3,4],
                [0,5],[5,6],[6,7],[7,8],
                [0,9],[9,10],[10,11],[11,12],
                [0,13],[13,14],[14,15],[15,16],
                [0,17],[17,18],[18,19],[19,20],
                [5,9],[9,13],[13,17]
              ];

              ctx.strokeStyle = '#00FF00';
              ctx.lineWidth = 5;
              connections.forEach(([start, end]) => {
                if (start < landmarks.length && end < landmarks.length) {
                  ctx.beginPath();
                  ctx.moveTo(landmarks[start].x * canvas.width, landmarks[start].y * canvas.height);
                  ctx.lineTo(landmarks[end].x * canvas.width, landmarks[end].y * canvas.height);
                  ctx.stroke();
                }
              });

              ctx.fillStyle = '#FF0000';
              ctx.strokeStyle = '#FFFFFF';
              ctx.lineWidth = 2;
              landmarks.forEach(landmark => {
                ctx.beginPath();
                ctx.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
              });
            }
          }
        }
      } else {
        setHandDetected(false);
      }

      ctx.restore();
    }

    // Continue detection loop (matching CodePen exactly)
    if (webcamRunningRef.current) {
      requestAnimationFrame(detectHands);
    }
  };

  const processVoiceCommand = (command) => {
    console.log('🔊 Processing voice command:', command);
    
    if (command.includes('hide commands')) {
      setCommandsVisible(false);
      return;
    }
    if (command.includes('show commands')) {
      setCommandsVisible(true);
      return;
    }
    // Multiple variations for starting camera
    if (command.includes('start camera') || 
        command.includes('start webcam') || 
        command.includes('start cam') ||
        command.includes('camera')) {
      console.log('Starting camera via voice command');
      startWebcam();
      return;
    }
    if (command.includes('stop camera') || command.includes('stop webcam')) {
      stopWebcam();
      return;
    }

    // Letter detection - improved pattern matching
    let letter = null;
    
    // Try single character first
    if (command.length === 1 && /[a-zA-Z]/.test(command)) {
      letter = command.toLowerCase();
    } else {
      // Try to match letter at start of command
      const match = command.match(/^([a-zA-Z])/);
      if (match) {
        letter = match[1].toLowerCase();
      } else {
        // Try to match letter anywhere in command
        const letterMatch = command.match(/([a-zA-Z])/);
        if (letterMatch) {
          letter = letterMatch[1].toLowerCase();
        }
      }
    }

    // If still no letter, try pronunciations
    if (!letter) {
      const pronunciations = {
        'ay': 'a', 'bee': 'b', 'see': 'c', 'dee': 'd', 'ee': 'e',
        'ef': 'f', 'jee': 'g', 'aitch': 'h', 'eye': 'i', 'jay': 'j',
        'kay': 'k', 'el': 'l', 'em': 'm', 'en': 'n', 'oh': 'o',
        'pee': 'p', 'cue': 'q', 'ar': 'r', 'es': 's', 'tee': 't',
        'you': 'u', 'vee': 'v', 'double you': 'w', 'ex': 'x',
        'why': 'y', 'zee': 'z',
        // Additional variations
        'sea': 'c', 'si': 'c', 'see': 'c'
      };
      for (const [pronunciation, l] of Object.entries(pronunciations)) {
        if (command.includes(pronunciation)) {
          letter = l;
          console.log(`Matched pronunciation "${pronunciation}" to letter ${l}`);
          break;
        }
      }
    }

    if (letter && letters.includes(letter)) {
      console.log(`📝 Voice command detected letter: ${letter.toUpperCase()}, jumping to it...`);
      setCurrentLetter(letter);
      setSimilarityScore(null); // Reset similarity when jumping to a letter
      hasMovedToNextRef.current = false; // Reset the move flag
      console.log(`✅ Successfully jumped to letter: ${letter.toUpperCase()}`);
    } else if (letter) {
      console.log(`⚠️ Letter "${letter}" detected but not in letters array`);
    } else {
      console.log(`⚠️ No letter detected in command: "${command}"`);
    }
  };

  const getImageUrl = (letter) => {
    return `/asl_dataset/${letter}/hand1_${letter}_bot_seg_1_cropped.jpeg`;
  };

  useEffect(() => {
    return () => {
      stopWebcam();
      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand">🤟 ASL Learning</div>
        <div className="navbar-controls">
          <div className="voice-status">
            <span className="voice-icon">{isListening ? '🎤' : '🔇'}</span>
            <span>{isListening ? 'Voice Active' : 'Voice Inactive'}</span>
          </div>
          {handTrackingActive && (
            <div className="hand-status">
              <span>🖐️</span>
              <span>{handDetected ? 'Hand Detected' : 'No Hand'}</span>
            </div>
          )}
        </div>
      </nav>

      {commandsVisible && (
        <div className="voice-commands-panel">
          <div className="commands-header">
            <h4>🎤 Voice Commands</h4>
            <button onClick={() => setCommandsVisible(false)}>✕</button>
          </div>
          <div className="commands-content">
            <div className="command-section">
              <h5>⚙️ Controls</h5>
              <div className="command-item">
                <span className="command-phrase">"hide commands"</span>
                <span className="command-action">Hide panel</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"start camera"</span>
                <span className="command-action">Start webcam</span>
              </div>
            </div>
            <div className="command-section">
              <h5>🔤 Letters</h5>
              <div className="command-item">
                <span className="command-phrase">"A", "B", "C"...</span>
                <span className="command-action">Show ASL letter</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        <div className="learning-mode">
          <h1>🤟 ASL Learning</h1>
          <p className="subtitle">Learn American Sign Language!</p>
          
          <div className="button-group">
            <button 
              className={`voice-button ${isListening ? 'listening' : ''}`}
              onClick={() => {
                if (isListening) {
                  recognitionRef.current?.stop();
                  setIsListening(false);
                } else {
                  recognitionRef.current?.start();
                  setIsListening(true);
                }
              }}
            >
              {isListening ? '🔇 Stop Voice' : '🎤 Start Voice'}
            </button>

            <button 
              className={`camera-button ${handTrackingActive ? 'active' : ''}`}
              onClick={handTrackingActive ? stopWebcam : startWebcam}
              disabled={!mediapipeReady}
            >
              {handTrackingActive ? '📷 Stop Camera' : '📷 Start Camera'}
            </button>
          </div>

          {handTrackingActive ? (
            <div className="split-view">
              <div className="current-letter">
                <h2>Target: {currentLetter.toUpperCase()}</h2>
                <img 
                  src={getImageUrl(currentLetter)} 
                  alt={`ASL sign for ${currentLetter}`}
                  className="asl-image"
                />
              </div>
              <div className="webcam-preview">
                <h3>Your Hand</h3>
                <div className="webcam-container">
                  <video
                    ref={videoRef}
                    id="webcam"
                    autoPlay
                    playsInline
                    muted
                    className="webcam-video"
                  />
                  <canvas
                    ref={canvasRef}
                    id="output_canvas"
                    className="webcam-canvas output_canvas"
                  />
                </div>
                {handDetected ? (
                  <div className="classification-feedback">
                    {isClassifying ? (
                      <div className="info-message-small">
                        🔍 Analyzing your gesture...
                      </div>
                    ) : similarityScore !== null ? (
                      <div className={`similarity-score ${similarityScore > 0.27 ? 'high' : similarityScore > 0.2 ? 'medium' : 'low'}`}>
                        <div className="similarity-label">
                          {similarityScore > 0.27 ? '✅ Good enough! Approved!' : similarityScore > 0.2 ? '⚠️ Getting close' : '❌ Try again'}
                        </div>
                        <div className="similarity-bar">
                          <div 
                            className="similarity-fill"
                            style={{ width: `${similarityScore > 0.27 ? 100 : similarityScore * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="success-message-small">
                        ✅ Hand detected! Hold your gesture steady...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="info-message-small">
                    👋 Show your hand to the camera
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="current-letter">
              <h2>{currentLetter.toUpperCase()}</h2>
              <img 
                src={getImageUrl(currentLetter)} 
                alt={`ASL sign for ${currentLetter}`}
                className="asl-image"
              />
            </div>
          )}

          {!mediapipeReady && (
            <div className="info-message">
              <p>⏳ Loading hand tracking...</p>
            </div>
          )}

          <div className="instructions">
            <h3>🎤 Voice Commands:</h3>
            <p>Say any letter to see its ASL sign!</p>
            <p><strong>💡 Tips:</strong></p>
            <ul>
              <li>Allow microphone and webcam permissions</li>
              <li>Use Chrome or Edge for best results</li>
              <li>Start camera to see hand detection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
