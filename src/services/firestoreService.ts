import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

/**
 * Recursively remove `undefined` values from an object.
 * Firestore throws if any field value is `undefined`.
 */
function stripUndefined(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      clean[key] = stripUndefined(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

import type {
  UserProfile,
  ExerciseSession,
  PainLog,
  CognitiveSession,
  ExercisePlan,
  MedicalReport,
  MobilityProgress,
  MobilityAssessmentResult,
} from "../types";

// ═══════════════════════════════════════════════
//  USER PROFILE
// ═══════════════════════════════════════════════

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  try {
    const ref = doc(db, "users", profile.uid);
    const data = stripUndefined({ ...profile, updatedAt: new Date().toISOString() });
    await setDoc(ref, data, { merge: true });
  } catch (err) {
    console.error("[Firestore] saveUserProfile error:", err);
    throw err;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (err) {
    console.error("[Firestore] getUserProfile error:", err);
    return null;
  }
}

export async function checkOnboardingComplete(uid: string): Promise<boolean> {
  try {
    const profile = await getUserProfile(uid);
    return profile?.onboardingComplete ?? false;
  } catch {
    return false;
  }
}

export async function updateUserProfile(
  uid: string,
  data: Partial<UserProfile>
): Promise<void> {
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[Firestore] updateUserProfile error:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════
//  EXERCISE SESSIONS
// ═══════════════════════════════════════════════

export async function saveSession(data: Omit<ExerciseSession, "id">): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "sessions"), data);
    return ref.id;
  } catch (err) {
    console.error("[Firestore] saveSession error:", err);
    throw err;
  }
}

export async function getUserSessions(
  userId: string,
  max = 50
): Promise<ExerciseSession[]> {
  try {
    const q = query(
      collection(db, "sessions"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExerciseSession));
    // Sort client-side (avoids needing composite index)
    results.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    return results.slice(0, max);
  } catch (err) {
    console.error("[Firestore] getUserSessions error:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════
//  PAIN LOGS
// ═══════════════════════════════════════════════

export async function savePainLog(data: Omit<PainLog, "id">): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "painLogs"), data);
    return ref.id;
  } catch (err) {
    console.error("[Firestore] savePainLog error:", err);
    throw err;
  }
}

export async function getUserPainLogs(
  userId: string,
  max = 30
): Promise<PainLog[]> {
  try {
    const q = query(
      collection(db, "painLogs"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PainLog));
    results.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    return results.slice(0, max);
  } catch (err) {
    console.error("[Firestore] getUserPainLogs error:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════
//  COGNITIVE SESSIONS
// ═══════════════════════════════════════════════

export async function saveCognitiveSession(
  data: Omit<CognitiveSession, "id">
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "cognitiveSessions"), data);
    return ref.id;
  } catch (err) {
    console.error("[Firestore] saveCognitiveSession error:", err);
    throw err;
  }
}

export async function getUserCognitiveSessions(
  userId: string,
  max = 30
): Promise<CognitiveSession[]> {
  try {
    const q = query(
      collection(db, "cognitiveSessions"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CognitiveSession));
    results.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    console.log("[Firestore] Fetched cognitive sessions:", results.length);
    return results.slice(0, max);
  } catch (err) {
    console.error("[Firestore] getUserCognitiveSessions error:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════
//  EXERCISE PLANS
// ═══════════════════════════════════════════════

export async function saveExercisePlan(
  data: Omit<ExercisePlan, "id">
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "exercisePlans"), data);
    return ref.id;
  } catch (err) {
    console.error("[Firestore] saveExercisePlan error:", err);
    throw err;
  }
}

export async function getLatestExercisePlan(
  userId: string
): Promise<ExercisePlan | null> {
  try {
    const q = query(
      collection(db, "exercisePlans"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    // Sort client-side to avoid composite index requirement
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ExercisePlan));
    docs.sort((a, b) => (b.generatedAt || "").localeCompare(a.generatedAt || ""));
    return docs[0];
  } catch (err) {
    console.error("[Firestore] getLatestExercisePlan error:", err);
    return null;
  }
}

// ═══════════════════════════════════════════════
//  MEDICAL REPORTS
// ═══════════════════════════════════════════════

export async function saveReport(
  data: Omit<MedicalReport, "id">
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "reports"), data);
    return ref.id;
  } catch (err) {
    console.error("[Firestore] saveReport error:", err);
    throw err;
  }
}

export async function getUserReports(
  userId: string,
  max = 10
): Promise<MedicalReport[]> {
  try {
    const q = query(
      collection(db, "reports"),
      where("userId", "==", userId),
      orderBy("uploadedAt", "desc"),
      fbLimit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MedicalReport));
  } catch (err) {
    console.error("[Firestore] getUserReports error:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════
//  COGNITIVE UNLOCK PROGRESS
// ═══════════════════════════════════════════════

export async function getUserUnlockProgress(
  uid: string
): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.unlockedLevels ?? ["Easy"];
    }
    return ["Easy"];
  } catch (err) {
    console.error("[Firestore] getUserUnlockProgress error:", err);
    return ["Easy"];
  }
}

export async function updateUserUnlockProgress(
  uid: string,
  unlockedLevels: string[]
): Promise<void> {
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { unlockedLevels });
  } catch (err) {
    console.error("[Firestore] updateUserUnlockProgress error:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════
//  MOBILITY PROGRESS (ROM tracking over time)
// ═══════════════════════════════════════════════

export async function saveMobilityProgress(
  data: Omit<MobilityProgress, "id">
): Promise<string> {
  try {
    const ref = await addDoc(collection(db, "mobilityProgress"), data);
    return ref.id;
  } catch (err) {
    console.error("[Firestore] saveMobilityProgress error:", err);
    throw err;
  }
}

export async function getMobilityHistory(
  userId: string,
  exerciseId?: string,
  max = 30
): Promise<MobilityProgress[]> {
  try {
    let q;
    if (exerciseId) {
      q = query(
        collection(db, "mobilityProgress"),
        where("userId", "==", userId),
        where("exerciseId", "==", exerciseId)
      );
    } else {
      q = query(
        collection(db, "mobilityProgress"),
        where("userId", "==", userId)
      );
    }
    const snap = await getDocs(q);
    const results = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MobilityProgress));
    results.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
    return results.slice(0, max);
  } catch (err) {
    console.error("[Firestore] getMobilityHistory error:", err);
    return [];
  }
}

// ═══════════════════════════════════════════════
//  EXERCISE DIFFICULTY UNLOCKS
// ═══════════════════════════════════════════════

export async function getExerciseDifficultyUnlocks(
  uid: string
): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      return data.unlockedDifficulties ?? ["beginner"];
    }
    return ["beginner"];
  } catch (err) {
    console.error("[Firestore] getExerciseDifficultyUnlocks error:", err);
    return ["beginner"];
  }
}

export async function updateExerciseDifficultyUnlocks(
  uid: string,
  unlockedDifficulties: string[]
): Promise<void> {
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { unlockedDifficulties });
  } catch (err) {
    console.error("[Firestore] updateExerciseDifficultyUnlocks error:", err);
    throw err;
  }
}

// ═══════════════════════════════════════════════
//  MOBILITY TRACKING (per-session baseline + history)
// ═══════════════════════════════════════════════

export interface SessionMobilityData {
  exerciseId: string;
  exerciseLabel: string;
  peakAngle: number;
  minAngle: number;
  rom: number; // peakAngle - minAngle
  reps: number;
  fullReps: number;
  partialReps: number;
  accuracy: number;
  sessionDate: string;
}

export async function saveSessionMobility(
  uid: string,
  sessionData: SessionMobilityData[]
): Promise<void> {
  try {
    const colRef = collection(db, "users", uid, "sessionMobility");
    const docRef = doc(colRef);
    await setDoc(docRef, { exercises: sessionData, createdAt: new Date().toISOString() });
  } catch (err) {
    console.error("[Firestore] saveSessionMobility error:", err);
  }
}

export async function getSessionMobilityHistory(
  uid: string
): Promise<{ exercises: SessionMobilityData[]; createdAt: string }[]> {
  try {
    const colRef = collection(db, "users", uid, "sessionMobility");
    const snap = await getDocs(colRef);
    const results: { exercises: SessionMobilityData[]; createdAt: string }[] = [];
    snap.forEach((d) => {
      results.push(d.data() as any);
    });
    // Sort by date oldest first
    results.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return results;
  } catch (err) {
    console.error("[Firestore] getSessionMobilityHistory error:", err);
    return [];
  }
}

export async function getBaselineMobility(
  uid: string
): Promise<SessionMobilityData[] | null> {
  // To get the true baseline for EVERY exercise, we fetch all mobility history
  // and find the oldest (first) entry for each unique exercise.
  const history = await getMobilityHistory(uid, undefined, 1000);
  if (history.length === 0) return null;
  
  // getMobilityHistory returns newest first, so we reverse to process oldest first
  const oldestFirst = [...history].reverse();
  
  const baselines = new Map<string, SessionMobilityData>();
  
  for (const m of oldestFirst) {
    if (!baselines.has(m.exerciseId)) {
      baselines.set(m.exerciseId, {
        exerciseId: m.exerciseId,
        exerciseLabel: m.exerciseLabel,
        peakAngle: m.peakAngle,
        minAngle: m.restAngle || 0,
        rom: m.maxRomAchieved || m.peakAngle,
        reps: m.fullReps + m.partialReps,
        fullReps: m.fullReps,
        partialReps: m.partialReps,
        accuracy: 100, // Dummy since it's not in MobilityProgress
        sessionDate: m.timestamp,
      });
    }
  }
  
  return Array.from(baselines.values());
}
