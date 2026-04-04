import React, { useState, useRef, useEffect, useCallback, type FC } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { saveSession } from "../../../services/firestoreService";
import { generateSessionInsight, generateRealtimeCoaching } from "../../../services/aiService";
import { auth } from "../../../firebase/config";
import type { FeedbackResult } from "../../../types";

const BACKEND_URL = import.meta.env.VITE_PYTHON_BACKEND_URL || "http://localhost:8000";
const WS_URL = BACKEND_URL.replace("http", "ws");

type SessionPhase = "setup" | "active" | "complete";

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
  const [exercises, setExercises] = useState<{ id: string; label: string; targetReps: number }[]>([]);
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    // Load exercises from plan or fetch personalized recommendations
    if (exercisePlan?.exercises?.length) {
      setExercises(
        exercisePlan.exercises.map((e: any) => ({
          id: e.exerciseId,
          label: e.label,
          targetReps: e.targetReps || 10,
        }))
      );
    } else if (user?.injuryType) {
      // No plan in store — re-generate from user's injury profile
      fetch(`${BACKEND_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          injury_type: user.injuryType,
          injury_region: user.injuryRegion || "",
          pain_regions: user.painRegions || [],
          treatment_phase: user.treatmentPhase || "active_rehab",
          age: user.age || 30,
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
              }))
            );
          }
        })
        .catch(() => {
          // Final fallback — generic exercises
          setExercises([
            { id: "arm_raise", label: "Arm Raise", targetReps: 10 },
            { id: "shoulder_abduction", label: "Shoulder Abduction", targetReps: 10 },
            { id: "squat", label: "Squat", targetReps: 10 },
            { id: "glute_bridge", label: "Glute Bridge", targetReps: 10 },
          ]);
        });
    } else {
      // No user profile — show generic exercises
      setExercises([
        { id: "arm_raise", label: "Arm Raise", targetReps: 10 },
        { id: "shoulder_abduction", label: "Shoulder Abduction", targetReps: 10 },
        { id: "squat", label: "Squat", targetReps: 10 },
        { id: "knee_bend", label: "Knee Bend", targetReps: 10 },
        { id: "glute_bridge", label: "Glute Bridge", targetReps: 10 },
        { id: "bicep_curl", label: "Bicep Curl", targetReps: 10 },
      ]);
    }
  }, [exercisePlan, user]);

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
        setRepState(data.repState || "idle");
        setAccuracy(data.accuracy || 0);
        setFeedback(data.feedback || null);
        setJointAngles(data.jointAngles || {});

        // Draw the annotated frame (with skeleton drawn by backend) on canvas
        if (data.annotatedFrame && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            const img = new Image();
            img.onload = () => {
              canvasRef.current!.width = img.width;
              canvasRef.current!.height = img.height;
              ctx.drawImage(img, 0, 0);
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
    setAccuracy(0);
    setFeedback(null);
    setAiInsight("");
    setAiCoaching("");
    setPhase("active");
    sessionStart.current = Date.now();

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
        const msg = await generateRealtimeCoaching(
          exercises.find((e) => e.id === exerciseId)?.label || exerciseId,
          jointAnglesRef.current,
          repsRef.current,
          exercises.find((e) => e.id === exerciseId)?.targetReps || 10,
          feedbackRef.current?.status || "unknown",
          feedbackRef.current?.message || "Detecting pose",
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
      const sessionData = {
        oduserId: userId,
        exerciseId: activeExercise,
        exerciseLabel: activeLabel,
        reps,
        targetReps,
        accuracy,
        duration,
        avgAngle: Object.values(jointAngles).reduce((a, b) => a + b, 0) /
          Math.max(Object.values(jointAngles).length, 1),
        feedback: feedback?.message || "",
        timestamp: new Date().toISOString(),
      };

      try {
        await saveSession({ ...sessionData, userId } as any);
      } catch (e) {
        console.warn("Save session failed:", e);
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {exercises.map((ex) => (
                  <button
                    key={ex.id}
                    className="btn btn-outline"
                    style={{
                      padding: "16px 14px",
                      textAlign: "left",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 4,
                    }}
                    onClick={() => startSession(ex.id)}
                  >
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{ex.label}</span>
                    <span style={{ fontSize: 11, color: "var(--color-grey-400)" }}>
                      Target: {ex.targetReps} reps
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Phase ── */}
      {phase === "active" && (
        <div className="grid-2">
          {/* Camera / Canvas */}
          <div className="widget fade-up">
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
                      transform: "scaleX(-1)",
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
                    {feedback.status === "good" ? "✅" : feedback.status === "warning" ? "⚠️" : "❌"}
                  </span>
                  {feedback.message}
                </div>
              )}
            </div>
          </div>

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
                  {reps}
                  <span style={{ fontSize: 24, color: "var(--color-grey-400)", fontWeight: 600 }}>
                    /{targetReps}
                  </span>
                </div>
                <p style={{ color: "var(--color-grey-400)", fontSize: 12, marginTop: 4 }}>
                  Reps Completed
                </p>

                {/* Progress bar */}
                <div className="progress-bar" style={{ marginTop: 16 }}>
                  <div
                    className="progress-bar__fill"
                    style={{ width: `${Math.min((reps / targetReps) * 100, 100)}%` }}
                  />
                </div>

                {/* Accuracy */}
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--color-grey-400)" }}>Accuracy</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: feedbackColor }}>
                    {accuracy}%
                  </span>
                </div>
              </div>
            </div>

            {/* How To Do This Exercise */}
            {exerciseInstructions.length > 0 && (
              <div className="widget fade-up delay-2" style={{ borderLeft: "3px solid var(--color-success)" }}>
                <div className="widget__header">
                  <h3 className="widget__title">📋 How to Perform</h3>
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
                      💡 Rep counts when you complete the full movement cycle and return to starting position.
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
                <h3 className="widget__title">🤖 AI Coach</h3>
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
        <div className="widget fade-up" style={{ maxWidth: 600 }}>
          <div className="widget__header">
            <h3 className="widget__title">Session Complete! 🎉</h3>
          </div>
          <div className="widget__body">
            <div style={{ marginBottom: 20, display: "flex", justifyContent: "center" }}>
              <div className="stat-card" style={{ maxWidth: 250, textAlign: "center" }}>
                <div className="stat-card__icon stat-card__icon--green">🏋️</div>
                <div className="stat-card__value">{reps}/{targetReps}</div>
                <div className="stat-card__label">Reps Completed</div>
              </div>
            </div>

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
              <div style={{
                padding: "16px",
                background: "var(--color-accent-dim)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(34,197,94,0.2)",
                marginBottom: 20,
              }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-accent-text)", textTransform: "uppercase", marginBottom: 6 }}>
                  🤖 AI Coach — Groq
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
