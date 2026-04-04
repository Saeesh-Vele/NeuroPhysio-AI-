import React, { useEffect, useState, type FC } from "react";
import { HiCheckCircle, HiArrowTrendingUp, HiClock } from "react-icons/hi2";
import { FaDumbbell, FaBullseye, FaChartBar, FaBrain } from "react-icons/fa";
import { auth } from "../../../firebase/config";
import {
  getUserSessions,
  getUserPainLogs,
  getUserCognitiveSessions,
} from "../../../services/firestoreService";
import { generateWeeklySummary } from "../../../services/aiService";
import type { ExerciseSession, PainLog, CognitiveSession } from "../../../types";

const Progress: FC = () => {
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [painLogs, setPainLogs] = useState<PainLog[]>([]);
  const [cogSessions, setCogSessions] = useState<CognitiveSession[]>([]);
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"exercise" | "pain" | "cognitive">("exercise");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      setLoading(true);
      const [s, p, c] = await Promise.all([
        getUserSessions(uid, 30),
        getUserPainLogs(uid, 30),
        getUserCognitiveSessions(uid, 30),
      ]);
      setSessions(s);
      setPainLogs(p);
      setCogSessions(c);
      console.log("Fetched cognitive sessions:", c);
      setLoading(false);

      try {
        const insight = await generateWeeklySummary(s, p, c);
        setAiInsight(insight);
      } catch {}
    })();
  }, []);

  // Compute stats
  const totalSessions = sessions.length;
  const totalReps = sessions.reduce((a, s) => a + (s.reps || 0), 0);
  const avgAccuracy = totalSessions > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.accuracy || 0), 0) / totalSessions)
    : 0;
  const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0);
  const avgCog = cogSessions.length > 0
    ? Math.round(cogSessions.reduce((a, s) => a + (s.accuracy || 0), 0) / cogSessions.length)
    : 0;

  // Weekly progression data
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const daySessions = sessions.filter((s) => s.timestamp?.startsWith(dateStr));
    const dayAvg = daySessions.length > 0
      ? Math.round(daySessions.reduce((a, s) => a + (s.accuracy || 0), 0) / daySessions.length)
      : 0;
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      accuracy: dayAvg,
      sessions: daySessions.length,
    };
  });

  const relativeTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="progress-page fade-in">
      <div className="page-header">
        <h1 className="page-header__title">Progress</h1>
        <p className="page-header__subtitle">Track your recovery journey over time.</p>
      </div>

      {/* Top Stats */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card fade-up delay-1">
          <div className="stat-card__icon stat-card__icon--green"><FaDumbbell size={18} /></div>
          <div className="stat-card__value">{totalSessions}</div>
          <div className="stat-card__label">Total Sessions</div>
        </div>
        <div className="stat-card fade-up delay-2">
          <div className="stat-card__icon stat-card__icon--blue"><FaBullseye size={18} /></div>
          <div className="stat-card__value">{avgAccuracy}%</div>
          <div className="stat-card__label">Avg Accuracy</div>
        </div>
        <div className="stat-card fade-up delay-3">
          <div className="stat-card__icon stat-card__icon--orange"><FaChartBar size={18} /></div>
          <div className="stat-card__value">{totalReps}</div>
          <div className="stat-card__label">Total Reps</div>
        </div>
        <div className="stat-card fade-up delay-4">
          <div className="stat-card__icon stat-card__icon--green"><FaBrain size={18} /></div>
          <div className="stat-card__value">{avgCog}%</div>
          <div className="stat-card__label">Avg Cognitive Score</div>
        </div>
      </div>

      {/* Chart */}
      <div className="widget fade-up delay-3" style={{ marginBottom: 24 }}>
        <div className="widget__header">
          <h3 className="widget__title">7-Day Accuracy Trend</h3>
        </div>
        <div className="widget__body">
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 180 }}>
            {weekData.map((d, i) => {
              const barHeight = Math.max(d.accuracy * 1.5, 8);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-white)" }}>
                    {d.accuracy > 0 ? `${d.accuracy}%` : "—"}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      height: barHeight,
                      background: d.accuracy > 0
                        ? "linear-gradient(to top, var(--color-accent), rgba(34,197,94,0.4))"
                        : "var(--color-border)",
                      borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                      transition: "height 0.6s ease",
                    }}
                  />
                  <span style={{ fontSize: 11, color: "var(--color-grey-400)" }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="widget fade-up delay-4">
        <div className="widget__header">
          <div style={{ display: "flex", gap: 4 }}>
            {(["exercise", "pain", "cognitive"] as const).map((tab) => (
              <button
                key={tab}
                className={`btn ${activeTab === tab ? "btn-primary" : "btn-outline"}`}
                style={{ padding: "6px 16px", fontSize: 12, textTransform: "capitalize" }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="widget__body">
          {activeTab === "exercise" && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr><th>Time</th><th>Exercise</th><th>Reps</th><th>Status</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>
                      No exercise sessions yet. Start your first session!
                    </td></tr>
                  ) : (
                    sessions.slice(0, 15).map((s, i) => {
                      const met = (s.reps || 0) >= (s.targetReps || 10);
                      const exceeded = (s.reps || 0) > (s.targetReps || 10);
                      return (
                        <tr key={i}>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{relativeTime(s.timestamp)}</td>
                          <td>{s.exerciseLabel}</td>
                          <td>{s.reps}/{s.targetReps}</td>
                          <td style={{ fontWeight: 700, color: exceeded ? "#22c55e" : met ? "var(--color-accent-text)" : "var(--color-warning)" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {exceeded ? <><HiArrowTrendingUp size={16} /> Exceeded</> : met ? <><HiCheckCircle size={16} /> Completed</> : <><HiClock size={14} /> {Math.round(((s.reps || 0) / (s.targetReps || 10)) * 100)}%</>}
                            </span>
                          </td>
                          <td style={{ fontFamily: "var(--font-mono)" }}>{Math.floor((s.duration || 0) / 60)}:{String((s.duration || 0) % 60).padStart(2, "0")}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "pain" && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Time</th><th>Region</th><th>Intensity</th><th>Notes</th></tr></thead>
                <tbody>
                  {painLogs.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: 20 }}>No pain logs.</td></tr>
                  ) : (
                    painLogs.slice(0, 15).map((p, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{relativeTime(p.timestamp)}</td>
                        <td>{p.bodyRegion.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</td>
                        <td style={{ fontWeight: 700, color: p.intensity >= 7 ? "var(--color-danger)" : p.intensity >= 4 ? "var(--color-warning)" : "var(--color-accent-text)" }}>
                          {p.intensity}/10
                        </td>
                        <td style={{ color: "var(--color-grey-300)" }}>{p.notes}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "cognitive" && (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Time</th><th>Level</th><th>Accuracy</th><th>Response</th></tr></thead>
                <tbody>
                  {cogSessions.length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: "center", padding: 20 }}>No cognitive sessions.</td></tr>
                  ) : (
                    cogSessions.slice(0, 15).map((c, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{relativeTime(c.timestamp)}</td>
                        <td>Level {c.level}</td>
                        <td style={{ fontWeight: 700, color: c.accuracy === 100 ? "var(--color-accent-text)" : "var(--color-warning)" }}>
                          {c.accuracy}%
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{(c.responseTimeMs / 1000).toFixed(1)}s</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="widget fade-up delay-5" style={{ marginTop: 24 }}>
          <div className="widget__header">
            <h3 className="widget__title">AI Weekly Analysis</h3>
            <span className="badge-accent">Gemini</span>
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

export default Progress;
