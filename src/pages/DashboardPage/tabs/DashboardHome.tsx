import React, { useEffect, useState, type FC } from "react";
import { useAppStore } from "../../../store/useAppStore";
import { getUserSessions, getUserPainLogs, getUserCognitiveSessions } from "../../../services/firestoreService";
import { generateWeeklySummary, generateRiskAlert } from "../../../services/aiService";
import { auth } from "../../../firebase/config";
import { HiExclamationTriangle, HiBolt, HiCpuChip, HiChartBar } from "react-icons/hi2";
import { FaRunning } from "react-icons/fa";
import type { ExerciseSession, PainLog, CognitiveSession } from "../../../types";

const DashboardHome: FC = () => {
  const { user, exercisePlan } = useAppStore();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [painLogs, setPainLogs] = useState<PainLog[]>([]);
  const [cogSessions, setCogSessions] = useState<CognitiveSession[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [riskAlert, setRiskAlert] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const displayName = user?.name || auth.currentUser?.displayName || "there";
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    (async () => {
      setLoading(true);
      const [s, p, c] = await Promise.all([
        getUserSessions(uid, 30),
        getUserPainLogs(uid, 14),
        getUserCognitiveSessions(uid, 14),
      ]);
      setSessions(s);
      setPainLogs(p);
      setCogSessions(c);

      // AI weekly summary
      try {
        const summary = await generateWeeklySummary(s, p);
        setAiInsight(summary);
      } catch { setAiInsight(""); }

      // Risk alert
      try {
        const alert = await generateRiskAlert(p);
        setRiskAlert(alert);
      } catch { setRiskAlert(null); }

      setLoading(false);
    })();
  }, []);

  // Calculate stats
  const totalSessions = sessions.length;
  const avgAccuracy = totalSessions > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.accuracy || 0), 0) / totalSessions)
    : 0;
  const totalReps = sessions.reduce((a, s) => a + (s.reps || 0), 0);
  const latestCog = cogSessions.length > 0 ? cogSessions[0].accuracy : 0;

  // Streak calculation
  const sessionDates = new Set(sessions.map((s) => s.timestamp?.split("T")[0]));
  let streak = 0;
  const d = new Date();
  while (sessionDates.has(d.toISOString().split("T")[0])) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  // Weekly accuracy chart data
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  const exerciseData = weekDays.map((day, i) => {
    // Get real sessions from the past 7 days for this weekday
    const targetDay = (i + 1) % 7; // Mon=1...Sun=0
    const matching = sessions.filter((s) => {
      const d = new Date(s.timestamp);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
      return d.getDay() === targetDay && diffDays < 7;
    });
    const avg = matching.length > 0
      ? Math.round(matching.reduce((a, s) => a + (s.reps || 0), 0) / matching.length)
      : 0;
    return { day, value: avg, count: matching.length };
  });

  const upcomingExercise = exercisePlan?.exercises?.[0];

  return (
    <div className="dash-home fade-in">
      <div className="page-header">
        <h1 className="page-header__title">{greeting}, {displayName} 👋</h1>
        <p className="page-header__subtitle">Here's your recovery overview for today.</p>
      </div>

      {/* Risk Alert */}
      {riskAlert && (
        <div
          style={{
            padding: "14px 20px",
            background: "var(--color-danger-dim)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "var(--radius-lg)",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <HiExclamationTriangle size={20} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
          <p style={{ fontSize: 13, color: "var(--color-danger)", lineHeight: 1.5 }}>
            {riskAlert}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card fade-up delay-1">
          <div className="stat-card__icon stat-card__icon--green"><FaRunning size={20} /></div>
          <div className="stat-card__row">
            <div>
              <div className="stat-card__value">{avgAccuracy}%</div>
              <div className="stat-card__label">Avg Exercise Accuracy</div>
            </div>
          </div>
        </div>

        <div className="stat-card fade-up delay-2">
          <div className="stat-card__icon stat-card__icon--orange"><HiBolt size={20} /></div>
          <div className="stat-card__row">
            <div>
              <div className="stat-card__value">{streak}</div>
              <div className="stat-card__label">Recovery Streak (days)</div>
            </div>
          </div>
        </div>

        <div className="stat-card fade-up delay-3">
          <div className="stat-card__icon stat-card__icon--blue"><HiCpuChip size={20} /></div>
          <div className="stat-card__row">
            <div>
              <div className="stat-card__value">{latestCog}%</div>
              <div className="stat-card__label">Latest Cognitive Score</div>
            </div>
          </div>
        </div>

        <div className="stat-card fade-up delay-4">
          <div className="stat-card__icon stat-card__icon--green"><HiChartBar size={20} /></div>
          <div className="stat-card__row">
            <div>
              <div className="stat-card__value">{totalSessions}</div>
              <div className="stat-card__label">Total Sessions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Upcoming */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="widget fade-up delay-3">
          <div className="widget__header">
            <h3 className="widget__title">7-Day Reps Completed</h3>
          </div>
          <div className="widget__body">
            {totalSessions === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ fontSize: 40, marginBottom: 8 }}><HiChartBar size={40} style={{ color: "var(--color-grey-400)" }} /></p>
                <p style={{ fontSize: 14, color: "var(--color-grey-400)" }}>Complete your first exercise session to see your chart!</p>
              </div>
            ) : (() => {
              const maxVal = Math.max(...exerciseData.map((d) => d.value), 1);
              const yScale = 180 / maxVal;
              return (
              <div className="line-chart">
              <div className="line-chart__y-axis">
                <span>{maxVal}</span><span>{Math.round(maxVal * 0.66)}</span><span>{Math.round(maxVal * 0.33)}</span><span>0</span>
              </div>
              <div className="line-chart__content">
                <div className="line-chart__grid">
                  <div className="grid-line" /><div className="grid-line" /><div className="grid-line" /><div className="grid-line" />
                </div>
                <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="line-chart__svg">
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M0,${200 - exerciseData[0].value * yScale} ${exerciseData.map((d, i) => `L${i * 100},${200 - d.value * yScale}`).join(" ")} L600,${200 - exerciseData[6].value * yScale} L600,200 L0,200 Z`}
                    fill="url(#lineGrad)"
                  />
                  <polyline
                    points={exerciseData.map((d, i) => `${i * 100},${200 - d.value * yScale}`).join(" ")}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {exerciseData.map((d, i) => (
                    <circle
                      key={i}
                      cx={i * 100}
                      cy={200 - d.value * yScale}
                      r="5"
                      fill="var(--color-accent)"
                      stroke="var(--color-surface)"
                      strokeWidth="2"
                    />
                  ))}
                </svg>
                <div className="line-chart__x-axis">
                  {exerciseData.map((d) => (
                    <span key={d.day}>{d.day}</span>
                  ))}
                </div>
              </div>
            </div>
              );})()}
          </div>
        </div>

        <div className="widget fade-up delay-4">
          <div className="widget__header">
            <h3 className="widget__title">Upcoming Session</h3>
          </div>
          <div className="widget__body" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 220 }}>
            <div>
              <p style={{ color: "var(--color-grey-100)", fontSize: 15, marginBottom: 4 }}>
                {upcomingExercise ? upcomingExercise.label : `${user?.injuryType || "Rehabilitation"} Session`}
              </p>
              <p style={{ color: "var(--color-grey-400)", fontSize: 13 }}>
                {upcomingExercise
                  ? `Target: ${upcomingExercise.targetReps} reps · ${upcomingExercise.priority} priority`
                  : "Estimated: 25 min"}
              </p>
              {upcomingExercise?.reason && (
                <p style={{ color: "var(--color-accent-text)", fontSize: 12, marginTop: 8, fontStyle: "italic" }}>
                  {upcomingExercise.reason}
                </p>
              )}
            </div>
            <a
              href="/dashboard/exercise"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", marginTop: 32, textAlign: "center" }}
            >
              ▶ Start Session
            </a>
          </div>
        </div>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="widget fade-up delay-5">
          <div className="widget__header">
            <h3 className="widget__title">AI Weekly Insight</h3>
            <span className="badge-accent">Groq</span>
          </div>
          <div className="widget__body">
            <p style={{ color: "var(--color-grey-100)", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {aiInsight}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
