# ASL Learning App

A web app for learning American Sign Language (ASL) with real-time hand tracking and voice control. Practice letters and spell words while the app recognizes your hand shapes via the camera.

## Features

- **Hand tracking** — Camera-based hand detection with a 3D-style skeleton overlay (green lines and red joints) that follows your hand in real time
- **Letter practice** — See the target letter and its ASL image; sign in front of the camera to get match feedback
- **Word spelling** — Say “spell hello” or “learn cat” to practice spelling a word letter by letter with hand recognition
- **Voice commands** — Control the app by voice: letters, scroll, camera on/off, and spelling mode
- **Responsive layout** — Works on desktop and mobile; camera and target letter are arranged for clear practice

## How to run

### Prerequisites

- Node.js 14+
- A browser with camera and microphone (Chrome or Edge recommended)

### Setup

```bash
git clone <repository-url>
cd asl_learning_app
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) and allow camera and microphone when prompted.

### Build for production

```bash
npm run build
```

Output is in the `build` folder.

### Deployment (Netlify, Vercel, GitHub Pages, etc.)

- **Dataset images** — The app loads ASL images from `public/asl_dataset/`. Ensure this folder is committed and deployed so the build includes it. After `npm run build`, check that `build/asl_dataset/` exists.
- **Root URL** — If the app is served at the site root (e.g. `https://yoursite.com/`), no change is needed. Image paths use `process.env.PUBLIC_URL`, which is empty at root.
- **Subpath** — If the app is served from a subpath (e.g. `https://user.github.io/asl-app/`), set `"homepage": "https://user.github.io/asl-app"` in `package.json` before building so asset and dataset paths resolve correctly.

## Voice commands

| Say | Action |
|-----|--------|
| **"start camera"** / **"camera"** | Turn on webcam and hand tracking |
| **"stop camera"** | Turn off webcam |
| **"A"**, **"B"**, … **"Z"** | Jump to that letter and show its ASL sign |
| **"spell hello"** / **"learn cat"** | Practice spelling that word letter by letter |
| **"scroll down"** / **"scroll up"** | Scroll the page |
| **"scroll to top"** / **"scroll to bottom"** | Jump to top or bottom |
| **"hide commands"** / **"show commands"** | Hide or show the voice commands panel |

## How it works

- **MediaPipe Hand Landmarker** — Detects hands and 21 landmarks per hand; the overlay uses depth (z) so closer parts look thicker and brighter.
- **Image embedder** — Compares your hand pose to reference ASL images to give “match” feedback when your sign is close enough.
- **Web Speech API** — Listens for voice commands so you can keep your hands free for signing.

## Project structure

```
asl_learning_app/
├── public/
│   ├── index.html
│   └── asl_dataset/     # ASL letter images
├── src/
│   ├── App.js           # Main component (hand tracking, voice, spelling)
│   ├── App.css          # Styles
│   └── index.js         # Entry point
├── package.json
└── README.md
```

## Tech stack

- React 18
- MediaPipe Tasks Vision (Hand Landmarker + Image Embedder)
- Web Speech API
- No backend required; runs fully in the browser

## Browser support

- **Chrome / Edge** — Full support (recommended)
- **Firefox / Safari** — Voice recognition may be limited; hand tracking should work

## License

MIT.
