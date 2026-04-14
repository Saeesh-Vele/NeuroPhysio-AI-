import { useEffect, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useGamification } from "../../../contexts/GamificationContext";
import { generateMealPlan, regenerateSingleMeal } from "../../../lib/groq";
import { saveMealPlan, getMealPlan, getMealPlanHistory, logMealFromPlan, getFoodLogs } from "../../../lib/firestore";
import type { DailyMealPlan, Meal } from "../../../lib/types";
import { motion, AnimatePresence } from "framer-motion";

const COOK_TIME = [
    { value: "quick", label: "Under 15 min" },
    { value: "moderate", label: "15-30 min" },
    { value: "elaborate", label: "45+ min" },
];
const SPICE = ["Mild", "Medium", "Spicy"];
const CUISINES = [
    { value: "indian", label: "Indian" },
    { value: "south-indian", label: "South Indian" },
    { value: "chinese", label: "Chinese" },
    { value: "continental", label: "Continental" },
    { value: "mexican", label: "Mexican" },
    { value: "thai", label: "Thai" },
    { value: "mixed", label: "Mixed" },
];
const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_ICONS: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍿" };
const MACRO_COLORS = ["#22c55e", "#3b82f6", "#f59e0b"];

export default function MealsPage() {
    const { user, profile } = useAuth();
    const { addXP } = useGamification();
    const [plan, setPlan] = useState<DailyMealPlan | null>(null);
    const [loading, setLoading] = useState(false);
    const [regenerating, setRegenerating] = useState<string | null>(null);
    const [loggedMeals, setLoggedMeals] = useState<Set<string>>(new Set());
    const [error, setError] = useState("");
    const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
    const [dayOffset, setDayOffset] = useState(0);
    const [history, setHistory] = useState<{ date: string; plan: DailyMealPlan }[]>([]);
    const [tab, setTab] = useState<"today" | "history">("today");
    const [cookTime, setCookTime] = useState("moderate");
    const [spiceLevel, setSpiceLevel] = useState("Medium");
    const [cuisine, setCuisine] = useState("indian");

    function getDateStr(offset: number) {
        const d = new Date(); d.setDate(d.getDate() + offset);
        return d.toISOString().split("T")[0];
    }

    function getDayLabel(offset: number) {
        if (offset === 0) return "Today";
        if (offset === -1) return "Yesterday";
        if (offset === 1) return "Tomorrow";
        const d = new Date(); d.setDate(d.getDate() + offset);
        return d.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
    }

    // Load plan and sync logged meals from Firestore
    useEffect(() => {
        async function load() {
            if (!user) return;
            const dateStr = getDateStr(dayOffset);
            const [saved, allLogs] = await Promise.all([
                getMealPlan(user.uid, dateStr),
                getFoodLogs(user.uid),
            ]);
            setPlan(saved);

            // Check which meals are already logged today by matching meal descriptions
            if (saved) {
                const todayLogs = allLogs.filter(l => l.timestamp?.startsWith(dateStr));
                const logged = new Set<string>();
                MEALS.forEach(type => {
                    const m = (saved as any)[type];
                    if (m && todayLogs.some(l => l.description === m.name)) {
                        logged.add(type);
                    }
                });
                setLoggedMeals(logged);
            } else {
                setLoggedMeals(new Set());
            }
        }
        load();
    }, [user, dayOffset]);

    useEffect(() => {
        async function loadHistory() {
            if (!user || tab !== "history") return;
            const h = await getMealPlanHistory(user.uid, 14);
            setHistory(h);
        }
        loadHistory();
    }, [user, tab]);

    function getContext() {
        if (!profile) return "";
        return `Name:${profile.name}, Age:${profile.age}, Gender:${profile.gender}, Weight:${profile.weight}kg, Height:${profile.height}cm, BMI:${profile.bmi}, Goal:${profile.goal}, Activity:${profile.activityLevel}, Diet:${profile.dietType}, Allergies:${(profile.allergies || []).join(",") || "None"}, Dislikes:${(profile.foodDislikes || []).join(",") || "None"}, Cuisines:${cuisine === "mixed" ? "Any" : cuisine}, Medical:${(profile.medicalConditions || []).join(",") || "None"}, Budget:₹${profile.weeklyBudget}/week, CookTime:${cookTime}, Spice:${spiceLevel}, CookingSkill:${(profile as any).cookingSkill || "intermediate"}`;
    }

    async function generate() {
        if (!user || !profile) return;
        setLoading(true); setError("");
        try {
            console.log("Prompt Context:", getContext());
            const raw = await generateMealPlan(getContext());
            console.log("Raw AI Response:", raw);
            if (!raw || raw.length < 10) {
                throw new Error("Empty AI response");
            }
            let cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(cleaned);
            const dateStr = getDateStr(dayOffset);
            parsed.date = dateStr;
            console.log("Saving meal plan:", parsed);
            await saveMealPlan(user.uid, dateStr, parsed);
            setPlan(parsed);
            setLoggedMeals(new Set());
            addXP(15);
        } catch (e: any) { setError(e.message || "Could not generate meals."); }
        setLoading(false);
    }

    async function handleRegenerate(mealType: typeof MEALS[number]) {
        if (!user || !profile || !plan) return;
        setRegenerating(mealType);
        try {
            const raw = await regenerateSingleMeal(mealType, getContext(), JSON.stringify(plan));
            let cleaned = raw.replace(/```json\n?|```\n?/g, "").trim();
            cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
            const firstBrace = cleaned.indexOf("{");
            const lastBrace = cleaned.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
            const newMeal = JSON.parse(cleaned);
            const updated = { ...plan, [mealType]: newMeal };
            updated.totalCalories = MEALS.reduce((a, t) => a + ((updated as any)[t]?.calories || 0), 0);
            await saveMealPlan(user.uid, getDateStr(dayOffset), updated);
            setPlan(updated);
            setLoggedMeals(prev => { const n = new Set(prev); n.delete(mealType); return n; });
        } catch (e: any) { setError(`Failed to regenerate ${mealType}: ${e.message}`); }
        setRegenerating(null);
    }

    async function toggleLogMeal(mealType: string, meal: Meal) {
        if (!user) return;
        const alreadyLogged = loggedMeals.has(mealType);
        if (alreadyLogged) return; // once logged, stay logged
        try {
            await logMealFromPlan(user.uid, mealType, meal);
            setLoggedMeals(prev => new Set(prev).add(mealType));
            addXP(10);
        } catch (e: any) { setError(`Failed to log ${mealType}: ${e.message}`); }
    }

    function MacroDonut({ meal }: { meal: Meal }) {
        const total = meal.protein + meal.carbs + meal.fats;
        if (total === 0) return null;
        const pPct = (meal.protein / total) * 100;
        const cPct = (meal.carbs / total) * 100;
        const R = 24, C = 2 * Math.PI * R;
        return (
            <svg viewBox="0 0 60 60" className="w-14 h-14 shrink-0">
                <circle cx="30" cy="30" r={R} fill="none" stroke="#e2e8f0" strokeWidth="6" className="dark:stroke-slate-700" />
                <circle cx="30" cy="30" r={R} fill="none" stroke={MACRO_COLORS[0]} strokeWidth="6"
                    strokeDasharray={`${(pPct / 100) * C} ${C}`} strokeDashoffset="0" className="-rotate-90 origin-center" />
                <circle cx="30" cy="30" r={R} fill="none" stroke={MACRO_COLORS[1]} strokeWidth="6"
                    strokeDasharray={`${(cPct / 100) * C} ${C}`} strokeDashoffset={`${-(pPct / 100) * C}`} className="-rotate-90 origin-center" />
                <text x="30" y="32" textAnchor="middle" className="text-[9px] fill-slate-600 dark:fill-slate-400 font-bold">{meal.calories}</text>
            </svg>
        );
    }

    return (
        <div className="meals-page fade-in" style={{ paddingBottom: 40 }}>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 className="page-header__title" style={{ margin: 0 }}>Meal Plan</h1>
                    <p className="page-header__subtitle" style={{ margin: 0 }}>AI-powered personalized nutrition</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setTab("today")}
                        className={`btn ${tab === "today" ? "btn-primary" : "btn-outline"}`}>
                        Plan
                    </button>
                    <button onClick={() => setTab("history")}
                        className={`btn ${tab === "history" ? "btn-primary" : "btn-outline"}`}>
                        History
                    </button>
                </div>
            </div>

            {tab === "today" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Day selector */}
                    <div className="widget" style={{ padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <button onClick={() => setDayOffset(d => d - 1)} className="btn-icon">←</button>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "var(--color-white)" }}>{getDayLabel(dayOffset)} · {getDateStr(dayOffset)}</span>
                        <button onClick={() => setDayOffset(d => d + 1)} className="btn-icon">→</button>
                    </div>

                    {/* Cuisine selector */}
                    <div className="widget" style={{ padding: 20 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-grey-300)", marginBottom: 12 }}>Cuisine</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {CUISINES.map(c => (
                                <button key={c.value} onClick={() => setCuisine(c.value)}
                                    className={`tag ${cuisine === c.value ? "badge-accent" : ""}`}
                                    style={cuisine !== c.value ? { background: "var(--color-surface-2)", cursor: "pointer" } : { cursor: "pointer", border: "1px solid var(--color-accent)", color: "var(--color-white)" }}>
                                    {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preferences row */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                            {COOK_TIME.map(t => (
                                <button key={t.value} onClick={() => setCookTime(t.value)}
                                    className="tag"
                                    style={cookTime === t.value ? { background: "var(--color-accent-dim)", color: "var(--color-accent-text)", borderColor: "var(--color-accent)", cursor: "pointer" } : { background: "var(--color-surface-2)", cursor: "pointer" }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div style={{ width: 1, height: 20, background: "var(--color-border)" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                            {SPICE.map(s => (
                                <button key={s} onClick={() => setSpiceLevel(s)}
                                    className="tag"
                                    style={spiceLevel === s ? { background: "var(--color-warning-dim)", color: "var(--color-warning)", borderColor: "var(--color-warning)", cursor: "pointer" } : { background: "var(--color-surface-2)", cursor: "pointer" }}>
                                    {s}
                                </button>
                            ))}
                        </div>
                        <div style={{ flex: 1 }} />
                        <button onClick={generate} disabled={loading} className="btn btn-primary" style={{ padding: "12px 24px" }}>
                            {loading ? (
                                <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Generating...</>
                            ) : (
                                <><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Generate Plan</>
                            )}
                        </button>
                    </div>

                    {error && <div style={{ background: "var(--color-danger-dim)", border: "1px solid var(--color-danger)", borderRadius: "var(--radius-lg)", padding: "12px 16px", fontSize: 14, color: "var(--color-white)" }}>{error}</div>}

                    {/* Meal Cards */}
                    {plan && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {/* Total summary bar */}
                            <div className="widget__header widget" style={{ padding: "16px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                                    <div>
                                        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-grey-300)" }}>Total Calories</p>
                                        <p style={{ fontSize: 24, fontWeight: 800, color: "var(--color-white)", lineHeight: 1.1 }}>{plan.totalCalories || MEALS.reduce((a, t) => a + ((plan as any)[t]?.calories || 0), 0)} kcal</p>

                                    </div>
                                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
                                    <div className="flex gap-4">
                                        {[
                                            { label: "Protein", value: MEALS.reduce((a, t) => a + ((plan as any)[t]?.protein || 0), 0), color: MACRO_COLORS[0] },
                                            { label: "Carbs", value: MEALS.reduce((a, t) => a + ((plan as any)[t]?.carbs || 0), 0), color: MACRO_COLORS[1] },
                                            { label: "Fats", value: MEALS.reduce((a, t) => a + ((plan as any)[t]?.fats || 0), 0), color: MACRO_COLORS[2] },
                                        ].map(m => (
                                            <div key={m.label} className="text-center">
                                                <p className="text-sm font-bold" style={{ color: m.color }}>{m.value}g</p>
                                                <p className="text-[9px] text-slate-400 uppercase font-semibold">{m.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div style={{ fontSize: 10, color: "var(--color-grey-400)" }}>{loggedMeals.size}/{MEALS.length} eaten</div>
                                    <button
                                        onClick={() => {
                                            if (!plan) return;
                                            const totalP = MEALS.reduce((a, t) => a + ((plan as any)[t]?.protein || 0), 0);
                                            const totalC = MEALS.reduce((a, t) => a + ((plan as any)[t]?.carbs || 0), 0);
                                            const totalF = MEALS.reduce((a, t) => a + ((plan as any)[t]?.fats || 0), 0);
                                            const totalCal = plan.totalCalories || MEALS.reduce((a, t) => a + ((plan as any)[t]?.calories || 0), 0);
                                            let text = `CHIKITSA — Meal Plan for ${plan.date || getDateStr(dayOffset)}\n`;
                                            text += `Total: ${totalCal} kcal  |  Protein: ${totalP}g  Carbs: ${totalC}g  Fats: ${totalF}g\n`;
                                            for (const m of MEALS) {
                                                const meal = (plan as any)[m];
                                                if (!meal) continue;
                                                text += `\n${m}\n---${meal.name}\n`;
                                                text += `${meal.calories} kcal  |  Protein: ${meal.protein}g  Carbs: ${meal.carbs}g  Fats: ${meal.fats}g\n`;
                                                text += `Prep: ${meal.prepTime}  Cook: ${meal.cookTime}\n`;
                                            }
                                            navigator.clipboard.writeText(text.trim());
                                            const btn = document.getElementById("copy-plan-btn");
                                            if (btn) { btn.textContent = "Copied!"; setTimeout(() => { btn.textContent = "📋 Copy"; }, 1500); }
                                        }}
                                        id="copy-plan-btn"
                                        className="btn btn-outline" style={{ fontSize: 10, padding: "6px 10px" }}
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>

                            {/* Individual meal cards */}
                            <AnimatePresence>
                                {MEALS.map((type) => {
                                    const m = (plan as any)[type] as Meal | undefined;
                                    if (!m) return null;
                                    const isExpanded = expandedMeal === type;
                                    const isLogged = loggedMeals.has(type);
                                    return (
                                        <motion.div key={type} layout
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                            className="widget transition-all overflow-hidden" style={isLogged ? { border: "1px solid var(--color-accent)", background: "var(--color-surface-2)" } : {}}>
                                            {/* Main card */}
                                            <div className="p-5 flex items-start gap-4">
                                                {/* ✅ Tick checkbox */}
                                                <button
                                                    onClick={() => toggleLogMeal(type, m)}
                                                    disabled={isLogged}
                                                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 mt-1 transition-all ${isLogged
                                                        ? "text-white"
                                                        : "text-transparent hover:opacity-80"
                                                        }`}
                                                    style={isLogged ? { background: "var(--color-accent)", borderColor: "var(--color-accent)" } : { borderColor: "var(--color-grey-400)" }}
                                                    title={isLogged ? "Logged ✓" : "Tick to log this meal & earn 10 XP"}>
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                </button>
                                                <MacroDonut meal={m} />
                                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedMeal(isExpanded ? null : type)}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm">{MEAL_ICONS[type]}</span>
                                                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-accent-text)" }}>{type}</span>
                                                        {isLogged && <span className="badge-accent">✓ Eaten · +10 XP</span>}
                                                    </div>
                                                    <h3 className="text-base font-bold truncate" style={{ color: "var(--color-white)" }}>{m.name}</h3>
                                                    <div className="flex items-center gap-3 mt-1.5 text-[11px]" style={{ color: "var(--color-grey-300)" }}>
                                                        <span className="font-semibold">{m.calories} kcal</span>
                                                        <span>P: {m.protein}g</span><span>C: {m.carbs}g</span><span>F: {m.fats}g</span>
                                                        {m.prepTime && <span className="ml-2">⏱ {m.prepTime}</span>}
                                                    </div>
                                                </div>
                                                {/* Small swap icon */}
                                                <button onClick={() => handleRegenerate(type)}
                                                    disabled={!!regenerating}
                                                    className="btn-icon w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 shrink-0"
                                                    title="Swap this meal">
                                                    {regenerating === type
                                                        ? <span className="spinner w-3 h-3 border-2 border-t-transparent rounded-full" style={{ borderColor: 'var(--color-warning)' }} />
                                                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                    }
                                                </button>
                                            </div>

                                            {/* Expanded details */}
                                            {isExpanded && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    style={{ borderTop: "1px solid var(--color-border-light)", padding: "0 20px 20px" }}>
                                                    {m.explanation && (
                                                        <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "var(--color-accent-dim)", border: "1px solid var(--color-accent)" }}>
                                                            <p style={{ fontSize: 12, color: "var(--color-accent-text)" }}>💡 {m.explanation}</p>
                                                        </div>
                                                    )}
                                                    <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                                        <div>
                                                            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-grey-300)", marginBottom: 8 }}>Ingredients</h4>
                                                            <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                                                {m.ingredients.map((ing, i) => (
                                                                    <li key={i} style={{ fontSize: 12, display: "flex", justifyContent: "space-between", color: "var(--color-white)" }}>
                                                                        <span>{ing.item}</span>
                                                                        <span style={{ color: "var(--color-grey-400)", fontWeight: 500 }}>{ing.quantity}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-grey-300)", marginBottom: 8 }}>Recipe</h4>
                                                            <ol style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                                {m.recipe.map((step, i) => (
                                                                    <li key={i} style={{ fontSize: 12, display: "flex", gap: 8, color: "var(--color-white)" }}>
                                                                        <span style={{ color: "var(--color-accent)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                                                                        <span>{step.replace(/^Step \d+:\s*/i, "")}</span>
                                                                    </li>
                                                                ))}
                                                            </ol>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </div>
                    )}

                    {!plan && !loading && (
                        <div className="widget" style={{ padding: 48, textAlign: "center" }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-grey-300)", marginBottom: 4 }}>No meal plan for {getDayLabel(dayOffset).toLowerCase()}</p>
                            <p style={{ fontSize: 12, color: "var(--color-grey-400)" }}>Select a cuisine above and click "Generate Plan"</p>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ HISTORY TAB ═══════ */}
            {tab === "history" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {history.length === 0 ? (
                        <div className="widget" style={{ padding: 48, textAlign: "center" }}>
                            <p style={{ fontSize: 14, color: "var(--color-grey-400)" }}>No meal plan history yet. Generate your first plan!</p>
                        </div>
                    ) : (
                        history.map(({ date, plan: hp }) => (
                            <div key={date} className="widget" style={{ padding: 20 }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-white)" }}>
                                        {new Date(date + "T00:00:00").toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
                                    </h3>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--color-grey-400)" }}>{hp.totalCalories || 0} kcal</span>
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                                    {MEALS.map(type => {
                                        const m = (hp as any)[type];
                                        if (!m) return null;
                                        return (
                                            <div key={type} className="widget" style={{ padding: 12, background: "var(--color-surface-2)", border: "1px solid var(--color-border-light)" }}>
                                                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-accent-text)" }}>{type}</span>
                                                <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: "var(--color-white)", marginTop: 4 }}>{m.name}</p>
                                                <p style={{ fontSize: 10, color: "var(--color-grey-400)", marginTop: 2 }}>{m.calories} kcal</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
