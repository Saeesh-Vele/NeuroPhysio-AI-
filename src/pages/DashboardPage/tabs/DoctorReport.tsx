import React, { useState, useEffect, type FC } from "react";
import { jsPDF } from "jspdf";
import { auth } from "../../../firebase/config";
import { useAppStore } from "../../../store/useAppStore";
import {
  getUserSessions,
  getUserPainLogs,
  getUserCognitiveSessions,
} from "../../../services/firestoreService";
import { generateWeeklySummary, generateRiskAlert } from "../../../services/aiService";
import type { ExerciseSession, PainLog, CognitiveSession } from "../../../types";

const DoctorReport: FC = () => {
  const { user } = useAppStore();
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [painLogs, setPainLogs] = useState<PainLog[]>([]);
  const [cogSessions, setCogSessions] = useState<CognitiveSession[]>([]);
  const [generating, setGenerating] = useState(false);
  const [reportDays, setReportDays] = useState(30);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      const [s, p, c] = await Promise.all([
        getUserSessions(uid, 50),
        getUserPainLogs(uid, 30),
        getUserCognitiveSessions(uid, 30),
      ]);
      setSessions(s);
      setPainLogs(p);
      setCogSessions(c);
      setLoading(false);
    })();
  }, []);

  const totalSessions = sessions.length;
  const totalReps = sessions.reduce((a, s) => a + (s.reps || 0), 0);
  const avgAccuracy = totalSessions > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.accuracy || 0), 0) / totalSessions)
    : 0;
  const avgCogAccuracy = cogSessions.length > 0
    ? Math.round(cogSessions.reduce((a, s) => a + (s.accuracy || 0), 0) / cogSessions.length)
    : 0;
  const avgCogTime = cogSessions.length > 0
    ? Math.round(cogSessions.reduce((a, s) => a + (s.responseTimeMs || 0), 0) / cogSessions.length)
    : 0;
  const maxCogLevel = cogSessions.length > 0
    ? Math.max(...cogSessions.map((s) => s.level || 0))
    : 0;

  // Pain trend
  const recentPain = painLogs.slice(0, 7);
  const olderPain = painLogs.slice(7, 14);
  const avgRecent = recentPain.length > 0 ? recentPain.reduce((a, p) => a + p.intensity, 0) / recentPain.length : 0;
  const avgOlder = olderPain.length > 0 ? olderPain.reduce((a, p) => a + p.intensity, 0) / olderPain.length : 0;
  const painTrend = avgRecent < avgOlder ? "Improving ↓" : avgRecent > avgOlder ? "Worsening ↑" : "Stable →";

  const stats = [
    { metric: "Total Sessions Completed", value: String(totalSessions) },
    { metric: "Total Reps Completed", value: String(totalReps) },
    { metric: "Average Exercise Accuracy", value: `${avgAccuracy}%` },
    { metric: "Cognitive Score (avg)", value: `${avgCogAccuracy}%` },
    { metric: "Pain Level Trend", value: painTrend },
    { metric: "Treatment Phase", value: user?.treatmentPhase || "—" },
  ];

  const generatePDF = async () => {
    setGenerating(true);

    try {
      const doc = new jsPDF();
      const w = doc.internal.pageSize.width;

      // Page 1 — Cover
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, w, 297, "F");
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(28);
      doc.text("NeuroPhysio AI", 20, 40);
      doc.setFontSize(12);
      doc.setTextColor(180, 180, 180);
      doc.text("Rehabilitation Recovery Report", 20, 52);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      let y = 80;
      doc.text(`Patient: ${user?.name || "—"}`, 20, y); y += 10;
      doc.text(`Age: ${user?.age || "—"}`, 20, y); y += 10;
      doc.text(`Injury: ${user?.injuryType || "—"}`, 20, y); y += 10;
      doc.text(`Surgery Date: ${user?.surgeryDate || "N/A"}`, 20, y); y += 10;
      doc.text(`Report Period: Last ${reportDays} days`, 20, y); y += 10;
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);

      // Page 2 — Exercise Performance
      doc.addPage();
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, w, 297, "F");
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(18);
      doc.text("Exercise Performance", 20, 25);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      y = 45;
      doc.text(`Total Sessions: ${totalSessions}`, 20, y); y += 8;
      doc.text(`Total Reps: ${totalReps}`, 20, y); y += 8;
      doc.text(`Average Accuracy: ${avgAccuracy}%`, 20, y); y += 15;

      doc.setTextColor(180, 180, 180);
      doc.setFontSize(10);
      doc.text("Date | Exercise | Reps | Accuracy", 20, y); y += 6;
      doc.setDrawColor(50, 50, 50);
      doc.line(20, y, w - 20, y); y += 4;
      doc.setTextColor(220, 220, 220);
      sessions.slice(0, 15).forEach((s) => {
        const date = s.timestamp?.split("T")[0] || "—";
        doc.text(`${date}  |  ${s.exerciseLabel}  |  ${s.reps}  |  ${s.accuracy}%`, 20, y);
        y += 6;
      });

      // Page 3 — Pain Summary
      doc.addPage();
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, w, 297, "F");
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(18);
      doc.text("Pain Log Summary", 20, 25);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      y = 45;
      doc.text(`Total Pain Entries: ${painLogs.length}`, 20, y); y += 8;
      doc.text(`Pain Trend: ${painTrend}`, 20, y); y += 15;

      // Pain by region
      const regionMap: Record<string, number[]> = {};
      painLogs.forEach((p) => {
        if (!regionMap[p.bodyRegion]) regionMap[p.bodyRegion] = [];
        regionMap[p.bodyRegion].push(p.intensity);
      });
      Object.entries(regionMap).forEach(([region, vals]) => {
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
        doc.text(`${region}: avg ${avg}/10 (${vals.length} entries)`, 20, y);
        y += 7;
      });

      // Page 4 — Cognitive
      doc.addPage();
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, w, 297, "F");
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(18);
      doc.text("Cognitive Performance", 20, 25);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      y = 45;
      doc.text(`Total Sessions: ${cogSessions.length}`, 20, y); y += 8;
      doc.text(`Average Accuracy: ${avgCogAccuracy}%`, 20, y); y += 8;
      doc.text(`Average Response Time: ${avgCogTime}ms`, 20, y); y += 8;
      doc.text(`Highest Level: ${maxCogLevel}`, 20, y);

      // Page 5 — AI Summary + Disclaimer
      doc.addPage();
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, w, 297, "F");
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(18);
      doc.text("AI Insights & Recommendations", 20, 25);

      try {
        const summary = await generateWeeklySummary(sessions, painLogs);
        doc.setTextColor(220, 220, 220);
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(summary, w - 40);
        doc.text(lines, 20, 45);
      } catch {
        doc.setTextColor(180, 180, 180);
        doc.text("AI insights unavailable.", 20, 45);
      }

      // Disclaimer
      doc.setTextColor(130, 130, 130);
      doc.setFontSize(8);
      doc.text(
        "DISCLAIMER: This report is generated by AI and should not replace professional medical advice.",
        20,
        280
      );
      doc.text("NeuroPhysio AI — Powered by Gemini & MoveNet", 20, 286);

      const blob = doc.output("blob");
      setPdfBlob(blob);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NeuroPhysio_Report_${user?.name || "Patient"}_${new Date().toISOString().split("T")[0]}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="doctor-report-page fade-in">
      <div className="page-header">
        <h1 className="page-header__title">Doctor Report</h1>
        <p className="page-header__subtitle">Comprehensive recovery summary for your physician.</p>
      </div>

      {/* Patient Summary */}
      <div className="widget fade-up" style={{ marginBottom: 24 }}>
        <div className="widget__header">
          <h3 className="widget__title">Patient Summary</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              className="form-select"
              value={reportDays}
              onChange={(e) => setReportDays(Number(e.target.value))}
              style={{ padding: "6px 12px", fontSize: 12, minWidth: 80 }}
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
            <button
              className="btn btn-primary"
              style={{ padding: "6px 14px", fontSize: 12 }}
              onClick={generatePDF}
              disabled={generating}
            >
              {generating ? "Generating…" : "Generate PDF"}
            </button>
          </div>
        </div>
        <div className="widget__body">
          <div className="grid-2">
            <div>
              <p style={{ fontSize: 12, color: "var(--color-grey-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Name</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-white)" }}>{user?.name || "—"}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--color-grey-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Age</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-white)" }}>{user?.age || "—"}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--color-grey-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Injury Type</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-white)" }}>{user?.injuryType || "—"}</p>
            </div>
            <div>
              <p style={{ fontSize: 12, color: "var(--color-grey-400)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Surgery Date</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-white)" }}>{user?.surgeryDate || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="widget fade-up delay-1" style={{ marginBottom: 24 }}>
        <div className="widget__header">
          <h3 className="widget__title">{reportDays}-Day Statistics</h3>
        </div>
        <div className="widget__body">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Metric</th><th style={{ textAlign: "right" }}>Value</th></tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.metric}>
                    <td>{s.metric}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--color-white)", fontFamily: "var(--font-mono)" }}>
                      {s.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Download buttons */}
      {pdfBlob && (
        <div className="widget fade-up delay-2" style={{ marginBottom: 24 }}>
          <div className="widget__body" style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary" onClick={downloadPDF}>
              📥 Download PDF
            </button>
            <a
              className="btn btn-outline"
              href={`mailto:?subject=NeuroPhysio Recovery Report — ${user?.name || "Patient"}&body=Please find attached the rehabilitation report.`}
            >
              📧 Share via Email
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorReport;
