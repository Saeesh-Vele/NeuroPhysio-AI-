// AuthContext shim — bridges MealsPage's useAuth() to NeuroPhysio's useAppStore()
import { createContext, useContext, type FC, type ReactNode } from "react";
import { useAppStore } from "../store/useAppStore";

interface AuthContextValue {
  user: { uid: string } | null;
  profile: {
    name: string;
    age: number;
    gender: string;
    weight: number;
    height: number;
    bmi: number;
    goal: string;
    activityLevel: string;
    dietType: string;
    allergies: string[];
    foodDislikes: string[];
    medicalConditions: string[];
    weeklyBudget: number;
  } | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null, profile: null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { firebaseUser, user } = useAppStore();

  const value: AuthContextValue = {
    user: firebaseUser ? { uid: firebaseUser.uid } : null,
    profile: user
      ? {
          name: user.name || "",
          age: user.age || 25,
          gender: user.gender || "other",
          weight: user.weight || 70,
          height: user.height || 170,
          bmi: user.weight && user.height
            ? Math.round((user.weight / ((user.height / 100) ** 2)) * 10) / 10
            : 22,
          goal: user.recoveryGoals?.[0] || "recovery",
          activityLevel: user.treatmentPhase || "moderate",
          dietType: "balanced",
          allergies: [],
          foodDislikes: [],
          medicalConditions: user.injuryType ? [user.injuryType] : [],
          weeklyBudget: 2000,
        }
      : null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
