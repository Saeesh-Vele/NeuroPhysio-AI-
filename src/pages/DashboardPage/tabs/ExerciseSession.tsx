import React, { useState, useRef, useEffect, useCallback, type FC } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { saveSession, saveMobilityProgress, getMobilityHistory, getExerciseDifficultyUnlocks, updateExerciseDifficultyUnlocks, saveSessionMobility, getBaselineMobility, type SessionMobilityData } from "../../../services/firestoreService";
import { generateSessionInsight, generateRealtimeCoaching } from "../../../services/aiService";
import { auth } from "../../../firebase/config";
import { HiPlayCircle, HiInformationCircle, HiArrowTopRightOnSquare, HiLockClosed, HiLockOpen, HiCheckCircle, HiExclamationTriangle, HiXCircle, HiLightBulb, HiCpuChip, HiTrophy, HiArrowTrendingUp } from "react-icons/hi2";
import { FaDumbbell } from "react-icons/fa";
import type { FeedbackResult, MobilityProgress } from "../../../types";

interface ExerciseItem {
  id: string;
  label: string;
  targetReps: number;
  difficulty: string;
  description?: string;
  instructions?: string[];
  youtubeUrl?: string;
}

const BACKEND_URL = import.meta.env.VITE_PYTHON_BACKEND_URL || "http://localhost:8000";
const WS_URL = BACKEND_URL.replace("http", "ws");

type SessionPhase = "setup" | "active" | "complete";

// ── Exercise GIF/media mapping (covers all 72 exercises) ──
const EXERCISE_GIF_MAP: Record<string, string> = {
  // ─── Knee ───
  knee_bend: "KneeBend.gif",
  heel_slide: "HeelSlide.gif",
  sit_to_stand: "SitToStand.gif",
  straight_leg_raise: "StraightLegRaise.gif",
  wall_squat: "SitToStand.gif",
  terminal_knee_extension: "KneeBend.gif",
  hamstring_curl: "HamstringCurl.gif",
  calf_raise: "CalfRaises.gif",
  step_up: "StepUp.gif",
  quad_set: "QuadSet.gif",
  prone_knee_bend: "ProneKneeBend.gif",
  patella_glide: "PatellaMobilization.jpeg",
  // ─── Shoulder ───
  arm_press: "ShoulderAbduction.gif",
  arm_raise: "ShoulderFlexion.gif",
  shoulder_abduction: "ShoulderAbduction.gif",
  shoulder_flexion: "ShoulderFlexion.gif",
  shoulder_external_rotation: "ShoulderExternalRotation.gif",
  wall_pushup: "WallPush.gif",
  pendulum_exercise: "PendulumExcercises.gif",
  scapular_squeeze: "ScapularSqueeze.gif",
  cross_body_stretch: "CrossBodyShoulderStretch.gif",
  finger_wall_walk: "FingerWallWalk.gif",
  passive_external_rotation: "PassiveExternalRotationa.gif",
  doorway_stretch: "DoorwayChestStreach.gif",
  wall_angel: "WallAngels.gif",
  shoulder_isometric_hold: "ShoulderIsometricHold.gif",
  towel_slide: "Towelslide.mp4",
  // ─── Arm ───
  bicep_curl: "BicepsCurl.gif",
  tricep_extension: "TricepsExtension.gif",
  wrist_curl: "BicepsCurl.gif",
  wrist_extension: "BicepsCurl.gif",
  wrist_circles: "BicepsCurl.gif",
  wrist_flex_extend: "BicepsCurl.gif",
  prayer_stretch: "CrossBodyShoulderStretch.gif",
  // ─── Hip ───
  hip_abduction: "HipAbduction.gif",
  hip_adduction: "HipAdduction.mp4",
  hip_flexion: "StraightLegRaise.gif",
  hip_extension: "StraightLegRaise.gif",
  supine_hip_flexion: "StraightLegRaise.gif",
  glute_bridge: "HipAbduction.gif",
  clamshell: "HipAbduction.gif",
  fire_hydrant: "HipAbduction.gif",
  gentle_hip_circles: "HipAbduction.gif",
  piriformis_stretch: "HipAbduction.gif",
  // ─── Ankle ───
  ankle_pump: "AnkleFlex.gif",
  ankle_alphabet: "AnkleAlphabetTrace.gif",
  ankle_dorsiflexion: "AnkleDorsiflexion.gif",
  ankle_circles: "AnkleAlphabetTrace.gif",
  toe_raises: "CalfRaises.gif",
  // ─── Balance / Functional ───
  step_down: "StepDown.gif",
  squat: "SitToStand.gif",
  lunge: "StepDown.gif",
  side_lunge: "StepDown.gif",
  single_leg_stand: "SitToStand.gif",
  tandem_stance: "SitToStand.gif",
  heel_to_toe_walk: "StepUp.gif",
  balance_reach: "SitToStand.gif",
  standing_march: "StepUp.gif",
  // ─── Core / Spine ───
  bird_dog: "ProneKneeBend.gif",
  dead_bug: "StraightLegRaise.gif",
  pelvic_tilt: "HeelSlide.gif",
  cat_cow_stretch: "ProneKneeBend.gif",
  prone_press_up: "ProneKneeBend.gif",
  trunk_rotation: "CrossBodyShoulderStretch.gif",
  // ─── Stretch ───
  seated_hamstring_stretch: "HamstringCurl.gif",
  hamstring_wall_stretch: "HamstringCurl.gif",
  standing_calf_stretch: "CalfRaises.gif",
  neck_flexion: "ScapularSqueeze.gif",
};

function getExerciseMedia(exerciseId: string): { url: string; isVideo: boolean } | null {
  const filename = EXERCISE_GIF_MAP[exerciseId];
  if (!filename) return null;
  const url = new URL(`../../../assets/Gifs/${filename}`, import.meta.url).href;
  const isVideo = filename.endsWith(".mp4");
  return { url, isVideo };
}

const ExerciseSession: FC = () => {
  const { exercisePlan } = useAppStore();

  // Session state
  const [phase, setPhase] = useState<SessionPhase>("setup");
  const [activeExercise, setActiveExercise] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [reps, setReps] = useState(0);
  const [targetReps, setTargetReps] = useState(10);
  const [repState, setRepState] = useState("idle");
  const [accuracy, setAccuracy] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackResult | null>(null);
  const [jointAngles, setJointAngles] = useState<Record<string, number>>({});
  const [aiInsight, setAiInsight] = useState("");
  const [sessionDuration, setSessionDuration] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const [aiCoaching, setAiCoaching] = useState("");
  const [aiCoachingLoading, setAiCoachingLoading] = useState(false);
  const coachingTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [exerciseInstructions, setExerciseInstructions] = useState<string[]>([]);
  const [exerciseDescription, setExerciseDescription] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Mobility / Partial rep state
  const [fullReps, setFullReps] = useState(0);
  const [partialReps, setPartialReps] = useState(0);
  const [peakAngle, setPeakAngle] = useState(0);
  const [minAngle, setMinAngle] = useState(999);
  const [maxRomAchieved, setMaxRomAchieved] = useState(0);
  const [restAngle, setRestAngle] = useState<number | null>(null);
  const [currentAttemptPeak, setCurrentAttemptPeak] = useState(0);
  const [previousRom, setPreviousRom] = useState<MobilityProgress | null>(null);
  const [baselineMobility, setBaselineMobility] = useState<SessionMobilityData[] | null>(null);
  const [isFirstSession, setIsFirstSession] = useState(false);
  const [prescription, setPrescription] = useState<any | null>(null); // personalized plan for this exercise

  // Difficulty locking state
  const [unlockedDifficulties, setUnlockedDifficulties] = useState<string[]>(["beginner"]);
  const [newUnlock, setNewUnlock] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameLoop = useRef<number>(0);
  const sessionStart = useRef(0);
  const durationTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Refs to avoid stale closures in setInterval
  const jointAnglesRef = useRef<Record<string, number>>({});
  const repsRef = useRef(0);
  const feedbackRef = useRef<FeedbackResult | null>(null);
  const activeExerciseRef = useRef("");

  // Keep refs in sync with state
  useEffect(() => { jointAnglesRef.current = jointAngles; }, [jointAngles]);
  useEffect(() => { repsRef.current = reps; }, [reps]);
  useEffect(() => { feedbackRef.current = feedback; }, [feedback]);

  // Available exercises from plan or defaults
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [difficultyTab, setDifficultyTab] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    const fetchFresh = (injuryType: string) => {
      fetch(`${BACKEND_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          injury_type: injuryType,
          injury_region: user?.injuryRegion || "",
          pain_regions: user?.painRegions || [],
          treatment_phase: user?.treatmentPhase || "active_rehab",
          age: user?.age || 30,
          report_data: (user as any)?.reportData || null,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.recommendations?.length) {
            setExercises(
              data.recommendations.map((e: any) => ({
                id: e.exerciseId,
                label: e.label,
                targetReps: e.targetReps || 10,
                difficulty: e.difficulty || "beginner",
                description: e.description || "",
                instructions: e.instructions || [],
                youtubeUrl: e.youtubeUrl || "",
              }))
            );
          }
        })
        .catch(() => {
          // Use plan as fallback if fetch fails
          if (exercisePlan?.exercises?.length) {
            setExercises(
              exercisePlan.exercises.map((e: any) => ({
                id: e.exerciseId,
                label: e.label,
                targetReps: e.targetReps || 10,
                difficulty: e.difficulty || "beginner",
                description: e.description || "",
                instructions: e.instructions || [],
                youtubeUrl: e.youtubeUrl || "",
              }))
            );
          }
        });
    };

    // Always prefer fetching fresh from backend to get instructions + YouTube links
    if (user?.injuryType) {
      fetchFresh(user.injuryType);
    } else if (exercisePlan?.exercises?.length) {
      // Try to extract injury type from plan
      fetchFresh(exercisePlan.basedOn || "general");
    } else {
      setExercises([
        { id: "pendulum_exercise", label: "Pendulum Exercise", targetReps: 8, difficulty: "beginner" },
        { id: "scapular_squeeze", label: "Scapular Squeeze", targetReps: 8, difficulty: "beginner" },
        { id: "ankle_pump", label: "Ankle Pump", targetReps: 10, difficulty: "beginner" },
        { id: "cat_cow_stretch", label: "Cat-Cow Stretch", targetReps: 8, difficulty: "beginner" },
        { id: "pelvic_tilt", label: "Pelvic Tilt", targetReps: 10, difficulty: "beginner" },
      ]);
    }
  }, [exercisePlan, user]);

  // Load difficulty unlocks from Firestore
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getExerciseDifficultyUnlocks(uid).then(setUnlockedDifficulties).catch(() => { });
  }, []);

  // Filter by current difficulty tab
  const filteredExercises = exercises.filter((e) => e.difficulty === difficultyTab);
  const beginnerCount = exercises.filter((e) => e.difficulty === "beginner").length;
  const intermediateCount = exercises.filter((e) => e.difficulty === "intermediate").length;
  const advancedCount = exercises.filter((e) => e.difficulty === "advanced").length;

  // ── Start Camera ──
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraError("");
    } catch (err) {
      setCameraError(
        "Camera not available. Please allow camera access in your browser settings."
      );
    }
  }, []);

  // ── Stop Camera ──
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── WebSocket Connection ──
  const [modelLoading, setModelLoading] = useState(true);
  const connectWS = useCallback(() => {
    const ws = new WebSocket(`${WS_URL}/ws/pose`);
    ws.onopen = () => console.log("🔌 WS connected");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle model loading state
        if (data.error === "Model not loaded") {
          setModelLoading(true);
          setFeedback({ status: "info", message: data.feedback?.message || "Loading MoveNet model..." } as any);
          return;
        }

        setModelLoading(false);
        setReps(data.repCount || 0);
        setFullReps(data.fullReps || 0);
        setPartialReps(data.partialReps || 0);
        setPeakAngle(data.peakAngle || 0);
        setMaxRomAchieved(data.maxRomAchieved || 0);
        setRestAngle(data.restAngle ?? null);
        setCurrentAttemptPeak(data.currentAttemptPeak || 0);
        setRepState(data.repState || "idle");
        setAccuracy(data.accuracy || 0);
        setFeedback(data.feedback || null);
        setJointAngles(data.jointAngles || {});

        // Track min angle (lower bound of ROM)
        if (data.peakAngle > 0) {
          setPeakAngle(prev => Math.max(prev, data.peakAngle));
        }
        if (data.restAngle != null && data.restAngle > 0) {
          setMinAngle(prev => Math.min(prev, data.restAngle));
        }

        // Draw the annotated frame (with skeleton drawn by backend) on canvas
        // We flip the image horizontally within the canvas so the body is mirrored
        // (matching the selfie-view video) but text overlays render correctly.
        if (data.annotatedFrame && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            const img = new Image();
            img.onload = () => {
              canvasRef.current!.width = img.width;
              canvasRef.current!.height = img.height;
              ctx.save();
              ctx.translate(img.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(img, 0, 0);
              ctx.restore();
            };
            img.src = `data:image/jpeg;base64,${data.annotatedFrame}`;
          }
        }

        // Voice feedback for corrections
        if (data.feedback?.status === "warning" && data.feedback?.message) {
          speakFeedback(data.feedback.message);
        }
      } catch (e) {
        // ignore parse errors
      }
    };
    ws.onerror = () => console.warn("WS error");
    ws.onclose = () => console.log("🔌 WS disconnected");
    wsRef.current = ws;
  }, []);

  // ── Speech synthesis ──
  const lastSpoken = useRef("");
  const lastSpeakTime = useRef(0);
  const speakFeedback = (msg: string) => {
    if (
      msg === lastSpoken.current ||
      Date.now() - lastSpeakTime.current < 4000
    )
      return;
    lastSpoken.current = msg;
    lastSpeakTime.current = Date.now();
    const utter = new SpeechSynthesisUtterance(msg);
    utter.rate = 1.1;
    utter.pitch = 1;
    utter.volume = 0.8;
    speechSynthesis.speak(utter);
  };

  // ── Send frames to backend ──
  const sendFrames = useCallback(() => {
    const video = videoRef.current;
    const ws = wsRef.current;
    if (!video || !ws || ws.readyState !== WebSocket.OPEN) return;

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth || 640;
    tempCanvas.height = video.videoHeight || 480;
    const ctx = tempCanvas.getContext("2d");
    if (!ctx) return;

    const loop = () => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // Only send if WebSocket buffer is clear — prevents frame queue buildup
      if (wsRef.current.bufferedAmount < 50000) {
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const dataUrl = tempCanvas.toDataURL("image/jpeg", 0.5);
        const base64 = dataUrl.split(",")[1];
        wsRef.current.send(JSON.stringify({ frame: base64, exerciseId: activeExerciseRef.current }));
      }

      frameLoop.current = window.setTimeout(loop, 150); // ~7 FPS to backend
    };
    loop();
  }, []);  // No deps — reads from refs

  // ── Start Session ──
  const startSession = async (exerciseId: string) => {
    const ex = exercises.find((e) => e.id === exerciseId);
    if (!ex) return;

    setActiveExercise(exerciseId);
    activeExerciseRef.current = exerciseId;  // Set ref synchronously for sendFrames
    setActiveLabel(ex.label);
    setTargetReps(ex.targetReps);
    setReps(0);
    setFullReps(0);
    setPartialReps(0);
    setPeakAngle(0);
    setMinAngle(999);
    setMaxRomAchieved(0);
    setRestAngle(null);
    setCurrentAttemptPeak(0);
    setAccuracy(0);
    setFeedback(null);
    setAiInsight("");
    setAiCoaching("");
    setNewUnlock(null);
    setPrescription(null);
    setPhase("active");
    sessionStart.current = Date.now();

    // Fetch previous ROM and baseline for this specific exercise
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        const history = await getMobilityHistory(uid, exerciseId, 1);
        setPreviousRom(history.length > 0 ? history[0] : null);
        // Load baseline — check if THIS exercise has a baseline
        const baseline = await getBaselineMobility(uid);
        setBaselineMobility(baseline);
        const hasBaselineForExercise = baseline?.some(b => b.exerciseId === exerciseId);
        setIsFirstSession(!hasBaselineForExercise);

        // If baseline exists, load personalized prescription
        if (hasBaselineForExercise) {
          const bl = baseline!.find(b => b.exerciseId === exerciseId)!;
          try {
            const presRes = await fetch(`${BACKEND_URL}/personalize-from-baseline`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                baseline_exercises: [{ exerciseId, peakAngle: bl.peakAngle, minAngle: bl.minAngle, rom: bl.rom, reps: bl.reps }],
                injury_type: user?.injuryType || "",
                age: user?.age || 30,
              }),
            });
            if (presRes.ok) {
              const presData = await presRes.json();
              if (presData.personalized?.length > 0) {
                setPrescription(presData.personalized[0]);
                setTargetReps(presData.personalized[0].prescription.targetReps);
              }
            }
          } catch { /* ignore */ }
        }
      }
    } catch { setPreviousRom(null); }

    // Fetch exercise instructions from backend
    try {
      const res = await fetch(`${BACKEND_URL}/exercises/${exerciseId}`);
      if (res.ok) {
        const data = await res.json();
        setExerciseInstructions(data.exercise?.instructions || []);
        setExerciseDescription(data.exercise?.description || "");
      }
    } catch { /* ignore */ }

    await startCamera();
    connectWS();

    // Wait for WS and camera to be ready
    setTimeout(() => sendFrames(), 1500);

    // Duration timer
    durationTimer.current = setInterval(() => {
      setSessionDuration(Math.floor((Date.now() - sessionStart.current) / 1000));
    }, 1000);

    // Groq real-time coaching — calls every 5 seconds, reads from refs for current data
    coachingTimer.current = setInterval(async () => {
      try {
        setAiCoachingLoading(true);
        // Build baseline context for motivation with specific numbers
        let baselineContext = "";
        if (baselineMobility) {
          const bl = baselineMobility.find(b => b.exerciseId === exerciseId);
          if (bl) {
            const romDiff = (peakAngle - bl.peakAngle).toFixed(1);
            const improved = peakAngle > bl.peakAngle;
            baselineContext = ` IMPORTANT CONTEXT: The patient's baseline peak angle for this exercise was ${bl.peakAngle.toFixed(1)}° with ROM of ${bl.rom.toFixed(1)}°. Their current session peak is ${peakAngle.toFixed(1)}°, which is ${improved ? `${romDiff}° BETTER` : `${Math.abs(Number(romDiff)).toFixed(1)}° lower`} than baseline. ${improved ? `Tell them exactly: "You've improved by ${romDiff} degrees from your baseline of ${bl.peakAngle.toFixed(1)}°! Amazing progress!"` : `Encourage them: "Your baseline was ${bl.peakAngle.toFixed(1)}°, push a little more to match it!"`}`;
          }
        }
        if (isFirstSession) {
          baselineContext += ` This is their FIRST session ever — tell them "This session will become your baseline! Give it your best so we can track your improvement from today!"`;
        }
        const msg = await generateRealtimeCoaching(
          exercises.find((e) => e.id === exerciseId)?.label || exerciseId,
          jointAnglesRef.current,
          repsRef.current,
          exercises.find((e) => e.id === exerciseId)?.targetReps || 10,
          feedbackRef.current?.status || "unknown",
          (feedbackRef.current?.message || "Detecting pose") + baselineContext,
          user?.injuryType,
        );
        if (msg) {
          setAiCoaching(msg);
          speakFeedback(msg);
        }
      } catch { /* ignore errors */ }
      finally { setAiCoachingLoading(false); }
    }, 5000);
  };

  // ── End Session ──
  const endSession = async () => {
    clearTimeout(frameLoop.current);
    clearInterval(durationTimer.current);
    clearInterval(coachingTimer.current);
    wsRef.current?.close();
    stopCamera();
    setPhase("complete");

    const duration = Math.floor((Date.now() - sessionStart.current) / 1000);
    const userId = auth.currentUser?.uid;

    if (userId) {
      const currentDifficulty = exercises.find(e => e.id === activeExercise)?.difficulty || "beginner";
      const sessionData = {
        userId: userId,
        exerciseId: activeExercise,
        exerciseLabel: activeLabel,
        reps,
        fullReps,
        partialReps,
        targetReps,
        accuracy,
        duration,
        avgAngle: Object.values(jointAngles).reduce((a, b) => a + b, 0) /
          Math.max(Object.values(jointAngles).length, 1),
        peakAngle,
        maxRomAchieved,
        restAngle,
        feedback: feedback?.message || "",
        timestamp: new Date().toISOString(),
        difficulty: currentDifficulty,
      };

      try {
        await saveSession({ ...sessionData, userId } as any);
      } catch (e) {
        console.warn("Save session failed:", e);
      }

      // Save mobility progress for ROM tracking
      try {
        await saveMobilityProgress({
          userId,
          exerciseId: activeExercise,
          exerciseLabel: activeLabel,
          peakAngle,
          maxRomAchieved,
          restAngle,
          fullReps,
          partialReps,
          difficulty: currentDifficulty,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("Save mobility progress failed:", e);
      }

      // Save session mobility data for baseline tracking
      try {
        const sessionMobData: SessionMobilityData[] = [{
          exerciseId: activeExercise,
          exerciseLabel: activeLabel,
          peakAngle,
          minAngle: minAngle === 999 ? 0 : minAngle,
          rom: peakAngle - (minAngle === 999 ? 0 : minAngle),
          reps,
          fullReps,
          partialReps,
          accuracy,
          sessionDate: new Date().toISOString(),
        }];
        await saveSessionMobility(userId, sessionMobData);

        // If this was an assessment session, generate personalized prescription
        if (isFirstSession && peakAngle > 0) {
          try {
            const presRes = await fetch(`${BACKEND_URL}/personalize-from-baseline`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                baseline_exercises: [{
                  exerciseId: activeExercise,
                  peakAngle,
                  minAngle: minAngle === 999 ? 0 : minAngle,
                  rom: peakAngle - (minAngle === 999 ? 0 : minAngle),
                  reps,
                }],
                injury_type: user?.injuryType || "",
                age: user?.age || 30,
              }),
            });
            if (presRes.ok) {
              const presData = await presRes.json();
              if (presData.personalized?.length > 0) {
                setPrescription(presData.personalized[0]);
              }
            }
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.warn("Save session mobility failed:", e);
      }

      // Check for difficulty unlock
      try {
        const history = await getMobilityHistory(userId);
        const beginnerSessions = history.filter(h => h.difficulty === "beginner");
        const intermediateSessions = history.filter(h => h.difficulty === "intermediate");

        const newUnlocks = [...unlockedDifficulties];
        // Unlock intermediate after 3+ beginner sessions
        if (beginnerSessions.length >= 3 && !newUnlocks.includes("intermediate")) {
          newUnlocks.push("intermediate");
          setNewUnlock("intermediate");
        }
        // Unlock advanced after 3+ intermediate sessions
        if (intermediateSessions.length >= 3 && !newUnlocks.includes("advanced")) {
          newUnlocks.push("advanced");
          setNewUnlock("advanced");
        }
        if (newUnlocks.length > unlockedDifficulties.length) {
          setUnlockedDifficulties(newUnlocks);
          await updateExerciseDifficultyUnlocks(userId, newUnlocks);
        }
      } catch (e) {
        console.warn("Unlock check failed:", e);
      }

      // Generate AI insight
      try {
        const insight = await generateSessionInsight(sessionData as any);
        setAiInsight(insight);
      } catch (e) {
        setAiInsight("Great session! Keep up the consistent effort.");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(frameLoop.current);
      clearInterval(durationTimer.current);
      clearInterval(coachingTimer.current);
      wsRef.current?.close();
      stopCamera();
    };
  }, [stopCamera]);

  const feedbackColor =
    feedback?.status === "good"
      ? "var(--color-accent)"
      : feedback?.status === "warning"
        ? "var(--color-warning)"
        : "var(--color-danger)";

  return (
    <div className="exercise-page fade-in">
      <div className="page-header">
        <h1 className="page-header__title">Exercise Session</h1>
        {phase === "active" && (
          <p className="page-header__subtitle">
            {activeLabel} — {Math.floor(sessionDuration / 60)}:{String(sessionDuration % 60).padStart(2, "0")}
          </p>
        )}
      </div>

      {/* ── Setup Phase ── */}
      {phase === "setup" && (
        <div>
          <div className="widget fade-up" style={{ marginBottom: 20 }}>
            <div className="widget__header">
              <h3 className="widget__title">Choose Exercise</h3>
              <span style={{ fontSize: 12, color: "var(--color-grey-400)" }}>
                {exercises.length} exercises available
              </span>
            </div>
            <div className="widget__body">
              {/* Difficulty Tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {([
                  { key: "beginner" as const, label: "Beginner", count: beginnerCount, color: "#22c55e" },
                  { key: "intermediate" as const, label: "Intermediate", count: intermediateCount, color: "#f59e0b" },
                  { key: "advanced" as const, label: "Advanced", count: advancedCount, color: "#ef4444" },
                ]).map((tab) => {
                  const isLocked = !unlockedDifficulties.includes(tab.key);
                  const isActive = difficultyTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => !isLocked && setDifficultyTab(tab.key)}
                      title={isLocked ? `Complete more ${tab.key === "intermediate" ? "beginner" : "intermediate"} sessions to unlock` : ""}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: `2px solid ${isLocked ? "var(--color-border)" : isActive ? tab.color : "var(--color-border)"}`,
                        background: isLocked ? "rgba(255,255,255,0.02)" : isActive ? `${tab.color}15` : "transparent",
                        color: isLocked ? "var(--color-grey-500)" : isActive ? tab.color : "var(--color-grey-400)",
                        cursor: isLocked ? "not-allowed" : "pointer",
                        opacity: isLocked ? 0.5 : 1,
                        transition: "all 0.2s ease",
                        textAlign: "center",
                        position: "relative",
                      }}
                      disabled={isLocked}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 700, fontSize: 14 }}>
                        {isLocked ? <HiLockClosed size={14} /> : tab.key !== "beginner" ? <HiLockOpen size={14} style={{ color: tab.color }} /> : null}
                        {tab.label}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>
                        {isLocked ? "Locked" : `${tab.count} exercise${tab.count !== 1 ? "s" : ""}`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Difficulty description */}
              <div style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--color-surface-alt)",
                marginBottom: 16,
                fontSize: 12,
                color: "var(--color-grey-400)",
                lineHeight: 1.5,
              }}>
                {difficultyTab === "beginner" && <><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#22c55e", marginRight: 6 }} /> Gentle exercises for early recovery. Low stress on injured areas, focus on range of motion and mobility.</>}
                {difficultyTab === "intermediate" && <><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#f59e0b", marginRight: 6 }} /> Moderate exercises for active rehabilitation. Builds strength while respecting recovery boundaries.</>}
                {difficultyTab === "advanced" && <><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#ef4444", marginRight: 6 }} /> Challenging exercises for late-stage recovery. Only proceed when your therapist approves progression.</>}
              </div>

              {/* Exercise Grid */}
              {filteredExercises.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                  {filteredExercises.map((ex) => {
                    const badgeColor = difficultyTab === "beginner" ? "#22c55e" : difficultyTab === "intermediate" ? "#f59e0b" : "#ef4444";
                    const isExpanded = expandedCard === ex.id;
                    return (
                      <div
                        key={ex.id}
                        style={{
                          border: `1px solid ${isExpanded ? badgeColor : "var(--color-border)"}`,
                          borderRadius: 12,
                          background: isExpanded ? `${badgeColor}08` : "var(--color-surface-alt)",
                          transition: "all 0.25s ease",
                          overflow: "hidden",
                        }}
                      >
                        {/* Card Header */}
                        <div
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "14px 16px", cursor: "pointer",
                          }}
                          onClick={() => setExpandedCard(isExpanded ? null : ex.id)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{
                              width: 10, height: 10, borderRadius: "50%",
                              background: badgeColor, flexShrink: 0,
                            }} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.label}</div>
                              <div style={{ fontSize: 11, color: "var(--color-grey-400)", marginTop: 2 }}>
                                Target: {ex.targetReps} reps
                                {ex.description && ` · ${ex.description}`}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <HiInformationCircle
                              size={18}
                              style={{ color: isExpanded ? badgeColor : "var(--color-grey-400)", transition: "color 0.2s" }}
                            />
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div style={{
                            padding: "0 16px 16px",
                            borderTop: "1px solid var(--color-border)",
                          }}>
                            {/* Instructions */}
                            {(ex.instructions?.length ?? 0) > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: badgeColor, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                  How to perform
                                </div>
                                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "var(--color-grey-300)" }}>
                                  {ex.instructions!.map((step, i) => (
                                    <li key={i} style={{ marginBottom: 4 }}>{step}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                              <button
                                className="btn btn-primary"
                                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px" }}
                                onClick={() => startSession(ex.id)}
                              >
                                <HiPlayCircle size={18} /> Start Session
                              </button>
                              {ex.youtubeUrl && (
                                <a
                                  href={ex.youtubeUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-outline"
                                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", textDecoration: "none" }}
                                >
                                  <HiArrowTopRightOnSquare size={16} /> Watch Tutorial
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--color-grey-400)" }}>
                  <HiLockClosed size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
                  <p style={{ fontSize: 14 }}>No {difficultyTab} exercises available for your current recovery phase.</p>
                  <p style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                    {difficultyTab !== "beginner" ? "Try switching to a lower difficulty level." : "Complete onboarding to get personalized exercises."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Active Phase ── */}
      {phase === "active" && (
        <div className="grid-2">
          {/* Left Column: Camera + Reference GIF */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="widget fade-up">
              {/* Assessment Mode Banner */}
              {isFirstSession && (
                <div style={{ padding: "12px 20px", background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(167,139,250,0.15))", borderBottom: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🔬</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#818cf8" }}>Mobility Assessment Mode</div>
                    <div style={{ fontSize: 11, color: "var(--color-grey-300)" }}>First time doing this exercise — we're measuring your baseline ROM to personalize your plan</div>
                  </div>
                </div>
              )}
              {/* Prescription Info Bar */}
              {!isFirstSession && prescription && (
                <div style={{ padding: "10px 20px", background: "rgba(34,197,94,0.08)", borderBottom: "1px solid rgba(34,197,94,0.2)", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Target</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#22c55e" }}>{prescription.prescription.targetReps} reps × {prescription.prescription.sets} sets</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Freq</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>{prescription.prescription.frequencyLabel}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Baseline</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-grey-200)" }}>{prescription.baseline.peakAngle}° peak</span>
                  </div>
                </div>
              )}
              <div className="widget__body" style={{ position: "relative", minHeight: 400, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {cameraError ? (
                  <div style={{ color: "var(--color-danger)", textAlign: "center", padding: 24 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                    <p>{cameraError}</p>
                  </div>
                ) : (
                  <>
                    {/* Raw video feed — hidden behind canvas when model is active */}
                    <video
                      ref={videoRef}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: "scaleX(-1)",
                        position: "absolute",
                        top: 0, left: 0,
                      }}
                      muted
                      playsInline
                    />
                    {/* Annotated frame from backend (skeleton + coordinates) */}
                    <canvas
                      ref={canvasRef}
                      style={{
                        position: "absolute",
                        top: 0, left: 0,
                        width: "100%", height: "100%",
                        objectFit: "cover",
                        pointerEvents: "none",
                        zIndex: 2,
                      }}
                    />
                    {/* Model loading overlay */}
                    {modelLoading && (
                      <div
                        style={{
                          position: "absolute",
                          top: 12, left: 12,
                          padding: "8px 16px",
                          background: "rgba(0,0,0,0.8)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid rgba(245,158,11,0.5)",
                          zIndex: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 14, height: 14,
                            border: "2px solid rgba(245,158,11,0.3)",
                            borderTopColor: "#f59e0b",
                            borderRadius: "50%",
                            animation: "spin 0.8s linear infinite",
                          }}
                        />
                        <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 600 }}>
                          Loading MoveNet model…
                        </span>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      </div>
                    )}
                  </>
                )}

                {/* Feedback banner overlay */}
                {feedback && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "12px 16px",
                      background:
                        feedback.status === "good"
                          ? "rgba(34,197,94,0.9)"
                          : feedback.status === "warning"
                            ? "rgba(245,158,11,0.9)"
                            : "rgba(239,68,68,0.9)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span>
                      {feedback.status === "good" ? <HiCheckCircle size={16} style={{ color: "#22c55e" }} /> : feedback.status === "warning" ? <HiExclamationTriangle size={16} style={{ color: "#f59e0b" }} /> : <HiXCircle size={16} style={{ color: "#ef4444" }} />}
                    </span>
                    {feedback.message}
                  </div>
                )}
              </div>
            </div>

            {/* ── Reference GIF ── */}
            {(() => {
              const media = getExerciseMedia(activeExercise);
              if (!media) return null;
              return (
                <div className="widget fade-up" style={{ marginTop: 0 }}>
                  <div style={{
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid var(--color-border)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🎯</span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--color-white)",
                      }}>Reference Demo</span>
                    </div>
                    <span style={{
                      fontSize: 10,
                      color: "var(--color-grey-400)",
                      background: "rgba(99,102,241,0.12)",
                      padding: "3px 8px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      fontWeight: 600,
                      letterSpacing: "0.5px",
                    }}>Follow along</span>
                  </div>
                  <div style={{
                    padding: 12,
                    display: "flex",
                    justifyContent: "center",
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
                  }}>
                    {media.isVideo ? (
                      <video
                        src={media.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        style={{
                          maxWidth: "100%",
                          maxHeight: 250,
                          borderRadius: 8,
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <img
                        src={media.url}
                        alt={`${activeLabel} demonstration`}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 250,
                          borderRadius: 8,
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })()}
          </div>{/* end Left Column */}

          {/* Right Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Rep Counter */}
            <div className="widget fade-up delay-1">
              <div className="widget__body" style={{ textAlign: "center", padding: "24px" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-white)", marginBottom: 8 }}>
                  {activeLabel}
                </h3>
                {exerciseDescription && (
                  <p style={{ fontSize: 11, color: "var(--color-grey-400)", marginBottom: 12, lineHeight: 1.4 }}>
                    {exerciseDescription}
                  </p>
                )}
                <div style={{ fontSize: 64, fontWeight: 800, color: "var(--color-white)", lineHeight: 1 }}>
                  {reps % 1 === 0 ? reps : reps.toFixed(1)}
                  <span style={{ fontSize: 24, color: "var(--color-grey-400)", fontWeight: 600 }}>
                    /{targetReps}
                  </span>
                </div>
                <p style={{ color: "var(--color-grey-400)", fontSize: 12, marginTop: 4 }}>
                  Reps Completed
                </p>

                {/* Full vs Partial breakdown */}
                <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
                    {fullReps} full
                  </span>
                  <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                    {partialReps} half
                  </span>
                </div>

                {/* Progress bar */}
                <div className="progress-bar" style={{ marginTop: 16 }}>
                  <div
                    className="progress-bar__fill"
                    style={{ width: `${Math.min((reps / targetReps) * 100, 100)}%` }}
                  />
                </div>

                {/* Accuracy + Peak Angle */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--color-grey-400)" }}>Accuracy</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: feedbackColor }}>
                    {accuracy}%
                  </span>
                </div>
              </div>
            </div>

            {/* Peak Angle & ROM Progress */}
            <div className="widget fade-up delay-1" style={{ borderLeft: "3px solid #a78bfa" }}>
              <div className="widget__header">
                <h3 className="widget__title"><HiArrowTrendingUp size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Mobility Progress</h3>
              </div>
              <div className="widget__body" style={{ padding: "14px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ textAlign: "center", padding: "10px 8px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#a78bfa" }}>{peakAngle}°</div>
                    <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>Peak Angle</div>
                  </div>
                  <div style={{ textAlign: "center", padding: "10px 8px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{maxRomAchieved}°</div>
                    <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>ROM Range</div>
                  </div>
                </div>
                {previousRom && (
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(167,139,250,0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(167,139,250,0.2)" }}>
                    <p style={{ fontSize: 11, color: "#a78bfa", margin: 0, fontWeight: 600 }}>
                      <HiArrowTrendingUp size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                      Previous best: {previousRom.peakAngle}° peak, {previousRom.maxRomAchieved}° ROM
                      {peakAngle > previousRom.peakAngle && (
                        <span style={{ color: "#22c55e", marginLeft: 6 }}>
                          ↑ +{(peakAngle - previousRom.peakAngle).toFixed(1)}° improvement!
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* How To Do This Exercise */}
            {exerciseInstructions.length > 0 && (
              <div className="widget fade-up delay-2" style={{ borderLeft: "3px solid var(--color-success)" }}>
                <div className="widget__header">
                  <h3 className="widget__title"><HiInformationCircle size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> How to Perform</h3>
                </div>
                <div className="widget__body" style={{ padding: "12px 16px" }}>
                  <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
                    {exerciseInstructions.map((step, i) => (
                      <li key={i} style={{ fontSize: 12, color: "var(--color-grey-300)", lineHeight: 1.5 }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(16,185,129,0.1)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <p style={{ fontSize: 11, color: "#10b981", margin: 0, fontWeight: 600 }}>
                      <HiLightBulb size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> Full rep = complete movement cycle. Half rep = reaching midpoint. Every bit of movement counts as progress!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Joint Angles */}
            <div className="widget fade-up delay-2">
              <div className="widget__header">
                <h3 className="widget__title">Joint Angles</h3>
              </div>
              <div className="widget__body">
                {Object.entries(jointAngles).length > 0 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {Object.entries(jointAngles).map(([name, angle]) => (
                      <div
                        key={name}
                        style={{
                          padding: "8px 10px",
                          background: "var(--color-surface-2)",
                          borderRadius: "var(--radius-md)",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span style={{ fontSize: 11, color: "var(--color-grey-300)" }}>
                          {name.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-white)", fontFamily: "var(--font-mono)" }}>
                          {angle}°
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--color-grey-400)", textAlign: "center" }}>
                    Waiting for pose data…
                  </p>
                )}
              </div>
            </div>

            {/* AI Coach (Groq) */}
            <div className="widget fade-up delay-3">
              <div className="widget__header">
                <h3 className="widget__title"><HiCpuChip size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> AI Coach</h3>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.15)", padding: "2px 8px", borderRadius: 99 }}>
                  Groq
                </span>
              </div>
              <div className="widget__body">
                {aiCoaching ? (
                  <p style={{ fontSize: 14, color: "var(--color-white)", lineHeight: 1.5, margin: 0, fontStyle: "italic" }}>
                    "{aiCoaching}"
                  </p>
                ) : aiCoachingLoading ? (
                  <p style={{ fontSize: 13, color: "var(--color-grey-400)", margin: 0 }}>Analyzing your form…</p>
                ) : (
                  <p style={{ fontSize: 13, color: "var(--color-grey-400)", margin: 0 }}>AI coaching will start in a few seconds…</p>
                )}
              </div>
            </div>

            {/* End Session */}
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} onClick={endSession}>
              End Session
            </button>
          </div>
        </div>
      )}

      {/* ── Complete Phase ── */}
      {phase === "complete" && (
        <div className="widget fade-up" style={{ maxWidth: 640 }}>
          <div className="widget__header">
            <h3 className="widget__title"><HiCheckCircle size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 4, color: "#22c55e" }} /> Session Complete!</h3>
          </div>
          <div className="widget__body">
            {/* Unlock Celebration */}
            {newUnlock && (
              <div style={{ padding: "16px", background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(34,197,94,0.15))", borderRadius: "var(--radius-md)", border: "1px solid rgba(167,139,250,0.3)", marginBottom: 20, textAlign: "center" }}>
                <HiTrophy size={32} style={{ color: "#f59e0b", marginBottom: 8 }} />
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-white)", marginBottom: 4 }}>
                  🎉 {newUnlock.charAt(0).toUpperCase() + newUnlock.slice(1)} Unlocked!
                </div>
                <p style={{ fontSize: 12, color: "var(--color-grey-300)", margin: 0 }}>
                  You've earned access to {newUnlock} exercises. Keep up the amazing progress!
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div style={{ textAlign: "center", padding: "14px 8px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-white)" }}>{reps % 1 === 0 ? reps : reps.toFixed(1)}/{targetReps}</div>
                <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginTop: 2 }}>REPS ({fullReps} full + {partialReps} half)</div>
              </div>
              <div style={{ textAlign: "center", padding: "14px 8px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{peakAngle.toFixed(1)}°</div>
                <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginTop: 2 }}>PEAK ANGLE</div>
              </div>
              <div style={{ textAlign: "center", padding: "14px 8px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{maxRomAchieved.toFixed(1)}°</div>
                <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginTop: 2 }}>ROM RANGE</div>
              </div>
            </div>

            {/* ROM Improvement vs Baseline */}
            {isFirstSession && (
              <div style={{ padding: "16px", background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(34,197,94,0.12))", borderRadius: "var(--radius-md)", border: "1px solid rgba(99,102,241,0.3)", marginBottom: 20, textAlign: "center" }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🎯</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#818cf8", marginBottom: 4 }}>Baseline Established!</div>
                <p style={{ fontSize: 12, color: "var(--color-grey-300)", margin: 0 }}>
                  Your first session ROM: <strong>{maxRomAchieved.toFixed(1)}°</strong> (Peak: {peakAngle.toFixed(1)}°). Future sessions will track your improvement from this baseline.
                </p>
              </div>
            )}

            {/* Personalized Plan from Assessment */}
            {isFirstSession && prescription && (
              <div style={{ padding: "20px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)", marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-white)", marginBottom: 12 }}>
                  📋 Your Personalized Plan
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: 12, background: "rgba(34,197,94,0.08)", borderRadius: 8, border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase", marginBottom: 2 }}>Target Per Session</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>{prescription.prescription.targetReps} reps × {prescription.prescription.sets} sets</div>
                  </div>
                  <div style={{ padding: 12, background: "rgba(167,139,250,0.08)", borderRadius: 8, border: "1px solid rgba(167,139,250,0.2)" }}>
                    <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase", marginBottom: 2 }}>Recommended Frequency</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#a78bfa" }}>{prescription.prescription.frequencyLabel}</div>
                  </div>
                  <div style={{ padding: 12, background: "rgba(245,158,11,0.08)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.2)" }}>
                    <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase", marginBottom: 2 }}>Est. Recovery</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>~{prescription.prescription.estimatedWeeksToFullRom} weeks</div>
                  </div>
                  <div style={{ padding: 12, background: "rgba(59,130,246,0.08)", borderRadius: 8, border: "1px solid rgba(59,130,246,0.2)" }}>
                    <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase", marginBottom: 2 }}>Mobility Level</div>
                    <div style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: prescription.baseline.mobilityLevel === "low" ? "#ef4444" :
                        prescription.baseline.mobilityLevel === "moderate" ? "#f59e0b" :
                          prescription.baseline.mobilityLevel === "good" ? "#a78bfa" :
                            "#22c55e",
                      textTransform: "capitalize"
                    }}>{prescription.baseline.mobilityLevel}</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--color-grey-400)", lineHeight: 1.5 }}>
                  Based on your assessed ROM of {prescription.baseline.rom}° (peak {prescription.baseline.peakAngle}°), you need {prescription.prescription.fullRom && `to reach ${prescription.prescription.fullRom}° for full ROM. `}Follow this plan consistently for best results.
                </div>
              </div>
            )}

            {!isFirstSession && baselineMobility && (() => {
              const bl = baselineMobility.find(b => b.exerciseId === activeExercise);
              if (!bl) return null;
              const romImproved = maxRomAchieved > bl.rom;
              const romDiff = Math.abs(maxRomAchieved - bl.rom).toFixed(1);
              const peakImproved = peakAngle > bl.peakAngle;
              const peakDiff = Math.abs(peakAngle - bl.peakAngle).toFixed(1);
              return (
                <div style={{ padding: "16px", background: romImproved ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.08)", borderRadius: "var(--radius-md)", border: `1px solid ${romImproved ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.25)"}`, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: romImproved ? "#22c55e" : "#f59e0b", marginBottom: 8 }}>
                    <HiArrowTrendingUp size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                    {romImproved ? "Mobility Improved 🎉" : "Keep Pushing 💪"}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div style={{ textAlign: "center", padding: 8, background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginBottom: 2 }}>BASELINE ROM</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-grey-200)" }}>{bl.rom.toFixed(1)}°</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 8, background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginBottom: 2 }}>TODAY'S ROM</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: romImproved ? "#22c55e" : "#f59e0b" }}>{maxRomAchieved.toFixed(1)}°</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 8, background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--color-grey-400)", marginBottom: 2 }}>CHANGE</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: romImproved ? "#22c55e" : "#f59e0b" }}>{romImproved ? "+" : "-"}{romDiff}°</div>
                    </div>
                  </div>
                  {peakImproved && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--color-grey-300)" }}>
                      ✨ Peak angle also improved: {bl.peakAngle.toFixed(1)}° → {peakAngle.toFixed(1)}° (+{peakDiff}°)
                    </div>
                  )}
                </div>
              );
            })()}

            {previousRom && !baselineMobility && (
              <div style={{ padding: "12px 16px", background: peakAngle > previousRom.peakAngle ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", borderRadius: "var(--radius-md)", border: `1px solid ${peakAngle > previousRom.peakAngle ? "rgba(34,197,94,0.3)" : "rgba(245,158,11,0.3)"}`, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: peakAngle > previousRom.peakAngle ? "#22c55e" : "#f59e0b", marginBottom: 4 }}>
                  <HiArrowTrendingUp size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                  {peakAngle > previousRom.peakAngle
                    ? `Mobility improved by ${(peakAngle - previousRom.peakAngle).toFixed(1)}° since last session!`
                    : `Previous best: ${previousRom.peakAngle}° — keep practicing to improve!`}
                </div>
                <div style={{ fontSize: 11, color: "var(--color-grey-400)" }}>
                  Previous: {previousRom.peakAngle}° peak · {previousRom.maxRomAchieved}° ROM · {previousRom.fullReps} full + {previousRom.partialReps} half reps
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1, padding: "12px 16px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 11, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Duration</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-white)" }}>
                  {Math.floor(sessionDuration / 60)}:{String(sessionDuration % 60).padStart(2, "0")}
                </div>
              </div>
              <div style={{ flex: 1, padding: "12px 16px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 11, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Exercise</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-white)" }}>{activeLabel}</div>
              </div>
            </div>

            {/* AI Insight */}
            {aiInsight && (
              <div style={{ padding: "16px", background: "var(--color-accent-dim)", borderRadius: "var(--radius-md)", border: "1px solid rgba(34,197,94,0.2)", marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent-text)", textTransform: "uppercase", marginBottom: 6 }}>
                  <HiCpuChip size={14} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} /> AI Coach — Groq
                </div>
                <p style={{ fontSize: 14, color: "var(--color-grey-100)", lineHeight: 1.6, fontStyle: "italic" }}>
                  "{aiInsight}"
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={() => setPhase("setup")}>
                New Exercise
              </button>
              <button className="btn btn-outline" onClick={() => window.location.href = "/dashboard"}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseSession;
