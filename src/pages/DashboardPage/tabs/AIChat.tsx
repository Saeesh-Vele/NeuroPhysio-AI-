import React, { useState, useRef, useEffect, type FC } from "react";
import { auth } from "../../../firebase/config";
import { useAppStore } from "../../../store/useAppStore";
import { getUserSessions, getUserPainLogs, getUserCognitiveSessions } from "../../../services/firestoreService";
import {
  HiPaperAirplane,
  HiPhoto,
  HiXMark,
  HiCpuChip,
  HiUser,
  HiSparkles,
  HiClipboardDocument,
} from "react-icons/hi2";
import type { ExerciseSession, PainLog, CognitiveSession } from "../../../types";

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // base64 thumbnail for display
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: "Meal Plan", prompt: "Create a detailed 7-day meal plan suitable for my medical condition and recovery goals. Include breakfast, lunch, dinner, and snacks with specific foods." },
  { label: "Exercise Advice", prompt: "Based on my injury and exercise history, what exercises should I focus on this week? What should I avoid?" },
  { label: "Pain Relief Tips", prompt: "What are the best natural pain relief methods for my condition? Include ice/heat therapy, stretches, and lifestyle tips." },
  { label: "Recovery Timeline", prompt: "Based on my injury type and current progress, what does a realistic recovery timeline look like? What milestones should I aim for?" },
  { label: "Sleep Tips", prompt: "How should I sleep to aid my recovery? What positions, pillows, or habits would help with my injury?" },
  { label: "Supplement Guide", prompt: "What supplements or vitamins could support my recovery? Include dosage recommendations and any warnings." },
];

// Lightweight markdown → HTML renderer
const renderMarkdown = (text: string): string => {
  return text
    // Headers: ## Header → <strong style>Header</strong>
    .replace(/^###\s+(.+)$/gm, '<div style="font-size:13px;font-weight:700;color:#22c55e;margin:12px 0 4px;text-transform:uppercase;letter-spacing:0.5px">$1</div>')
    .replace(/^##\s+(.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#22c55e;margin:14px 0 6px">$1</div>')
    .replace(/^#\s+(.+)$/gm, '<div style="font-size:15px;font-weight:700;color:#22c55e;margin:16px 0 8px">$1</div>')
    // Bold: **text** → <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--color-white);font-weight:600">$1</strong>')
    // Italic: *text* → <em>
    .replace(/(?<![*])\*([^*]+)\*(?![*])/g, '<em>$1</em>')
    // Unordered lists: - item or * item → styled list item
    .replace(/^[\-\*]\s+(.+)$/gm, '<div style="display:flex;gap:8px;align-items:baseline;margin:3px 0;padding-left:4px"><span style="color:#22c55e;font-size:8px;margin-top:5px">●</span><span>$1</span></div>')
    // Numbered lists: 1. item
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:8px;align-items:baseline;margin:3px 0;padding-left:4px"><span style="color:#22c55e;font-weight:600;min-width:16px">$1.</span><span>$2</span></div>')
    // Line breaks
    .replace(/\n\n/g, '<div style="height:10px"></div>')
    .replace(/\n/g, '<br/>');
};

const STORAGE_KEY = "neurophysio_ai_chat";

const AIChat: FC = () => {
  const { user } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/jpeg");
  const [sessions, setSessions] = useState<ExerciseSession[]>([]);
  const [painLogs, setPainLogs] = useState<PainLog[]>([]);
  const [cogSessions, setCogSessions] = useState<CognitiveSession[]>([]);
  const [copied, setCopied] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist messages to sessionStorage
  useEffect(() => {
    try {
      // Strip image data to keep storage small
      const toSave = messages.map(({ image, ...rest }) => rest);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* storage full — ignore */ }
  }, [messages]);

  // Load user data for context
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    Promise.all([
      getUserSessions(uid, 20),
      getUserPainLogs(uid, 15),
      getUserCognitiveSessions(uid, 10),
    ]).then(([s, p, c]) => {
      setSessions(s);
      setPainLogs(p);
      setCogSessions(c);
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build system context with all user info
  const buildSystemContext = (): string => {
    const sessionSummary = sessions.slice(0, 10).map((s) =>
      `${s.timestamp?.split("T")[0]}: ${s.exerciseLabel} — ${s.reps}/${s.targetReps} reps, duration ${s.duration}s`
    ).join("\n") || "No sessions yet";

    const painSummary = painLogs.slice(0, 8).map((p) =>
      `${p.timestamp?.split("T")[0]}: ${p.bodyRegion} — ${p.intensity}/10${p.notes ? ` (${p.notes})` : ""}`
    ).join("\n") || "No pain logs";

    const cogSummary = cogSessions.length > 0
      ? `${cogSessions.length} sessions, avg accuracy ${Math.round(cogSessions.reduce((a, c) => a + (c.accuracy || 0), 0) / cogSessions.length)}%`
      : "No cognitive sessions";

    return `You are NeuroPhysio AI, a compassionate and knowledgeable physiotherapy assistant. You have complete access to this patient's medical and rehabilitation data.

PATIENT PROFILE:
- Name: ${user?.name || "Unknown"}
- Age: ${user?.age || "Unknown"}
- Gender: ${user?.gender || "Unknown"}
- Height: ${user?.height || "Unknown"} cm
- Weight: ${user?.weight || "Unknown"} kg
- Injury Type: ${user?.injuryType || "Unknown"}
- Injury Region: ${user?.injuryRegion || "Unknown"}
- Surgery Date: ${user?.surgeryDate || "N/A"}
- Treatment Phase: ${user?.treatmentPhase || "Unknown"}
- Recovery Goals: ${user?.recoveryGoals?.join(", ") || "General recovery"}
- Pain Regions: ${user?.painRegions?.map((p) => `${p.region}: ${p.intensity}/10`).join(", ") || "None reported"}

RECENT EXERCISE SESSIONS:
${sessionSummary}

RECENT PAIN LOGS:
${painSummary}

COGNITIVE TRAINING:
${cogSummary}

GUIDELINES:
- Be evidence-based and conservative in your advice
- Never diagnose conditions or replace medical professional consultation
- For pain > 6/10, always recommend seeing a physician
- Provide specific, actionable advice tailored to their injury type
- When asked about meals/diet, consider their medical condition, age, weight, and recovery needs
- When asked about exercises, reference their actual exercise history
- Be warm, encouraging, and supportive
- For image analysis, describe what you see and provide relevant medical/rehab context
- Format responses with clear sections and bullet points when appropriate`;
  };

  // Image handling
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send message — text via Groq, image via Gemini
  const sendMessage = async (overrideText?: string) => {
    const text = overrideText || input.trim();
    if (!text && !imageBase64) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text || "Analyze this image",
      image: imagePreview || undefined,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let reply = "";

      if (imageBase64) {
        // Use Gemini for image analysis
        const prompt = `${buildSystemContext()}

The patient has uploaded an image. ${text ? `They asked: "${text}"` : "Analyze this image and provide relevant medical/rehabilitation context."}

Provide a helpful, detailed response based on the image and their medical profile.`;

        const res = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inlineData: { mimeType: imageMime, data: imageBase64 } },
              ],
            }],
            generationConfig: { maxOutputTokens: 1000, temperature: 0.6 },
          }),
        });

        if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
        const data = await res.json();
        reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't analyze the image. Please try again.";
        removeImage();
      } else {
        // Text-only via Groq
        const chatHistory = messages.slice(-10).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const res = await fetch(GROQ_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: buildSystemContext() },
              ...chatHistory,
              { role: "user", content: text },
            ],
            max_tokens: 1500,
            temperature: 0.7,
          }),
        });

        if (!res.ok) throw new Error(`Groq error: ${res.status}`);
        const data = await res.json();
        reply = data.choices?.[0]?.message?.content || "I'm having trouble responding. Please try again.";
      }

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("[AIChat] Error:", err);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div className="ai-chat-page fade-in" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
      {/* Header */}
      <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HiSparkles size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--color-white)", margin: 0 }}>AI Health Assistant</h1>
              <p style={{ fontSize: 12, color: "var(--color-grey-400)", margin: 0 }}>
                Powered by Groq · Knows your complete medical profile
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); sessionStorage.removeItem(STORAGE_KEY); }}
              style={{
                padding: "6px 14px", borderRadius: 8, background: "var(--color-surface-alt)",
                border: "1px solid var(--color-border)", color: "var(--color-grey-300)",
                fontSize: 12, cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.color = "#22c55e"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-grey-300)"; }}
            >
              New Chat
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HiSparkles size={32} style={{ color: "#22c55e" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-white)", margin: "0 0 6px" }}>
                Hi {user?.name || "there"}! How can I help?
              </h2>
              <p style={{ fontSize: 13, color: "var(--color-grey-400)", margin: 0, maxWidth: 400 }}>
                I know your injury ({user?.injuryType || "condition"}), exercise history, pain logs, and recovery goals. Ask me anything!
              </p>
            </div>
            {/* Quick Prompts */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 600, marginTop: 8 }}>
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.prompt)}
                  style={{
                    padding: "8px 14px",
                    background: "var(--color-surface-alt)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 20,
                    color: "var(--color-grey-200)",
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22c55e"; e.currentTarget.style.color = "#22c55e"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-grey-200)"; }}
                >
                  <HiSparkles size={12} />
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: msg.role === "user" ? "flex-end" : "flex-start", flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: msg.role === "user" ? "var(--color-surface-alt)" : "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 2,
            }}>
              {msg.role === "user" ? <HiUser size={14} color="var(--color-grey-300)" /> : <HiCpuChip size={14} color="#fff" />}
            </div>
            {/* Bubble */}
            <div style={{
              maxWidth: "75%",
              padding: "12px 16px",
              borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: msg.role === "user" ? "var(--color-accent-dim)" : "var(--color-surface-alt)",
              border: `1px solid ${msg.role === "user" ? "rgba(34,197,94,0.2)" : "var(--color-border)"}`,
              position: "relative",
            }}>
              {msg.image && (
                <img src={msg.image} alt="Uploaded" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, marginBottom: 8 }} />
              )}
              <div
                style={{ fontSize: 14, color: "var(--color-grey-100)", lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content.replace(/\n/g, '<br/>') }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "var(--color-grey-500)" }}>{formatTime(msg.timestamp)}</span>
                {msg.role === "assistant" && (
                  <button
                    onClick={() => copyMessage(msg.content, i)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-grey-500)" }}
                    title="Copy"
                  >
                    <HiClipboardDocument size={14} />
                    {copied === i && <span style={{ fontSize: 10, marginLeft: 4, color: "#22c55e" }}>Copied</span>}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #22c55e, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HiCpuChip size={14} color="#fff" />
            </div>
            <div style={{ padding: "14px 18px", background: "var(--color-surface-alt)", border: "1px solid var(--color-border)", borderRadius: "16px 16px 16px 4px" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.2s infinite" }} />
                <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.2s infinite 0.2s" }} />
                <div className="typing-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", animation: "pulse 1.2s infinite 0.4s" }} />
                <span style={{ fontSize: 12, color: "var(--color-grey-400)", marginLeft: 8 }}>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div style={{ padding: "8px 24px", borderTop: "1px solid var(--color-border)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: 6, background: "var(--color-surface-alt)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
            <img src={imagePreview} alt="Preview" style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }} />
            <span style={{ fontSize: 12, color: "var(--color-grey-300)" }}>Image attached</span>
            <button onClick={removeImage} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-grey-400)", padding: 2 }}>
              <HiXMark size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div style={{ padding: "12px 24px 20px", borderTop: "1px solid var(--color-border)" }}>
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 8,
          background: "var(--color-surface-alt)",
          border: "1px solid var(--color-border)",
          borderRadius: 16,
          padding: "8px 8px 8px 16px",
          transition: "border-color 0.2s",
        }}>
          {/* Image Upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "none", border: "none", cursor: "pointer", color: "var(--color-grey-400)",
              padding: 6, borderRadius: 8, flexShrink: 0, transition: "color 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#22c55e"}
            onMouseLeave={(e) => e.currentTarget.style.color = "var(--color-grey-400)"}
            title="Upload image"
          >
            <HiPhoto size={20} />
          </button>
          {/* Text Input */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about your recovery, meals, exercises..."
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--color-white)",
              fontSize: 14,
              resize: "none",
              lineHeight: 1.5,
              maxHeight: 120,
              fontFamily: "inherit",
            }}
          />
          {/* Send */}
          <button
            onClick={() => sendMessage()}
            disabled={loading || (!input.trim() && !imageBase64)}
            style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: input.trim() || imageBase64 ? "linear-gradient(135deg, #22c55e, #16a34a)" : "var(--color-surface-2)",
              border: "none", cursor: input.trim() || imageBase64 ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s",
              opacity: loading ? 0.5 : 1,
            }}
          >
            <HiPaperAirplane size={16} color="#fff" />
          </button>
        </div>
        <p style={{ fontSize: 10, color: "var(--color-grey-500)", marginTop: 6, textAlign: "center" }}>
          AI responses are for informational purposes only. Always consult your physician for medical decisions.
        </p>
      </div>

      {/* Typing animation keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default AIChat;
