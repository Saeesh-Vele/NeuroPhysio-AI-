# 🧠 NeuroPhysio AI — Intelligent Rehabilitation Platform

> **AI-powered physiotherapy rehabilitation platform** with real-time pose detection using Google's MoveNet model, personalized exercise plans, pain tracking, cognitive training, and clinical PDF reporting.

---

## 📑 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [AI Models Used](#ai-models-used)
- [Project Structure](#project-structure)
- [Backend — File-by-File Breakdown](#backend--file-by-file-breakdown)
- [Frontend — File-by-File Breakdown](#frontend--file-by-file-breakdown)
- [Routing & Navigation](#routing--navigation)
- [Authentication & Guards](#authentication--guards)
- [Real-Time Pose Detection Pipeline](#real-time-pose-detection-pipeline)
- [Exercise Library](#exercise-library)
- [State Management](#state-management)
- [Database Schema (Firestore)](#database-schema-firestore)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Setup & Installation](#setup--installation)
- [Running the Project](#running-the-project)
- [Screenshots](#screenshots)

---

## Overview

NeuroPhysio AI is a full-stack rehabilitation platform that combines:

- **Computer Vision** — Real-time pose detection via webcam using Google's MoveNet Lightning model
- **Biomechanics Engine** — Joint angle computation, rep counting, and form correction feedback
- **AI Coaching** — Gemini Flash 2.5 for clinical insights + Groq for real-time session feedback
- **Clinical Reporting** — Automated 5-page PDF reports (jsPDF) with exercise data, pain trends, and AI analysis
- **Patient Onboarding** — 5-step wizard with optional medical report processing via Gemini Vision

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                  │
│                        http://localhost:5173                     │
│                                                                 │
│  ┌───────────┐  ┌──────────┐  ┌────────────┐  ┌─────────────┐ │
│  │  Landing   │  │   Auth   │  │ Onboarding │  │  Dashboard  │ │
│  │   Page     │→ │  Page    │→ │  (5-step)  │→ │   Layout    │ │
│  └───────────┘  └──────────┘  └────────────┘  └──────┬──────┘ │
│                                                       │        │
│  ┌─────────┬──────────┬────────┬──────────┬──────────┬───────┐ │
│  │Dashboard│ Exercise │  Pain  │Cognitive │Progress  │Doctor │ │
│  │  Home   │ Session  │Tracker │ Trainer  │  Page    │Report │ │
│  └────┬────┴────┬─────┴───┬────┴────┬─────┴────┬─────┴───┬───┘ │
│       │         │         │         │          │         │      │
│       ▼         ▼         ▼         ▼          ▼         ▼      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Firebase Firestore + Auth                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│       │                                                        │
│       │  WebSocket (ws://localhost:8000/ws/pose)                │
│       │  REST API  (http://localhost:8000/*)                    │
│       ▼                                                        │
└───────┼────────────────────────────────────────────────────────┘
        │
┌───────┴────────────────────────────────────────────────────────┐
│                   BACKEND (Python FastAPI)                      │
│                   http://localhost:8000                          │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │ MoveNet  │  │  Angle       │  │  Exercise Library      │   │
│  │ Lightning│  │  Engine      │  │  (52 exercises)        │   │
│  │ (TF 2.21)│  │  (geometry)  │  │  5 categories          │   │
│  └────┬─────┘  └──────┬───────┘  └────────────┬───────────┘   │
│       │               │                        │               │
│  ┌────▼──────┐  ┌─────▼──────┐  ┌──────────────▼────────────┐ │
│  │ Rep       │  │ Feedback   │  │  Recommendation            │ │
│  │ Counter   │  │ Engine     │  │  Engine                    │ │
│  │ (state    │  │ (form      │  │  (injury-aware             │ │
│  │  machine) │  │  coaching)  │  │   personalization)        │ │
│  └───────────┘  └────────────┘  └────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.2.0 | UI component framework |
| TypeScript | 5.9.3 | Type-safe JavaScript |
| Vite | 8.0.1 | Build tool & dev server |
| React Router | 7.14.0 | Client-side routing |
| Zustand | 5.0.12 | Global state management |
| Firebase | 12.11.0 | Auth + Firestore database |
| jsPDF | 4.2.1 | Client-side PDF generation |
| Framer Motion | 12.38.0 | Animations |

### Backend
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.13 | Runtime |
| FastAPI | 0.115.0 | Async REST + WebSocket API |
| TensorFlow | 2.21.0 | ML inference runtime |
| MoveNet Lightning v4 | - | Pose detection (17 keypoints) |
| OpenCV | 4.10.0 | Image processing & skeleton rendering |
| NumPy | 1.26.4 | Numerical computation |
| Uvicorn | 0.30.0 | ASGI server |

### Cloud Services
| Service | Purpose |
|---------|---------|
| Firebase Auth | User authentication (email/password + Google) |
| Cloud Firestore | NoSQL database for all user data |
| Gemini Flash 2.5 | Medical report extraction, weekly summaries, risk alerts |
| Groq (LLaMA) | Real-time session coaching & post-session insights |

---

## AI Models Used

### 1. MoveNet Lightning v4 (Google)
- **Type**: Single-person pose estimation
- **Source**: TensorFlow Hub (`tfhub.dev/google/movenet/singlepose/lightning/4`)
- **Input**: 192×192 RGB image
- **Output**: 17 keypoints with `(y, x, confidence)` each
- **Keypoints**: nose, left/right eye, left/right ear, left/right shoulder, left/right elbow, left/right wrist, left/right hip, left/right knee, left/right ankle
- **Inference**: Runs in a Python thread pool via `asyncio.run_in_executor()` to avoid blocking the async event loop
- **Loading**: Downloaded once from TF Hub, cached at `~/.keras/models/movenet_lightning_v4`

### 2. Gemini Flash 2.5 (Google)
- **API**: `generativelanguage.googleapis.com`
- **Used for**:
  - Medical report image analysis (OCR + medical entity extraction)
  - Weekly rehabilitation summary generation
  - Risk alert detection from pain trends
  - AI-driven insights in clinical PDF reports

### 3. Groq (LLaMA 3)
- **API**: `api.groq.com`
- **Used for**:
  - Real-time exercise session coaching feedback
  - Post-session AI insight generation
  - Fast inference for low-latency use cases

---

## Project Structure

```
WIN_YA_LUN/
├── backend/                          # Python FastAPI backend
│   ├── main.py                       # FastAPI app, WebSocket, MoveNet inference
│   ├── angle_engine.py               # Joint angle calculation (pure geometry)
│   ├── exercise_library.py           # 52 exercises with full configs
│   ├── rep_engine.py                 # State-machine rep counter
│   ├── feedback_engine.py            # Form correction feedback generator
│   ├── recommendation_engine.py      # Personalized exercise recommendations
│   ├── requirements.txt              # Python dependencies
│   └── venv/                         # Python virtual environment
│
├── src/                              # React frontend source
│   ├── main.tsx                      # React entry point
│   ├── App.tsx                       # Root component with routing & auth guards
│   ├── index.css                     # Global design system (CSS variables)
│   │
│   ├── firebase/
│   │   └── config.ts                 # Firebase initialization (Auth + Firestore)
│   │
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces (30+ types)
│   │
│   ├── store/
│   │   └── useAppStore.ts            # Zustand global state
│   │
│   ├── services/
│   │   ├── firestoreService.ts       # Firestore CRUD operations
│   │   └── aiService.ts              # Gemini + Groq API integrations
│   │
│   ├── components/
│   │   └── Sidebar/
│   │       ├── Sidebar.tsx           # Navigation sidebar with user info
│   │       └── Sidebar.css
│   │
│   ├── pages/
│   │   ├── LandingPage/              # Public landing page
│   │   │   ├── LandingPage.tsx
│   │   │   └── LandingPage.css
│   │   │
│   │   ├── AuthPage/                 # Login / Register
│   │   │   ├── AuthPage.tsx
│   │   │   └── AuthPage.css
│   │   │
│   │   ├── OnboardingPage/           # 5-step onboarding wizard
│   │   │   ├── OnboardingPage.tsx
│   │   │   └── OnboardingPage.css
│   │   │
│   │   └── DashboardPage/            # Main dashboard layout
│   │       ├── DashboardLayout.tsx    # Layout with sidebar + Outlet
│   │       ├── DashboardPage.css
│   │       └── tabs/
│   │           ├── DashboardHome.tsx      # Overview with stats & AI insight
│   │           ├── ExerciseSession.tsx    # Live webcam exercise session
│   │           ├── PainTracker.tsx        # Interactive body pain map
│   │           ├── CognitiveTrainer.tsx   # Memory games with scoring
│   │           ├── Progress.tsx           # Charts & trend analysis
│   │           ├── DoctorReport.tsx       # 5-page PDF generation
│   │           └── Settings.tsx           # Profile & account management
│   │
│   └── hooks/
│       └── useToast.ts               # Toast notification hook
│
├── .env.local                        # Environment variables (API keys)
├── index.html                        # HTML entry point
├── package.json                      # NPM dependencies & scripts
├── vite.config.ts                    # Vite configuration
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # This file
```

---

## Backend — File-by-File Breakdown

### `main.py` — FastAPI Application (~585 lines)
The core server that handles everything:
- **MoveNet Model Loading**: Downloads MoveNet Lightning v4 from TF Hub (cached at `~/.keras/models/`). Uses `tf.saved_model.load()` directly (bypasses `tensorflow_hub` for Python 3.13 compatibility).
- **Pose Detection**: `detect_pose(frame)` — converts BGR→RGB, resizes to 192×192 with padding, runs inference via `model.signatures["serving_default"]`, returns 17 keypoints with pixel coordinates.
- **Skeleton Drawing**: `draw_skeleton(frame, keypoints)` — draws colored joint dots, white bone connections with glow effect, coordinate labels at each joint, angle arc indicators at elbows/knees/shoulders, and a status bar showing detected joint count.
- **WebSocket Handler**: Uses a **producer/consumer pattern** with `asyncio.gather()`:
  - `receiver()` — receives frames from the client, keeps only the latest (drops stale frames)
  - `processor()` — runs TF inference in a **thread pool** via `run_in_executor()` so it doesn't block the async event loop
- **REST Endpoints**: `/health`, `/exercises`, `/exercises/{id}`, `/recommend`

### `angle_engine.py` — Joint Angle Calculator (~93 lines)
Pure geometry engine:
- `calculate_angle(a, b, c)` — calculates the angle at vertex B formed by points A-B-C using vector dot product. Returns degrees (0–180).
- `get_angle(keypoints, points, threshold)` — looks up 3 named keypoints and calculates their angle if all have sufficient confidence.
- `calculate_all_joint_angles(keypoints)` — computes 8 standard rehabilitation angles: left/right shoulder, elbow, hip, and knee.

### `exercise_library.py` — Exercise Database (~1640 lines)
Contains **52 exercises** across 5 categories, each with:
- `id`, `label`, `description`, `category`, `difficulty`
- `targetMuscles[]` — muscles targeted
- `angleChecks[]` — joint angle ranges for form validation (points, targetMin/Max, feedback messages)
- `repLogic` — threshold angles for rep counting state machine
- `contraindications[]` — conditions where exercise should be avoided
- `instructions[]` — step-by-step patient instructions

**Categories**: Knee (13), Shoulder (11), Hip (8), Balance (5), General (15)

### `rep_engine.py` — Repetition Counter (~95 lines)
State-machine based rep counter:
- States: `idle` → `going_down` → `at_bottom` → `going_up` → `at_top` → (rep counted) → `going_down`
- Tracks the primary angle for each exercise (e.g., knee angle for squats)
- Uses `downThreshold` and `upThreshold` from exercise config
- Includes `minHoldMs` to prevent noise-triggered false reps

### `feedback_engine.py` — Form Correction (~80 lines)
Generates real-time coaching feedback:
- Checks each `angleCheck` defined in the exercise config
- Compares current joint angle against `targetMin`/`targetMax`
- Returns status (`good`, `warning`, `danger`) with specific correction message
- Messages like "Bend your knee more", "Don't go too deep", "Perfect squat depth"

### `recommendation_engine.py` — Exercise Planner (~160 lines)
Generates personalized exercise plans based on:
- Injury type (maps to relevant body categories)
- Treatment phase (filters by difficulty)
- Pain regions (avoids exercises that stress painful areas)
- Age (adjusts difficulty thresholds)
- Returns prioritized list with `priority` (high/medium/low) and `reason`

---

## Frontend — File-by-File Breakdown

### `App.tsx` — Root Component with Auth Guards
- Listens to Firebase `onAuthStateChanged`
- Routes: `/` (landing), `/auth` (login/register), `/onboarding`, `/dashboard/*`
- **Auth Guard**: Unauthenticated users redirected to `/auth`
- **Onboarding Guard**: New users (no profile) redirected to `/onboarding`
- Shows a loading spinner during auth state resolution

### `firebase/config.ts` — Firebase Initialization
- Initializes Firebase app with config from `.env.local`
- Exports `auth` (Firebase Auth) and `db` (Firestore)

### `store/useAppStore.ts` — Zustand Global State
Manages:
- `user` — current user profile (from Firestore)
- `onboardingComplete` — whether user finished onboarding
- `exercisePlan` — current exercise recommendations
- `poseData` — latest keypoints from WebSocket
- Actions: `setUser`, `setOnboardingComplete`, `setExercisePlan`, `reset`

### `services/firestoreService.ts` — Firestore CRUD
- `saveUserProfile` / `getUserProfile` — user document management (with `stripUndefined()` to prevent Firestore errors)
- `saveSession` / `getUserSessions` — exercise session records
- `savePainLog` / `getUserPainLogs` — pain tracking entries
- `saveCognitiveSession` / `getUserCognitiveSessions` — memory game scores
- `saveExercisePlan` / `getLatestExercisePlan` — AI-generated exercise plans
- `saveReport` / `getUserReports` — clinical PDF reports

### `services/aiService.ts` — AI API Integration
- `processReportImage(base64, mimeType)` — sends medical report image to Gemini Vision, extracts diagnosis, medications, restrictions, recommendations
- `generateWeeklySummary(sessions, painLogs)` — Gemini generates weekly rehab progress analysis
- `generateSessionInsight(session)` — Groq provides post-session coaching feedback
- `generateRiskAlert(painLogs)` — Gemini analyzes pain trends for clinical risk alerts
- `generateReportInsight(data)` — Gemini creates AI section for clinical PDF reports

### Dashboard Tabs

#### `DashboardHome.tsx` — Overview Dashboard
- Greeting with user's name
- Stats cards: total sessions, accuracy average, streak, cognitive score
- AI weekly summary (Gemini)
- Risk alerts from pain trends
- Recent session history

#### `ExerciseSession.tsx` — Live Exercise Session
- Exercise picker from library (52 exercises)
- Webcam capture → base64 JPEG → WebSocket to backend
- Frame sending at ~7 FPS with buffer overflow protection
- Displays annotated frame (skeleton overlay from backend) on canvas
- Shows rep count, accuracy %, joint angles, form feedback
- Voice feedback via `SpeechSynthesis` API
- Post-session: saves to Firestore, generates AI insight

#### `PainTracker.tsx` — Interactive Pain Map
- SVG body diagram with 16 clickable anatomical zones
- Hover/click to select pain regions
- Intensity slider (1-10) with color coding (green→yellow→red)
- Pain history log from Firestore
- Saves entries with timestamp

#### `CognitiveTrainer.tsx` — Memory Training
- Grid-based memory matching game
- Level progression (increases grid size)
- Tracks: time, accuracy, level reached
- Session history from Firestore
- Saves scores with timestamp

#### `Progress.tsx` — Analytics & Trends
- Bar chart showing 7-day accuracy trend
- Three tabs: Exercise, Pain, Cognitive
- Each tab shows relevant metrics and history
- AI weekly analysis (Gemini)

#### `DoctorReport.tsx` — Clinical PDF Generation
- Generates a professional 5-page PDF using jsPDF:
  - **Page 1**: Cover page with patient info
  - **Page 2**: Exercise performance summary
  - **Page 3**: Pain trend analysis
  - **Page 4**: Cognitive training results
  - **Page 5**: AI-generated clinical insights with disclaimer
- Download and email sharing options

#### `Settings.tsx` — Account Management
- Edit profile (name, age, gender, injury type)
- Save changes to Firestore
- Sign out (clears Zustand store + Firebase auth)
- Account deletion

---

## Routing & Navigation

```
/                           → LandingPage (public)
/auth                       → AuthPage (login/register/Google)
/onboarding                 → OnboardingPage (5-step wizard)
/dashboard                  → DashboardLayout
  /dashboard/               → DashboardHome (default)
  /dashboard/exercise       → ExerciseSession
  /dashboard/pain           → PainTracker
  /dashboard/cognitive      → CognitiveTrainer
  /dashboard/progress       → Progress
  /dashboard/report         → DoctorReport
  /dashboard/settings       → Settings
```

**Navigation Flow:**
```
Landing → Auth → Onboarding (first time only) → Dashboard
                      ↑                            ↓
              (guard: no profile)        (full app access)
```

---

## Authentication & Guards

1. **Firebase Auth** handles email/password and Google sign-in
2. **`App.tsx`** listens to `onAuthStateChanged` — checks if user is authenticated
3. **Onboarding Guard**: After login, checks Firestore for `onboardingComplete` field
   - If `false` or profile doesn't exist → redirect to `/onboarding`
   - If `true` → allow access to `/dashboard`
4. **Dashboard Guard**: All `/dashboard/*` routes require authentication
5. **Auth Page**: If user is already logged in → redirect to `/dashboard`

---

## Real-Time Pose Detection Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                             │
│                                                                │
│  Webcam → Canvas.toDataURL("image/jpeg", 0.5)                 │
│         → base64 encode                                        │
│         → WS.send({frame: base64, exerciseId: "knee_bend"})    │
│         → (only sends if WS.bufferedAmount < 50KB)             │
│         → repeats every 150ms (~7 FPS)                         │
└────────────────────┬───────────────────────────────────────────┘
                     │ WebSocket (ws://localhost:8000/ws/pose)
                     ▼
┌────────────────────────────────────────────────────────────────┐
│ BACKEND (Python)                                               │
│                                                                │
│  receiver() ─────────────── keeps only latest frame ────────── │
│       ▼                                                        │
│  processor() ──── run_in_executor (thread pool) ──────────     │
│       │                                                        │
│       ├── base64 decode → numpy array → cv2.imdecode           │
│       ├── BGR→RGB → tf.image.resize_with_pad (192×192)         │
│       ├── MoveNet inference → 17 keypoints (y, x, score)       │
│       ├── Scale keypoints to original frame dimensions          │
│       ├── calculate_all_joint_angles() → 8 angles              │
│       ├── RepEngine.process_frame() → rep count + state        │
│       ├── get_feedback() → form correction message             │
│       ├── draw_skeleton() → annotated frame with overlay       │
│       └── cv2.imencode → base64 → send JSON response           │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────────┐
│ FRONTEND (Browser)                                             │
│                                                                │
│  WS.onmessage → parse JSON                                    │
│       ├── annotatedFrame → canvas.drawImage (skeleton overlay) │
│       ├── repCount → update rep display                        │
│       ├── accuracy → update accuracy %                         │
│       ├── jointAngles → display angle values                   │
│       ├── feedback → show correction banner                    │
│       └── feedback.warning → SpeechSynthesis (voice feedback)  │
└────────────────────────────────────────────────────────────────┘
```

---

## Exercise Library

### Categories & Exercise Count

| Category | Count | Target Areas |
|----------|-------|-------------|
| **Knee** | 13 | Quadriceps, hamstrings, calf |
| **Shoulder** | 11 | Rotator cuff, deltoid, trapezius |
| **Hip** | 8 | Glutes, hip flexors, adductors |
| **Balance** | 5 | Ankle stabilizers, core |
| **General** | 15 | Full body, core, compound movements |
| **Total** | **52** | |

### Exercise Examples
- **Knee**: Knee Bend, Heel Slide, Sit to Stand, Wall Squat, Step Down
- **Shoulder**: Arm Raise, Shoulder Abduction, Wall Push-Up, Pendulum, Wall Angel
- **Hip**: Hip Abduction, Glute Bridge, Clamshell, Fire Hydrant, Piriformis Stretch
- **Balance**: Single Leg Stand, Tandem Stance, Heel-to-Toe Walk, Standing March
- **General**: Squat, Lunge, Bird Dog, Dead Bug, Cat-Cow Stretch, Prone Press-Up

---

## State Management

Using **Zustand** for lightweight global state:

```typescript
interface AppState {
  user: UserProfile | null;        // Current user's profile from Firestore
  onboardingComplete: boolean;     // Whether onboarding wizard is done
  exercisePlan: ExercisePlan|null; // Current AI-generated plan
  poseData: any;                   // Latest keypoints from WebSocket
  setUser: (u: UserProfile) => void;
  setOnboardingComplete: (v: boolean) => void;
  setExercisePlan: (p: ExercisePlan) => void;
  reset: () => void;               // Clears all state on logout
}
```

---

## Database Schema (Firestore)

### `users/{uid}`
```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "age": 28,
  "gender": "male",
  "height": 175,
  "weight": 70,
  "injuryType": "ACL Reconstruction",
  "injuryRegion": "Left Knee",
  "treatmentPhase": "active_rehab",
  "painRegions": [{"region": "left_knee", "intensity": 5}],
  "recoveryGoals": ["reduce_pain", "increase_mobility"],
  "onboardingComplete": true,
  "reportData": { "diagnosis": "...", "medications": [], "restrictions": [] },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### `sessions/{auto-id}`
```json
{
  "userId": "string",
  "exerciseId": "knee_bend",
  "exerciseLabel": "Knee Bend",
  "reps": 8,
  "targetReps": 10,
  "accuracy": 85,
  "duration": 120,
  "avgAngle": 92.5,
  "feedback": "Good form maintained",
  "timestamp": "ISO8601"
}
```

### `painLogs/{auto-id}`
```json
{
  "userId": "string",
  "region": "left_knee",
  "intensity": 6,
  "notes": "Sharp pain during bending",
  "timestamp": "ISO8601"
}
```

### `cognitiveSessions/{auto-id}`
```json
{
  "userId": "string",
  "score": 85,
  "level": 3,
  "timeMs": 45000,
  "accuracy": 92,
  "timestamp": "ISO8601"
}
```

### `exercisePlans/{auto-id}`
```json
{
  "userId": "string",
  "exercises": [{"id": "knee_bend", "label": "...", "priority": "high", "reason": "..."}],
  "generatedAt": "ISO8601",
  "basedOn": "onboarding"
}
```

---

## API Endpoints

### REST API (http://localhost:8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server health check + model status |
| `GET` | `/exercises` | Full exercise library (52 exercises) |
| `GET` | `/exercises/{id}` | Single exercise configuration |
| `POST` | `/recommend` | Generate personalized exercise plan |

### WebSocket (ws://localhost:8000/ws/pose)

**Client sends:**
```json
{
  "frame": "base64_encoded_jpeg",
  "exerciseId": "knee_bend"
}
```

**Server responds:**
```json
{
  "keypoints": [{...}],
  "coordinates": [{"name": "left_knee", "x": 320, "y": 450, "score": 0.92}],
  "jointAngles": {"left_knee_angle": 95.3, "left_hip_angle": 172.1},
  "repCount": 3,
  "repState": "going_up",
  "accuracy": 78,
  "feedback": {"status": "good", "message": "Perfect squat depth"},
  "annotatedFrame": "base64_jpeg_with_skeleton_overlay",
  "modelLoaded": true
}
```

---

## Environment Variables

Create `.env.local` in the project root:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# AI API Keys
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GROQ_API_KEY=your_groq_api_key

# Python Backend URL
VITE_PYTHON_BACKEND_URL=http://localhost:8000
```

---

## Setup & Installation

### Prerequisites
- **Node.js** >= 18
- **Python** >= 3.10
- **npm** >= 9

### 1. Clone the repository
```bash
git clone https://github.com/your-repo/WIN_YA_LUN.git
cd WIN_YA_LUN
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Set up Python backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # macOS/Linux
pip install -r requirements.txt
pip install tensorflow tensorflow-hub setuptools
```

### 4. Configure environment
Create `.env.local` in the project root with your Firebase, Gemini, and Groq API keys (see [Environment Variables](#environment-variables)).

### 5. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** (Email/Password + Google sign-in)
4. Enable **Cloud Firestore**
5. Copy your config to `.env.local`

---

## Running the Project

### Start Backend (Terminal 1)
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
**Expected output:**
```
✅ MoveNet Lightning loaded
✅ MoveNet model ready!
INFO: Application startup complete.
```

### Start Frontend (Terminal 2)
```bash
npm run dev
```
**Expected output:**
```
VITE v8.0.3 ready in 250 ms
➜ Local: http://localhost:5173/
```

### Access the Application
Open **http://localhost:5173** in your browser.

---

## Key Design Decisions

1. **Thread Pool for TF Inference**: MoveNet runs synchronously (~100-200ms per frame on CPU). Without thread pool, it would block the FastAPI async event loop, freezing the WebSocket. `run_in_executor()` solves this.

2. **Producer/Consumer WebSocket**: The receiver task keeps only the latest frame (drops old ones). The processor task processes at its own pace. This prevents frame queue buildup.

3. **bufferedAmount Check**: Frontend checks `WebSocket.bufferedAmount` before sending. If the buffer is full (backend is slow), frames are skipped to prevent memory leaks.

4. **stripUndefined() for Firestore**: Firestore throws on `undefined` values. The `stripUndefined()` utility recursively removes them before `setDoc()`.

5. **Direct TF Hub Download**: `tensorflow_hub` has `pkg_resources` issues on Python 3.13. We bypass it by using `tf.keras.utils.get_file()` with the `?tf-hub-format=compressed` URL directly.

---

## License

This project is for educational and research purposes.

---

**Built with ❤️ using React, FastAPI, TensorFlow MoveNet, Firebase, Gemini AI, and Groq**
