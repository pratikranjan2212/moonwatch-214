// src/ui/MissionHUD.jsx
import React, { useEffect } from 'react';

export default function MissionHUD({
  sol,
  maxSol = 214,
  countdown,
  level,
  isPaused,
  solarExtended,
  shieldActive,
  oxygenLevel, // 'LOW' | 'NORMAL' | 'HIGH'
  greenhouseActive,
  commsQueued,
  alertModal,
  reducedMotion,
  graphicsPreset,
  fps,
  onTogglePause,
  onToggleSolar,
  onToggleShield,
  onCycleOxygen,
  onToggleGreenhouse,
  onToggleComms,
  onAdvanceSol,
  onDismissAlert,
  onToggleReducedMotion,
  onChangeGraphics,
}) {
  // Global Keyboard Navigation Listener (Disabled when isPaused is true)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (isPaused) return;

      const key = e.key.toLowerCase();

      if (key === '1' || key === 'p') {
        e.preventDefault();
        onToggleSolar();
      } else if (key === '2' || key === 's') {
        e.preventDefault();
        onToggleShield();
      } else if (key === '3' || key === 'o') {
        e.preventDefault();
        onCycleOxygen();
      } else if (key === '4' || key === 'g') {
        e.preventDefault();
        if (level >= 2) onToggleGreenhouse();
      } else if (key === '5' || key === 'c') {
        e.preventDefault();
        if (level >= 3) onToggleComms();
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        onAdvanceSol();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onDismissAlert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPaused,
    level,
    onToggleSolar,
    onToggleShield,
    onCycleOxygen,
    onToggleGreenhouse,
    onToggleComms,
    onAdvanceSol,
    onDismissAlert,
  ]);

  const getO2Meta = () => {
    if (oxygenLevel === 'LOW') return { icon: '⚠️', pattern: 'url(#pat-stripes)', pct: 30, label: 'LOW (DANGER)' };
    if (oxygenLevel === 'HIGH') return { icon: '◆', pattern: 'url(#pat-dots)', pct: 100, label: 'HIGH (BOOST)' };
    return { icon: '●', pattern: 'url(#pat-grid)', pct: 68, label: 'NORMAL (SAFE)' };
  };

  const o2Meta = getO2Meta();

  return (
    <>
      {/* Hidden SVG Pattern Definitions for Color-Blind Safe Gauges */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="pat-stripes" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#991b1b" />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#fca5a5" strokeWidth="4" />
          </pattern>
          <pattern id="pat-grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#065f46" />
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#6ee7b7" strokeWidth="2" />
          </pattern>
          <pattern id="pat-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#1e40af" />
            <circle cx="4" cy="4" r="2" fill="#93c5fd" />
          </pattern>
        </defs>
      </svg>

      {/* TOP BAR */}
      <header className="hud-header">
        {/* Sol Progress & Timer */}
        <div className="hud-card hud-sol-card">
          <div className="hud-sol-primary">
            <div className="hud-label-dim">
              MISSION COMMAND • LEVEL {level}
            </div>
            <div className="hud-sol-title">
              SOL {sol} / {maxSol}
            </div>
          </div>

          <div className="hud-timer-col">
            <div className="hud-label-dim">NEXT SOL TIMER</div>
            <div className="hud-timer-val">
              {isPaused
                ? '⏸ GAME PAUSED'
                : reducedMotion
                ? '⏸ PAUSED (REDUCED MOTION)'
                : `⏱ ${countdown}s`}
            </div>
          </div>
        </div>

        {/* Colour-Blind Safe O2 Gauge */}
        <div className="hud-card hud-gauge-card">
          <div className="hud-gauge-header">
            <span>OXYGEN GAUGE</span>
            <span>{o2Meta.icon} {o2Meta.label}</span>
          </div>
          <svg className="hud-gauge-svg" width="100%" height="16">
            <rect width="100%" height="100%" fill="#0f172a" />
            <rect width={`${o2Meta.pct}%`} height="100%" fill={o2Meta.pattern} />
          </svg>
        </div>

        {/* Accessibility, Graphics & Pause Bar */}
        <div className="hud-card hud-controls-card">
          <button
            type="button"
            className="hud-reduced-motion-btn"
            onClick={onToggleReducedMotion}
          >
            {reducedMotion ? '✓ Motion ON' : 'Motion OFF'}
          </button>

          <label className="hud-gfx-label">
            GFX:
            <select
              value={graphicsPreset}
              onChange={(e) => onChangeGraphics(e.target.value)}
              className="hud-gfx-select"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MED</option>
              <option value="HIGH">HIGH</option>
            </select>
          </label>

          <span
            className="hud-fps-badge"
            style={{ color: fps < 30 ? '#f87171' : '#34d399' }}
          >
            {fps} FPS
          </span>

          {/* PAUSE BUTTON */}
          <button
            type="button"
            className="pause-trigger-btn"
            onClick={onTogglePause}
            aria-label="Pause Game"
          >
            ⏸ Pause
          </button>
        </div>
      </header>

      {/* SPACE-WEATHER ALERT MODAL */}
      {alertModal && !isPaused && (
        <div className="solar-alert-modal" role="dialog" aria-modal="true">
          <div className="solar-alert-title">☀️⚡ SOLAR FLARE DETECTED!</div>
          <p className="solar-alert-msg">
            {alertModal.message || 'Incoming Space Weather Storm! Retract Solar Panels [1/P] and raise your Shield Dome [2/S]!'}
          </p>
          <button
            type="button"
            className="solar-alert-btn"
            onClick={onDismissAlert}
          >
            DISMISS ALERT [ESC]
          </button>
        </div>
      )}

      {/* BOTTOM TACTILE NAVIGATION DECK */}
      <nav className="control-deck" aria-label="Lunar Base Controls">
        <button
          type="button"
          className={`deck-btn ${solarExtended ? 'active-state' : ''}`}
          onClick={onToggleSolar}
          disabled={isPaused}
        >
          <span className="key-badge">1 / P</span>
          <span style={{ fontSize: '1.5rem' }}>☀️</span>
          <strong>Solar Panels</strong>
          <small style={{ color: '#bae6fd' }}>{solarExtended ? 'EXTENDED' : 'RETRACTED'}</small>
        </button>

        <button
          type="button"
          className={`deck-btn ${shieldActive ? 'active-state' : ''}`}
          onClick={onToggleShield}
          disabled={isPaused}
        >
          <span className="key-badge">2 / S</span>
          <span style={{ fontSize: '1.5rem' }}>🛡️</span>
          <strong>Shield Dome</strong>
          <small style={{ color: '#bae6fd' }}>{shieldActive ? 'ON' : 'OFF'}</small>
        </button>

        <button
          type="button"
          className="deck-btn"
          onClick={onCycleOxygen}
          disabled={isPaused}
        >
          <span className="key-badge">3 / O</span>
          <span style={{ fontSize: '1.5rem' }}>🫧</span>
          <strong>Cycle O₂</strong>
          <small style={{ color: '#fde68a' }}>{o2Meta.icon} {oxygenLevel}</small>
        </button>

        <button
          type="button"
          className={`deck-btn ${greenhouseActive ? 'active-state' : ''}`}
          onClick={onToggleGreenhouse}
          disabled={isPaused || level < 2}
          title={level < 2 ? 'Unlocks at Level 2' : 'Toggle Greenhouse Watering'}
        >
          <span className="key-badge">4 / G</span>
          <span style={{ fontSize: '1.5rem' }}>🌱</span>
          <strong>Greenhouse</strong>
          <small>{level < 2 ? '🔒 LEVEL 2+' : greenhouseActive ? 'WATERING' : 'IDLE'}</small>
        </button>

        <button
          type="button"
          className={`deck-btn ${commsQueued ? 'active-state' : ''}`}
          onClick={onToggleComms}
          disabled={isPaused || level < 3}
          title={level < 3 ? 'Unlocks at Level 3' : 'Queue Earth Comms'}
        >
          <span className="key-badge">5 / C</span>
          <span style={{ fontSize: '1.5rem' }}>📡</span>
          <strong>Earth Comms</strong>
          <small>{level < 3 ? '🔒 LEVEL 3' : commsQueued ? 'QUEUED' : 'STANDBY'}</small>
        </button>

        <button
          type="button"
          className="deck-btn"
          onClick={onAdvanceSol}
          disabled={isPaused}
          style={{ background: '#2563eb', borderColor: '#93c5fd' }}
        >
          <span className="key-badge">SPACE / ↵</span>
          <span style={{ fontSize: '1.5rem' }}>🚀</span>
          <strong>Next Sol</strong>
          <small>ADVANCE DAY</small>
        </button>
      </nav>
    </>
  );
}
