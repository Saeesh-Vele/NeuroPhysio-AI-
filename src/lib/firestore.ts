// Meal-specific Firestore operations
// Uses the existing Firebase instance from the project

import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
} from "firebase/firestore";
import { db } from "../firebase/config";
import type { DailyMealPlan, Meal, FoodLog } from "./types";

export async function saveMealPlan(
  userId: string,
  dateStr: string,
  plan: DailyMealPlan
): Promise<void> {
  const ref = doc(db, "mealPlans", `${userId}_${dateStr}`);
  await setDoc(ref, { userId, date: dateStr, plan, updatedAt: new Date().toISOString() });
}

export async function getMealPlan(
  userId: string,
  dateStr: string
): Promise<DailyMealPlan | null> {
  const ref = doc(db, "mealPlans", `${userId}_${dateStr}`);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data().plan as DailyMealPlan;
}

export async function getMealPlanHistory(
  userId: string,
  maxDays = 14
): Promise<{ date: string; plan: DailyMealPlan }[]> {
  try {
    const q = query(
      collection(db, "mealPlans"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const results = snap.docs
      .map((d) => ({ date: d.data().date as string, plan: d.data().plan as DailyMealPlan }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, maxDays);
    return results;
  } catch (err) {
    console.error("[Firestore] getMealPlanHistory error:", err);
    return [];
  }
}

export async function logMealFromPlan(
  userId: string,
  mealType: string,
  meal: Meal
): Promise<string> {
  const ref = await addDoc(collection(db, "foodLogs"), {
    userId,
    mealType,
    description: meal.name,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fats: meal.fats,
    timestamp: new Date().toISOString(),
  });
  return ref.id;
}

export async function getFoodLogs(userId: string): Promise<FoodLog[]> {
  try {
    const q = query(
      collection(db, "foodLogs"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FoodLog))
      .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
  } catch (err) {
    console.error("[Firestore] getFoodLogs error:", err);
    return [];
  }
}
