# 🧾 Product Requirements Document (PRD)
## Project Name: ASL Hand Recognition Voice App (v2)

### 👀 Overview
This project is a browser-based application that allows users to interact with American Sign Language (ASL) through voice commands and real-time hand tracking.  
The app uses the webcam to detect and track the user’s hand movements, showing live visual feedback and recognizing gestures that correspond to ASL letters or words.

The goal is to make communication more inclusive for both hearing and non-hearing users — creating a fun, educational, and assistive experience.

---

## 🎯 Goals

| Goal | Description |
|------|--------------|
| **Voice to ASL Display** | Accept voice commands and show the ASL representation. |
| **Hand Movement Detection** | Use webcam and AI (MediaPipe) to detect hand positions in real time. |
| **Gesture Recognition (Basic)** | Recognize specific gestures such as “A”, “B”, “C”, “OK”, “Thumbs Up”. |
| **Visual Feedback** | Draw landmarks and hand outlines on the video feed to help users practice. |
| **Learning Mode** | Let users compare their ASL gesture with the model gesture (side-by-side). |
| **Accessibility** | Work entirely with voice — no keyboard input required. |

---

## 🧱 Core Features

### 1. 🎤 Voice Recognition (Existing)
- Uses the **Web Speech API** to capture user speech.
- Converts spoken input into text.
- Displays the corresponding ASL sign or animation.

### 2. 🎥 Real-Time Hand Tracking (Improved)
- Uses **MediaPipe Hands** to detect 21 hand landmarks.
- Draws the hand’s skeleton in real time using a `<canvas>`.
- Detects whether a hand is open, closed, or making specific gestures.

### 3. 🤖 Gesture Recognition (New)
- Implement a **gesture classifier** to identify signs based on landmark data.
- Start simple with 2–3 gestures (like “A”, “B”, “OK”).
- Expand using TensorFlow.js for machine learning-based gesture detection.

### 4. 🧑‍🏫 Learning Mode (Planned)
- Split-screen mode: left side shows “target ASL gesture” (e.g., from a dataset), right side shows user’s live hand.
- Feedback text: “Good job!” / “Try again.”

---

## ⚙️ Technical Requirements

| Component | Technology |
|------------|-------------|
| **Frontend** | HTML, CSS, JavaScript (or React if scaling up) |
| **Hand Tracking** | MediaPipe Tasks Vision (Web) |
| **Gesture Recognition** | Custom JS rules or TensorFlow.js |
| **Voice Recognition** | Web Speech API |
| **Hosting** | Netlify / Vercel / Local (Vite dev server) |
| **Browser Support** | Chrome / Edge (Web Speech API + Webcam) |

---

## 🧩 Architecture Diagram (Concept)

```
🎤 Voice Input  →  Web Speech API  →  Display ASL Image
                        |
                        ↓
🎥 Webcam Input  →  MediaPipe HandLandmarker  →  Landmark Data  → Gesture Logic  →  Feedback / Animation
```

---

## 🧠 Functional Flow

1. **User opens the app**
   - Webcam permission requested.
   - Voice recognition initialized.
   
2. **User speaks a phrase**
   - The app converts voice → text → ASL image/video.

3. **User performs ASL gesture**
   - The webcam captures hand movement.
   - The app overlays red dots (landmarks) showing hand tracking.
   - If the gesture matches known patterns, it displays recognized word (e.g., “A”, “OK”).

4. **Feedback shown**
   - Text and optional audio confirmation: “You signed A!”

---

## 🧰 Detect Hand Movement Feature (New)

Add this detection logic to improve movement sensitivity.

```js
function detectMovement(prevLandmarks, currLandmarks) {
  if (!prevLandmarks || !currLandmarks) return false;

  let totalMovement = 0;
  for (let i = 0; i < currLandmarks.length; i++) {
    const dx = currLandmarks[i].x - prevLandmarks[i].x;
    const dy = currLandmarks[i].y - prevLandmarks[i].y;
    totalMovement += Math.sqrt(dx * dx + dy * dy);
  }

  // Threshold: if total movement > certain value, detect movement
  return totalMovement > 0.05;
}

// Example integration in your detectHands() loop
let prevLandmarks = null;

async function detectHands() {
  const results = await handLandmarker.detectForVideo(video, performance.now());
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  if (results.landmarks.length > 0) {
    const currLandmarks = results.landmarks[0];
    if (detectMovement(prevLandmarks, currLandmarks)) {
      console.log("🖐️ Movement detected!");
    }
    prevLandmarks = currLandmarks;
  }

  requestAnimationFrame(detectHands);
}
```
