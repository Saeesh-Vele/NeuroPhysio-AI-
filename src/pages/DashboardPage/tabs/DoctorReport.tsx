import React, { useState, useEffect, useRef, type FC } from "react";
import { jsPDF } from "jspdf";
import { auth } from "../../../firebase/config";
import { useAppStore } from "../../../store/useAppStore";
import {
  getUserSessions,
  getUserPainLogs,
  getUserCognitiveSessions,
} from "../../../services/firestoreService";
import { generateWeeklySummary } from "../../../services/aiService";
import {
  HiDocumentArrowDown,
  HiShare,
  HiClipboardDocument,
  HiPrinter,
  HiChartBar,
  HiCheckCircle,
  HiExclamationTriangle,
  HiArrowTrendingUp,
  HiArrowTrendingDown,
  HiClock,
  HiUser,
  HiCalendarDays,
  HiBeaker,
  HiCpuChip,
  HiHeart,
} from "react-icons/hi2";
import { FaDumbbell, FaBrain } from "react-icons/fa";
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
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const painChartRef = useRef<HTMLCanvasElement>(null);

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

  // ── Computed Stats ──
  const totalSessions = sessions.length;
  const totalReps = sessions.reduce((a, s) => a + (s.reps || 0), 0);
  const avgAccuracy = totalSessions > 0
    ? Math.round(sessions.reduce((a, s) => a + (s.accuracy || 0), 0) / totalSessions)
    : 0;
  const totalDuration = sessions.reduce((a, s) => a + (s.duration || 0), 0);
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
  const painTrend = avgRecent < avgOlder ? "Improving" : avgRecent > avgOlder ? "Worsening" : "Stable";
  const painTrendIcon = painTrend === "Improving" ? <HiArrowTrendingDown size={14} style={{ color: "#22c55e" }} /> : painTrend === "Worsening" ? <HiArrowTrendingUp size={14} style={{ color: "#ef4444" }} /> : <HiClock size={14} style={{ color: "#f59e0b" }} />;

  // Exercise frequency per day (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
  const dailyReps = last7Days.map((day) =>
    sessions.filter((s) => s.timestamp?.startsWith(day)).reduce((a, s) => a + (s.reps || 0), 0)
  );
  const maxReps = Math.max(...dailyReps, 1);

  // Pain by region
  const regionMap: Record<string, number[]> = {};
  painLogs.forEach((p) => {
    if (!regionMap[p.bodyRegion]) regionMap[p.bodyRegion] = [];
    regionMap[p.bodyRegion].push(p.intensity);
  });

  // ── Draw Charts ──
  useEffect(() => {
    // Reps chart
    const canvas = chartRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const pad = 40, chartW = W - pad * 2, chartH = H - pad * 2;
    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = pad + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad, gy); ctx.lineTo(W - pad, gy); ctx.stroke();
    }
    // Bars
    const barW = chartW / 7 * 0.5;
    dailyReps.forEach((v, i) => {
      const x = pad + (chartW / 7) * i + (chartW / 7 - barW) / 2;
      const barH = (v / maxReps) * chartH;
      const y = pad + chartH - barH;
      const grad = ctx.createLinearGradient(x, y, x, pad + chartH);
      grad.addColorStop(0, "#22c55e"); grad.addColorStop(1, "rgba(34,197,94,0.2)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();
      // Label
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(last7Days[i].slice(5), x + barW / 2, H - 8);
      if (v > 0) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px system-ui";
        ctx.fillText(String(v), x + barW / 2, y - 6);
      }
    });
  }, [sessions, loading]);

  // Pain chart
  useEffect(() => {
    const canvas = painChartRef.current;
    if (!canvas || painLogs.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const regions = Object.entries(regionMap);
    if (regions.length === 0) return;
    const pad = 40, chartH = H - pad * 2, barH = Math.min(30, chartH / regions.length - 8);

    regions.forEach(([region, vals], i) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      const y = pad + i * (barH + 10);
      const barW = (avg / 10) * (W - pad * 2 - 80);
      const color = avg > 6 ? "#ef4444" : avg > 3 ? "#f59e0b" : "#22c55e";

      ctx.fillStyle = color + "30";
      ctx.beginPath(); ctx.roundRect(pad + 80, y, barW, barH, 4); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(pad + 80, y, barW, barH, 4); ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px system-ui";
      ctx.textAlign = "right";
      ctx.fillText(region, pad + 72, y + barH / 2 + 4);

      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui";
      ctx.textAlign = "left";
      ctx.fillText(`${Math.round(avg * 10) / 10}/10`, pad + 80 + barW + 8, y + barH / 2 + 4);
    });
  }, [painLogs, loading]);

  // ── AI Analysis ──
  const fetchAIAnalysis = async () => {
    setAiLoading(true);
    try {
      const result = await generateWeeklySummary(sessions, painLogs);
      setAiAnalysis(result);
    } catch {
      setAiAnalysis("AI analysis is currently unavailable. Please try again in a few moments.");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && sessions.length > 0) {
      fetchAIAnalysis();
    }
  }, [loading]);

  // ── PDF Generation ──
  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const w = doc.internal.pageSize.width;
      const pageH = 297;
      const margin = 20;
      const contentW = w - margin * 2;

      // ── Color palette (professional medical white theme) ──
      const navy = [30, 58, 95] as const;       // headings
      const darkText = [30, 30, 30] as const;    // body text
      const greyLabel = [100, 100, 100] as const; // labels
      const lightGrey = [180, 180, 180] as const; // dividers
      const accent = [41, 98, 255] as const;      // accent blue
      const white = [255, 255, 255] as const;
      const red = [220, 53, 69] as const;
      const green = [34, 139, 34] as const;
      const amber = [200, 140, 20] as const;

      // ── Helpers ──
      const newPage = () => {
        doc.addPage();
        doc.setFillColor(...white);
        doc.rect(0, 0, w, pageH, "F");
        // Header bar
        doc.setFillColor(...navy);
        doc.rect(0, 0, w, 3, "F");
      };

      const sectionTitle = (title: string, yPos: number): number => {
        doc.setTextColor(...navy);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(title, margin, yPos);
        yPos += 2;
        doc.setDrawColor(...lightGrey);
        doc.setLineWidth(0.4);
        doc.line(margin, yPos, w - margin, yPos);
        return yPos + 8;
      };

      const statRow = (label: string, value: string, yPos: number): number => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...greyLabel);
        doc.setFontSize(10);
        doc.text(label, margin, yPos);
        doc.setTextColor(...darkText);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(value, w - margin, yPos, { align: "right" });
        doc.setFont("helvetica", "normal");
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(margin, yPos + 3, w - margin, yPos + 3);
        return yPos + 10;
      };

      // ── Computed insights ──
      const avgRecentPain = avgRecent;
      const recoveryRaw = (avgAccuracy * 0.4) + ((100 - avgRecentPain * 10) * 0.3) + (avgCogAccuracy * 0.3);
      const recoveryScore = Math.max(0, Math.min(100, Math.round(recoveryRaw)));
      const recoveryLabel = recoveryScore >= 80 ? "Excellent" : recoveryScore >= 60 ? "Moderate" : "Needs Attention";
      const recoveryColor = recoveryScore >= 80 ? green : recoveryScore >= 60 ? amber : red;

      const expectedSessions = Math.max(1, Math.round(reportDays * 0.7)); // ~5 per week
      const adherenceRate = Math.min(100, Math.round((totalSessions / expectedSessions) * 100));
      const adherenceLabel = adherenceRate >= 70 ? "Good" : adherenceRate >= 40 ? "Fair" : "Poor";
      const adherenceColor = adherenceRate >= 70 ? green : adherenceRate >= 40 ? amber : red;

      const adherenceDesc = adherenceRate >= 70 ? "high" : adherenceRate >= 40 ? "moderate" : "low";
      const painDesc = painTrend === "Improving" ? "improving" : painTrend === "Worsening" ? "worsening" : "stable";
      const cogDesc = avgCogAccuracy >= 80 ? "good" : avgCogAccuracy >= 60 ? "moderate" : "low";

      // Risk flags
      const riskFlags: string[] = [];
      if (totalSessions < 5) riskFlags.push("Low exercise adherence — fewer than 5 sessions recorded");
      if (painTrend === "Worsening") riskFlags.push("Pain levels are increasing — recommend clinical review");
      if (avgRecentPain >= 7) riskFlags.push("Average recent pain is high (≥7/10) — may need intervention");
      if (avgCogAccuracy < 60 && cogSessions.length > 0) riskFlags.push("Cognitive performance below expected threshold (<60%)");
      if (avgCogTime > 8000 && cogSessions.length > 0) riskFlags.push("Slow cognitive response time — may indicate fatigue or difficulty");

      // Recommendations
      const recs: string[] = [];
      if (adherenceRate < 70) recs.push("Increase exercise frequency to at least 5 sessions per week for optimal recovery.");
      if (avgRecentPain >= 6) recs.push("Consult your physiotherapist regarding persistent or elevated pain levels.");
      if (avgCogTime > 5000 && cogSessions.length > 0) recs.push("Continue cognitive training exercises to improve response time.");
      if (avgAccuracy < 70 && totalSessions > 0) recs.push("Focus on exercise form and accuracy — consider reducing rep targets temporarily.");
      if (painTrend === "Improving") recs.push("Pain is trending downward — maintain current rehabilitation routine.");
      if (recoveryScore >= 80) recs.push("Excellent progress — discuss advancing to next treatment phase with your physician.");
      if (recs.length === 0) recs.push("Continue following your current rehabilitation plan and monitor progress weekly.");

      // ═══════════════════════════════════════
      //  PAGE 1 — Cover + Clinical Overview
      // ═══════════════════════════════════════
      doc.setFillColor(...white);
      doc.rect(0, 0, w, pageH, "F");

      // Header bar
      doc.setFillColor(...navy);
      doc.rect(0, 0, w, 14, "F");
      doc.setTextColor(...white);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("NEUROPHYSIO AI", margin, 9);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Rehabilitation Recovery Report", w - margin, 9, { align: "right" });

      // Title
      doc.setTextColor(...navy);
      doc.setFontSize(26);
      doc.setFont("helvetica", "bold");
      doc.text("Recovery Report", margin, 34);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...greyLabel);
      doc.text("Comprehensive Rehabilitation Assessment", margin, 42);

      doc.setDrawColor(...navy);
      doc.setLineWidth(0.6);
      doc.line(margin, 47, w - margin, 47);

      // Patient Info (2 columns)
      let y = 58;
      const fieldPair = (l1: string, v1: string, l2: string, v2: string) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...greyLabel);
        doc.setFontSize(8);
        doc.text(l1.toUpperCase(), margin, y);
        doc.text(l2.toUpperCase(), w / 2 + 5, y);
        doc.setTextColor(...darkText);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(v1, margin, y + 6);
        doc.text(v2, w / 2 + 5, y + 6);
        doc.setFont("helvetica", "normal");
        y += 14;
      };
      fieldPair("Patient Name", user?.name || "—", "Age", String(user?.age || "—"));
      fieldPair("Injury Type", user?.injuryType || "—", "Surgery Date", user?.surgeryDate || "N/A");
      fieldPair("Treatment Phase", user?.treatmentPhase || "Active Rehabilitation", "Report Period", `Last ${reportDays} days`);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...greyLabel); doc.setFontSize(8);
      doc.text("GENERATED ON", margin, y);
      doc.setTextColor(...darkText); doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), margin, y + 6);
      doc.setFont("helvetica", "normal");
      y += 18;

      // ── Recovery Score ──
      doc.setDrawColor(...lightGrey); doc.setLineWidth(0.3);
      doc.line(margin, y, w - margin, y);
      y += 10;

      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, y, contentW, 32, 3, 3, "F");

      doc.setTextColor(...greyLabel); doc.setFontSize(9);
      doc.text("RECOVERY SCORE", margin + 10, y + 10);
      doc.setTextColor(...(recoveryColor as unknown as [number, number, number]));
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.text(`${recoveryScore}`, margin + 10, y + 26);
      doc.setFontSize(12);
      doc.text(`/ 100`, margin + 10 + doc.getTextWidth(`${recoveryScore}`) + 3, y + 26);

      doc.setTextColor(...(recoveryColor as unknown as [number, number, number]));
      doc.setFontSize(14);
      doc.text(recoveryLabel, w - margin - 10, y + 20, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 40;

      // ── Clinical Summary ──
      y = sectionTitle("Clinical Summary", y);
      doc.setTextColor(...darkText); doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const clinicalLines = [
        `Patient demonstrates ${adherenceDesc} adherence to the prescribed rehabilitation program with ${totalSessions} sessions completed over the reporting period (adherence rate: ${adherenceRate}%).`,
        `Pain trend is ${painDesc}, with an average recent intensity of ${Math.round(avgRecentPain * 10) / 10}/10.${avgRecentPain >= 7 ? " Elevated pain levels warrant clinical attention." : ""}`,
        cogSessions.length > 0
          ? `Cognitive performance is ${cogDesc}, with an average accuracy of ${avgCogAccuracy}% and mean response time of ${(avgCogTime / 1000).toFixed(1)}s. Highest level achieved: ${maxCogLevel}.`
          : "No cognitive training sessions recorded during this period.",
      ];
      clinicalLines.forEach((line) => {
        const wrapped = doc.splitTextToSize(line, contentW);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 4;
      });
      y += 4;

      // ── Risk Flags ──
      if (riskFlags.length > 0) {
        y = sectionTitle("Risk Flags", y);
        riskFlags.forEach((flag) => {
          doc.setFillColor(255, 245, 245);
          doc.roundedRect(margin, y - 4, contentW, 9, 2, 2, "F");
          doc.setTextColor(...red);
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text("!", margin + 4, y + 2);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...darkText);
          doc.text(flag, margin + 12, y + 2);
          y += 12;
        });
        y += 4;
      }

      // ═══════════════════════════════════════
      //  PAGE 2 — Exercise & Pain & Cognitive
      // ═══════════════════════════════════════
      newPage();
      y = 18;
      y = sectionTitle("Exercise Performance", y);
      y = statRow("Total Sessions Completed", String(totalSessions), y);
      y = statRow("Total Repetitions", String(totalReps), y);
      y = statRow("Total Exercise Duration", `${Math.floor(totalDuration / 60)} min ${totalDuration % 60} sec`, y);
      y = statRow("Target Completion Rate", `${sessions.filter(s => (s.reps || 0) >= (s.targetReps || 10)).length}/${totalSessions}`, y);

      // Adherence rate
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...greyLabel); doc.setFontSize(10);
      doc.text("Adherence Rate", margin, y);
      doc.setTextColor(...(adherenceColor as unknown as [number, number, number]));
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text(`${adherenceRate}% — ${adherenceLabel}`, w - margin, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2);
      doc.line(margin, y + 3, w - margin, y + 3);
      y += 16;

      // Pain section
      y = sectionTitle("Pain Assessment", y);
      y = statRow("Total Pain Entries", String(painLogs.length), y);
      y = statRow("Pain Trend", painTrend, y);
      y = statRow("Average Recent Pain", `${Math.round(avgRecent * 10) / 10}/10`, y);
      Object.entries(regionMap).forEach(([region, vals]) => {
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
        y = statRow(`${region}`, `${avg}/10 (${vals.length} entries)`, y);
      });
      y += 8;

      // Cognitive section
      y = sectionTitle("Cognitive Performance", y);
      y = statRow("Total Sessions", String(cogSessions.length), y);
      y = statRow("Average Accuracy", `${avgCogAccuracy}%`, y);
      y = statRow("Average Response Time", `${(avgCogTime / 1000).toFixed(1)}s`, y);
      y = statRow("Highest Level Reached", String(maxCogLevel), y);

      // ═══════════════════════════════════════
      //  PAGE 3 — AI Analysis + Recommendations
      // ═══════════════════════════════════════
      newPage();
      y = 18;
      y = sectionTitle("AI Clinical Interpretation", y);

      doc.setTextColor(...greyLabel); doc.setFontSize(7);
      doc.text("Powered by Groq LLaMA · AI-generated analysis for informational purposes only", margin, y);
      y += 8;

      if (aiAnalysis) {
        doc.setTextColor(...darkText); doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const aiLines = doc.splitTextToSize(aiAnalysis, contentW);
        // Paginate AI text
        for (let i = 0; i < aiLines.length; i++) {
          if (y > pageH - 40) {
            newPage();
            y = 18;
          }
          doc.text(aiLines[i], margin, y);
          y += 5;
        }
      } else {
        doc.setTextColor(...greyLabel); doc.setFontSize(10);
        doc.text("AI analysis was not available at the time of report generation.", margin, y);
        y += 10;
      }

      y += 8;
      if (y > pageH - 60) { newPage(); y = 18; }
      y = sectionTitle("Recommendations", y);
      doc.setTextColor(...darkText); doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      recs.forEach((rec, i) => {
        if (y > pageH - 20) { newPage(); y = 18; }
        const bullet = `${i + 1}. ${rec}`;
        const wrapped = doc.splitTextToSize(bullet, contentW - 5);
        doc.text(wrapped, margin + 2, y);
        y += wrapped.length * 5 + 3;
      });

      // ═══════════════════════════════════════
      //  LAST PAGE — Session History Tables
      // ═══════════════════════════════════════
      newPage();
      y = 18;
      y = sectionTitle("Session History", y);

      // Table header
      doc.setFillColor(240, 242, 245);
      doc.rect(margin, y - 4, contentW, 8, "F");
      doc.setTextColor(...greyLabel); doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("DATE", margin + 2, y);
      doc.text("EXERCISE", 55, y);
      doc.text("REPS", 120, y);
      doc.text("STATUS", 145, y);
      doc.text("DURATION", 175, y);
      doc.setFont("helvetica", "normal");
      y += 7;

      doc.setFontSize(9);
      sessions.slice(0, 25).forEach((s, idx) => {
        if (y > pageH - 25) {
          newPage();
          y = 18;
          // Re-draw header
          doc.setFillColor(240, 242, 245);
          doc.rect(margin, y - 4, contentW, 8, "F");
          doc.setTextColor(...greyLabel); doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text("DATE", margin + 2, y); doc.text("EXERCISE", 55, y);
          doc.text("REPS", 120, y); doc.text("STATUS", 145, y); doc.text("DURATION", 175, y);
          doc.setFont("helvetica", "normal"); doc.setFontSize(9);
          y += 7;
        }
        // Zebra striping
        if (idx % 2 === 0) {
          doc.setFillColor(249, 250, 251);
          doc.rect(margin, y - 4, contentW, 7, "F");
        }
        const date = s.timestamp?.split("T")[0] || "—";
        const met = (s.reps || 0) >= (s.targetReps || 10);
        const dur = `${Math.floor((s.duration || 0) / 60)}:${String((s.duration || 0) % 60).padStart(2, "0")}`;
        doc.setTextColor(...darkText);
        doc.text(date, margin + 2, y);
        doc.text((s.exerciseLabel || "—").substring(0, 28), 55, y);
        doc.text(`${s.reps}/${s.targetReps}`, 120, y);
        doc.setTextColor(...(met ? green : amber) as unknown as [number, number, number]);
        doc.setFont("helvetica", "bold");
        doc.text(met ? "Completed" : "Partial", 145, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...darkText);
        doc.text(dur, 175, y);
        y += 7;
      });

      // ── Disclaimer footer on last page ──
      const totalPages = doc.internal.pages.length - 1;
      doc.setPage(totalPages);
      y = pageH - 30;
      doc.setDrawColor(...lightGrey); doc.setLineWidth(0.3);
      doc.line(margin, y, w - margin, y);
      y += 6;
      doc.setTextColor(...greyLabel); doc.setFontSize(7);
      doc.text("DISCLAIMER: This report is generated by artificial intelligence and is intended for informational purposes only.", margin, y);
      doc.text("It should NOT replace professional medical evaluation, diagnosis, or treatment recommendations.", margin, y + 4);
      doc.setTextColor(...lightGrey); doc.setFontSize(6.5);
      doc.text(`NeuroPhysio AI  |  Report ID: ${Date.now().toString(36).toUpperCase()}  |  Generated ${new Date().toISOString().split("T")[0]}`, margin, y + 10);

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

  const sharePrint = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
  };

  const copyShareLink = async () => {
    const text = `NeuroPhysio AI Recovery Report\n\nPatient: ${user?.name || "—"}\nInjury: ${user?.injuryType || "—"}\nSessions: ${totalSessions}\nTotal Reps: ${totalReps}\nPain Trend: ${painTrend}\n\nGenerated on ${new Date().toLocaleDateString()}\n\nThis report was generated by NeuroPhysio AI rehabilitation platform.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`NeuroPhysio Recovery Report — ${user?.name || "Patient"}`);
    const body = encodeURIComponent(`Recovery Report Summary\n\nPatient: ${user?.name || "—"}\nInjury: ${user?.injuryType || "—"}\nSessions Completed: ${totalSessions}\nTotal Reps: ${totalReps}\nPain Trend: ${painTrend}\nCognitive Score: ${avgCogAccuracy}%\n\nFull PDF report is attached separately.\n\n— NeuroPhysio AI`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`*NeuroPhysio Recovery Report*\n\nPatient: ${user?.name || "—"}\nInjury: ${user?.injuryType || "—"}\nSessions: ${totalSessions} | Reps: ${totalReps}\nPain: ${painTrend}\n\n_Generated by NeuroPhysio AI_`);
    window.open(`https://wa.me/?text=${text}`);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
        <div className="spinner" />
      </div>
    );
  }

  const SectionTitle: FC<{ icon: React.ReactNode; title: string; badge?: string }> = ({ icon, title, badge }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "var(--color-accent-text)" }}>{icon}</span>
      <h3 className="widget__title" style={{ margin: 0 }}>{title}</h3>
      {badge && <span className="badge-accent">{badge}</span>}
    </div>
  );

  const StatCard: FC<{ icon: React.ReactNode; value: string; label: string; color?: string }> = ({ icon, value, label, color = "var(--color-accent-text)" }) => (
    <div style={{
      background: "var(--color-surface-alt)",
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      alignItems: "center",
      gap: 14,
      border: "1px solid var(--color-border)",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-white)", fontFamily: "var(--font-mono)" }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--color-grey-400)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div className="doctor-report-page fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HiDocumentArrowDown size={24} style={{ color: "var(--color-accent-text)" }} />
          <div>
            <h1 className="page-header__title" style={{ margin: 0 }}>Recovery Report</h1>
            <p className="page-header__subtitle" style={{ margin: 0 }}>Comprehensive rehabilitation summary for your physician</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <select
            className="form-select"
            value={reportDays}
            onChange={(e) => setReportDays(Number(e.target.value))}
            style={{ padding: "8px 14px", fontSize: 12, borderRadius: 8 }}
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <button className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px" }} onClick={generatePDF} disabled={generating}>
            <HiDocumentArrowDown size={16} />
            {generating ? "Generating…" : "Generate PDF"}
          </button>
          {pdfBlob && (
            <div style={{ position: "relative" }}>
              <button className="btn btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px" }} onClick={() => setShareOpen(!shareOpen)}>
                <HiShare size={16} /> Share
              </button>
              {shareOpen && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 100,
                  background: "var(--color-surface-2)", border: "1px solid var(--color-border)",
                  borderRadius: 10, padding: 6, minWidth: 180,
                  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                }}>
                  <button onClick={downloadPDF} style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "var(--color-white)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, fontSize: 13 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-alt)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <HiDocumentArrowDown size={16} /> Download PDF
                  </button>
                  <button onClick={sharePrint} style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "var(--color-white)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, fontSize: 13 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-alt)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <HiPrinter size={16} /> Print / Preview
                  </button>
                  <button onClick={shareEmail} style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "var(--color-white)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, fontSize: 13 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-alt)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <HiShare size={16} /> Share via Email
                  </button>
                  <button onClick={shareWhatsApp} style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "var(--color-white)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, fontSize: 13 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-alt)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <HiShare size={16} /> Share via WhatsApp
                  </button>
                  <button onClick={copyShareLink} style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "var(--color-white)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderRadius: 6, fontSize: 13 }} onMouseEnter={(e) => e.currentTarget.style.background = "var(--color-surface-alt)"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <HiClipboardDocument size={16} /> {copied ? "Copied!" : "Copy Summary"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Patient Identity Card */}
      <div className="widget fade-up" style={{ marginBottom: 20, background: "linear-gradient(135deg, var(--color-surface) 0%, rgba(34,197,94,0.05) 100%)", border: "1px solid rgba(34,197,94,0.15)" }}>
        <div className="widget__body">
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#fff" }}>
              {(user?.name || "P").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-white)" }}>{user?.name || "Patient"}</div>
              <div style={{ fontSize: 12, color: "var(--color-grey-400)", marginTop: 2 }}>{user?.email || ""} · Report generated {new Date().toLocaleDateString()}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            {[
              { icon: <HiUser size={14} />, label: "Age", val: String(user?.age || "—") },
              { icon: <HiBeaker size={14} />, label: "Injury Type", val: user?.injuryType || "—" },
              { icon: <HiCalendarDays size={14} />, label: "Surgery Date", val: user?.surgeryDate || "N/A" },
              { icon: <HiChartBar size={14} />, label: "Treatment Phase", val: user?.treatmentPhase || "Active Rehab" },
            ].map((f) => (
              <div key={f.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--color-grey-400)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {f.icon} {f.label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-white)" }}>{f.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <StatCard icon={<FaDumbbell size={18} />} value={String(totalSessions)} label="Sessions Completed" />
        <StatCard icon={<HiChartBar size={18} />} value={String(totalReps)} label="Total Repetitions" color="#3b82f6" />
        <StatCard icon={<HiHeart size={18} />} value={painTrend} label="Pain Trend" color={painTrend === "Improving" ? "#22c55e" : painTrend === "Worsening" ? "#ef4444" : "#f59e0b"} />
        <StatCard icon={<FaBrain size={18} />} value={`${avgCogAccuracy}%`} label="Cognitive Score" color="#a78bfa" />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="widget fade-up delay-1">
          <div className="widget__header">
            <SectionTitle icon={<HiChartBar size={16} />} title="7-Day Rep Activity" />
          </div>
          <div className="widget__body">
            <canvas ref={chartRef} width={500} height={200} style={{ width: "100%", height: 200 }} />
          </div>
        </div>
        <div className="widget fade-up delay-2">
          <div className="widget__header">
            <SectionTitle icon={<HiHeart size={16} />} title="Pain by Region" />
          </div>
          <div className="widget__body">
            {painLogs.length > 0 ? (
              <canvas ref={painChartRef} width={500} height={200} style={{ width: "100%", height: 200 }} />
            ) : (
              <div style={{ textAlign: "center", padding: 30, color: "var(--color-grey-400)", fontSize: 13 }}>No pain data recorded yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Session History Table */}
      <div className="widget fade-up delay-3" style={{ marginBottom: 20 }}>
        <div className="widget__header">
          <SectionTitle icon={<FaDumbbell size={16} />} title="Session History" />
          <span style={{ fontSize: 11, color: "var(--color-grey-400)" }}>{totalSessions} sessions</span>
        </div>
        <div className="widget__body">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Exercise</th><th>Reps</th><th>Status</th><th>Duration</th></tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 20,color: "var(--color-grey-400)" }}>No sessions recorded yet</td></tr>
                ) : (
                  sessions.slice(0, 20).map((s, i) => {
                    const met = (s.reps || 0) >= (s.targetReps || 10);
                    return (
                      <tr key={i}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{s.timestamp?.split("T")[0] || "—"}</td>
                        <td>{s.exerciseLabel}</td>
                        <td>{s.reps}/{s.targetReps}</td>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: met ? "#22c55e" : "#f59e0b" }}>
                            {met ? <HiCheckCircle size={14} /> : <HiExclamationTriangle size={14} />}
                            {met ? "Completed" : "Partial"}
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
        </div>
      </div>

      {/* AI Clinical Analysis */}
      <div className="widget fade-up delay-4" style={{ marginBottom: 20 }}>
        <div className="widget__header">
          <SectionTitle icon={<HiCpuChip size={16} />} title="AI Clinical Analysis" badge="Groq" />
        </div>
        <div className="widget__body">
          {aiLoading ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 20, color: "var(--color-grey-400)" }}>
              <div className="spinner" style={{ width: 20, height: 20 }} />
              Generating comprehensive analysis...
            </div>
          ) : aiAnalysis ? (
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.8, color: "var(--color-grey-100)" }}>
              {aiAnalysis}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 20, color: "var(--color-grey-400)" }}>
              <button className="btn btn-outline" onClick={fetchAIAnalysis}>
                <HiCpuChip size={16} style={{ marginRight: 6 }} /> Generate AI Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: "14px 18px",
        background: "rgba(245,158,11,0.06)",
        border: "1px solid rgba(245,158,11,0.15)",
        borderRadius: 10,
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 20,
      }}>
        <HiExclamationTriangle size={18} style={{ color: "#f59e0b", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: "var(--color-grey-300)", lineHeight: 1.6 }}>
          <strong style={{ color: "#f59e0b" }}>Medical Disclaimer:</strong> This report is AI-generated for informational purposes only and should not replace professional medical evaluation. Always consult your physician before making changes to your rehabilitation program.
        </div>
      </div>
    </div>
  );
};

export default DoctorReport;
