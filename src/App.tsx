import React, { useEffect, useState, type FC } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/config";
import { getUserProfile, getLatestExercisePlan } from "./services/firestoreService";
import { useAppStore } from "./store/useAppStore";
import "./index.css";
import { useToast } from "./hooks/useToast";
import LandingPage from "./pages/LandingPage/LandingPage";
import AuthPage from "./pages/AuthPage/AuthPage";
import OnboardingPage from "./pages/OnboardingPage/OnboardingPage";
import DashboardLayout from "./pages/DashboardPage/DashboardLayout";
import DashboardHome from "./pages/DashboardPage/tabs/DashboardHome";
import ExerciseSession from "./pages/DashboardPage/tabs/ExerciseSession";
import PainTracker from "./pages/DashboardPage/tabs/PainTracker";
import CognitiveTrainer from "./pages/DashboardPage/tabs/CognitiveTrainer";
import Progress from "./pages/DashboardPage/tabs/Progress";
import DoctorReport from "./pages/DashboardPage/tabs/DoctorReport";
import Settings from "./pages/DashboardPage/tabs/Settings";
import { ToastContainer } from "./components/Toast/Toast";

/* ── Auth Guard ── */
const ProtectedRoute: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, isOnboardingComplete } = useAppStore();
  if (!firebaseUser) return <Navigate to="/auth" replace />;
  if (!isOnboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
};

const OnboardingGuard: FC<{ children: React.ReactNode }> = ({ children }) => {
  const { firebaseUser, isOnboardingComplete } = useAppStore();
  if (!firebaseUser) return <Navigate to="/auth" replace />;
  if (isOnboardingComplete) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App: FC = () => {
  const { toasts, showToast } = useToast();
  const { setFirebaseUser, setUser, setOnboardingComplete, setExercisePlan } = useAppStore();
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        // Check onboarding
        const profile = await getUserProfile(user.uid);
        if (profile) {
          setUser(profile);
          setOnboardingComplete(profile.onboardingComplete);
          // Load exercise plan from Firestore so it persists across refreshes
          try {
            const plan = await getLatestExercisePlan(user.uid);
            if (plan) setExercisePlan(plan);
          } catch { /* ignore */ }
        } else {
          setOnboardingComplete(false);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setOnboardingComplete(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, [setFirebaseUser, setUser, setOnboardingComplete]);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--color-bg)",
          color: "var(--color-grey-300)",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--color-border)",
            borderTopColor: "var(--color-accent)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span>Loading NeuroPhysio…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage showToast={showToast} />} />
        <Route path="/auth" element={<AuthPage showToast={showToast} />} />

        {/* Onboarding — after first signup */}
        <Route
          path="/onboarding"
          element={
            <OnboardingGuard>
              <OnboardingPage />
            </OnboardingGuard>
          }
        />

        {/* Dashboard routes — protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="exercise" element={<ExerciseSession />} />
          <Route path="pain-tracker" element={<PainTracker />} />
          <Route path="cognitive" element={<CognitiveTrainer />} />
          <Route path="progress" element={<Progress />} />
          <Route path="doctor-report" element={<DoctorReport />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer toasts={toasts} />
    </>
  );
};

export default App;
