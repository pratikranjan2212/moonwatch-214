// src/ui/WelcomeScreen.jsx
import React, { useState } from 'react';

const CAMPAIGN_LEVELS = [
  {
    id: 1,
    rank: '🌱 CADET',
    title: 'Level 1: Power Basics',
    sols: 14,
    stars: '⭐',
    accent: '#fbbf24',
    icon: '☀️🛡️',
    goal: 'Learn to charge your lunar batteries and raise the Shield Dome when solar storms hit!',
    unlockedKeys: ['[1 / P] Solar Panels', '[2 / S] Shield Dome', '[3 / O] Oxygen'],
  },
  {
    id: 2,
    rank: '🚀 PILOT',
    title: 'Level 2: Life Support & Greenhouse',
    sols: 21,
    stars: '⭐⭐',
    accent: '#38bdf8',
    icon: '🌱🫧',
    goal: 'Grow space crops inside the Hydroponic Dome and keep your crew breathing fresh oxygen!',
    unlockedKeys: ['All Level 1 Keys', '[4 / G] Water Greenhouse'],
  },
  {
    id: 3,
    rank: '👑 COMMANDER',
    title: 'Level 3: Deep Space Comms',
    sols: 28,
    stars: '⭐⭐⭐',
    accent: '#a855f7',
    icon: '📡🌍',
    goal: 'Master the full moonbase and beam emergency weather data back to Mission Control on Earth!',
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

        {/* Simplified, Kid-Friendly Level Cards (Dense tags removed) */}
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
                <div className="level-card-top">
                  <span className="rank-badge" style={{ background: lvl.accent }}>
                    {lvl.rank}
                  </span>
                  <span className="sol-pill">{lvl.sols} Sols</span>
                </div>

                <div className="level-icon">{lvl.icon}</div>
                <h2 className="level-name">{lvl.title}</h2>
                <p className="level-goal">{lvl.goal}</p>

                <div className="level-footer">
                  <span>Difficulty: {lvl.stars}</span>
                  <span className="select-indicator">
                    {isSelected ? '✓ READY' : 'Click to Select'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Helpful Addition: Visual Loadout Strip for the Selected Level */}
        <div className="loadout-strip">
          <span className="loadout-title">🕹️ YOUR CONTROLS FOR LEVEL {selectedLevel}:</span>
          <div className="loadout-chips">
            {currentCard.unlockedKeys.map((k) => (
              <span key={k} className="loadout-chip">
                {k}
              </span>
            ))}
            <span className="loadout-chip">[SPACE] Next Sol</span>
          </div>
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
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h2>🧑‍🚀 Commander's Quick Guide</h2>
            <ul className="tutorial-list">
              <li>
                <strong>☀️ Watch the Sun:</strong> Extend Solar Panels <code>[1/P]</code> on calm days to charge batteries.
              </li>
              <li>
                <strong>🛡️ Block Solar Storms:</strong> When a NASA Flare alert pops up, retract panels and turn ON your Shield Dome <code>[2/S]</code>!
              </li>
              <li>
                <strong>🫧 Keep Crew Happy:</strong> Cycle Oxygen <code>[3/O]</code>, water crops <code>[4/G]</code>, and beam data to Earth <code>[5/C]</code>.
              </li>
              <li>
                <strong>⏭️ Advance Days:</strong> Press <code>[Space]</code> or <code>[Enter]</code> when your base is ready for the next Sol!
              </li>
            </ul>
            <button className="start-mission-btn" onClick={() => setActiveModal(null)}>
              Got It! Let's Play
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
