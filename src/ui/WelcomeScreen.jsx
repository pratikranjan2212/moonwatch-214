// src/ui/WelcomeScreen.jsx
import React, { useState } from 'react';

const CAMPAIGN_LEVELS = [
  {
    id: 1,
    rank: 'CADET',
    title: 'Level 1: Power Basics',
    sols: 14,
    stars: '⭐',
    accent: '#fbbf24',
    bgImage: '/images/level1-power.jpg',
    goal: 'Charge your batteries with sunlight and raise the shield dome when space storms hit!',
    unlockedKeys: ['[1 / P] Solar Panels', '[2 / S] Shield Dome', '[3 / O] Oxygen'],
  },
  {
    id: 2,
    rank: 'PILOT',
    title: 'Level 2: Life Support & Greenhouse',
    sols: 21,
    stars: '⭐⭐',
    accent: '#38bdf8',
    bgImage: '/images/level2-greenhouse.jpg',
    goal: 'Grow fresh space plants in the greenhouse and keep clean oxygen flowing for your crew!',
    unlockedKeys: ['All Level 1 Keys', '[4 / G] Water Greenhouse'],
  },
  {
    id: 3,
    rank: 'COMMANDER',
    title: 'Level 3: Deep Space Comms',
    sols: 28,
    stars: '⭐⭐⭐',
    accent: '#a855f7',
    bgImage: '/images/level3-comms.jpg',
    goal: 'Master your full moonbase and beam emergency weather signals back home to Earth!',
    unlockedKeys: ['All Level 1 & 2 Keys', '[5 / C] Queue Earth Comms'],
  },
];

export default function WelcomeScreen({
  selectedLevel,
  onSelectLevel,
  onStartMission,
  reducedMotion,
  onToggleReducedMotion,
  graphicsPreset,
  onChangeGraphics,
}) {
  const [activeModal, setActiveModal] = useState(null); // 'TUTORIAL' | 'SETTINGS' | null
  const currentCard = CAMPAIGN_LEVELS.find((l) => l.id === selectedLevel) || CAMPAIGN_LEVELS[0];

  return (
    <div className="welcome-overlay">
      <div className="welcome-card">
        {/* Clean Header (Top technical badges removed) */}
        <header className="welcome-header">
          <div>
            <div className="welcome-greeting">👋 WELCOME ABOARD, ASTRONAUT!</div>
            <h1 className="welcome-title">MOONWATCH: Sol 214</h1>
            <p className="welcome-subtitle">
              Keep your crew alive. Real NASA flares. Your call.
            </p>
          </div>
          <div className="age-pill">🎮 AGES 9–14 • 3–8 MIN RUN</div>
        </header>

        {/* Step Prompt */}
        <div className="section-label">
          <span>CHOOSE YOUR MISSION DIFFICULTY</span>
          <span style={{ color: currentCard.accent }}>
            Selected: {currentCard.rank} ({currentCard.sols} Sols)
          </span>
        </div>

        {/* Simplified, Kid-Friendly Level Cards with Visual Backgrounds */}
        <div className="level-grid">
          {CAMPAIGN_LEVELS.map((lvl) => {
            const isSelected = selectedLevel === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onSelectLevel(lvl.id)}
                className={`level-card ${isSelected ? 'selected' : ''}`}
                style={{
                  '--card-accent': lvl.accent,
                }}
              >
                <div
                  className="level-card-bg"
                  style={{
                    backgroundImage: `url(${lvl.bgImage})`,
                  }}
                />
                <div className="level-card-overlay" />
                <div className="level-card-content">
                  <div className="level-card-top">
                    <span className="rank-badge" style={{ background: lvl.accent }}>
                      {lvl.rank}
                    </span>
                    <span className="sol-pill">{lvl.sols} Sols</span>
                  </div>

                  <div className="level-card-body">
                    <h2 className="level-name">{lvl.title}</h2>
                    <p className="level-goal">{lvl.goal}</p>
                  </div>

                  <div className="level-footer">
                    <span>Difficulty: {lvl.stars}</span>
                    <span className="select-indicator">
                      {isSelected ? '✓ READY' : 'Click to Select'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Clean Bottom Action Bar (Replay Seed & Credits removed) */}
        <footer className="welcome-footer">
          <div className="secondary-actions">
            <button
              type="button"
              className="menu-btn settings-btn"
              onClick={() => setActiveModal('SETTINGS')}
            >
              ⚙️ Settings
            </button>
            <button
              type="button"
              className="menu-btn tutorial-btn"
              onClick={() => setActiveModal('TUTORIAL')}
            >
              ❓ How to Play
            </button>
          </div>

          <button
            type="button"
            className="start-mission-btn"
            onClick={onStartMission}
          >
            🚀 Start Mission →
          </button>
        </footer>
      </div>

      {/* Kid-Friendly How to Play Modal */}
      {activeModal === 'TUTORIAL' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-row">
              <div>
                <h2 className="modal-title-text">
                  🧑‍🚀 How to Play: 4 Easy Steps
                </h2>
                <p className="modal-sub-text">
                  Your mission: Keep your moonbase powered, protected, and healthy!
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="tutorial-cards-grid">
              {/* Step 1 */}
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
                  <p className="step-desc">
                    Open solar panels on calm sunny days to fill up your base batteries!
                  </p>
                </div>
              </div>

              {/* Step 2 */}
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
                  <p className="step-desc">
                    When NASA warns you of a solar flare, close panels and turn ON the shield dome!
                  </p>
                </div>
              </div>

              {/* Step 3 */}
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
                  <p className="step-desc">
                    Pump clean oxygen and water greenhouse plants so your astronauts stay breathing!
                  </p>
                </div>
              </div>

              {/* Step 4 */}
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
                  <p className="step-desc">
                    Once your base is safe and prepared, advance the day to survive to the next Sol!
                  </p>
                </div>
              </div>
            </div>

            <div className="pro-tip-banner">
              <span className="pro-tip-icon">💡</span>
              <span>
                <strong>Space Fact:</strong> A <strong>"Sol"</strong> is simply the scientific word for <strong>one day</strong> on the Moon!
              </span>
            </div>

            <button
              type="button"
              className="start-mission-btn modal-submit-btn"
              onClick={() => setActiveModal(null)}
            >
              Got It! Let's Play 🚀
            </button>
          </div>
        </div>
      )}

      {/* Accessibility & Graphics Settings Modal */}
      {activeModal === 'SETTINGS' && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>⚙️ Mission Settings</h2>
            <div className="settings-row">
              <span>Reduced Motion (No Shake + Pause Timer)</span>
              <button
                type="button"
                className="menu-btn"
                onClick={onToggleReducedMotion}
              >
                {reducedMotion ? '✅ ON' : '❌ OFF'}
              </button>
            </div>
            <div className="settings-row">
              <span>Graphics Quality</span>
              <select
                value={graphicsPreset}
                onChange={(e) => onChangeGraphics(e.target.value)}
                className="gfx-select"
              >
                <option value="LOW">LOW (Fastest)</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH (Best Visuals)</option>
              </select>
            </div>
            <button className="start-mission-btn" onClick={() => setActiveModal(null)}>
              Save & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
