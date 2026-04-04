import React, { useState, useEffect, type FC } from "react";
import { auth } from "../../../firebase/config";
import { useAppStore } from "../../../store/useAppStore";
import { updateUserProfile } from "../../../services/firestoreService";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const Settings: FC = () => {
  const navigate = useNavigate();
  const { user, reset } = useAppStore();

  const [name, setName] = useState(user?.name || auth.currentUser?.displayName || "");
  const [email] = useState(user?.email || auth.currentUser?.email || "");
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [sessionReminder, setSessionReminder] = useState(true);
  const [painAlerts, setPainAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setSaving(true);
    try {
      await updateUserProfile(uid, { name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      reset();
      navigate("/auth");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure? This will delete all your data permanently.")) return;
    try {
      await auth.currentUser?.delete();
      reset();
      navigate("/auth");
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="settings-page fade-in">
      <div className="page-header">
        <h1 className="page-header__title">Settings</h1>
        <p className="page-header__subtitle">Manage your account and app preferences.</p>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        {/* Profile */}
        <div className="widget fade-up">
          <div className="widget__header">
            <h3 className="widget__title">Profile</h3>
          </div>
          <div className="widget__body">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} readOnly style={{ color: "var(--color-grey-400)" }} />
            </div>
            <div className="form-group">
              <label className="form-label">Injury Type</label>
              <input
                className="form-input"
                type="text"
                value={user?.injuryType || "Not set"}
                readOnly
                style={{ color: "var(--color-grey-400)" }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Treatment Phase</label>
              <input
                className="form-input"
                type="text"
                value={user?.treatmentPhase || "Not set"}
                readOnly
                style={{ color: "var(--color-grey-400)" }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSave} style={{ marginTop: 8 }} disabled={saving}>
              {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Preferences */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="widget fade-up delay-1">
            <div className="widget__header">
              <h3 className="widget__title">Notifications</h3>
            </div>
            <div className="widget__body">
              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Push Notifications</div>
                  <div className="toggle-row__desc">Get updates about your recovery</div>
                </div>
                <button className={`toggle-switch ${notifications ? "active" : ""}`} onClick={() => setNotifications((n) => !n)}>
                  <div className="toggle-switch__knob" />
                </button>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Session Reminders</div>
                  <div className="toggle-row__desc">Remind before scheduled sessions</div>
                </div>
                <button className={`toggle-switch ${sessionReminder ? "active" : ""}`} onClick={() => setSessionReminder((s) => !s)}>
                  <div className="toggle-switch__knob" />
                </button>
              </div>
              <div className="toggle-row">
                <div>
                  <div className="toggle-row__label">Pain Level Alerts</div>
                  <div className="toggle-row__desc">Alert when pain trend increases</div>
                </div>
                <button className={`toggle-switch ${painAlerts ? "active" : ""}`} onClick={() => setPainAlerts((p) => !p)}>
                  <div className="toggle-switch__knob" />
                </button>
              </div>
            </div>
          </div>

          <div className="widget fade-up delay-2">
            <div className="widget__header">
              <h3 className="widget__title">Account Actions</h3>
            </div>
            <div className="widget__body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button className="btn btn-outline" onClick={handleLogout}>
                Sign Out
              </button>
              <button
                className="btn btn-outline"
                style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
                onClick={handleDeleteAccount}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
