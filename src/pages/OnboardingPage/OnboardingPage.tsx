import React, { useState, useRef, useEffect, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/config";
import { saveUserProfile, saveExercisePlan } from "../../services/firestoreService";
import { processReportImage, generateExerciseRecommendation } from "../../services/aiService";
import { useAppStore } from "../../store/useAppStore";
import type { OnboardingData, PainRegion, ExtractedReportData, UserProfile } from "../../types";
import "./OnboardingPage.css";

const TOTAL_STEPS = 5;
const BACKEND_URL = import.meta.env.VITE_PYTHON_BACKEND_URL || "http://localhost:8000";

const INJURY_TYPES = [
  "ACL Reconstruction",
  "Knee Replacement",
  "Knee Arthroscopy",
  "Meniscus Tear",
  "Rotator Cuff Repair",
  "Shoulder Replacement",
  "Shoulder Dislocation",
  "Frozen Shoulder",
  "Hip Replacement",
  "Hip Fracture",
  "Ankle Sprain",
  "Ankle Fracture",
  "Stroke",
  "Spinal Injury",
  "Lower Back Pain",
  "General Deconditioning",
];

const BODY_REGIONS = [
  "left_knee", "right_knee", "left_shoulder", "right_shoulder",
  "lower_back", "upper_back", "left_hip", "right_hip",
  "left_ankle", "right_ankle", "left_elbow", "right_elbow",
  "left_wrist", "right_wrist", "neck", "chest",
];

const TREATMENT_PHASES = [
  { value: "immediate_post_op", label: "Just had surgery (0–2 weeks)" },
  { value: "post_surgery_week2", label: "Early recovery (2–6 weeks)" },
  { value: "active_rehab", label: "Active rehabilitation (6+ weeks)" },
  { value: "maintenance", label: "Maintenance / Prevention" },
  { value: "no_surgery", label: "No surgery — conservative treatment" },
];

const RECOVERY_GOALS = [
  { id: "reduce_pain", label: "Reduce pain and inflammation", icon: "🎯" },
  { id: "increase_mobility", label: "Increase range of motion", icon: "🦿" },
  { id: "build_strength", label: "Build muscle strength", icon: "💪" },
  { id: "improve_balance", label: "Improve balance and stability", icon: "⚖️" },
  { id: "return_sport", label: "Return to sports/activity", icon: "🏃" },
  { id: "daily_function", label: "Perform daily activities better", icon: "🏠" },
  { id: "prevent_reinjury", label: "Prevent re-injury", icon: "🛡️" },
  { id: "cognitive_rehab", label: "Cognitive rehabilitation", icon: "🧠" },
];

const OnboardingPage: FC = () => {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const setExercisePlan = useAppStore((s) => s.setExercisePlan);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<OnboardingData>({
    name: auth.currentUser?.displayName || "",
    age: 0,
    gender: "",
    height: 0,
    weight: 0,
    injuryType: "",
    injuryRegion: "",
    surgeryDate: null,
    treatmentPhase: "active_rehab",
    painRegions: [],
    recoveryGoals: [],
  });

  // Report upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [reportProcessing, setReportProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedReportData | null>(null);


  // ── Form helpers ──
  const updateField = <K extends keyof OnboardingData>(key: K, val: OnboardingData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const toggleGoal = (goalId: string) => {
    setFormData((prev) => ({
      ...prev,
      recoveryGoals: prev.recoveryGoals.includes(goalId)
        ? prev.recoveryGoals.filter((g) => g !== goalId)
        : [...prev.recoveryGoals, goalId],
    }));
  };

  const togglePainRegion = (region: string) => {
    setFormData((prev) => {
      const exists = prev.painRegions.find((p) => p.region === region);
      return {
        ...prev,
        painRegions: exists
          ? prev.painRegions.filter((p) => p.region !== region)
          : [...prev.painRegions, { region, intensity: 5 }],
      };
    });
  };

  const updatePainIntensity = (region: string, intensity: number) => {
    setFormData((prev) => ({
      ...prev,
      painRegions: prev.painRegions.map((p) =>
        p.region === region ? { ...p, intensity } : p
      ),
    }));
  };

  // ── Report Upload ──
  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setReportProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const mimeType = file.type || "image/jpeg";
        const result = await processReportImage(base64, mimeType);
        console.log("[Report] Gemini extracted data:", JSON.stringify(result, null, 2));
        setExtractedData({
          ...result,
          extractedAt: new Date().toISOString(),
        });
        setReportProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setReportProcessing(false);
    }
  };

  // ── Final Submit ──
  const handleComplete = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsLoading(true);

    const profile: UserProfile = {
      uid: user.uid,
      name: formData.name,
      email: user.email || "",
      age: formData.age,
      gender: formData.gender,
      height: formData.height,
      weight: formData.weight,
      injuryType: formData.injuryType,
      injuryRegion: formData.injuryRegion,
      surgeryDate: formData.surgeryDate,
      treatmentPhase: formData.treatmentPhase,
      painRegions: formData.painRegions,
      recoveryGoals: formData.recoveryGoals,
      onboardingComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(extractedData ? { reportData: extractedData } : {}),
    };

    // Set local state immediately so navigation guards allow dashboard access
    setUser(profile);
    setOnboardingComplete(true);

    // Save to Firestore — this MUST succeed for subsequent logins to go to dashboard
    try {
      console.log("[Onboarding] Saving profile to Firestore with onboardingComplete:", profile.onboardingComplete);
      await saveUserProfile(profile);
      console.log("[Onboarding] ✅ Profile saved to Firestore successfully");
    } catch (err) {
      console.error("[Onboarding] ❌ CRITICAL: Firestore save FAILED — next login will redirect to onboarding!", err);
      // Despite failure, user can still proceed this session
    }

    // Generate exercise plan via backend (non-blocking)
    try {
      const res = await fetch(`${BACKEND_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          injury_type: formData.injuryType,
          injury_region: formData.injuryRegion,
          pain_regions: formData.painRegions,
          treatment_phase: formData.treatmentPhase,
          age: formData.age,
          report_data: extractedData || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const plan = {
          userId: user.uid,
          exercises: data.recommendations,
          generatedAt: new Date().toISOString(),
          basedOn: "onboarding",
        };
        await saveExercisePlan(plan);
        setExercisePlan(plan);
      }
    } catch (err) {
      console.warn("Exercise recommendation failed:", err);
    }

    setIsLoading(false);
    navigate("/dashboard");
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.name && formData.age > 0 && formData.gender;
      case 2: return formData.injuryType && formData.treatmentPhase;
      case 3: return true; // Report is optional
      case 4: return true; // Pain regions optional
      case 5: return formData.recoveryGoals.length > 0;
      default: return true;
    }
  };

  const next = () => { if (step < TOTAL_STEPS) setStep(step + 1); };
  const prev = () => { if (step > 1) setStep(step - 1); };


  const getPainColor = (intensity: number) => {
    if (intensity <= 3) return "var(--color-accent-text)";
    if (intensity <= 6) return "var(--color-warning)";
    return "var(--color-danger)";
  };

  const getPainLabel = (intensity: number) => {
    if (intensity <= 3) return "Mild";
    if (intensity <= 6) return "Moderate";
    return "Severe";
  };

  const regionLabel = (r: string) =>
    r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="onboarding-page">
      <div className="onboarding-card fade-in">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <div className="onboarding-brand-icon">N</div>
            NeuroPhysio Recovery
          </div>
          <h1 className="onboarding-title">Let's set up your recovery profile</h1>
          <p className="onboarding-sub">
            This helps us create a personalized rehabilitation plan tailored to your needs.
          </p>

          {/* Progress dots */}
          <div className="onboarding-progress">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`onboarding-progress__dot ${
                  i + 1 === step ? "onboarding-progress__dot--active" : ""
                } ${i + 1 < step ? "onboarding-progress__dot--done" : ""}`}
              />
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="onboarding-body" key={step}>
          {/* ── Step 1: Personal Info ── */}
          {step === 1 && (
            <>
              <h2 className="onboarding-step-title">Personal Information</h2>
              <p className="onboarding-step-desc">
                Basic details to personalize your experience.
              </p>
              <div className="onboarding-form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input
                    className="form-input"
                    type="number"
                    value={formData.age || ""}
                    onChange={(e) => updateField("age", Number(e.target.value))}
                    placeholder="Age"
                    min={1}
                    max={120}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={formData.gender}
                    onChange={(e) => updateField("gender", e.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Height (cm)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={formData.height || ""}
                    onChange={(e) => updateField("height", Number(e.target.value))}
                    placeholder="170"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Weight (kg)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={formData.weight || ""}
                    onChange={(e) => updateField("weight", Number(e.target.value))}
                    placeholder="70"
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Step 2: Injury Assessment ── */}
          {step === 2 && (
            <>
              <h2 className="onboarding-step-title">Injury & Treatment Details</h2>
              <p className="onboarding-step-desc">
                Tell us about your condition so we can tailor your exercises.
              </p>
              <div className="onboarding-form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Injury / Condition Type</label>
                  <select
                    className="form-select"
                    value={formData.injuryType}
                    onChange={(e) => updateField("injuryType", e.target.value)}
                  >
                    <option value="">Select your condition</option>
                    {INJURY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label className="form-label">Affected Region</label>
                  <div className="pain-region-grid">
                    {["Left Knee", "Right Knee", "Left Shoulder", "Right Shoulder", "Left Hip", "Right Hip", "Lower Back", "Neck", "Left Ankle", "Right Ankle"].map((r) => (
                      <button
                        key={r}
                        className={`pain-region-pill ${
                          formData.injuryRegion === r ? "pain-region-pill--selected" : ""
                        }`}
                        onClick={() => updateField("injuryRegion", r)}
                        type="button"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Surgery Date (if any)</label>
                  <input
                    className="form-input"
                    type="date"
                    value={formData.surgeryDate || ""}
                    onChange={(e) => updateField("surgeryDate", e.target.value || null)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Treatment Phase</label>
                  <select
                    className="form-select"
                    value={formData.treatmentPhase}
                    onChange={(e) => updateField("treatmentPhase", e.target.value)}
                  >
                    {TREATMENT_PHASES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Upload Report ── */}
          {step === 3 && (
            <>
              <h2 className="onboarding-step-title">Upload Medical Report</h2>
              <p className="onboarding-step-desc">
                Upload a prescription or medical report. Our AI will extract key details automatically. This step is optional.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />

              <div
                className="upload-area"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="upload-area__icon">📄</div>
                <div className="upload-area__title">
                  Click to upload prescription or report
                </div>
                <div className="upload-area__hint">
                  Supports JPG, PNG, PDF — processed by Gemini AI
                </div>
              </div>

              {uploadedFile && (
                <div className="upload-preview">
                  <span className="upload-preview__icon">📎</span>
                  <span className="upload-preview__name">{uploadedFile.name}</span>
                  <span
                    className={`upload-preview__status ${
                      reportProcessing
                        ? "upload-preview__status--processing"
                        : "upload-preview__status--done"
                    }`}
                  >
                    {reportProcessing ? "Processing…" : "✓ Analyzed"}
                  </span>
                </div>
              )}

              {extractedData && !reportProcessing && (
                <div className="extracted-card">
                  <div className="extracted-card__title">
                    🤖 AI-Extracted Information
                  </div>
                  {extractedData.diagnosis && (
                    <div className="extracted-card__item">
                      <strong>Diagnosis:</strong> {extractedData.diagnosis}
                    </div>
                  )}
                  {(extractedData as any).severity && (
                    <div className="extracted-card__item">
                      <strong>Severity:</strong>{" "}
                      <span style={{
                        color: ["severe","acute","critical"].includes((extractedData as any).severity?.toLowerCase())
                          ? "#ef4444" : (extractedData as any).severity?.toLowerCase() === "moderate" ? "#f59e0b" : "#22c55e",
                        fontWeight: 600,
                      }}>
                        {(extractedData as any).severity}
                      </span>
                    </div>
                  )}
                  {(extractedData.medications?.length ?? 0) > 0 && (
                    <div className="extracted-card__item">
                      <strong>Medications:</strong> {extractedData.medications.join(", ")}
                    </div>
                  )}
                  {(extractedData.restrictions?.length ?? 0) > 0 && (
                    <div className="extracted-card__item">
                      <strong>Restrictions:</strong> {extractedData.restrictions.join(", ")}
                    </div>
                  )}
                  {((extractedData as any).contraindications?.length ?? 0) > 0 && (
                    <div className="extracted-card__item">
                      <strong>Contraindications:</strong> {(extractedData as any).contraindications.join(", ")}
                    </div>
                  )}
                  {((extractedData as any).recommended_exercises?.length ?? 0) > 0 && (
                    <div className="extracted-card__item">
                      <strong>Recommended Exercises:</strong> {(extractedData as any).recommended_exercises.join(", ")}
                    </div>
                  )}
                  {(extractedData.recommendations?.length ?? 0) > 0 && (
                    <div className="extracted-card__item">
                      <strong>Recommendations:</strong> {extractedData.recommendations.join(", ")}
                    </div>
                  )}
                  {/* Fallback: show raw text if no structured data */}
                  {!extractedData.diagnosis && !(extractedData.medications?.length) && extractedData.rawText && (
                    <div className="extracted-card__item">
                      <strong>Extracted Text:</strong>
                      <p style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 4, opacity: 0.8 }}>
                        {extractedData.rawText.slice(0, 500)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Step 4: Pain Assessment ── */}
          {step === 4 && (
            <>
              <h2 className="onboarding-step-title">Pain Assessment</h2>
              <p className="onboarding-step-desc">
                Select areas where you experience pain and rate the intensity.
              </p>

              <div className="pain-region-grid">
                {BODY_REGIONS.map((region) => (
                  <button
                    key={region}
                    className={`pain-region-pill ${
                      formData.painRegions.find((p) => p.region === region)
                        ? "pain-region-pill--selected"
                        : ""
                    }`}
                    onClick={() => togglePainRegion(region)}
                    type="button"
                  >
                    {regionLabel(region)}
                  </button>
                ))}
              </div>

              {formData.painRegions.map((pr) => (
                <div key={pr.region} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-white)" }}>
                      {regionLabel(pr.region)}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: getPainColor(pr.intensity) }}>
                      {pr.intensity}/10 — {getPainLabel(pr.intensity)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={pr.intensity}
                    onChange={(e) => updatePainIntensity(pr.region, Number(e.target.value))}
                    className="pain-slider__input"
                    style={{
                      width: "100%",
                      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${pr.intensity * 10}%, var(--color-border) ${pr.intensity * 10}%, var(--color-border) 100%)`,
                    }}
                  />
                </div>
              ))}
            </>
          )}

          {/* ── Step 5: Recovery Goals ── */}
          {step === 5 && (
            <>
              <h2 className="onboarding-step-title">Recovery Goals</h2>
              <p className="onboarding-step-desc">
                Select your rehabilitation goals. We'll prioritize exercises accordingly.
              </p>
              <div className="goal-grid">
                {RECOVERY_GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    className={`goal-card ${
                      formData.recoveryGoals.includes(goal.id) ? "goal-card--selected" : ""
                    }`}
                    onClick={() => toggleGoal(goal.id)}
                    type="button"
                  >
                    <span className="goal-card__check">
                      {formData.recoveryGoals.includes(goal.id) ? "✓" : ""}
                    </span>
                    <span>
                      {goal.icon} {goal.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="onboarding-footer">
          <span className="onboarding-footer__step">
            Step {step} of {TOTAL_STEPS}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            {step > 1 && (
              <button className="btn btn-outline" onClick={prev}>
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                className="btn btn-primary"
                onClick={next}
                disabled={!canProceed()}
              >
                Continue
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleComplete}
                disabled={!canProceed() || isLoading}
              >
                {isLoading ? "Setting up…" : "Complete Setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
