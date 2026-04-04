import React, { type FC } from "react";
import { useNavigate } from "react-router-dom";
import type { ToastType } from "../../types";
import Nav from "../../components/Nav/Nav";
import HeroCanvas from "../../components/HeroCanvas/HeroCanvas";
import StatItem from "../../components/StatItem/StatItem";
import "./LandingPage.css";

interface LandingPageProps {
  showToast: (msg: string, type?: ToastType) => void;
}

const features = [
  { icon: "🦴", title: "Joint Recovery Tracking",  desc: "AI-powered pose estimation tracks your joint angles, range of motion, and movement patterns in real time during every rehab session." },
  { icon: "🧠", title: "Cognitive Memory Training", desc: "Interactive memory exercises and cognitive assessments that adapt difficulty based on your improvement trajectory." },
  { icon: "📊", title: "Progress Analytics",        desc: "Comprehensive dashboards visualizing your recovery trends, exercise adherence, pain levels, and cognitive scores over time." },
  { icon: "🤖", title: "Real-Time AI Feedback",     desc: "Instant corrective feedback during exercises — posture alerts, rep counting, and form guidance powered by machine learning." },
  { icon: "🩺", title: "Doctor Reports",            desc: "Auto-generated physician reports summarizing recovery milestones, setbacks, and recommended next steps for your care team." },
  { icon: "🔒", title: "Secure & Private",          desc: "HIPAA-compliant data handling with end-to-end encryption — your health data stays safe and private at all times." },
];

const steps = [
  { title: "Sign Up",              desc: "Create your account as a patient, caretaker, or physician in seconds." },
  { title: "Set Up Your Profile",  desc: "Enter your injury details, recovery goals, and baseline metrics to personalize your rehab plan." },
  { title: "Train & Recover",      desc: "Follow guided exercises with real-time AI feedback, track joint mobility, and complete cognitive challenges." },
  { title: "Analyze & Improve",    desc: "Review your progress analytics, share reports with your doctor, and adapt your recovery roadmap." },
];

const LandingPage: FC<LandingPageProps> = () => {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <Nav />

      <HeroCanvas />

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stats-bar__inner container">
          <StatItem count={5}   suffix="K+" label="Patients Recovered" />
          <StatItem count={96}  suffix="%"  label="Recovery Accuracy" />
          <StatItem count={120} suffix="+"  label="Clinics Partnered" />
          <StatItem count={35}  suffix="%"  label="Faster Recovery" />
        </div>
      </div>

      {/* Features */}
      <section className="section" id="features">
        <div className="container">
          <div className="features__header">
            <p className="section-label">What We Offer</p>
            <h2 className="section-title">Built for smarter rehabilitation</h2>
            <p className="section-desc">Every feature is designed to accelerate recovery and track real progress.</p>
          </div>
          <div className="grid-3">
            {features.map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-card__icon">{f.icon}</div>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section how-it-works" id="how-it-works">
        <div className="container">
          <div className="features__header">
            <p className="section-label">The Process</p>
            <h2 className="section-title">Your Recovery Journey</h2>
            <p className="section-desc">From sign-up to full recovery — guided by AI every step of the way.</p>
          </div>
          <div className="steps">
            {steps.map((s) => (
              <div key={s.title} className="step">
                <div className="step__num" />
                <h3 className="step__title">{s.title}</h3>
                <p className="step__desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section" id="about">
        <div className="container">
          <p className="section-label">Start Recovering Today</p>
          <h2 className="section-title">Ready to transform your recovery?</h2>
          <p className="section-desc">Join thousands of patients and clinicians using AI-powered rehabilitation.</p>
          <div className="hero__cta" style={{ marginTop: 40 }}>
            <button className="btn btn-primary" onClick={() => navigate("/auth")}>
              Begin Your Recovery
            </button>
            <button className="btn btn-outline" onClick={() => navigate("/dashboard")}>
              View Dashboard Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer__top">
            <div className="footer__brand">
              <button
                className="nav__logo"
                onClick={() => navigate("/")}
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                <div className="nav__logo-icon"><span>N</span></div>
                NeuroPhysio
              </button>
              <p>Intelligent rehabilitation and recovery through technology.</p>
            </div>
            <div className="footer__links-group">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--color-grey-200)",fontSize:14,padding:0 }} onClick={() => navigate("/dashboard")}>Dashboard</button></li>
              </ul>
            </div>
            <div className="footer__links-group">
              <h4>Account</h4>
              <ul>
                <li><button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--color-grey-200)",fontSize:14,padding:0 }} onClick={() => navigate("/auth")}>Login</button></li>
                <li><button style={{ background:"none",border:"none",cursor:"pointer",color:"var(--color-grey-200)",fontSize:14,padding:0 }} onClick={() => navigate("/auth")}>Sign Up</button></li>
              </ul>
            </div>
            <div className="footer__links-group">
              <h4>Team</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer__bottom">
            <span>© 2025 NeuroPhysio Recovery. AI-Powered Rehabilitation.</span>
            <span>Made with ♥ by Team Nakshatra</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
