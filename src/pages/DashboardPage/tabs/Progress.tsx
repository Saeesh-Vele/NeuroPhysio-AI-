import React, { useEffect, useState, useMemo, type FC } from "react";
import { HiCheckCircle, HiArrowTrendingUp, HiClock, HiLockClosed, HiLockOpen } from "react-icons/hi2";
import { FaDumbbell, FaBullseye, FaChartBar, FaBrain } from "react-icons/fa";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { auth } from "../../../firebase/config";
import {
  getUserSessions,
  getUserPainLogs,
  getUserCognitiveSessions,
  getMobilityHistory,
  getExerciseDifficultyUnlocks,
  getBaselineMobility,
  type SessionMobilityData,
} from "../../../services/firestoreService";
import { generateWeeklySummary } from "../../../services/aiService";
import type { ExerciseSession, PainLog, CognitiveSession, MobilityProgress } from "../../../types";

const renderMarkdown = (text: string): string => {
  return text
    .replace(/^###\s+(.+)$/gm, '<div style="font-size:13px;font-weight:700;color:#22c55e;margin:12px 0 4px;text-transform:uppercase;letter-spacing:0.5px">$1</div>')
    .replace(/^##\s+(.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#22c55e;margin:14px 0 6px">$1</div>')
    .replace(/^#\s+(.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#22c55e;margin:16px 0 8px">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--color-white);font-weight:600">$1</strong>')
    .replace(/(?<![*])\*([^*]+)\*(?![*])/g, '<em>$1</em>')
    .replace(/^[\-\*]\s+(.+)$/gm, '<div style="display:flex;gap:8px;align-items:baseline;margin:3px 0;padding-left:4px"><span style="color:#22c55e;font-size:8px;margin-top:5px">●</span><span>$1</span></div>')
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:8px;align-items:baseline;margin:3px 0;padding-left:4px"><span style="color:#22c55e;font-weight:600;min-width:16px">$1.</span><span>$2</span></div>')
    .replace(/\n\n/g, '<div style="height:10px"></div>')
    .replace(/\n/g, '<br/>');
};

const Progress: FC = () => {
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [painLogs, setPainLogs] = useState<PainLog[]>([]);
  const [cogSessions, setCogSessions] = useState<CognitiveSession[]>([]);
  const [mobilityHistory, setMobilityHistory] = useState<MobilityProgress[]>([]);
  const [baselineMobility, setBaselineMobility] = useState<SessionMobilityData[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("all");
  const [unlockedDiffs, setUnlockedDiffs] = useState<string[]>(["beginner"]);
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"exercise" | "pain" | "cognitive" | "mobility">("exercise");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      setLoading(true);
      const [s, p, c, m] = await Promise.all([
        getUserSessions(uid, 30),
        getUserPainLogs(uid, 30),
        getUserCognitiveSessions(uid, 30),
        getMobilityHistory(uid),
      ]);
      setSessions(s);
      setPainLogs(p);
      setCogSessions(c);
      setMobilityHistory(m);
      console.log("Fetched cognitive sessions:", c);
      setLoading(false);

      // Load baseline
      try {
        const bl = await getBaselineMobility(uid);
        setBaselineMobility(bl || []);
      } catch { /* ignore */ }

      // Load unlocks
      getExerciseDifficultyUnlocks(uid).then(setUnlockedDiffs).catch(() => {});

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

  // ROM improvement
  const avgRomImprovement = (() => {
    if (mobilityHistory.length < 2) return 0;
    const byExercise: Record<string, MobilityProgress[]> = {};
    mobilityHistory.forEach(m => {
      if (!byExercise[m.exerciseId]) byExercise[m.exerciseId] = [];
      byExercise[m.exerciseId].push(m);
    });
    let totalImprovement = 0;
    let count = 0;
    Object.values(byExercise).forEach(sessions => {
      if (sessions.length >= 2) {
        const sorted = [...sessions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const improvement = sorted[sorted.length - 1].peakAngle - sorted[0].peakAngle;
        totalImprovement += improvement;
        count++;
      }
    });
    return count > 0 ? Math.round(totalImprovement / count) : 0;
  })();

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
          <div className="stat-card__value">{avgRomImprovement > 0 ? `+${avgRomImprovement}°` : "—"}</div>
          <div className="stat-card__label">Avg ROM Improvement</div>
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
            {(["exercise", "pain", "cognitive", "mobility"] as const).map((tab) => (
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
                  <tr><th>Time</th><th>Exercise</th><th>Reps</th><th>Type</th><th>Status</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
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
                          <td>{(s.reps || 0) % 1 === 0 ? s.reps : (s.reps || 0).toFixed(1)}/{s.targetReps}</td>
                          <td>
                            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: (s.partialReps || 0) > 0 ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)", color: (s.partialReps || 0) > 0 ? "#f59e0b" : "#22c55e", fontWeight: 600 }}>
                              {(s.fullReps || s.reps || 0)}F + {(s.partialReps || 0)}H
                            </span>
                          </td>
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

          {activeTab === "mobility" && (
            <div>
              {/* Difficulty Progression */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                {(["beginner", "intermediate", "advanced"] as const).map((diff) => {
                  const isUnlocked = unlockedDiffs.includes(diff);
                  const color = diff === "beginner" ? "#22c55e" : diff === "intermediate" ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={diff} style={{ flex: 1, padding: "12px 16px", borderRadius: "var(--radius-md)", background: isUnlocked ? `${color}10` : "var(--color-surface-2)", border: `1px solid ${isUnlocked ? color : "var(--color-border)"}`, textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
                        {isUnlocked ? <HiLockOpen size={14} style={{ color }} /> : <HiLockClosed size={14} style={{ color: "var(--color-grey-500)" }} />}
                        <span style={{ fontSize: 13, fontWeight: 700, color: isUnlocked ? color : "var(--color-grey-500)", textTransform: "capitalize" }}>{diff}</span>
                      </div>
                      <div style={{ fontSize: 11, color: isUnlocked ? "var(--color-grey-300)" : "var(--color-grey-500)" }}>
                        {isUnlocked ? "✓ Unlocked" : "Locked"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Per-Exercise ROM Charts with Baseline Comparison */}
              {mobilityHistory.length > 0 && (() => {
                // Get unique exercises with data
                const exerciseList = [...new Set(mobilityHistory.filter(m => m.peakAngle > 0).map(m => m.exerciseLabel))];
                if (exerciseList.length === 0) return null;
                
                // Filter data
                const filteredHistory = selectedExercise === "all"
                  ? mobilityHistory.filter(m => m.peakAngle > 0)
                  : mobilityHistory.filter(m => m.peakAngle > 0 && m.exerciseLabel === selectedExercise);

                const chartData = filteredHistory
                  .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""))
                  .map((m, idx) => ({
                    session: `#${idx + 1}`,
                    date: new Date(m.timestamp || "").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    exercise: m.exerciseLabel,
                    peakAngle: Number(m.peakAngle.toFixed(1)),
                    rom: Number(m.maxRomAchieved.toFixed(1)),
                    reps: m.fullReps + m.partialReps * 0.5,
                  }));

                // Find baseline for selected exercise
                const baselineEntry = selectedExercise !== "all"
                  ? baselineMobility.find(b => b.exerciseLabel === selectedExercise)
                  : null;

                return (
                  <div style={{ marginBottom: 24 }}>
                    {/* Exercise Filter */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-white)" }}>
                        <HiArrowTrendingUp size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6, color: "#22c55e" }} />
                        Assessed Baseline vs Current
                      </div>
                      <select
                        value={selectedExercise}
                        onChange={(e) => setSelectedExercise(e.target.value)}
                        style={{
                          marginLeft: "auto",
                          background: "var(--color-surface-2)",
                          border: "1px solid var(--color-border)",
                          borderRadius: 6,
                          padding: "6px 12px",
                          color: "var(--color-white)",
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <option value="all">All Exercises</option>
                        {exerciseList.map(ex => (
                          <option key={ex} value={ex}>{ex}</option>
                        ))}
                      </select>
                    </div>

                    {/* Baseline Info Card (when specific exercise selected) */}
                    {baselineEntry && (
                      <div style={{ padding: "12px 16px", background: "rgba(99,102,241,0.08)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.2)", marginBottom: 12, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 11, color: "#818cf8", fontWeight: 700 }}>🔬 ASSESSED BASELINE</div>
                        <div style={{ fontSize: 12, color: "var(--color-grey-200)" }}>Peak: <strong>{baselineEntry.peakAngle.toFixed(1)}°</strong></div>
                        <div style={{ fontSize: 12, color: "var(--color-grey-200)" }}>ROM: <strong>{baselineEntry.rom.toFixed(1)}°</strong></div>
                        <div style={{ fontSize: 12, color: "var(--color-grey-200)" }}>Reps: <strong>{baselineEntry.reps}</strong></div>
                        {chartData.length > 0 && (() => {
                          const latestPeak = chartData[chartData.length - 1].peakAngle;
                          const diff = latestPeak - baselineEntry.peakAngle;
                          const improved = diff > 0;
                          return (
                            <div style={{ marginLeft: "auto", fontSize: 13, fontWeight: 800, color: improved ? "#22c55e" : "#f59e0b" }}>
                              {improved ? `+${diff.toFixed(1)}°` : `${diff.toFixed(1)}°`} since baseline
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Chart */}
                    {chartData.length >= 1 && (
                      <div style={{ padding: "20px", background: "var(--color-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                            <XAxis
                              dataKey="session"
                              tick={{ fill: "#9ca3af", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fill: "#9ca3af", fontSize: 10 }}
                              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                              tickLine={false}
                              unit="°"
                            />
                            <Tooltip
                              contentStyle={{
                                background: "#1a1a2e",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 8,
                                fontSize: 12,
                                color: "#e5e7eb",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                              }}
                              labelStyle={{ color: "#9ca3af", fontWeight: 600, marginBottom: 4 }}
                              formatter={(value: any, name: any) => [
                                `${value}°`,
                                name === "peakAngle" ? "Peak Angle" : name === "rom" ? "ROM" : name
                              ]}
                            />
                            <Legend
                              wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
                              formatter={(value: any) => value === "peakAngle" ? "Peak Angle" : value === "rom" ? "ROM Range" : value}
                            />
                            {/* Baseline reference lines */}
                            {baselineEntry && (
                              <>
                                <ReferenceLine
                                  y={baselineEntry.peakAngle}
                                  stroke="#818cf8"
                                  strokeDasharray="8 4"
                                  strokeWidth={1.5}
                                  label={{ value: `Baseline Peak: ${baselineEntry.peakAngle.toFixed(1)}°`, position: "insideTopRight", fill: "#818cf8", fontSize: 10 }}
                                />
                                <ReferenceLine
                                  y={baselineEntry.rom}
                                  stroke="#6ee7b7"
                                  strokeDasharray="8 4"
                                  strokeWidth={1.5}
                                  label={{ value: `Baseline ROM: ${baselineEntry.rom.toFixed(1)}°`, position: "insideBottomRight", fill: "#6ee7b7", fontSize: 10 }}
                                />
                              </>
                            )}
                            <Line
                              type="monotone"
                              dataKey="peakAngle"
                              stroke="#a78bfa"
                              strokeWidth={2.5}
                              dot={{ fill: "#a78bfa", r: 4, strokeWidth: 0 }}
                              activeDot={{ r: 6, fill: "#a78bfa", stroke: "#fff", strokeWidth: 2 }}
                            />
                            <Line
                              type="monotone"
                              dataKey="rom"
                              stroke="#22c55e"
                              strokeWidth={2.5}
                              dot={{ fill: "#22c55e", r: 4, strokeWidth: 0 }}
                              activeDot={{ r: 6, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        {/* Summary below chart */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
                          {(() => {
                            const peaks = chartData.map(d => d.peakAngle);
                            const roms = chartData.map(d => d.rom);
                            const lastPeak = peaks[peaks.length - 1];
                            const firstPeak = peaks[0];
                            const trend = lastPeak - firstPeak;
                            return (
                              <>
                                <div style={{ textAlign: "center", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                                  <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Best Peak</div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: "#a78bfa" }}>{Math.max(...peaks).toFixed(1)}°</div>
                                </div>
                                <div style={{ textAlign: "center", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                                  <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Best ROM</div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: "#22c55e" }}>{Math.max(...roms).toFixed(1)}°</div>
                                </div>
                                <div style={{ textAlign: "center", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                                  <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Sessions</div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--color-grey-200)" }}>{chartData.length}</div>
                                </div>
                                <div style={{ textAlign: "center", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: 6 }}>
                                  <div style={{ fontSize: 9, color: "var(--color-grey-400)", textTransform: "uppercase" }}>Trend</div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: trend >= 0 ? "#22c55e" : "#f59e0b" }}>
                                    {trend >= 0 ? "+" : ""}{trend.toFixed(1)}°
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ROM History Table */}
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Time</th><th>Exercise</th><th>Peak Angle</th><th>ROM</th><th>Reps</th></tr></thead>
                  <tbody>
                    {mobilityHistory.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 20 }}>No mobility data yet. Complete an exercise session!</td></tr>
                    ) : (
                      mobilityHistory.slice(0, 20).map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{relativeTime(m.timestamp)}</td>
                          <td>{m.exerciseLabel}</td>
                          <td style={{ fontWeight: 700, color: "#a78bfa" }}>{Number(m.peakAngle).toFixed(1)}°</td>
                          <td style={{ fontWeight: 700, color: "#22c55e" }}>{Number(m.maxRomAchieved).toFixed(1)}°</td>
                          <td>
                            <span style={{ fontSize: 11 }}>{m.fullReps}F + {m.partialReps}H</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="widget fade-up delay-5" style={{ marginTop: 24 }}>
          <div className="widget__header">
            <h3 className="widget__title">AI Weekly Analysis</h3>
            <span className="badge-accent">Groq</span>
          </div>
          <div className="widget__body">
            <div
              style={{ color: "var(--color-grey-100)", fontSize: 14, lineHeight: 1.7 }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(aiInsight) }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Progress;
