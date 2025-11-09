import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function LearningMode() {
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
  const [handedness, setHandedness] = useState(null); // Left or Right hand
  const [handednessScore, setHandednessScore] = useState(null); // Confidence score
  const [handDepth, setHandDepth] = useState(null); // Average z coordinate
  const [worldLandmarks, setWorldLandmarks] = useState(null); // 3D world coordinates
  const [handPoseAnalysis, setHandPoseAnalysis] = useState(null); // 3D pose analysis

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cornerCanvasRef = useRef(null); // Corner preview canvas for hand landmarks
  const handLandmarkerRef = useRef(null);
  const imageEmbedderRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const runningModeRef = useRef("IMAGE");
  const classificationIntervalRef = useRef(null);
  const webcamRunningRef = useRef(false);
  const hasMovedToNextRef = useRef(false);
  const drawingUtilsRef = useRef(null); // Cache drawing utilities

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
        
        // Pre-load drawing utilities
        try {
          const drawingUtils = await import('@mediapipe/drawing_utils');
          drawingUtilsRef.current = drawingUtils;
          console.log('✅ Drawing utilities loaded');
        } catch (error) {
          console.error('Failed to load drawing utilities:', error);
        }
        
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

  // Analyze 3D hand pose using world landmarks
  const analyze3DHandPose = (worldLandmarks) => {
    if (!worldLandmarks || worldLandmarks.length < 21) {
      return null;
    }

    // Calculate 3D distance between two landmarks
    const distance3D = (p1, p2) => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dz = p2.z - p1.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    // Key landmark indices (MediaPipe hand landmarks)
    // 0: Wrist, 4: Thumb tip, 8: Index tip, 12: Middle tip, 16: Ring tip, 20: Pinky tip
    const wrist = worldLandmarks[0];
    const thumbTip = worldLandmarks[4];
    const indexTip = worldLandmarks[8];
    const middleTip = worldLandmarks[12];
    const ringTip = worldLandmarks[16];
    const pinkyTip = worldLandmarks[20];

    const analysis = {
      // Finger distances from wrist
      thumbDistance: distance3D(wrist, thumbTip),
      indexDistance: distance3D(wrist, indexTip),
      middleDistance: distance3D(wrist, middleTip),
      ringDistance: distance3D(wrist, ringTip),
      pinkyDistance: distance3D(wrist, pinkyTip),
      
      // Hand span (distance between thumb and pinky)
      handSpan: distance3D(thumbTip, pinkyTip),
      
      // Average finger extension
      avgFingerExtension: (
        distance3D(wrist, thumbTip) +
        distance3D(wrist, indexTip) +
        distance3D(wrist, middleTip) +
        distance3D(wrist, ringTip) +
        distance3D(wrist, pinkyTip)
      ) / 5
    };

    return analysis;
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

  // Start voice recognition - Shared instance across routes
  useEffect(() => {
    // Use shared instance if it exists
    if (window.sharedSpeechRecognition) {
      console.log('✅ Using existing shared speech recognition');
      recognitionRef.current = window.sharedSpeechRecognition;
      setIsListening(true);
      return;
    }

    // Only initialize if it doesn't exist
    if (recognitionRef.current) {
      console.log('Voice recognition already initialized');
      return;
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Share instance globally so it persists across routes
      window.sharedSpeechRecognition = recognitionRef.current;
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        console.log('✅ Speech recognition started');
        setIsListening(true);
      };

      recognitionRef.current.onresult = (event) => {
        if (event.results && event.results.length > 0) {
          const command = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
          console.log('🎤 Voice recognized:', command);
          processVoiceCommand(command);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.log('⚠️ Speech recognition error:', event.error);
        setIsListening(false);
        // Don't auto-restart on certain errors
        if (event.error !== 'no-speech' && event.error !== 'aborted' && event.error !== 'not-allowed') {
          setTimeout(() => {
            try {
              if (recognitionRef.current && !isListening) {
                recognitionRef.current.start();
              }
            } catch (e) {
              console.log('Error restarting recognition:', e);
            }
          }, 1000);
        }
      };

      recognitionRef.current.onend = () => {
        console.log('🔄 Speech recognition ended, restarting...');
        setIsListening(false);
        // Always try to restart (for continuous listening)
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {
            console.log('Error restarting recognition:', e);
          }
        }, 500);
      };

      // Start recognition after a delay
      const startRecognition = () => {
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              console.log('🎤 Starting speech recognition...');
            }
          } catch (e) {
            console.log('Error starting recognition:', e);
            // Retry once
            setTimeout(() => {
              try {
                if (recognitionRef.current) {
                  recognitionRef.current.start();
                }
              } catch (e2) {
                console.log('Error on retry:', e2);
              }
            }, 2000);
          }
        }, 1000);
      };

      startRecognition();
    } else {
      console.warn('⚠️ Speech recognition not supported in this browser');
    }

    // Don't cleanup on navigation - keep recognition running
    return () => {
      console.log('LearningMode unmounting, but keeping voice recognition running');
    };
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
    
    // Check if video dimensions are valid
    if (!video.videoWidth || !video.videoHeight || video.videoWidth === 0 || video.videoHeight === 0) {
      // Video not ready yet, try again next frame
      if (webcamRunningRef.current) {
        requestAnimationFrame(detectHands);
      }
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('❌ Failed to get canvas context');
      return;
    }

    // Set canvas dimensions (matching MediaPipe example exactly)
    canvas.style.width = video.videoWidth;
    canvas.style.height = video.videoHeight;
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

      // Debug: Log detection results
      if (results && results.landmarks && results.landmarks.length > 0) {
        console.log(`🎯 Detected ${results.landmarks.length} hand(s), canvas size: ${canvas.width}x${canvas.height}, video size: ${video.videoWidth}x${video.videoHeight}`);
      }

      // Clear and prepare main canvas for drawing landmarks (matching MediaPipe example exactly)
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw landmarks if detected (matching MediaPipe example exactly)
      if (results.landmarks) {
        setHandDetected(results.landmarks.length > 0);

        // Extract 3D prediction data from HandLandmarkerResult
        // Handedness: Left or Right hand detection
        // NOTE: Since video is mirrored, we need to flip the handedness interpretation
        if (results.handednesses && results.handednesses.length > 0) {
          const firstHandedness = results.handednesses[0];
          if (firstHandedness && firstHandedness.length > 0) {
            const category = firstHandedness[0];
            // Flip handedness because video is mirrored - MediaPipe sees mirrored view
            const actualHandedness = category.categoryName === "Left" ? "Right" : "Left";
            setHandedness(actualHandedness);
            setHandednessScore(category.score); // Confidence score (0-1)
            console.log(`🤚 Handedness: ${actualHandedness} (${(category.score * 100).toFixed(1)}%) - MediaPipe detected: ${category.categoryName}`);
          }
        }

        // Extract depth (z coordinates) from landmarks
        if (results.landmarks && results.landmarks.length > 0) {
          const firstHandLandmarks = results.landmarks[0];
          if (firstHandLandmarks && firstHandLandmarks.length > 0) {
            // Calculate average z coordinate for depth estimation
            let sumZ = 0;
            let validZCount = 0;
            firstHandLandmarks.forEach(landmark => {
              if (landmark && typeof landmark.z === 'number') {
                sumZ += landmark.z;
                validZCount++;
              }
            });
            if (validZCount > 0) {
              const avgZ = sumZ / validZCount;
              setHandDepth(avgZ);
            }
          }
        }

        // Extract world landmarks (3D coordinates in meters)
        if (results.worldLandmarks && results.worldLandmarks.length > 0) {
          const worldLm = results.worldLandmarks[0];
          setWorldLandmarks(worldLm);
          // Analyze 3D hand pose
          const analysis = analyze3DHandPose(worldLm);
          setHandPoseAnalysis(analysis);
        }

        // Use MediaPipe drawing utilities (matching MediaPipe example exactly)
        if (drawingUtilsRef.current) {
          const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = drawingUtilsRef.current;
          
          // Verify all utilities are available
          if (!drawConnectors || !drawLandmarks || !HAND_CONNECTIONS) {
            console.error('❌ Drawing utilities incomplete:', {
              drawConnectors: !!drawConnectors,
              drawLandmarks: !!drawLandmarks,
              HAND_CONNECTIONS: !!HAND_CONNECTIONS
            });
          } else {
            // Draw for each hand (matching MediaPipe example exactly)
            for (const landmarks of results.landmarks) {
              if (landmarks && landmarks.length > 0) {
                try {
                  drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                    color: "#00FF00",
                    lineWidth: 5
                  });
                  drawLandmarks(ctx, landmarks, { color: "#FF0000", lineWidth: 2 });
                } catch (drawError) {
                  console.error('❌ Error drawing landmarks:', drawError);
                }
              }
            }
          }
        } else {
          console.warn('⚠️ Drawing utilities not loaded yet - trying to load...');
          // Try to load drawing utilities if not loaded
          try {
            const drawingUtils = await import('@mediapipe/drawing_utils');
            drawingUtilsRef.current = drawingUtils;
            console.log('✅ Drawing utilities loaded on demand');
          } catch (loadError) {
            console.error('❌ Failed to load drawing utilities:', loadError);
          }
        }
      } else {
        setHandDetected(false);
        // Reset 3D prediction data when hand is lost
        setHandedness(null);
        setHandednessScore(null);
        setHandDepth(null);
        setWorldLandmarks(null);
        setHandPoseAnalysis(null);
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
    
    // Scroll commands (no keys needed) - Gentle scrolling
    if (command.includes('scroll down') || command.includes('scroll down page') || command.includes('page down')) {
      window.scrollBy({ top: 200, behavior: 'smooth' });
      console.log('📜 Scrolling down gently');
      return;
    }
    if (command.includes('scroll up') || command.includes('scroll up page') || command.includes('page up')) {
      window.scrollBy({ top: -200, behavior: 'smooth' });
      console.log('📜 Scrolling up gently');
      return;
    }
    if (command.includes('scroll to top') || command.includes('go to top') || command.includes('top of page')) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      console.log('📜 Scrolling to top');
      return;
    }
    if (command.includes('scroll to bottom') || command.includes('go to bottom') || command.includes('bottom of page')) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      console.log('📜 Scrolling to bottom');
      return;
    }
    
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
      if (classificationIntervalRef.current) {
        clearInterval(classificationIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <nav className="navbar">
        <div className="navbar-brand" style={{ cursor: 'default' }}>
          🤟 ASL Learning
        </div>
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
              <h5>📜 Scroll</h5>
              <div className="command-item">
                <span className="command-phrase">"scroll down"</span>
                <span className="command-action">Scroll down</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"scroll up"</span>
                <span className="command-action">Scroll up</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"scroll to top"</span>
                <span className="command-action">Jump to top</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"scroll to bottom"</span>
                <span className="command-action">Jump to bottom</span>
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
          
          <div className="status-indicators">
            <div className={`status-indicator ${isListening ? 'active' : 'inactive'}`}>
              <span className="status-icon">{isListening ? '🎤' : '🔇'}</span>
              <span className="status-text">{isListening ? 'Voice Active' : 'Voice Inactive'}</span>
            </div>
            <div className={`status-indicator ${handTrackingActive ? 'active' : 'inactive'} ${!mediapipeReady ? 'disabled' : ''}`}>
              <span className="status-icon">{handTrackingActive ? '📷' : '📷'}</span>
              <span className="status-text">{handTrackingActive ? 'Camera Active' : 'Camera Inactive'}</span>
            </div>
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
                {/* Hand landmarks are now drawn directly on the webcam canvas */}
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
                    
                    {/* 3D Prediction Info Panel */}
                    {handedness && (
                      <div className="info-message-small" style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0, 102, 255, 0.1)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold' }}>🤚 Hand:</span>
                            <span style={{ color: handedness === 'Left' ? '#0066FF' : '#00FF00' }}>
                              {handedness} ({(handednessScore * 100).toFixed(1)}%)
                            </span>
                          </div>
                          {handDepth !== null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 'bold' }}>📏 Depth (Z):</span>
                              <span>{handDepth.toFixed(4)}</span>
                              <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                {handDepth < -0.1 ? '(Close)' : handDepth > 0.1 ? '(Far)' : '(Medium)'}
                              </span>
                            </div>
                          )}
                          {worldLandmarks && worldLandmarks.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#666' }}>
                              <span style={{ fontWeight: 'bold' }}>🌐 3D World:</span>
                              <span>{worldLandmarks.length} landmarks detected</span>
                            </div>
                          )}
                          {handPoseAnalysis && (
                            <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '6px', fontSize: '0.75rem' }}>
                              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>📐 3D Pose Analysis:</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                <div>Hand Span: {(handPoseAnalysis.handSpan * 100).toFixed(2)} cm</div>
                                <div>Avg Extension: {(handPoseAnalysis.avgFingerExtension * 100).toFixed(2)} cm</div>
                              </div>
                            </div>
                          )}
                        </div>
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
            <p><strong>📜 Scroll Commands:</strong></p>
            <ul>
              <li><strong>"scroll down"</strong> or <strong>"page down"</strong>: Scroll down</li>
              <li><strong>"scroll up"</strong> or <strong>"page up"</strong>: Scroll up</li>
              <li><strong>"scroll to top"</strong> or <strong>"go to top"</strong>: Jump to top</li>
              <li><strong>"scroll to bottom"</strong> or <strong>"go to bottom"</strong>: Jump to bottom</li>
            </ul>
            <p><strong>💡 Tips:</strong></p>
            <ul>
              <li>Allow microphone and webcam permissions</li>
              <li>Use Chrome or Edge for best results</li>
              <li>Start camera to see hand detection</li>
              <li>No mouse or keyboard needed - everything is voice controlled!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearningMode;
