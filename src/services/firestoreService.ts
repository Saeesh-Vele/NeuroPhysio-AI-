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
