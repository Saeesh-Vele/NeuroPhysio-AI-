import { create } from "zustand";
import type { AppState } from "../types";

export const useAppStore = create<AppState>((set) => ({
  user: null,
  firebaseUser: null,
  currentExercise: null,
  poseData: null,
  reps: 0,
  feedback: null,
  isOnboardingComplete: false,
  exercisePlan: null,

  setUser: (user) => set({ user }),
  setFirebaseUser: (u) => set({ firebaseUser: u }),
  setCurrentExercise: (id) => set({ currentExercise: id, reps: 0, feedback: null }),
  setPoseData: (pose) => set({ poseData: pose }),
  setReps: (n) => set({ reps: n }),
  incrementReps: () => set((s) => ({ reps: s.reps + 1 })),
  setFeedback: (fb) => set({ feedback: fb }),
  setOnboardingComplete: (v) => set({ isOnboardingComplete: v }),
  setExercisePlan: (plan) => set({ exercisePlan: plan }),
  reset: () =>
    set({
      user: null,
      firebaseUser: null,
      currentExercise: null,
      poseData: null,
      reps: 0,
      feedback: null,
      isOnboardingComplete: false,
      exercisePlan: null,
    }),
}));
