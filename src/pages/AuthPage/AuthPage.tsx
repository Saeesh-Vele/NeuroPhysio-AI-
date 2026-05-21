import React, { useState, useEffect, useRef, type FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../firebase/config";
import { getUserProfile } from "../../services/firestoreService";
import { useAppStore } from "../../store/useAppStore";
import type { ToastType } from "../../types";
import "./AuthPage.css";

interface AuthPageProps {
  showToast: (msg: string, type?: ToastType) => void;
}

/* ── Google Icon SVG ───────────────────────────────────── */
const GoogleIcon: FC = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ── Starfield Canvas Component ────────────────────────── */
const StarfieldCanvas: FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const stars: {
      x: number; y: number; r: number; a: number;
      speed: number; phase: number; drift: number;
    }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 0.85 + 0.18,
        a: Math.random() * 0.45 + 0.1,
        speed: Math.random() * 0.00011 + 0.000035,
        phase: Math.random() * Math.PI * 2,
        drift: (Math.random() - 0.5) * 0.00008,
      });
    }

    const draw = (ts: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const W = canvas.width;
      const H = canvas.height;
      stars.forEach((s) => {
        s.x = (s.x + s.drift + 1) % 1;
        const alpha = s.a * (0.55 + 0.45 * Math.sin(ts * s.speed * 1000 + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(74,222,128,${alpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="auth-bg-canvas" />;
};

/* ── Auth Page Component ───────────────────────────────── */
const AuthPage: FC<AuthPageProps> = ({ showToast }) => {
  const navigate = useNavigate();
  const [isRightPanelActive, setIsRightPanelActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sign In state
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");

  // Sign Up state
  const [suName, setSuName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");

  /* ── Friendly error messages ─────────────────────────── */
  const friendlyError = (code: string): string => {
    const map: Record<string, string> = {
      "auth/email-already-in-use":   "That email is already registered. Please sign in.",
      "auth/invalid-email":          "Invalid email address.",
      "auth/weak-password":          "Password must be at least 6 characters.",
      "auth/user-not-found":         "No account found with this email.",
      "auth/wrong-password":         "Incorrect password. Try again.",
      "auth/too-many-requests":      "Too many attempts. Please try again later.",
      "auth/network-request-failed": "Network error. Check your connection.",
      "auth/popup-closed-by-user":   "Sign-in popup was closed.",
      "auth/invalid-credential":     "Invalid email or password.",
    };
    return map[code] || "Something went wrong. Please try again.";
  };

  const { setFirebaseUser, setUser, setOnboardingComplete } = useAppStore();

  /* ── Sign In ─────────────────────────────────────────── */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siEmail || !siPwd) {
      showToast("Please fill in all fields.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, siEmail, siPwd);
      // Fetch profile and update store before navigating so route guards have correct state
      const profile = await getUserProfile(cred.user.uid);
      const complete = profile?.onboardingComplete ?? false;
      setFirebaseUser({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName });
      if (profile) {
        setUser(profile);
        setOnboardingComplete(complete);
      }
      showToast("Welcome back! Redirecting…");
      navigate(complete ? "/dashboard" : "/onboarding");
    } catch (err: any) {
      showToast(friendlyError(err.code), "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Sign Up ─────────────────────────────────────────── */
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suName) { showToast("Please enter your full name.", "error"); return; }
    if (suPwd.length < 6) { showToast("Password must be at least 6 characters.", "error"); return; }

    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, suEmail, suPwd);
      await updateProfile(cred.user, { displayName: suName });
      showToast("Account created! Setting up your profile…");
      setTimeout(() => navigate("/onboarding"), 1200);
    } catch (err: any) {
      showToast(friendlyError(err.code), "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Google Auth ─────────────────────────────────────── */
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const cred = await signInWithPopup(auth, provider);
      // Fetch profile and update store before navigating so route guards have correct state
      const profile = await getUserProfile(cred.user.uid);
      const complete = profile?.onboardingComplete ?? false;
      setFirebaseUser({ uid: cred.user.uid, email: cred.user.email, displayName: cred.user.displayName });
      if (profile) {
        setUser(profile);
        setOnboardingComplete(complete);
      }
      showToast("Signed in with Google! Redirecting…");
      navigate(complete ? "/dashboard" : "/onboarding");
    } catch (err: any) {
      showToast(friendlyError(err.code), "error");
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Forgot Password ─────────────────────────────────── */
  const handleForgot = async () => {
    if (!siEmail) { showToast("Enter your email above first.", "error"); return; }
    try {
      await sendPasswordResetEmail(auth, siEmail);
      showToast("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      showToast(friendlyError(err.code), "error");
    }
  };

  return (
    <div className="auth-page">
      {/* Starfield canvas */}
      <StarfieldCanvas />

      {/* Ambient blobs */}
      <div className="auth-glow-blob auth-glow-blob--1" />
      <div className="auth-glow-blob auth-glow-blob--2" />
      <div className="auth-glow-blob auth-glow-blob--3" />

      {/* Back to landing */}
      <button className="auth-back-link" onClick={() => navigate("/")} id="auth-back-link">
        <svg viewBox="0 0 14 14">
          <path d="M9 2L4 7l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        NeuroPhysio
      </button>

      {/* ── Auth Card ───────────────────────────────────── */}
      <div className={`auth-container${isRightPanelActive ? " right-panel-active" : ""}`} id="auth-container">

        {/* ── Sign In Form ─────────────────────────────── */}
        <div className="auth-form-container auth-signin-container">
          <form id="signin-form" autoComplete="off" onSubmit={handleSignIn}>
            <h1>Welcome Back</h1>
            <p className="auth-form-sub">Access your recovery dashboard</p>

            {/* Google SSO */}
            <div className="auth-social-container">
              <button
                type="button"
                className="auth-social"
                id="google-signin"
                title="Continue with Google"
                aria-label="Sign in with Google"
                onClick={handleGoogleAuth}
                disabled={isLoading}
              >
                <GoogleIcon />
              </button>
            </div>

            <div className="auth-or-divider"><span>or sign in with email</span></div>

            <div className="auth-input-group">
              <input
                type="email"
                id="si-email"
                placeholder=" "
                required
                value={siEmail}
                onChange={(e) => setSiEmail(e.target.value)}
                autoComplete="email"
              />
              <label htmlFor="si-email">Email address</label>
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                id="si-pwd"
                placeholder=" "
                required
                value={siPwd}
                onChange={(e) => setSiPwd(e.target.value)}
                autoComplete="current-password"
              />
              <label htmlFor="si-pwd">Password</label>
            </div>

            <button type="button" className="auth-forgot-pass" onClick={handleForgot} id="forgot-link">
              Forgot password?
            </button>

            <button type="submit" className="auth-primary-btn" id="signin-btn" disabled={isLoading}>
              {isLoading ? "Please wait…" : "Access Platform"}
            </button>

            {/* Mobile-only toggle */}
            <div className="auth-mobile-toggle">
              Don't have an account?{" "}
              <button type="button" onClick={() => setIsRightPanelActive(true)}>
                Sign up
              </button>
            </div>
          </form>
        </div>

        {/* ── Sign Up Form ─────────────────────────────── */}
        <div className="auth-form-container auth-signup-container">
          <form id="signup-form" autoComplete="off" onSubmit={handleSignUp}>
            <h1>Create Account</h1>
            <p className="auth-form-sub">Begin your recovery journey</p>

            {/* Google SSO */}
            <div className="auth-social-container">
              <button
                type="button"
                className="auth-social"
                id="google-signup"
                title="Continue with Google"
                aria-label="Sign up with Google"
                onClick={handleGoogleAuth}
                disabled={isLoading}
              >
                <GoogleIcon />
              </button>
            </div>

            <div className="auth-or-divider"><span>or create with email</span></div>

            <div className="auth-input-group">
              <input
                type="text"
                id="su-name"
                placeholder=" "
                required
                value={suName}
                onChange={(e) => setSuName(e.target.value)}
                autoComplete="name"
              />
              <label htmlFor="su-name">Full name</label>
            </div>
            <div className="auth-input-group">
              <input
                type="email"
                id="su-email"
                placeholder=" "
                required
                value={suEmail}
                onChange={(e) => setSuEmail(e.target.value)}
                autoComplete="email"
              />
              <label htmlFor="su-email">Email address</label>
            </div>
            <div className="auth-input-group">
              <input
                type="password"
                id="su-pwd"
                placeholder=" "
                required
                minLength={6}
                value={suPwd}
                onChange={(e) => setSuPwd(e.target.value)}
              />
              <label htmlFor="su-pwd">Password (min 6 chars)</label>
            </div>

            <button type="submit" className="auth-primary-btn" id="signup-btn" disabled={isLoading}>
              {isLoading ? "Please wait…" : "Create Account"}
            </button>

            {/* Mobile-only toggle */}
            <div className="auth-mobile-toggle">
              Already have an account?{" "}
              <button type="button" onClick={() => setIsRightPanelActive(false)}>
                Sign in
              </button>
            </div>
          </form>
        </div>

        {/* ── Sliding overlay panel ────────────────────── */}
        <div className="auth-overlay-container">
          <div className="auth-overlay">

            {/* Decorative waves */}
            <svg className="auth-overlay-waves" viewBox="0 0 800 200" preserveAspectRatio="none" fill="none">
              <path d="M0 160 Q100 120 200 145 Q300 170 400 135 Q500 100 600 125 Q700 150 800 110" stroke="rgba(34,197,94,0.35)" strokeWidth="1"/>
              <path d="M0 175 Q110 140 220 160 Q340 180 460 148 Q580 116 700 140 Q760 153 800 130" stroke="rgba(74,222,128,0.25)" strokeWidth="0.8"/>
              <path d="M0 190 Q120 160 250 175 Q380 190 500 162 Q620 134 750 158 Q780 165 800 152" stroke="rgba(22,163,74,0.18)" strokeWidth="0.6"/>
            </svg>

            {/* Right panel: "New here? → Sign Up" */}
            <div className="auth-overlay-panel auth-overlay-right">
              <div className="auth-brand">NeuroPhysio</div>
              <h1>Hello,<br /><em>Friend</em></h1>
              <p>Begin your experience. Unlock AI-powered rehabilitation and recovery insights.</p>
              <button
                className="auth-ghost-btn"
                id="overlay-signUp-btn"
                onClick={() => setIsRightPanelActive(true)}
                type="button"
              >
                Create Account
              </button>
            </div>

            {/* Left panel: "Already a member? → Sign In" */}
            <div className="auth-overlay-panel auth-overlay-left">
              <div className="auth-brand">NeuroPhysio</div>
              <h1>Welcome<br /><em>Back</em></h1>
              <p>NeuroPhysio remembers your progress. Continue where you left off.</p>
              <button
                className="auth-ghost-btn"
                id="overlay-signIn-btn"
                onClick={() => setIsRightPanelActive(false)}
                type="button"
              >
                Sign In
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
