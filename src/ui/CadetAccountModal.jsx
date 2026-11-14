import React, { useState, useEffect } from 'react';
import {
  AVATAR_OPTIONS,
  getActiveProfile,
  getAllProfiles,
  loginOrCreateAccount,
  setActiveProfile,
  logoutToGuest,
} from '../data/userProfileManager.js';

export default function CadetAccountModal({ isOpen, onClose }) {
  const [activeProfile, setActiveProfileState] = useState(() => getActiveProfile());
  const [allProfiles, setAllProfiles] = useState(() => getAllProfiles());
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form states
  const [callsign, setCallsign] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('👩‍🚀');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      setActiveProfileState(getActiveProfile());
      setAllProfiles(getAllProfiles());
      setErrorMessage('');
      setSuccessMessage('');
      setIsCreatingNew(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const res = loginOrCreateAccount({
      callsign,
      avatar: selectedAvatar,
      pin,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to authenticate profile');
      return;
    }

    setSuccessMessage(
      res.isNew
        ? `Welcome aboard, Cadet ${res.profile.callsign}! Your progress will now be saved.`
        : `Welcome back, ${res.profile.callsign}! Profile loaded.`
    );

    setActiveProfileState(res.profile);
    setAllProfiles(getAllProfiles());
    setIsCreatingNew(false);
    setCallsign('');
    setPin('');

    setTimeout(() => {
      onClose?.();
    }, 1200);
  };

  const handleSwitchUser = (profileId) => {
    setActiveProfile(profileId);
    setActiveProfileState(getActiveProfile());
    setSuccessMessage('Profile switched successfully!');
    setTimeout(() => {
      setSuccessMessage('');
      onClose?.();
    }, 800);
  };

  const handleLogout = () => {
    logoutToGuest();
    setActiveProfileState(getActiveProfile());
    setSuccessMessage('Logged out to Guest Explorer.');
  };

  const isGuest = activeProfile.isGuest;

  return (
    <div className="game-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="game-modal-chassis cadet-account-chassis" onClick={(e) => e.stopPropagation()}>
        {/* Top Status HUD */}
        <div className="game-modal-top-bar">
          <div className="game-modal-telemetry-tag">
            <span className="telemetry-live-pulse" />
            <span className="telemetry-tag-label">NASA CADET DATABASE // PLAYER IDENTITY</span>
          </div>
          <button
            type="button"
            className="game-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="game-modal-body cadet-account-body">
          {/* Header Banner */}
          <div className="view-banner-header">
            <div className="view-banner-badge">🛰️ PLAYER CAREER SYSTEM</div>
            <h2 className="view-banner-title">
              {isGuest && !isCreatingNew ? 'Cadet Log In & Progress Save' : 'Astronaut Service Record'}
            </h2>
            <p className="view-banner-desc">
              Log in with your Cadet Callsign to save your completed missions, Sol survival streaks, and play from any browser anytime!
            </p>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="account-alert error-alert">
              <span>⚠️ {errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="account-alert success-alert">
              <span>✅ {successMessage}</span>
            </div>
          )}

          {/* ================= VIEW 1: ACTIVE CADET PROFILE CARD ================= */}
          {!isGuest && !isCreatingNew && (
            <div className="active-cadet-card animate-fade-in">
              <div className="cadet-badge-card">
                <div className="cadet-id-avatar">
                  <span className="id-avatar-icon">{activeProfile.avatar}</span>
                  <span className="id-verified-tick">✓</span>
                </div>
                <div className="cadet-id-meta">
                  <span className="cadet-class-badge">OFFICIAL ARTEMIS CADET</span>
                  <h3 className="cadet-id-name">{activeProfile.callsign}</h3>
                  <span className="cadet-id-sub">
                    Joined: {new Date(activeProfile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Career Stats Grid */}
              <div className="cadet-stats-grid">
                <div className="cadet-stat-box">
                  <span className="stat-num">{activeProfile.totalSolsSurvived || 0}</span>
                  <span className="stat-desc">SOLS SURVIVED</span>
                </div>
                <div className="cadet-stat-box">
                  <span className="stat-num">{activeProfile.missionsCompleted || 0}</span>
                  <span className="stat-desc">MISSIONS COMPLETED</span>
                </div>
                <div className="cadet-stat-box">
                  <span className="stat-num">⭐ {activeProfile.stars || 0}</span>
                  <span className="stat-desc">TOTAL STARS</span>
                </div>
                <div className="cadet-stat-box">
                  <span className="stat-num">
                    {activeProfile.unlockedLevels ? `${activeProfile.unlockedLevels.length}/3` : '1/3'}
                  </span>
                  <span className="stat-desc">LEVELS UNLOCKED</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="cadet-profile-actions">
                <button
                  type="button"
                  className="game-modal-action-btn secondary-action"
                  onClick={() => setIsCreatingNew(true)}
                >
                  <span>+ Switch or Create Profile</span>
                </button>
                <button
                  type="button"
                  className="game-modal-action-btn secondary-action btn-logout"
                  onClick={handleLogout}
                >
                  Log Out
                </button>
              </div>
            </div>
          )}

          {/* ================= VIEW 2: LOGIN / CREATE NEW CADET ACCOUNT FORM ================= */}
          {(isGuest || isCreatingNew) && (
            <form onSubmit={handleLoginSubmit} className="cadet-login-form animate-fade-in">
              <div className="form-group">
                <label className="form-label" htmlFor="cadet-callsign-input">
                  <span>Cadet Callsign (Player Name)</span>
                  <span className="label-tip">e.g. Commander Nova, Neil-214, Orion</span>
                </label>
                <input
                  id="cadet-callsign-input"
                  type="text"
                  className="arcade-input"
                  placeholder="Enter your astronaut callsign..."
                  value={callsign}
                  onChange={(e) => setCallsign(e.target.value)}
                  maxLength={24}
                  required
                />
              </div>

              {/* Avatar Selector */}
              <div className="form-group">
                <label className="form-label">
                  <span>Select Helmet & Avatar</span>
                </label>
                <div className="avatar-pick-grid">
                  {AVATAR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={`avatar-option-btn ${selectedAvatar === opt.emoji ? 'is-selected' : ''}`}
                      onClick={() => setSelectedAvatar(opt.emoji)}
                      title={opt.label}
                    >
                      <span className="avatar-emoji">{opt.emoji}</span>
                      <span className="avatar-caption">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Secret PIN */}
              <div className="form-group">
                <label className="form-label" htmlFor="cadet-pin-input">
                  <span>Secret 4-Digit Security PIN (Optional)</span>
                  <span className="label-tip">Protects your save file from other players</span>
                </label>
                <input
                  id="cadet-pin-input"
                  type="password"
                  className="arcade-input"
                  placeholder="e.g. 1234 (Leave blank if not needed)"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                />
              </div>

              <button type="submit" className="arcade-start-btn form-submit-btn">
                <span>🚀 Login / Save Cadet ID</span>
                <span className="btn-arrow-icon">❯</span>
              </button>
            </form>
          )}

          {/* Saved Profiles Quick Switcher (If multiple exist on machine) */}
          {allProfiles.length > 0 && (
            <div className="saved-profiles-section">
              <span className="saved-profiles-title">Saved Cadets on this Device:</span>
              <div className="saved-profiles-list">
                {allProfiles.map((p) => {
                  const isCurrent = p.id === activeProfile.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className={`saved-profile-chip ${isCurrent ? 'is-active' : ''}`}
                      onClick={() => handleSwitchUser(p.id)}
                    >
                      <span>{p.avatar}</span>
                      <span className="chip-name">{p.callsign}</span>
                      {isCurrent && <span className="chip-active-badge">ACTIVE</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="game-modal-footer">
          <div className="footer-keyboard-hint">
            <kbd className="arcade-key mini-key">ESC</kbd>
            <span>to close</span>
          </div>
          <button
            type="button"
            className="game-modal-action-btn primary-action"
            onClick={onClose}
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  );
}

