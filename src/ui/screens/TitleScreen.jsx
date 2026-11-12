import { useState } from 'react';
import { LEVEL_LIST } from '../../engine/levels.js';
import useGameStore from '../../store/useGameStore.js';

export function TitleScreen() {
  const currentLevel = useGameStore((s) => s.game?.level) || 1;
  const currentSeed = useGameStore((s) => s.game?.seed) || 2142026;
  const data = useGameStore((s) => s.data);
  const startLevel = useGameStore((s) => s.startLevel);
  const setScreen = useGameStore((s) => s.setScreen);

  const [selectedLevel, setSelectedLevel] = useState(currentLevel);
  const [seedInput, setSeedInput] = useState(String(currentSeed));
  const [creditsOpen, setCreditsOpen] = useState(false);

  const handleStartMission = () => {
    const cleanSeed = seedInput.trim() !== '' ? seedInput.trim() : undefined;
    startLevel(selectedLevel, cleanSeed, { screen: 'briefing' });
  };

  const handleOpenTutorial = () => {
    const cleanSeed = seedInput.trim() !== '' ? seedInput.trim() : undefined;
    startLevel(selectedLevel, cleanSeed, { screen: 'tutorial' });
  };

  return (
    <main className="screen-shell" aria-label="Title Screen">
      <div className="screen-container">
        {/* Header & Logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span className="nasa-badge">🛰️ NASA DONKI SPACE WEATHER EDITION</span>
              <span className="kbd-hint">HD-2D TACTICAL TRAINER</span>
            </div>
            <h1 className="hero-title">MOONWATCH: Sol 214</h1>
            <p className="hero-tagline">
              Keep your crew alive. Real NASA flares. Your call.
            </p>
          </div>

          <div
            className={`source-badge ${data?.eventSource === 'live' ? 'source-live' : 'source-snapshot'}`}
          >
            <span>{data?.eventSource === 'live' ? '📡 LIVE NASA DONKI' : '🛰️ CURATED SNAPSHOT READY'}</span>
          </div>
        </div>

        {/* Level Selector */}
        <section aria-label="Select Mission Level">
          <div className="hud-section-title">
            <span>Select Mission Campaign Level</span>
            <span>Ages 9–14 · 3–8 Min Per Run</span>
          </div>

          <div className="level-selector-grid">
            {LEVEL_LIST.map((lvl) => {
              const isSelected = selectedLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  className={`level-select-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedLevel(lvl.id)}
                  aria-pressed={isSelected}
                >
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 800,
                        color: isSelected ? 'var(--power)' : 'var(--sun-highlight)',
                      }}
                    >
                      Level {lvl.id}: {lvl.name}
                    </span>
                    <span className="forecast-sol-pill">{lvl.targetSols} Sols</span>
                  </div>

                  <p style={{ margin: '0.2rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {lvl.subtitle}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.25rem' }}>
                    {lvl.introduces.map((item) => (
                      <span key={item} className="kbd-hint">
                        {item}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Replay Seed Input & Primary Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label
              htmlFor="mission-seed-input"
              style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--sun-highlight)' }}
            >
              Mission Replay Seed (Optional):
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                id="mission-seed-input"
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="e.g. 2142026"
                style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '6px',
                  border: '2px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  width: '180px',
                }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setSeedInput(String(Math.floor(100000 + Math.random() * 900000)))}
              >
                Randomize
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setCreditsOpen(true)}>
              Credits & Science
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setScreen('settings')}>
              ⚙ Settings
            </button>
            <button type="button" className="btn btn-cyan" onClick={handleOpenTutorial}>
              ? Tutorial
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStartMission}
              style={{ fontSize: '1.1rem', padding: '0.75rem 1.6rem' }}
            >
              🚀 Start Mission →
            </button>
          </div>
        </div>
      </div>

      {/* Credits Modal / Drawer */}
      {creditsOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="credits-modal-title"
        >
          <div className="modal-card">
            <h2
              id="credits-modal-title"
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                color: 'var(--sun-highlight)',
              }}
            >
              Credits & NASA Space Weather Data
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
              <strong>MOONWATCH: Sol 214 (Junior Astronaut Mission Trainer — HD-2D Edition)</strong>{' '}
              turns real solar flares (FLR) and coronal mass ejections (CME) from NASA’s{' '}
              <strong>Space Weather Database Of Notifications, Knowledge, Information (DONKI)</strong>{' '}
              into interactive cause-and-effect mission decisions.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-primary)' }}>
              <li>
                <strong>Space Weather Telemetry:</strong> NASA Goddard Space Flight Center / CCMC DONKI API
              </li>
              <li>
                <strong>3D & Sprite Assets:</strong> CC0 / Permissive open packs (Kenney, Quaternius, Poly Haven)
              </li>
              <li>
                <strong>Accessibility:</strong> Colour-blind safe SVG patterns, full keyboard navigation, and reduced-motion mode
              </li>
            </ul>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCreditsOpen(false)}
              >
                Close Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default TitleScreen;
