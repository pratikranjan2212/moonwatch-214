// src/ui/LandingScreen.jsx
import React, { useState } from 'react';
import { CREW_ROSTER } from './BriefingScreen.jsx';

export default function LandingScreen({ onStartMission }) {
  const [activeModal, setActiveModal] = useState(null); // 'OVERVIEW' | 'WEATHER' | 'HEROES' | 'TUTORIAL' | null

  return (
    <div className="landing-page">
      {/* Background Visual Layer: Cinematic Moon & Starfield */}
      <div className="landing-bg-layer" />
      <div className="landing-stars-layer" />
      <div className="landing-vignette" />
      <div className="landing-grid-overlay" />

      {/* Fixed Satellite positioned near the Moon towards the middle */}
      <div className="landing-fixed-satellite" aria-hidden="true">
        <svg width="120" height="76" viewBox="0 0 120 76" fill="none">
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
          <path d="M 45 38 A 16 16 0 0 0 30 22" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M 40 38 A 26 26 0 0 0 18 14" stroke="rgba(56, 189, 248, 0.28)" strokeWidth="1.2" strokeDasharray="3 4" />

          {/* Left Solar Wing */}
          <rect x="6" y="20" width="30" height="36" rx="2" fill="url(#satWingGrad)" stroke="#38bdf8" strokeWidth="1.2" />
          <line x1="16" y1="20" x2="16" y2="56" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
          <line x1="26" y1="20" x2="26" y2="56" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
          <line x1="6" y1="32" x2="36" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
          <line x1="6" y1="44" x2="36" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />

          {/* Left Wing Mount Truss */}
          <line x1="36" y1="38" x2="46" y2="38" stroke="#94a3b8" strokeWidth="2.5" />

          {/* Satellite Central Bus */}
          <rect x="46" y="26" width="24" height="24" rx="3.5" fill="#f8fafc" stroke="#38bdf8" strokeWidth="1.6" />
          <rect x="50" y="30" width="16" height="16" rx="2" fill="#0f172a" />

          {/* High Gain Parabolic Dish (Oriented toward Moon) */}
          <path d="M 46 29 Q 36 21 34 16" fill="none" stroke="#fbbf24" strokeWidth="2" />
          <path d="M 32 14 Q 35 17 38 23" fill="none" stroke="#fbbf24" strokeWidth="2.2" />
          <circle cx="35" cy="18" r="2.4" fill="#f59e0b" />

          {/* Right Wing Mount Truss */}
          <line x1="70" y1="38" x2="80" y2="38" stroke="#94a3b8" strokeWidth="2.5" />

          {/* Right Solar Wing */}
          <rect x="80" y="20" width="30" height="36" rx="2" fill="url(#satWingGrad)" stroke="#38bdf8" strokeWidth="1.2" />
          <line x1="90" y1="20" x2="90" y2="56" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
          <line x1="100" y1="20" x2="100" y2="56" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
          <line x1="80" y1="32" x2="110" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
          <line x1="80" y1="44" x2="110" y2="44" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />

          {/* Blue Thruster Glow on Back */}
          <circle cx="70" cy="38" r="4.5" fill="#38bdf8" opacity="0.85" filter="url(#satGlow)">
            <animate attributeName="r" values="3.5;6;3.5" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.4;0.9" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Blinking Telemetry Beacon LED */}
          <circle cx="58" cy="29" r="2.2" fill="#22c55e">
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
              <button type="button" className="nav-link-btn" onClick={onStartMission}>
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

            <button
              type="button"
              className="landing-cta-btn"
              onClick={onStartMission}
            >
              <span>LAUNCH MISSION</span>
              <span className="pixel-arrow">❯</span>
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
          {/* Huge Pixel Title: MOONWATCH (Full Width Spanning) */}
          <div className="landing-title-container">
            <h1 className="landing-huge-title" aria-label="MOONWATCH">
              <span>M</span>
              <span>O</span>
              <span>O</span>
              <span>N</span>
              <span>W</span>
              <span>A</span>
              <span>T</span>
              <span>C</span>
              <span>H</span>
            </h1>
          </div>

          {/* Location & Mission Time Header Strip (Now Below MOONWATCH Title) */}
          <div className="landing-meta-strip">
            <span className="meta-left">SHACKLETON CRATER • SOUTH POLE</span>
            <span className="meta-right">MISSION DURATION • 14–28 SOLS</span>
          </div>
        </section>

        {/* Bottom Spacer to Center Title in the Middle */}
        <div className="landing-spacer landing-spacer-bottom" />

        {/* Bottom Action Strip */}
        <footer className="landing-bottom-strip">
          <div className="landing-actions">
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
              onClick={onStartMission}
            >
              EXPLORE LEVELS
            </button>
          </div>

          <div className="landing-powered">
            <span className="live-dot" />
            <span className="powered-text">POWERED BY <strong>NASA DONKI</strong></span>
          </div>
        </footer>
      </div>

      {/* OVERVIEW MODAL */}
      {activeModal === 'OVERVIEW' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h2 className="modal-title-text">🌙 About Moonwatch: Sol 214</h2>
                <p className="modal-sub-text">NASA-powered lunar colony defense</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <p style={{ color: '#e2e8f0', lineHeight: 1.6, fontSize: '0.92rem', margin: '0 0 16px' }}>
              Built for young explorers and future astronauts, <strong>Moonwatch: Sol 214</strong> connects real NASA DONKI solar flare telemetry with an interactive lunar outpost simulation.
            </p>
            <div className="tutorial-cards-grid">
              <div className="tutorial-step-card" style={{ '--step-accent': '#fbbf24' }}>
                <div className="step-num-badge">☀️</div>
                <div className="step-info">
                  <div className="step-title">Real Solar Physics</div>
                  <p className="step-desc">Real solar flares detected by NASA satellites hit your base in real time!</p>
                </div>
              </div>
              <div className="tutorial-step-card" style={{ '--step-accent': '#38bdf8' }}>
                <div className="step-num-badge">🛡️</div>
                <div className="step-info">
                  <div className="step-title">Base Defense</div>
                  <p className="step-desc">Balance solar power, shield domes, clean oxygen, and hydroponic greenhouse crops.</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="start-mission-btn modal-submit-btn"
              onClick={() => {
                setActiveModal(null);
                onStartMission();
              }}
            >
              Choose Your Level 🚀
            </button>
          </div>
        </div>
      )}

      {/* SPACE WEATHER MODAL */}
      {activeModal === 'WEATHER' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h2 className="modal-title-text">☀️ NASA Space Weather</h2>
                <p className="modal-sub-text">Live Solar Storms & Historic Archives</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <p style={{ color: '#e2e8f0', lineHeight: 1.5, fontSize: '0.9rem', margin: '0 0 14px' }}>
              The Sun constantly ejects high-energy solar storms (Coronal Mass Ejections). NASA’s Space Weather Database of Notifications, Knowledge, Information (DONKI) tracks them:
            </p>
            <div className="tutorial-cards-grid">
              <div className="tutorial-step-card" style={{ '--step-accent': '#f87171' }}>
                <div className="step-num-badge">⚡</div>
                <div className="step-info">
                  <div className="step-title">May 2024 Superstorm (G5)</div>
                  <p className="step-desc">Most severe geomagnetic storm in 20+ years! Extreme radiation requiring full shields.</p>
                </div>
              </div>
              <div className="tutorial-step-card" style={{ '--step-accent': '#fb923c' }}>
                <div className="step-num-badge">🎃</div>
                <div className="step-info">
                  <div className="step-title">Halloween Storms 2003 (X17)</div>
                  <p className="step-desc">Massive interplanetary CME with speeds surpassing 2000 km/s.</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="start-mission-btn modal-submit-btn"
              onClick={() => {
                setActiveModal(null);
                onStartMission();
              }}
            >
              Test Base Against Flares 🚀
            </button>
          </div>
        </div>
      )}

      {/* HEROES MODAL */}
      {activeModal === 'HEROES' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h2 className="modal-title-text">🧑‍🚀 Shackleton Outpost Crew</h2>
                <p className="modal-sub-text">5 astronauts with unique superpowers</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="tutorial-cards-grid">
              {CREW_ROSTER.map((c) => (
                <div key={c.id} className="tutorial-step-card" style={{ '--step-accent': c.accent }}>
                  <div className="step-num-badge">{c.avatar}</div>
                  <div className="step-info">
                    <div className="step-header">
                      <span className="step-title">{c.name} ({c.role})</span>
                      <span style={{ fontSize: '0.72rem', color: c.accent, fontWeight: 800 }}>{c.perk}</span>
                    </div>
                    <p className="step-desc">{c.bio}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="start-mission-btn modal-submit-btn"
              onClick={() => {
                setActiveModal(null);
                onStartMission();
              }}
            >
              Select Your Hero in Briefing 🚀
            </button>
          </div>
        </div>
      )}

      {/* TUTORIAL MODAL */}
      {activeModal === 'TUTORIAL' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h2 className="modal-title-text">🧑‍🚀 How to Play: 4 Easy Steps</h2>
                <p className="modal-sub-text">Keep your moonbase safe and powered!</p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="tutorial-cards-grid">
              <div className="tutorial-step-card" style={{ '--step-accent': '#fbbf24' }}>
                <div className="step-num-badge">1</div>
                <div className="step-info">
                  <div className="step-header">
                    <span className="step-title">☀️ Catch Sunlight</span>
                    <div className="key-badge-group">
                      <span>Press</span>
                      <kbd className="key-cap">1</kbd>
                      <span>or</span>
                      <kbd className="key-cap">P</kbd>
                    </div>
                  </div>
                  <p className="step-desc">Open solar panels on calm days to fill up your base batteries!</p>
                </div>
              </div>
              <div className="tutorial-step-card" style={{ '--step-accent': '#38bdf8' }}>
                <div className="step-num-badge">2</div>
                <div className="step-info">
                  <div className="step-header">
                    <span className="step-title">🛡️ Shield Against Storms</span>
                    <div className="key-badge-group">
                      <span>Press</span>
                      <kbd className="key-cap">2</kbd>
                      <span>or</span>
                      <kbd className="key-cap">S</kbd>
                    </div>
                  </div>
                  <p className="step-desc">When NASA warns of a flare, close panels and turn ON the shield dome!</p>
                </div>
              </div>
              <div className="tutorial-step-card" style={{ '--step-accent': '#34d399' }}>
                <div className="step-num-badge">3</div>
                <div className="step-info">
                  <div className="step-header">
                    <span className="step-title">🌱 Keep Crew Healthy</span>
                    <div className="key-badge-group">
                      <span>Press</span>
                      <kbd className="key-cap">3</kbd>
                      <span>or</span>
                      <kbd className="key-cap">O</kbd>
                    </div>
                  </div>
                  <p className="step-desc">Pump clean oxygen and water greenhouse crops for fresh air.</p>
                </div>
              </div>
              <div className="tutorial-step-card" style={{ '--step-accent': '#a855f7' }}>
                <div className="step-num-badge">4</div>
                <div className="step-info">
                  <div className="step-header">
                    <span className="step-title">🚀 Finish the Day</span>
                    <div className="key-badge-group">
                      <span>Press</span>
                      <kbd className="key-cap">SPACE</kbd>
                    </div>
                  </div>
                  <p className="step-desc">Advance the day to survive to the next Sol!</p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="start-mission-btn modal-submit-btn"
              onClick={() => {
                setActiveModal(null);
                onStartMission();
              }}
            >
              Choose Mission Level 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

