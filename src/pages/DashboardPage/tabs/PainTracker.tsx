import React, { useState, useEffect, type FC } from "react";
import { auth } from "../../../firebase/config";
import { savePainLog, getUserPainLogs } from "../../../services/firestoreService";
import type { PainLog } from "../../../types";

const BODY_ZONES = [
  { id: "head", label: "Head", cx: 150, cy: 30, r: 22 },
  { id: "neck", label: "Neck", cx: 150, cy: 62, r: 10 },
  { id: "left_shoulder", label: "Left Shoulder", cx: 110, cy: 88, r: 14 },
  { id: "right_shoulder", label: "Right Shoulder", cx: 190, cy: 88, r: 14 },
  { id: "chest", label: "Chest", cx: 150, cy: 110, r: 20 },
  { id: "left_elbow", label: "Left Elbow", cx: 82, cy: 140, r: 10 },
  { id: "right_elbow", label: "Right Elbow", cx: 218, cy: 140, r: 10 },
  { id: "upper_back", label: "Upper Back", cx: 150, cy: 130, r: 16 },
  { id: "abdomen", label: "Abdomen", cx: 150, cy: 155, r: 18 },
  { id: "lower_back", label: "Lower Back", cx: 150, cy: 175, r: 16 },
  { id: "left_wrist", label: "Left Wrist", cx: 65, cy: 175, r: 8 },
  { id: "right_wrist", label: "Right Wrist", cx: 235, cy: 175, r: 8 },
  { id: "left_hip", label: "Left Hip", cx: 125, cy: 200, r: 14 },
  { id: "right_hip", label: "Right Hip", cx: 175, cy: 200, r: 14 },
  { id: "left_knee", label: "Left Knee", cx: 125, cy: 262, r: 12 },
  { id: "right_knee", label: "Right Knee", cx: 175, cy: 262, r: 12 },
  { id: "left_ankle", label: "Left Ankle", cx: 125, cy: 325, r: 10 },
  { id: "right_ankle", label: "Right Ankle", cx: 175, cy: 325, r: 10 },
];

const PainTracker: FC = () => {
  const [painLevel, setPainLevel] = useState(3);
  const [selectedZone, setSelectedZone] = useState("");
  const [notes, setNotes] = useState("");
  const [entries, setEntries] = useState<PainLog[]>([]);
  const [hoveredZone, setHoveredZone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getUserPainLogs(uid, 20).then(setEntries);
  }, []);

  const addEntry = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedZone) return;

    setSaving(true);
    const entry: Omit<PainLog, "id"> = {
      userId: uid,
      bodyRegion: selectedZone,
      intensity: painLevel,
      notes: notes || "No notes",
      timestamp: new Date().toISOString(),
    };

    try {
      await savePainLog(entry);
      setEntries((prev) => [{ ...entry } as PainLog, ...prev]);
      setNotes("");
      setPainLevel(3);
      setSelectedZone("");
    } catch (e) {
      console.error("Pain log save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const getPainColor = (level: number) => {
    if (level <= 3) return "var(--color-accent-text)";
    if (level <= 6) return "var(--color-warning)";
    return "var(--color-danger)";
  };

  const getPainLabel = (level: number) => {
    if (level <= 3) return "Mild";
    if (level <= 6) return "Moderate";
    return "Severe";
  };

  const zoneLabel = (id: string) =>
    BODY_ZONES.find((z) => z.id === id)?.label || id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const relativeTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="pain-tracker-page fade-in">
      <div className="page-header">
        <h1 className="page-header__title">Pain Tracker</h1>
        <p className="page-header__subtitle">Log and monitor your pain levels. Tap a body region to start.</p>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Interactive Body Diagram */}
        <div className="widget fade-up">
          <div className="widget__header">
            <h3 className="widget__title">Select Pain Region</h3>
          </div>
          <div className="widget__body" style={{ display: "flex", justifyContent: "center" }}>
            <svg viewBox="0 0 300 370" width="280" style={{ maxHeight: 400 }}>
              {/* Body silhouette */}
              <ellipse cx="150" cy="30" rx="20" ry="24" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <rect x="130" y="54" width="40" height="12" rx="6" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <path d="M120,66 Q120,80 110,88 L100,100 L80,140 L65,175 Q62,180 65,182 L75,180 L82,142 L100,110 L120,100 Z" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <path d="M180,66 Q180,80 190,88 L200,100 L220,140 L235,175 Q238,180 235,182 L225,180 L218,142 L200,110 L180,100 Z" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <rect x="120" y="66" width="60" height="70" rx="12" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <rect x="120" y="130" width="60" height="50" rx="8" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <path d="M120,178 L110,205 L110,260 L115,262 L127,265 Q130,260 125,245 L130,210 L140,180 Z" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <path d="M180,178 L190,205 L190,260 L185,262 L173,265 Q170,260 175,245 L170,210 L160,180 Z" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <path d="M115,262 L112,300 L115,325 L120,340 L135,342 L130,325 L127,300 L127,265 Z" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />
              <path d="M185,262 L188,300 L185,325 L180,340 L165,342 L170,325 L173,300 L173,265 Z" fill="var(--color-surface-3)" stroke="var(--color-border-light)" strokeWidth="1" />

              {/* Clickable zones */}
              {BODY_ZONES.map((zone) => (
                <circle
                  key={zone.id}
                  cx={zone.cx}
                  cy={zone.cy}
                  r={zone.r}
                  fill={
                    selectedZone === zone.id
                      ? "rgba(239,68,68,0.5)"
                      : hoveredZone === zone.id
                      ? "rgba(245,158,11,0.3)"
                      : "rgba(255,255,255,0.05)"
                  }
                  stroke={
                    selectedZone === zone.id
                      ? "var(--color-danger)"
                      : hoveredZone === zone.id
                      ? "var(--color-warning)"
                      : "transparent"
                  }
                  strokeWidth="2"
                  cursor="pointer"
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone("")}
                  onClick={() => setSelectedZone(zone.id)}
                  style={{ transition: "all 0.2s ease" }}
                />
              ))}
              {hoveredZone && (
                <text
                  x="150"
                  y="365"
                  textAnchor="middle"
                  fill="var(--color-grey-200)"
                  fontSize="11"
                  fontFamily="Inter"
                >
                  {BODY_ZONES.find((z) => z.id === hoveredZone)?.label}
                </text>
              )}
            </svg>
          </div>
        </div>

        {/* Pain Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="widget fade-up delay-1">
            <div className="widget__header">
              <h3 className="widget__title">Log Pain</h3>
            </div>
            <div className="widget__body">
              {selectedZone ? (
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent-text)", marginBottom: 16 }}>
                  📍 {zoneLabel(selectedZone)}
                </p>
              ) : (
                <p style={{ fontSize: 13, color: "var(--color-grey-400)", marginBottom: 16 }}>
                  ← Select a body region on the diagram
                </p>
              )}

              <div className="form-group">
                <label className="form-label">
                  Pain Level: <span style={{ color: getPainColor(painLevel), fontWeight: 700 }}>{painLevel}/10 — {getPainLabel(painLevel)}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="pain-slider__input"
                  style={{
                    width: "100%",
                    background: `linear-gradient(to right, var(--color-accent) 0%, ${getPainColor(painLevel)} ${painLevel * 10}%, var(--color-border) ${painLevel * 10}%, var(--color-border) 100%)`,
                  }}
                />
                <div className="pain-slider__labels" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--color-grey-400)" }}>No Pain</span>
                  <span style={{ fontSize: 11, color: "var(--color-grey-400)" }}>Severe</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                  placeholder="Describe the pain..."
                  maxLength={200}
                  style={{ resize: "vertical" }}
                />
                <span style={{ fontSize: 10, color: "var(--color-grey-400)" }}>{notes.length}/200</span>
              </div>

              <button
                className="btn btn-primary"
                onClick={addEntry}
                style={{ width: "100%", marginTop: 8 }}
                disabled={!selectedZone || saving}
              >
                {saving ? "Saving…" : "Submit Entry"}
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stat-card fade-up delay-2">
            <div className="stat-card__icon stat-card__icon--green">📊</div>
            <div className="stat-card__value" style={{ color: entries.length > 0 ? getPainColor(entries[0]?.intensity || 0) : "var(--color-white)" }}>
              {entries.length > 0 ? `${entries[0].intensity}/10` : "—"}
            </div>
            <div className="stat-card__label">Latest Pain Level</div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="widget fade-up delay-3">
        <div className="widget__header">
          <h3 className="widget__title">Pain History</h3>
          <span style={{ fontSize: 12, color: "var(--color-grey-400)" }}>{entries.length} entries</span>
        </div>
        <div className="widget__body">
          {entries.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--color-grey-400)", fontSize: 13, padding: 20 }}>
              No pain entries logged yet.
            </p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th><th>Area</th><th>Level</th><th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.slice(0, 10).map((entry, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        {relativeTime(entry.timestamp)}
                      </td>
                      <td>{zoneLabel(entry.bodyRegion)}</td>
                      <td>
                        <span style={{ color: getPainColor(entry.intensity), fontWeight: 700, fontSize: 15 }}>
                          {entry.intensity}/10
                        </span>
                      </td>
                      <td style={{ color: "var(--color-grey-300)" }}>{entry.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PainTracker;
