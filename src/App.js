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
  const [handedness, setHandedness] = useState(null);
  const [handednessScore, setHandednessScore] = useState(null);
  const [handDepth, setHandDepth] = useState(null);
  const [worldLandmarks, setWorldLandmarks] = useState(null);
  const [handPoseAnalysis, setHandPoseAnalysis] = useState(null);
  const [practiceWord, setPracticeWord] = useState(null); // word to spell, e.g. "hello"
  const [wordLetterIndex, setWordLetterIndex] = useState(0); // which letter in the word
  const [wordComplete, setWordComplete] = useState(false); // show "word complete" briefly
  const [imageErrorLetter, setImageErrorLetter] = useState(null); // letter whose dataset image failed to load

  useEffect(() => {
    setImageErrorLetter(null);
  }, [currentLetter]);

  // Hand skeleton connections (MediaPipe 21-landmark model) - for reliable overlay drawing
  const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],           // thumb
    [0, 5], [5, 6], [6, 7], [7, 8],           // index
    [0, 9], [9, 10], [10, 11], [11, 12],      // middle
    [0, 13], [13, 14], [14, 15], [15, 16],    // ring
    [0, 17], [17, 18], [18, 19], [19, 20],    // pinky
    [5, 9], [9, 13], [13, 17], [17, 0]       // palm
  ];

  const drawHandOverlay = (ctx, landmarksList, width, height, videoWidth, videoHeight) => {
    if (!ctx || !landmarksList || landmarksList.length === 0) return;
    const isNormalized = (l) => (l?.x ?? 0) <= 1.01 && (l?.y ?? 0) <= 1.01;
    for (const landmarks of landmarksList) {
      if (!landmarks || landmarks.length < 21) continue;
      const sample = landmarks[0];
      const norm = sample && isNormalized(sample);
      const toX = (l) => {
        const x = l?.x ?? 0;
        return norm ? x * width : (videoWidth ? (x / videoWidth) * width : x);
      };
      const toY = (l) => {
        const y = l?.y ?? 0;
        return norm ? y * height : (videoHeight ? (y / videoHeight) * height : y);
      };
      // Use z for 3D-style depth (smaller z = closer to camera in MediaPipe)
      const zValues = landmarks.map((l) => typeof l?.z === 'number' ? l.z : 0);
      const minZ = Math.min(...zValues);
      const maxZ = Math.max(...zValues);
      const zRange = maxZ - minZ || 1;
      const depth = (l) => Math.max(0, Math.min(1, 1 - ((l?.z ?? 0) - minZ) / zRange)); // 1 = close, 0 = far
      // Connectors with depth-based thickness and opacity
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const [i, j] of HAND_CONNECTIONS) {
        const a = landmarks[i];
        const b = landmarks[j];
        if (!a || !b) continue;
        const d = (depth(a) + depth(b)) / 2;
        const lineW = 1.5 + d * 4;
        const alpha = 0.5 + d * 0.5;
        ctx.strokeStyle = `rgba(0, 220, 120, ${alpha})`;
        ctx.lineWidth = lineW;
        ctx.beginPath();
        ctx.moveTo(toX(a), toY(a));
        ctx.lineTo(toX(b), toY(b));
        ctx.stroke();
        // Soft shadow line (offset by depth) for 3D feel
        ctx.strokeStyle = `rgba(0, 180, 80, ${alpha * 0.25})`;
        ctx.lineWidth = lineW + 2;
        const dx = (depth(a) - 0.5) * 6;
        const dy = (depth(b) - 0.5) * 6;
        ctx.beginPath();
        ctx.moveTo(toX(a) + dx, toY(a) + dy);
        ctx.lineTo(toX(b) + dx, toY(b) + dy);
        ctx.stroke();
      }
      // Landmark dots: size and opacity by depth
      for (let i = 0; i < landmarks.length; i++) {
        const l = landmarks[i];
        if (!l) continue;
        const d = depth(l);
        const r = 2 + d * 5;
        const alpha = 0.6 + d * 0.4;
        ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.beginPath();
        ctx.arc(toX(l), toY(l), r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 200, 200, ${alpha * 0.8})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  };

  const recognitionRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cornerCanvasRef = useRef(null); // Corner preview canvas for hand landmarks
  const handLandmarkerRef = useRef(null);
  const lastLandmarksRef = useRef(null); // So we can redraw every frame
  const imageEmbedderRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const runningModeRef = useRef("IMAGE");
  const classificationIntervalRef = useRef(null);
  const webcamRunningRef = useRef(false);
  const hasMovedToNextRef = useRef(false);
  const drawingUtilsRef = useRef(null); // Cache drawing utilities
  const voiceUserStoppedRef = useRef(false); // true when user clicked Stop voice

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
          
          if (practiceWord) {
            // Word mode: advance to next letter in the word
            const nextIndex = wordLetterIndex + 1;
            if (nextIndex < practiceWord.length) {
              setTimeout(() => {
                setWordLetterIndex(nextIndex);
                setCurrentLetter(practiceWord[nextIndex]);
                setSimilarityScore(null);
                hasMovedToNextRef.current = false;
              }, 1200);
            } else {
              setWordComplete(true);
              setTimeout(() => {
                setPracticeWord(null);
                setWordLetterIndex(0);
                setWordComplete(false);
                setSimilarityScore(null);
                hasMovedToNextRef.current = false;
              }, 2500);
            }
          } else {
            // Alphabet mode: next letter
            const currentIndex = letters.indexOf(currentLetter);
            if (currentIndex !== -1 && currentIndex < letters.length - 1) {
              setTimeout(() => {
                setCurrentLetter(letters[currentIndex + 1]);
                setSimilarityScore(null);
                hasMovedToNextRef.current = false;
              }, 1500);
            } else {
              hasMovedToNextRef.current = false;
            }
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
        setIsListening(false);
        if (voiceUserStoppedRef.current) return;
        setTimeout(() => {
          try {
            if (recognitionRef.current) recognitionRef.current.start();
          } catch (e) {}
        }, 500);
      };

      const startRecognition = () => {
        voiceUserStoppedRef.current = false;
        setTimeout(() => {
          try {
            if (recognitionRef.current) {
              recognitionRef.current.start();
            }
          } catch (e) {
            setTimeout(() => {
              try {
                if (recognitionRef.current) recognitionRef.current.start();
              } catch (e2) {}
            }, 2000);
          }
        }, 500);
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
      
      // Mirror video so it feels natural; sizing is handled by .webcam-container + CSS
      video.style.cssText = `
        visibility: visible !important;
        opacity: 1 !important;
        transform: scaleX(-1);
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

  const startListening = () => {
    voiceUserStoppedRef.current = false;
    try {
      if (recognitionRef.current) recognitionRef.current.start();
    } catch (e) {}
  };

  const stopListening = () => {
    voiceUserStoppedRef.current = true;
    try {
      if (recognitionRef.current) recognitionRef.current.stop();
    } catch (e) {}
    setIsListening(false);
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

    // Only resize canvas when video dimensions change (resizing clears the canvas).
    const needResize = canvas.width !== video.videoWidth || canvas.height !== video.videoHeight;
    if (needResize) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    // Keep canvas display size in sync with video so overlay tracks hand motion 1:1.
    const displayW = video.clientWidth;
    const displayH = video.clientHeight;
    if (displayW && displayH && (canvas.style.width !== `${displayW}px` || canvas.style.height !== `${displayH}px`)) {
      canvas.style.width = `${displayW}px`;
      canvas.style.height = `${displayH}px`;
    }

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

        // Draw hand skeleton overlay (manual drawing so it always follows hand motion)
        lastLandmarksRef.current = results.landmarks;
        drawHandOverlay(ctx, results.landmarks, canvas.width, canvas.height, video.videoWidth, video.videoHeight);
      } else {
        setHandDetected(false);
        lastLandmarksRef.current = null;
        // Reset 3D prediction data when hand is lost
        setHandedness(null);
        setHandednessScore(null);
        setHandDepth(null);
        setWorldLandmarks(null);
        setHandPoseAnalysis(null);
      }

      ctx.restore();
    } else {
      // No new video frame: redraw last landmarks so overlay never disappears
      const last = lastLandmarksRef.current;
      if (last && last.length > 0) {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawHandOverlay(ctx, last, canvas.width, canvas.height, video.videoWidth, video.videoHeight);
        ctx.restore();
      }
    }

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
    
    // Spell / learn word: "spell hello" or "learn hello" -> practice spelling that word
    const spellMatch = command.match(/(?:spell|learn)\s+(.+)/);
    if (spellMatch) {
      const raw = spellMatch[1].trim().toLowerCase().replace(/\s+/g, '');
      const word = raw.split('').filter(c => /[a-z]/.test(c)).join('');
      if (word.length > 0) {
        setPracticeWord(word);
        setWordLetterIndex(0);
        setCurrentLetter(word[0]);
        setWordComplete(false);
        setSimilarityScore(null);
        hasMovedToNextRef.current = false;
        return;
      }
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

  // Use PUBLIC_URL so images work when hosted at root or subpath (e.g. GitHub Pages)
  const getImageUrl = (letter) => {
    const base = process.env.PUBLIC_URL || '';
    return `${base}/asl_dataset/${letter}/hand1_${letter}_bot_seg_1_cropped.jpeg`;
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
          ASL Learning
        </div>
        <div className="navbar-controls">
          <div className="voice-status">
            <span className="voice-icon" aria-hidden>{isListening ? 'On' : 'Off'}</span>
            <span>{isListening ? 'Voice Active' : 'Voice Inactive'}</span>
          </div>
          {handTrackingActive && (
            <div className="hand-status">
              <span className="hand-icon" aria-hidden>Hand</span>
              <span>{handDetected ? 'Detected' : 'No hand'}</span>
            </div>
          )}
        </div>
      </nav>

      {commandsVisible && (
        <div className="voice-commands-panel">
          <div className="commands-header">
            <h4>Voice commands</h4>
            <button onClick={() => setCommandsVisible(false)}>✕</button>
          </div>
          <div className="commands-content">
            <div className="command-section">
              <h5>Controls</h5>
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
              <h5>Scroll</h5>
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
              <h5>Letters & words</h5>
              <div className="command-item">
                <span className="command-phrase">"A", "B", "C"...</span>
                <span className="command-action">Show ASL letter</span>
              </div>
              <div className="command-item">
                <span className="command-phrase">"spell hello" / "learn cat"</span>
                <span className="command-action">Practice spelling that word</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        <div className="learning-mode">
          <h1>ASL Learning</h1>
          <p className="subtitle">Learn American Sign Language!</p>
          
          <div className="control-buttons">
            <button
              type="button"
              className={`control-btn ${isListening ? 'active' : ''}`}
              onClick={isListening ? stopListening : startListening}
              disabled={!(window.SpeechRecognition || window.webkitSpeechRecognition)}
              title={isListening ? 'Stop voice' : 'Start voice'}
            >
              <span className="control-btn-label">{isListening ? 'Stop voice' : 'Start voice'}</span>
            </button>
            <button
              type="button"
              className={`control-btn ${handTrackingActive ? 'active' : ''}`}
              onClick={handTrackingActive ? stopWebcam : startWebcam}
              disabled={!mediapipeReady}
              title={handTrackingActive ? 'Stop camera' : 'Start camera'}
            >
              <span className="control-btn-label">{handTrackingActive ? 'Stop camera' : 'Start camera'}</span>
            </button>
          </div>

          {handTrackingActive ? (
            <div className="split-view">
              <div className="webcam-preview">
                <h3>Hand tracking</h3>
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
                    aria-hidden
                  />
                </div>
                {/* Hand landmarks are now drawn directly on the webcam canvas */}
                {handDetected ? (
                  <div className="classification-feedback">
                    {isClassifying ? (
                      <div className="info-message-small">
                        Analyzing your gesture…
                      </div>
                    ) : similarityScore !== null ? (
                      <div className={`similarity-score ${similarityScore > 0.27 ? 'high' : similarityScore > 0.2 ? 'medium' : 'low'}`}>
                        <div className="similarity-label">
                          {similarityScore > 0.27 ? 'Match — approved' : similarityScore > 0.2 ? 'Getting close' : 'Try again'}
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
                        Hand detected. Hold your gesture steady.
                      </div>
                    )}
                    
                    {/* 3D Prediction Info Panel */}
                    {handedness && (
                      <div className="info-message-small" style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f3f4f6', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold' }}>Hand:</span>
                            <span style={{ color: handedness === 'Left' ? '#0066FF' : '#00FF00' }}>
                              {handedness} ({(handednessScore * 100).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="info-message-small">
                    Show your hand in view of the camera
                  </div>
                )}
              </div>
              <div className="current-letter">
                {practiceWord ? (
                  <>
                    <p className="practice-word-label">Spelling: <strong>{practiceWord}</strong></p>
                    <p className="practice-word-progress">Letter {wordLetterIndex + 1} of {practiceWord.length}</p>
                    <h2>{currentLetter.toUpperCase()}</h2>
                  </>
                ) : wordComplete ? (
                  <p className="word-complete-message">Word complete.</p>
                ) : (
                  <h2>{currentLetter.toUpperCase()}</h2>
                )}
                {!wordComplete && letters.includes(currentLetter) && (
                  imageErrorLetter === currentLetter ? (
                    <div className="asl-image-fallback" aria-label={`ASL sign for ${currentLetter}`}>
                      <span>{currentLetter.toUpperCase()}</span>
                      <small>Image unavailable</small>
                    </div>
                  ) : (
                    <img 
                      src={getImageUrl(currentLetter)} 
                      alt={`ASL sign for ${currentLetter}`}
                      className="asl-image"
                      onError={() => setImageErrorLetter(currentLetter)}
                    />
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="current-letter">
              <h2>{currentLetter.toUpperCase()}</h2>
              {imageErrorLetter === currentLetter ? (
                <div className="asl-image-fallback" aria-label={`ASL sign for ${currentLetter}`}>
                  <span>{currentLetter.toUpperCase()}</span>
                  <small>Image unavailable</small>
                </div>
              ) : (
                <img 
                  src={getImageUrl(currentLetter)} 
                  alt={`ASL sign for ${currentLetter}`}
                  className="asl-image"
                  onError={() => setImageErrorLetter(currentLetter)}
                />
              )}
            </div>
          )}

          {!mediapipeReady && (
            <div className="info-message">
              <p>Loading hand tracking…</p>
            </div>
          )}

          <div className="instructions">
            <h3>Voice commands</h3>
            <p>Say any letter to see its ASL sign. Say &quot;spell [word]&quot; or &quot;learn [word]&quot; to practice spelling.</p>
            <p><strong>Scroll</strong></p>
            <ul>
              <li><strong>"scroll down"</strong> or <strong>"page down"</strong>: Scroll down</li>
              <li><strong>"scroll up"</strong> or <strong>"page up"</strong>: Scroll up</li>
              <li><strong>"scroll to top"</strong> or <strong>"go to top"</strong>: Jump to top</li>
              <li><strong>"scroll to bottom"</strong> or <strong>"go to bottom"</strong>: Jump to bottom</li>
            </ul>
            <p><strong>Tips</strong></p>
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
