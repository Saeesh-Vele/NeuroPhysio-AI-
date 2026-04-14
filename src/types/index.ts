/* ══════════════════════════════════════════════════════════════
   NeuroPhysio AI — Core Type Definitions
   All TypeScript interfaces MUST be defined here.
   ══════════════════════════════════════════════════════════════ */

// ── Auth & Toast ──
export type AuthTab = "login" | "signup";
export type ToastType = "info" | "error" | "success";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

// ── App Config ──
export const APP_CONFIG = {
  name: "NeuroPhysio Recovery",
  tagline: "Intelligent Rehabilitation & Recovery",
  problemArea: "Recovery & Rehabilitation",
  version: "1.0.0",
} as const;

// ── User Profile ──
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  height: number;        // cm
  weight: number;        // kg
  injuryType: string;
  injuryRegion: string;
  surgeryDate: string | null;
  treatmentPhase: string;
  painRegions: PainRegion[];
  recoveryGoals: string[];
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
  // Mobility assessment from onboarding (camera-based)
  mobilityAssessment?: MobilityAssessmentResult[];
  // Extracted report data
  reportData?: ExtractedReportData;
  // Exercise difficulty unlocks
  unlockedDifficulties?: string[];  // ['beginner', 'intermediate', 'advanced']
}

// ── Mobility Assessment (onboarding) ──
export interface MobilityAssessmentResult {
  exerciseId: string;
  exerciseLabel: string;
  peakAngle: number;
  fullRomRange: number;    // full ROM for this exercise
  romPercentage: number;   // peakAngle / fullRomRange * 100
  mobilityLevel: 'low' | 'moderate' | 'good' | 'excellent';
  assessedAt: string;
}

export interface PainRegion {
  region: string;
  intensity: number;  // 1-10
}

export interface ExtractedReportData {
  diagnosis: string;
  medications: string[];
  restrictions: string[];
  recommendations: string[];
  rawText: string;
  extractedAt: string;
}

// ── Onboarding ──
export interface OnboardingData {
  // Step 1: Personal
  name: string;
  age: number;
  gender: string;
  height: number;
  weight: number;
  // Step 2: Injury
  injuryType: string;
  injuryRegion: string;
  surgeryDate: string | null;
  treatmentPhase: string;
  // Step 3: Report upload (processed separately)
  reportData?: ExtractedReportData;
  // Step 4: Pain
  painRegions: PainRegion[];
  // Step 5: Goals
  recoveryGoals: string[];
}

// ── Pose & Keypoints ──
export interface Keypoint {
  x: number;
  y: number;
  score: number;
  name: string;
}

export interface PoseKeypoints {
  nose: Keypoint;
  left_eye: Keypoint;
  right_eye: Keypoint;
  left_ear: Keypoint;
  right_ear: Keypoint;
  left_shoulder: Keypoint;
  right_shoulder: Keypoint;
  left_elbow: Keypoint;
  right_elbow: Keypoint;
  left_wrist: Keypoint;
  right_wrist: Keypoint;
  left_hip: Keypoint;
  right_hip: Keypoint;
  left_knee: Keypoint;
  right_knee: Keypoint;
  left_ankle: Keypoint;
  right_ankle: Keypoint;
}

// ── Exercise ──
export interface AngleCheck {
  name: string;
  points: [string, string, string]; // [A, vertex B, C]
  targetMin: number;
  targetMax: number;
  feedbackLow: string;
  feedbackHigh: string;
  feedbackGood: string;
}

export interface RepLogic {
  primaryAngle: string;
  downThreshold: number;
  upThreshold: number;
  minHoldMs: number;
}

export interface ExerciseConfig {
  id: string;
  label: string;
  description: string;
  category: string;
  targetMuscles: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  targetReps: number;
  angleChecks: AngleCheck[];
  repLogic: RepLogic;
  contraindications: string[];
  instructions: string[];
}

export type RepState = "idle" | "moving_down" | "at_bottom" | "moving_up" | "at_top";

// ── Feedback ──
export interface AngleResult {
  angleName: string;
  currentAngle: number | null;
  status: "good" | "low" | "high" | "unknown";
  message: string;
}

export interface FeedbackResult {
  status: "good" | "warning" | "error";
  message: string;
  angleResults: AngleResult[];
}

// ── Session ──
export interface ExerciseSession {
  id?: string;
  userId: string;
  exerciseId: string;
  exerciseLabel: string;
  reps: number;
  fullReps: number;
  partialReps: number;
  targetReps: number;
  accuracy: number;
  duration: number;       // seconds
  avgAngle: number;
  peakAngle: number;      // max angle achieved
  maxRomAchieved: number; // max range of motion delta
  restAngle: number | null; // baseline angle at rest
  feedback: string;
  timestamp: string;
  aiInsight?: string;
  difficulty?: string;    // beginner/intermediate/advanced
}

// ── Mobility Progress (ROM over time) ──
export interface MobilityProgress {
  id?: string;
  userId: string;
  exerciseId: string;
  exerciseLabel: string;
  peakAngle: number;
  maxRomAchieved: number;
  restAngle: number | null;
  fullReps: number;
  partialReps: number;
  difficulty: string;
  timestamp: string;
}

// ── Pain Log ──
export interface PainLog {
  id?: string;
  userId: string;
  bodyRegion: string;
  intensity: number;     // 1-10
  notes: string;
  timestamp: string;
}

// ── Cognitive Session ──
export interface CognitiveSession {
  id?: string;
  userId: string;
  accuracy: number;      // 0-100
  responseTimeMs: number;
  level: number;
  difficulty: string;
  gridSize?: number;     // e.g. 3, 4, 5
  completed?: boolean;   // true if round was finished
  timestamp: string;
}

// ── Exercise Plan ──
export interface ExercisePlan {
  id?: string;
  userId: string;
  exercises: RecommendedExercise[];
  generatedAt: string;
  basedOn: string;       // "onboarding" | "session_history"
}

export interface RecommendedExercise {
  exerciseId: string;
  label: string;
  targetReps: number;
  priority: "high" | "medium" | "low";
  reason: string;
}

// ── Medical Report ──
export interface MedicalReport {
  id?: string;
  userId: string;
  fileName: string;
  extractedData: ExtractedReportData;
  uploadedAt: string;
}

// ── Dashboard Data ──
export interface DashboardData {
  accuracyTrend: { date: string; accuracy: number }[];
  mobilityTrend: { date: string; knee: number; shoulder: number }[];
  cognitiveScores: { date: string; score: number }[];
  completionRate: number;
  totalReps: number;
  totalSessions: number;
  currentStreak: number;
  recentInsight: string | null;
  todayScore: number;
}

// ── Chart ──
export interface ChartDataItem {
  label: string;
  value: number;
  active?: boolean;
}

// ── WebSocket Message from Python Backend ──
export interface PoseFrame {
  keypoints: Keypoint[];
  coordinates: { name: string; x: number; y: number }[];
  jointAngles: Record<string, number>;
  repCount: number;
  repState: RepState;
  fullReps: number;
  partialReps: number;
  peakAngle: number;
  maxRomAchieved: number;
  restAngle: number | null;
  currentAttemptPeak: number;
  accuracy: number;
  feedback: FeedbackResult;
  exerciseId: string;
}

// ── Zustand Store ──
export interface AppState {
  user: UserProfile | null;
  firebaseUser: { uid: string; email: string | null; displayName: string | null } | null;
  currentExercise: string | null;
  poseData: PoseFrame | null;
  reps: number;
  feedback: FeedbackResult | null;
  isOnboardingComplete: boolean;
  exercisePlan: ExercisePlan | null;
  // Actions
  setUser: (user: UserProfile | null) => void;
  setFirebaseUser: (u: AppState["firebaseUser"]) => void;
  setCurrentExercise: (id: string | null) => void;
  setPoseData: (pose: PoseFrame | null) => void;
  setReps: (n: number) => void;
  incrementReps: () => void;
  setFeedback: (fb: FeedbackResult | null) => void;
  setOnboardingComplete: (v: boolean) => void;
  setExercisePlan: (plan: ExercisePlan | null) => void;
  reset: () => void;
}
