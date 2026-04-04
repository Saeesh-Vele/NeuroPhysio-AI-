import React, { useState, useCallback, type FC } from "react";
import { FaBrain } from "react-icons/fa";
import { auth } from "../../../firebase/config";
import { saveCognitiveSession } from "../../../services/firestoreService";

const GRID_SIZE = 3;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b"];

type GameState = "idle" | "showing" | "input" | "result";

const CognitiveTrainer: FC = () => {
  const [accuracy, setAccuracy] = useState(0);
  const [responseTime, setResponseTime] = useState(0);
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [round, setRound] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [message, setMessage] = useState("Press Start to begin. Memorize the highlighted cells.");
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [level, setLevel] = useState(3);
  const [history, setHistory] = useState<{ score: number; time: number; level: number }[]>([]);

  const patternLength = difficulty === "Easy" ? 3 : difficulty === "Medium" ? 4 : 5;

  const generatePattern = useCallback(() => {
    const cells = new Set<number>();
    while (cells.size < patternLength) {
      cells.add(Math.floor(Math.random() * TOTAL_CELLS));
    }
    return Array.from(cells);
  }, [patternLength]);

  const startGame = useCallback(() => {
    const newPattern = generatePattern();
    setPattern(newPattern);
    setUserPattern([]);
    setGameState("showing");
    setMessage("Memorize the pattern...");
    setRound((r) => r + 1);

    const showTime = difficulty === "Easy" ? 2000 : difficulty === "Medium" ? 1500 : 1000;
    setTimeout(() => {
      setGameState("input");
      setMessage("Now recreate the pattern!");
      setStartTime(Date.now());
    }, showTime);
  }, [generatePattern, difficulty]);

  const handleCellClick = (index: number) => {
    if (gameState !== "input") return;

    setUserPattern((prev) => {
      if (prev.includes(index)) return prev.filter((i) => i !== index);

      const next = [...prev, index];
      if (next.length === patternLength) {
        const elapsed = Date.now() - startTime;
        const correctCount = next.filter((i) => pattern.includes(i)).length;
        const acc = Math.round((correctCount / patternLength) * 100);
        const isCorrect = acc === 100;
        const newTotal = totalAttempts + 1;
        const newCorrect = totalCorrect + (isCorrect ? 1 : 0);

        setTotalAttempts(newTotal);
        setTotalCorrect(newCorrect);
        setAccuracy(Math.round((newCorrect / newTotal) * 100));
        setResponseTime(elapsed);
        setGameState("result");
        setMessage(isCorrect ? `✅ Perfect! Accuracy: ${acc}%` : `❌ ${acc}% correct. Try again.`);

        // Level progression
        if (isCorrect && level < 10) {
          setLevel((l) => l + 1);
        }

        // Save to history
        setHistory((h) => [{ score: acc, time: elapsed, level }, ...h].slice(0, 5));

        // Save to Firestore
        const uid = auth.currentUser?.uid;
        if (uid) {
          saveCognitiveSession({
            odudId: uid,
            accuracy: acc,
            responseTimeMs: elapsed,
            level,
            difficulty,
            timestamp: new Date().toISOString(),
          }).catch(() => {});
        }
      }
      return next;
    });
  };

  const getCellState = (index: number) => {
    if (gameState === "showing" && pattern.includes(index)) return "highlighted";
    if ((gameState === "input" || gameState === "result") && userPattern.includes(index)) {
      if (gameState === "result") return pattern.includes(index) ? "correct" : "wrong";
      return "selected";
    }
    if (gameState === "result" && pattern.includes(index)) return "missed";
    return "empty";
  };

  return (
    <div className="cognitive-page fade-in">
      <div className="page-header">
        <h1 className="page-header__title">Cognitive Trainer</h1>
        <p className="page-header__subtitle">Exercise your memory and pattern recognition. Level {level}.</p>
      </div>

      {/* Stats */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card fade-up delay-1">
          <div className="stat-card__icon stat-card__icon--blue"><FaBrain size={18} /></div>
          <div className="stat-card__value">{accuracy}%</div>
          <div className="stat-card__label">Accuracy</div>
        </div>
        <div className="stat-card fade-up delay-2">
          <div className="stat-card__icon stat-card__icon--orange">⏱</div>
          <div className="stat-card__value">{responseTime > 0 ? `${(responseTime / 1000).toFixed(1)}s` : "—"}</div>
          <div className="stat-card__label">Response Time</div>
        </div>
        <div className="stat-card fade-up delay-3">
          <div className="stat-card__icon stat-card__icon--green">⚡</div>
          <div className="stat-card__value">Lv.{level}</div>
          <div className="stat-card__label">{difficulty}</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Game */}
        <div className="widget fade-up delay-4">
          <div className="widget__header">
            <h3 className="widget__title">Pattern Recall</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {(["Easy", "Medium", "Hard"] as const).map((d) => (
                <button
                  key={d}
                  className={`btn ${difficulty === d ? "btn-primary" : "btn-outline"}`}
                  style={{ padding: "6px 14px", fontSize: 12 }}
                  onClick={() => {
                    setDifficulty(d);
                    setGameState("idle");
                    setPattern([]);
                    setUserPattern([]);
                    setMessage("Press Start to begin.");
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="widget__body" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <p style={{ color: "var(--color-grey-300)", fontSize: 14, marginBottom: 24, textAlign: "center" }}>
              {message}
            </p>

            <div className="pattern-grid">
              {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
                const state = getCellState(i);
                return (
                  <button
                    key={i}
                    className={`pattern-cell pattern-cell--${state}`}
                    onClick={() => handleCellClick(i)}
                    disabled={gameState !== "input"}
                  />
                );
              })}
            </div>

            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              {(gameState === "idle" || gameState === "result") && (
                <button className="btn btn-primary btn-lg" onClick={startGame}>
                  {gameState === "result" ? "Next Round" : "Start"}
                </button>
              )}
            </div>

            {totalAttempts > 0 && (
              <p style={{ color: "var(--color-grey-400)", fontSize: 12, marginTop: 16 }}>
                Round {round} · {totalCorrect}/{totalAttempts} correct
              </p>
            )}
          </div>
        </div>

        {/* History Panel */}
        <div className="widget fade-up delay-5">
          <div className="widget__header">
            <h3 className="widget__title">Recent Sessions</h3>
          </div>
          <div className="widget__body">
            {history.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--color-grey-400)", textAlign: "center", padding: 20 }}>
                Complete a round to see your history.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "var(--color-surface-2)",
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--color-grey-200)" }}>
                      Level {h.level}
                    </span>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: h.score === 100 ? "var(--color-accent-text)" : "var(--color-warning)",
                    }}>
                      {h.score}%
                    </span>
                    <span style={{ fontSize: 11, color: "var(--color-grey-400)", fontFamily: "var(--font-mono)" }}>
                      {(h.time / 1000).toFixed(1)}s
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CognitiveTrainer;
