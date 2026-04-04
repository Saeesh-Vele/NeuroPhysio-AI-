/* ══════════════════════════════════════════════════════════════
   AI Insights Service — Gemini (deep) + Groq (fast)
   ══════════════════════════════════════════════════════════════ */

import type { ExerciseSession, PainLog } from "../types";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT =
  "You are a physiotherapy AI assistant. Be evidence-based and conservative. Never diagnose conditions. Never suggest stopping prescribed exercises without consulting a doctor. Always recommend professional consultation for pain > 6/10.";

// ── Groq (fast per-session coaching) ──────────────────────
export async function generateSessionInsight(
  session: Omit<ExerciseSession, "id">
): Promise<string> {
  try {
    const prompt = `${SYSTEM_PROMPT}

Patient just completed a rehabilitation exercise session:
- Exercise: ${session.exerciseLabel}
- Reps completed: ${session.reps} / ${session.targetReps}
- Accuracy: ${session.accuracy}%
- Duration: ${session.duration} seconds

Give a 2-3 sentence encouraging coaching note with one specific improvement tip.`;

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "Great session! Keep up the good work.";
  } catch (err) {
    console.error("[AI] generateSessionInsight error:", err);
    return "Great session! Keep pushing toward your recovery goals.";
  }
}


// ── Groq (real-time form correction during exercise) ──────
export async function generateRealtimeCoaching(
  exerciseLabel: string,
  jointAngles: Record<string, number>,
  repCount: number,
  targetReps: number,
  feedbackStatus: string,
  feedbackMessage: string,
  injuryType?: string,
): Promise<string> {
  try {
    const anglesStr = Object.entries(jointAngles)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${Math.round(v)}°`)
      .join(", ");

    const prompt = `You are a physiotherapy coach giving REAL-TIME corrections during an exercise.

CURRENT STATE:
- Exercise: ${exerciseLabel}
- Patient injury: ${injuryType || "general rehabilitation"}
- Reps: ${repCount}/${targetReps}
- Joint angles: ${anglesStr || "detecting..."}
- Form status: ${feedbackStatus}
- Current issue: ${feedbackMessage}

Give ONE short correction sentence (max 15 words). Be specific about which body part to adjust and how.
If form is good, give encouragement.
Reply with ONLY the coaching message, nothing else.`;

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 40,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[AI] Groq API error:", res.status, errText);
      throw new Error(`Groq API error: ${res.status}`);
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    return content || "Keep going, maintain your form!";
  } catch (err) {
    console.error("[AI] generateRealtimeCoaching error:", err);
    return "Focus on smooth, controlled movements.";
  }
}

// ── Gemini (deep weekly summary) ─────────────────────────
export async function generateWeeklySummary(
  sessions: ExerciseSession[],
  painLogs: PainLog[]
): Promise<string> {
  try {
    const sessionSummary = sessions
      .slice(0, 14)
      .map(
        (s) =>
          `${s.timestamp}: ${s.exerciseLabel} — ${s.reps} reps, ${s.accuracy}% accuracy`
      )
      .join("\n");

    const painSummary = painLogs
      .slice(0, 10)
      .map((p) => `${p.timestamp}: ${p.bodyRegion} — ${p.intensity}/10 (${p.notes})`)
      .join("\n");

    const prompt = `${SYSTEM_PROMPT}

Analyze this patient's 7-day rehabilitation data and provide a detailed, actionable recovery report.

EXERCISE SESSIONS:
${sessionSummary || "No sessions recorded"}

PAIN LOGS:
${painSummary || "No pain logs"}

Provide your analysis in this exact format (be detailed and specific — at least 2-3 sentences per section):

PROGRESS OVERVIEW
Analyze the patient's exercise consistency, rep completion rates, and overall trajectory. Mention specific exercises and how they've improved.

PAIN & RISK ASSESSMENT
Identify any concerning pain patterns. Flag if any pain levels are above 6/10 or worsening. If no pain logs exist, note the importance of tracking pain.

DAILY LIFESTYLE RECOMMENDATIONS
Provide 3-4 specific daily-life tips related to their injury (e.g., "Avoid lifting objects heavier than 5 lbs with the affected arm", "Use ice packs for 15 minutes after exercise sessions", "Sleep on the unaffected side with a pillow for support").

THINGS TO AVOID
List 3-4 specific activities or movements the patient should strictly avoid based on their exercises and injury pattern (e.g., "Do NOT do overhead reaching or heavy lifting", "Avoid sudden twisting movements").

EXERCISE ADJUSTMENTS
Suggest specific changes to their exercise routine — increase reps, add new exercises, or reduce intensity where needed.

NEXT WEEK GOALS
Set 2-3 concrete, measurable goals for the coming week (e.g., "Complete 5 exercise sessions", "Increase pendulum reps to 12").`;

    // Retry logic for rate limiting (429)
    let lastErr = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.6 },
          }),
        });

        if (res.status === 429) {
          // Rate limited — wait and retry
          const waitMs = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
          console.warn(`[AI] Gemini rate limited, retrying in ${waitMs}ms...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
        const data = await res.json();
        return (
          data.candidates?.[0]?.content?.parts?.[0]?.text ||
          "Weekly summary temporarily unavailable."
        );
      } catch (err: any) {
        lastErr = err.message || String(err);
        console.warn(`[AI] Gemini attempt ${attempt + 1} failed:`, lastErr);
      }
    }
    console.error("[AI] generateWeeklySummary exhausted retries:", lastErr);
    return "Weekly insights are being generated. Please try again later.";
  } catch (err) {
    console.error("[AI] generateWeeklySummary error:", err);
    return "Weekly insights are being generated. Please try again later.";
  }
}

// ── Gemini (risk alert) ──────────────────────────────────
export async function generateRiskAlert(
  painLogs: PainLog[]
): Promise<string | null> {
  const highPain = painLogs.filter((p) => p.intensity >= 7);
  if (highPain.length === 0) return null;

  try {
    const prompt = `${SYSTEM_PROMPT}

URGENT: Patient has reported high pain levels:
${highPain.map((p) => `- ${p.bodyRegion}: ${p.intensity}/10 — "${p.notes}"`).join("\n")}

Generate a 1-2 sentence safety alert recommending professional consultation. Be clear but not alarmist.`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 100, temperature: 0.3 },
      }),
    });

    if (!res.ok) return "High pain detected. Please consult your physician.";
    const data = await res.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "High pain detected. Please consult your physician."
    );
  } catch {
    return "High pain levels detected. We recommend speaking with your physician.";
  }
}

// ── Gemini (report/prescription image analysis) ──────────
export async function processReportImage(
  base64Image: string,
  mimeType: string = "image/jpeg"
): Promise<{
  diagnosis: string;
  medications: string[];
  restrictions: string[];
  recommendations: string[];
  rawText: string;
}> {
  try {
    const prompt = `${SYSTEM_PROMPT}

Analyze this medical report/prescription image. Extract the following information in JSON format:
{
  "diagnosis": "main diagnosis or condition",
  "severity": "mild/moderate/severe/acute/critical",
  "medications": ["list of medications mentioned"],
  "restrictions": ["any activity restrictions or precautions"],
  "contraindications": ["specific exercises or movements to AVOID, e.g. heavy_lifting, shoulder_overhead"],
  "recommended_exercises": ["specific exercises recommended, e.g. pendulum, stretching, isometric"],
  "recommendations": ["treatment recommendations"],
  "rawText": "full text extracted from the image"
}

If any field is not found, use an empty string or empty array. Return ONLY valid JSON, no extra text.`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 800, temperature: 0.2 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini Vision API error: ${res.status}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return {
      diagnosis: "",
      medications: [],
      restrictions: [],
      recommendations: [],
      rawText: text,
    };
  } catch (err) {
    console.error("[AI] processReportImage error:", err);
    return {
      diagnosis: "Unable to process image",
      medications: [],
      restrictions: [],
      recommendations: [],
      rawText: "",
    };
  }
}

// ── Gemini (exercise recommendation from profile) ────────
export async function generateExerciseRecommendation(
  profileSummary: string
): Promise<string> {
  try {
    const prompt = `${SYSTEM_PROMPT}

Based on this patient profile, recommend the top 8-10 exercises from this list and explain why:

Available exercises: knee_bend, heel_slide, sit_to_stand, straight_leg_raise, wall_squat, terminal_knee_extension, hamstring_curl, calf_raise, step_up, step_down, quad_set, ankle_pump, prone_knee_bend, side_lying_leg_raise, arm_raise, shoulder_abduction, shoulder_flexion, shoulder_external_rotation, shoulder_internal_rotation, wall_pushup, pendulum_exercise, scapular_squeeze, chest_expansion, bicep_curl, tricep_extension, wrist_curl, wrist_extension, hip_abduction, hip_adduction, glute_bridge, clamshell, hip_flexion, fire_hydrant, hip_extension, piriformis_stretch, single_leg_stand, tandem_stance, heel_to_toe_walk, balance_reach, squat, lunge, seated_hamstring_stretch, standing_calf_stretch, neck_flexion, neck_rotation, trunk_rotation, cat_cow_stretch, bird_dog, dead_bug, pelvic_tilt

PATIENT PROFILE:
${profileSummary}

Return a JSON array of objects with: exerciseId, reason, priority (high/medium/low), targetReps.
Return ONLY valid JSON array, no extra text.`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
      }),
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  } catch (err) {
    console.error("[AI] generateExerciseRecommendation error:", err);
    return "[]";
  }
}
