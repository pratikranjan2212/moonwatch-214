// src/ui/WelcomeScreen.jsx
import React, { useState } from 'react';
import GameInfoModal from './GameInfoModal.jsx';

const CAMPAIGN_LEVELS = [
  {
    id: 1,
    rank: 'CADET',
    title: 'POWER BASICS',
    fullTitle: 'Level 1: Power Basics',
    sols: 14,
    stars: '⭐',
    accent: '#fbbf24',
    bgImage: '/images/level1-power.jpg',
    badge: '☀️ CATCH SUNLIGHT',
    quote: 'Catch sunlight, but retract solar panels when flares hit! ☀️',
    goal: 'Charge your batteries with sunlight and raise the shield dome when space storms hit!',
    unlockedKeys: ['[1 / P] Solar Panels', '[2 / S] Shield Dome', '[3 / O] Oxygen'],
    locked: false,
    score: '14/14 SOLS',
  },
  {
    id: 2,
    rank: 'PILOT',
    title: 'LIFE SUPPORT',
    fullTitle: 'Level 2: Life Support & Greenhouse',
    sols: 21,
    stars: '⭐⭐',
    accent: '#38bdf8',
    bgImage: '/images/level2-greenhouse.jpg',
    badge: '🌱 GREENHOUSE CROPS',
    quote: 'Keep the greenhouse humming and dwarf-wheat watered for fresh air! 🌱',
    goal: 'Grow fresh space plants in the greenhouse and keep clean oxygen flowing for your crew!',
    unlockedKeys: ['All Level 1 Keys', '[4 / G] Water Greenhouse'],
    locked: false,
    score: '21/21 SOLS',
  },
  {
    id: 3,
    rank: 'COMMANDER',
    title: 'DEEP COMMS',
    fullTitle: 'Level 3: Deep Space Comms',
    sols: 28,
    stars: '⭐⭐⭐',
    accent: '#a855f7',
    bgImage: '/images/level3-comms.jpg',
    badge: '📡 DONKI TELEMETRY',
    quote: 'Align the high-gain dish and beam NASA solar storm signals to Earth! 📡',
    goal: 'Master your full moonbase and beam emergency weather signals back home to Earth!',
    unlockedKeys: ['All Level 1 & 2 Keys', '[5 / C] Queue Earth Comms'],
    locked: false,
    score: '28/28 SOLS',
  },
  {
    id: 4,
    rank: 'EXPEDITION',
    title: 'MARS GATEWAY',
    fullTitle: 'Level 4: Mars Gateway',
    sols: 500,
    stars: '⭐⭐⭐⭐',
    accent: '#94a3b8',
    bgImage: '/images/black_hole_hero.jpg',
    badge: '🚀 DEEP SPACE EXPEDITION',
    quote: 'Classified NASA deep space mission! Expedition staging in progress. 🔒',
    goal: 'Deep space staging orbit beyond the Moon. Research in progress!',
    unlockedKeys: ['Classified Tech'],
    locked: true,
    score: 'LOCKED',
  },
];

export default function WelcomeScreen({
  selectedLevel = 1,
  onSelectLevel,
  onStartMission,
  onBackToHome,
  reducedMotion,
  onToggleReducedMotion,
  graphicsPreset,
  onChangeGraphics,
}) {
  const [activeModal, setActiveModal] = useState(null); // 'TUTORIAL' | 'SETTINGS' | null
  const [mascotMessage, setMascotMessage] = useState(null);

  const currentLevelObj =
    CAMPAIGN_LEVELS.find((l) => l.id === selectedLevel) || CAMPAIGN_LEVELS[0];

  const handleCardClick = (lvl) => {
    if (lvl.locked) {
      setMascotMessage(lvl.quote);
      return;
    }
    onSelectLevel(lvl.id);
    setMascotMessage(lvl.quote);
  };

  const activeQuote = mascotMessage || currentLevelObj.quote;

  return (
    <div className="welcome-arcade-screen">
      {/* Background Visual Layers */}
      <div className="arcade-bg-space" />
      <div className="arcade-stars-layer" />
      <div className="arcade-grid-overlay" />
      <div className="arcade-vignette" />

      {/* Cyber Glowing Frame */}
      <div className="arcade-frame" />

      {/* Main Content Area */}
      <div className="arcade-content">
        {/* ==================== TOP ARCADE HUD BAR ==================== */}
        <header className="arcade-top-hud">
          {/* Top Left: Solar Power / Battery Counter Pill */}
          <div className="arcade-stat-pill">
            <div className="stat-pill-icon">☀️</div>
            <div className="stat-pill-text">
              <span className="stat-pill-val">100%</span>
              <span className="stat-pill-label">SOL POWER</span>
            </div>
          </div>

          {/* Top Center: Game Logo & Title */}
          <div className="arcade-game-brand" onClick={onBackToHome} role="button" tabIndex={0}>
            <h1 className="arcade-brand-title">MOONWATCH</h1>
            <div className="arcade-brand-subtitle">
              <span className="brand-dot" />
              <span>SOL 214 // CAMPAIGN SELECTOR</span>
            </div>
          </div>

          {/* Top Right: Player Profile Badge */}
          <div className="arcade-player-pill">
            <div className="player-avatar">👩‍🚀</div>
            <div className="player-info">
              <span className="player-name">CADET EXPLORER</span>
              <span className="player-rank">RANK: {currentLevelObj.rank}</span>
            </div>
            <button
              type="button"
              className="player-menu-btn"
              onClick={() => setActiveModal('SETTINGS')}
              aria-label="Settings Menu"
            >
              ☰
            </button>
          </div>
        </header>

        {/* ==================== CENTER LEVEL SELECTOR STAGE ==================== */}
        <main className="arcade-stage">
          {/* Left Column: Mascot & Quick Action Buttons */}
          <aside className="arcade-left-dock">
            {/* Round Action Icon Buttons Stack (Like Angry Birds Left Rail) */}
            <div className="round-btn-stack">
              <button
                type="button"
                className="arcade-round-btn btn-help"
                onClick={() => setActiveModal('TUTORIAL')}
                title="How to Play"
                aria-label="How to Play"
              >
                <span>❓</span>
              </button>

              <button
                type="button"
                className="arcade-round-btn btn-settings"
                onClick={() => setActiveModal('SETTINGS')}
                title="Settings"
                aria-label="Settings"
              >
                <span>⚙️</span>
              </button>

              {onBackToHome && (
                <button
                  type="button"
                  className="arcade-round-btn btn-home"
                  onClick={onBackToHome}
                  title="Return to Landing"
                  aria-label="Back to Home"
                >
                  <span>🏠</span>
                </button>
              )}
            </div>

            {/* Astronaut Character Mascot & Speech Bubble */}
            <div className="mascot-container">
              {/* Comic Speech Bubble */}
              <div className="mascot-speech-bubble animate-bounce-subtle">
                <p className="speech-text">{activeQuote}</p>
                <div className="speech-arrow" />
              </div>

              {/* Astronaut Character Figure */}
              <div className="mascot-avatar-wrap">
                <div className="mascot-halo-glow" />
                <div className="mascot-character">
                  {/* Space Helmet Avatar SVG */}
                  <svg width="84" height="84" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="42" fill="#0f172a" stroke="#38bdf8" strokeWidth="3.5" />
                    {/* Golden Visor */}
                    <ellipse cx="50" cy="50" rx="30" ry="24" fill="url(#visorGrad)" stroke="#fbbf24" strokeWidth="2.5" />
                    {/* Visor Glint Reflection */}
                    <path d="M 28 40 Q 42 32 68 34" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeLinecap="round" />
                    {/* Communication Antenna */}
                    <line x1="72" y1="20" x2="84" y2="10" stroke="#38bdf8" strokeWidth="3" />
                    <circle cx="84" cy="10" r="4.5" fill="#ef4444" className="antenna-beacon" />
                    {/* Chest Collar */}
                    <path d="M 22 84 Q 50 72 78 84" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
                    <defs>
                      <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="50%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#451a03" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Progress / Info Badge */}
                <div className="mascot-progress-badge">
                  <span className="badge-icon">📊</span>
                  <span className="badge-text">33% SECURED</span>
                </div>
              </div>

              {/* Directional Ribbon Signpost (Pointing to Levels) */}
              <div className="signpost-ribbon">
                <span>SELECT MISSION ❯</span>
              </div>
            </div>
          </aside>

          {/* Right Area: Tall Vertical Level Cards (Angry Birds Reloaded Style) */}
          <section className="arcade-cards-carousel" aria-label="Mission Campaigns">
            {CAMPAIGN_LEVELS.map((lvl) => {
              const isSelected = selectedLevel === lvl.id && !lvl.locked;
              return (
                <div
                  key={lvl.id}
                  className={`arcade-level-card ${isSelected ? 'is-selected' : ''} ${
                    lvl.locked ? 'is-locked' : ''
                  }`}
                  style={{ '--level-accent': lvl.accent }}
                  onClick={() => handleCardClick(lvl)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${lvl.fullTitle} ${lvl.locked ? 'Locked' : 'Selectable'}`}
                >
                  {/* Outer Glowing Border Chassis */}
                  <div className="card-outer-chassis">
                    {/* Top Angled Banner Strip */}
                    <div className="card-top-banner">
                      <div className="banner-title-text">{lvl.title}</div>
                      <div className="banner-sub-text">{lvl.rank} • {lvl.sols} SOLS</div>
                    </div>

                    {/* Card Center Visual Window */}
                    <div className="card-visual-frame">
                      <div
                        className="card-bg-image"
                        style={{ backgroundImage: `url(${lvl.bgImage})` }}
                      />
                      <div className="card-image-gradient" />

                      {/* If Locked: Giant Cute Metallic Padlock (Angry Birds Style) */}
                      {lvl.locked ? (
                        <div className="card-padlock-overlay">
                          <div className="arcade-padlock-icon">
                            <svg width="88" height="88" viewBox="0 0 100 100" fill="none">
                              {/* Padlock Shackle */}
                              <path
                                d="M 32 46 V 26 C 32 16 68 16 68 26 V 46"
                                stroke="#cbd5e1"
                                strokeWidth="8"
                                strokeLinecap="round"
                              />
                              {/* Shackle Inner Hollow */}
                              <path
                                d="M 40 46 V 28 C 40 22 60 22 60 28 V 46"
                                stroke="#1e293b"
                                strokeWidth="5"
                                strokeLinecap="round"
                              />
                              {/* Padlock Body */}
                              <rect
                                x="20"
                                y="44"
                                width="60"
                                height="48"
                                rx="14"
                                fill="url(#padlockGrad)"
                                stroke="#e2e8f0"
                                strokeWidth="3"
                              />
                              {/* Glowing Cyan Scanner Eye / Keyhole */}
                              <ellipse cx="50" cy="64" rx="9" ry="11" fill="#0f172a" />
                              <circle cx="50" cy="62" r="5" fill="#38bdf8" />
                              <rect x="48" y="64" width="4" height="10" fill="#38bdf8" rx="2" />
                              <defs>
                                <linearGradient id="padlockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#94a3b8" />
                                  <stop offset="50%" stopColor="#64748b" />
                                  <stop offset="100%" stopColor="#334155" />
                                </linearGradient>
                              </defs>
                            </svg>
                          </div>
                          <div className="locked-ribbon-tag">COMING SOON! 🔒</div>
                        </div>
                      ) : (
                        /* Unlocked Feature Badge */
                        <div className="card-feature-badge">
                          <span>{lvl.badge}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom Progress & Stars Area */}
                    <div className="card-bottom-tray">
                      <div className="tray-stars-row">
                        <span className="tray-stars">{lvl.stars}</span>
                        <span className="tray-score">{lvl.score}</span>
                      </div>

                      {/* Status / Selection Indicator */}
                      <div className="tray-status-badge">
                        {lvl.locked ? (
                          <span className="status-locked">CLASSIFIED</span>
                        ) : isSelected ? (
                          <span className="status-selected">✓ SELECTED</span>
                        ) : (
                          <span className="status-ready">CLICK TO PLAY</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        </main>

        {/* ==================== BOTTOM ACTION BAR ==================== */}
        <footer className="arcade-bottom-bar">
          {/* Selected Mission Summary Pill */}
          <div className="mission-selection-summary">
            <span className="summary-indicator-dot" style={{ background: currentLevelObj.accent }} />
            <div className="summary-texts">
              <span className="summary-level-title">
                {currentLevelObj.fullTitle}
              </span>
              <span className="summary-details">
                {currentLevelObj.rank} DIFFICULTY • {currentLevelObj.sols} SOLS DURATION
              </span>
            </div>
          </div>

          {/* Big Chunky Primary Start Mission Button (Arcade Gold/Orange) */}
          <button
            type="button"
            className="arcade-start-btn"
            onClick={onStartMission}
          >
            <span className="btn-rocket-icon">🚀</span>
            <span className="btn-main-label">START MISSION</span>
            <span className="btn-arrow-icon">❯</span>
          </button>
        </footer>
      </div>

      {/* ==================== MODALS ==================== */}
      {/* Game Info & Tutorial Modal */}
      {activeModal === 'TUTORIAL' && (
        <GameInfoModal
          activeTab="TUTORIAL"
          onSelectTab={(tab) => setActiveModal(tab)}
          onClose={() => setActiveModal(null)}
          onStartMission={onStartMission}
        />
      )}

      {/* Settings Modal */}
      {activeModal === 'SETTINGS' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="game-modal-chassis settings-chassis" onClick={(e) => e.stopPropagation()}>
            <div className="game-modal-top-bar">
              <div className="game-modal-telemetry-tag">
                <span className="telemetry-live-pulse" />
                <span className="telemetry-tag-label">SYSTEM CONFIG // SETTINGS</span>
              </div>
              <button
                type="button"
                className="game-modal-close-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close Settings"
              >
                ✕
              </button>
            </div>

            <div className="game-modal-body settings-modal-body">
              <h2 className="view-banner-title">⚙️ Mission & Graphics Settings</h2>
              <p className="view-banner-desc">Customize controls, motion, and visual performance.</p>

              <div className="settings-controls-list">
                <div className="settings-item-row">
                  <div>
                    <strong className="setting-label">Reduced Motion</strong>
                    <p className="setting-sub">Disables camera shake and gives extra reaction time.</p>
                  </div>
                  <button
                    type="button"
                    className={`setting-toggle-btn ${reducedMotion ? 'active' : ''}`}
                    onClick={onToggleReducedMotion}
                  >
                    {reducedMotion ? '✅ ENABLED' : '❌ DISABLED'}
                  </button>
                </div>

                <div className="settings-item-row">
                  <div>
                    <strong className="setting-label">Graphics Quality</strong>
                    <p className="setting-sub">Adjust bloom, shadow resolution, and 3D visual fidelity.</p>
                  </div>
                  <div className="graphics-preset-group">
                    {['LOW', 'MEDIUM', 'HIGH'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`preset-btn ${graphicsPreset === preset ? 'is-active' : ''}`}
                        onClick={() => onChangeGraphics?.(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="game-modal-footer">
              <div className="footer-keyboard-hint">
                <span>Preferences saved automatically</span>
              </div>
              <button
                type="button"
                className="game-modal-action-btn primary-action"
                onClick={() => setActiveModal(null)}
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
