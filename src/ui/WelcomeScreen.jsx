// src/ui/WelcomeScreen.jsx
import React, { useState } from 'react';
import GameInfoModal from './GameInfoModal.jsx';

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
  onBackToHome,
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
            {onBackToHome && (
              <button
                type="button"
                className="menu-btn home-btn"
                onClick={onBackToHome}
              >
                ← Home
              </button>
            )}
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

      {/* Kid-Friendly How to Play & Game Info Modal */}
      {activeModal === 'TUTORIAL' && (
        <GameInfoModal
          activeTab="TUTORIAL"
          onSelectTab={(tab) => setActiveModal(tab)}
          onClose={() => setActiveModal(null)}
          onStartMission={onStartMission}
        />
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
