// src/ui/LandingScreen.jsx
import React, { useState } from 'react';
import { CREW_ROSTER } from './BriefingScreen.jsx';

export default function LandingScreen({ onStartMission }) {
  const [activeModal, setActiveModal] = useState(null); // 'OVERVIEW' | 'WEATHER' | 'HEROES' | 'TUTORIAL' | null

  return (
    <div className="landing-page">
      {/* Background Visual Layer: Cinematic Black Hole & Accretion Disk */}
      <div className="landing-bg-layer" />
      <div className="landing-vignette" />
      <div className="landing-grid-overlay" />

      {/* Outer Glowing Frame */}
      <div className="landing-frame" />

      {/* Main Content Container */}
      <div className="landing-content">
        {/* Top Navigation Bar */}
        <header className="landing-nav">
          <div className="landing-logo" onClick={onStartMission} role="button" tabIndex={0}>
            <div className="landing-logo-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="7" fill="#fbbf24" />
                <ellipse cx="12" cy="12" rx="11" ry="4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" transform="rotate(-20 12 12)" />
              </svg>
            </div>
            <div className="landing-logo-text">
              <span className="logo-brand">MOONWATCH</span>
              <span className="logo-sub">SOL 214</span>
            </div>
          </div>

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
        </header>

        {/* Mission Statement (Top-Left) */}
        <section className="landing-statement-wrap">
          <p className="landing-statement">
            MOONWATCH IS A REAL-TIME LUNAR SURVIVAL SIMULATION POWERED BY NASA DONKI SPACE WEATHER DATA. KEEP YOUR CREW ALIVE BEYOND EARTH.
          </p>
        </section>

        {/* Spacer to push title and footer down */}
        <div className="landing-spacer" />

        {/* Location & Mission Time Header Strip */}
        <div className="landing-meta-strip">
          <span className="meta-left">SHACKLETON CRATER • SOUTH POLE</span>
          <span className="meta-right">MISSION DURATION • 14–28 SOLS</span>
        </div>

        {/* Huge Pixel Title: MOONWATCH '214 */}
        <div className="landing-title-container">
          <h1 className="landing-huge-title" data-text="MOONWATCH'214">
            MOONWATCH'214
          </h1>
        </div>

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
