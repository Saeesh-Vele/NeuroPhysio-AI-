import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Nav.css";

const Nav: React.FC = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className="navbar-container">
      <nav className={`navbar-content ${scrolled ? "scrolled" : ""}`}>

        {/* LEFT LINKS */}
        <div className="navbar-links-desktop">
          <a href="#features" className="navbar-link">Features</a>
          <a href="#how-it-works" className="navbar-link">How It Works</a>
          <a href="#about" className="navbar-link">About</a>
        </div>

        {/* LOGO */}
        <button
          className="navbar-brand"
          onClick={() => navigate("/")}
        >
          NeuroPhysio
        </button>

        {/* RIGHT SIDE */}
        <div className="navbar-right">
          <button
            className="navbar-login-btn desktop-login"
            onClick={() => navigate("/auth")}
          >
            Login
          </button>

          <button
            className="navbar-cta-btn desktop-login"
            onClick={() => navigate("/auth")}
          >
            Get Started
          </button>

          <button
            className="navbar-mobile-toggle"
            onClick={() => setMobileOpen(true)}
          >
            ☰
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="mobile-menu-overlay"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="mobile-menu-header">
              <button
                className="navbar-brand"
                onClick={() => navigate("/")}
              >
                NeuroPhysio
              </button>

              <button
                className="mobile-menu-close"
                onClick={() => setMobileOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mobile-menu-links">
              <a href="#features" className="mobile-menu-link">Features</a>
              <a href="#how-it-works" className="mobile-menu-link">How It Works</a>
              <a href="#about" className="mobile-menu-link">About</a>

              <button
                className="mobile-menu-link"
                onClick={() => navigate("/auth")}
              >
                Login
              </button>

              <button
                className="navbar-cta-btn"
                onClick={() => navigate("/auth")}
              >
                Get Started
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Nav;