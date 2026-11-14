// src/ui/LandingScreen.jsx
import React, { useState } from 'react';
import GameInfoModal from './GameInfoModal.jsx';
import CadetAccountModal from './CadetAccountModal.jsx';
import { useActiveProfile } from '../data/userProfileManager.js';

export default function LandingScreen({ onStartMission, onExploreLevels }) {
  const [activeModal, setActiveModal] = useState(null); // 'OVERVIEW' | 'WEATHER' | 'HEROES' | 'TUTORIAL' | null
  const [showAccountModal, setShowAccountModal] = useState(false);
  const activeProfile = useActiveProfile();

  return (
    <div className="landing-page">
      {/* Background Visual Layer: Cinematic Moon & Starfield */}
      <div className="landing-bg-layer" />
      <div className="landing-stars-layer" />
      <div className="landing-vignette" />
      <div className="landing-grid-overlay" />

      {/* Fixed Satellite positioned near the Moon towards the upper middle (as marked) */}
      <div className="landing-fixed-satellite" aria-hidden="true">
        <svg width="156" height="98" viewBox="0 0 156 98" fill="none">
          <defs>
            <linearGradient id="satWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0c4a6e" />
            </linearGradient>
            <filter id="satGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Faint Telemetry Wave pointing toward Moon */}
          <path d="M 58 49 A 20 20 0 0 0 38 28" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M 52 49 A 32 32 0 0 0 24 18" stroke="rgba(56, 189, 248, 0.28)" strokeWidth="1.2" strokeDasharray="3 4" />

          {/* Left Solar Wing */}
          <rect x="8" y="26" width="38" height="46" rx="2.5" fill="url(#satWingGrad)" stroke="#38bdf8" strokeWidth="1.3" />
          <line x1="20" y1="26" x2="20" y2="72" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
          <line x1="33" y1="26" x2="33" y2="72" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
          <line x1="8" y1="41" x2="46" y2="41" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" />
          <line x1="8" y1="56" x2="46" y2="56" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" />

          {/* Left Wing Mount Truss */}
          <line x1="46" y1="49" x2="59" y2="49" stroke="#94a3b8" strokeWidth="2.8" />

          {/* Satellite Central Bus */}
          <rect x="59" y="34" width="30" height="30" rx="4" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.8" />
          <rect x="64" y="39" width="20" height="20" rx="2.5" fill="#0f172a" />

          {/* High Gain Parabolic Dish (Oriented toward Moon) */}
          <path d="M 59 38 Q 47 28 44 21" fill="none" stroke="#fbbf24" strokeWidth="2.2" />
          <path d="M 41 18 Q 45 22 49 29" fill="none" stroke="#fbbf24" strokeWidth="2.4" />
          <circle cx="45" cy="23" r="2.8" fill="#f59e0b" />

          {/* Right Wing Mount Truss */}
          <line x1="89" y1="49" x2="102" y2="49" stroke="#94a3b8" strokeWidth="2.8" />

          {/* Right Solar Wing */}
          <rect x="102" y="26" width="38" height="46" rx="2.5" fill="url(#satWingGrad)" stroke="#38bdf8" strokeWidth="1.3" />
          <line x1="115" y1="26" x2="115" y2="72" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
          <line x1="128" y1="26" x2="128" y2="72" stroke="rgba(255,255,255,0.4)" strokeWidth="0.9" />
          <line x1="102" y1="41" x2="140" y2="41" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" />
          <line x1="102" y1="56" x2="140" y2="56" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9" />

          {/* Blue Thruster Glow on Back */}
          <circle cx="89" cy="49" r="5.5" fill="#38bdf8" opacity="0.85" filter="url(#satGlow)">
            <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Blinking Telemetry Beacon LED */}
          <circle cx="74" cy="38" r="2.6" fill="#22c55e">
            <animate attributeName="opacity" values="1;0.15;1" dur="1.2s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>

      {/* Outer Glowing Frame */}
      <div className="landing-frame" />

      {/* Main Content Container */}
      <div className="landing-content">
        {/* Top Navigation Bar */}
        <header className="landing-nav">
          <div className="landing-logo" onClick={onStartMission} role="button" tabIndex={0}>
            <div className="landing-logo-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="7" fill="#38bdf8" />
                <ellipse cx="12" cy="12" rx="11" ry="4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" transform="rotate(-20 12 12)" />
              </svg>
            </div>
            <div className="landing-logo-text">
              <span className="logo-brand">MOONWATCH</span>
              <span className="logo-sub">SOL 214</span>
            </div>
          </div>

          {/* Nav Links Moved to Right Group next to Launch Mission Button */}
          <div className="landing-nav-right-group">
            <nav className="landing-nav-links" aria-label="Main Navigation">
              <button type="button" className="nav-link-btn" onClick={() => setActiveModal('OVERVIEW')}>
                • OVERVIEW
              </button>
              <button type="button" className="nav-link-btn" onClick={onExploreLevels || onStartMission}>
                • MISSIONS
              </button>
              <button type="button" className="nav-link-btn" onClick={() => setActiveModal('WEATHER')}>
                • SPACE WEATHER
              </button>
              <button type="button" className="nav-link-btn" onClick={() => setActiveModal('HEROES')}>
                • CREW
              </button>
              <button type="button" className="nav-link-btn" onClick={() => setActiveModal('TUTORIAL')}>
                • HOW TO PLAY
              </button>
            </nav>

            {/* Astronaut User Account / Cadet ID Login Button */}
            <button
              type="button"
              className={`landing-account-btn ${!activeProfile.isGuest ? 'is-logged-in' : ''}`}
              onClick={() => setShowAccountModal(true)}
              aria-label="Cadet Account and Progress"
            >
              <span className="account-avatar">{activeProfile.avatar}</span>
              <span className="account-label">
                {activeProfile.isGuest ? 'CADET LOGIN / ID' : activeProfile.callsign}
              </span>
              {!activeProfile.isGuest && (
                <span className="account-stars-badge">⭐ {activeProfile.stars || 0}</span>
              )}
            </button>
          </div>
        </header>

        {/* Mission Statement (Top-Left) */}
        <section className="landing-statement-wrap">
          <p className="landing-statement">
            MOONWATCH IS A REAL-TIME LUNAR SURVIVAL SIMULATION POWERED BY NASA DONKI SPACE WEATHER DATA. KEEP YOUR CREW ALIVE BEYOND EARTH.
          </p>
        </section>

        {/* Top Spacer to Center Title in the Middle */}
        <div className="landing-spacer landing-spacer-top" />

        {/* Centered Hero Section (In the Middle of the Screen) */}
        <section className="landing-center-hero">
          {/* Huge Pixel Title: MOONWATCH (Full Width Spanning, Tight Kerning) */}
          <div className="landing-title-container">
            <h1 className="landing-huge-title" data-text="MOONWATCH" aria-label="MOONWATCH">
              MOONWATCH
            </h1>
          </div>

          {/* Location & Mission Time Header Strip (Below MOONWATCH Title) */}
          <div className="landing-meta-strip">
            <span className="meta-left">SHACKLETON CRATER • SOUTH POLE</span>
            <span className="meta-right">MISSION DURATION • 14–28 SOLS</span>
          </div>

          {/* Primary Action Buttons (Moved Up Below MOONWATCH as marked) */}
          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-primary-btn"
              onClick={onStartMission}
            >
              <span>START MISSION</span>
              <span className="pixel-arrow-dark">❯</span>
            </button>

            <button
              type="button"
              className="landing-secondary-btn"
              onClick={onExploreLevels || onStartMission}
            >
              EXPLORE LEVELS
            </button>
          </div>
        </section>

        {/* Bottom Strip */}
        <footer className="landing-bottom-strip">
          <div className="landing-bottom-space-filler" />
          <div className="landing-powered">
            <span className="live-dot" />
            <span className="powered-text">POWERED BY <strong>NASA DONKI</strong></span>
          </div>
        </footer>
      </div>

      {/* Premier Sci-Fi Game Info Modal */}
      <GameInfoModal
        activeTab={activeModal}
        onSelectTab={setActiveModal}
        onClose={() => setActiveModal(null)}
        onStartMission={onStartMission}
      />

      {/* Astronaut Cadet Login & Service Record Modal */}
      <CadetAccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
      />
    </div>
  );
}

