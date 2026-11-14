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
      <header
        style={{
          position: 'absolute',
          top: 14,
          left: 18,
          right: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          zIndex: 20,
        }}
      >
        {/* Sol Progress & Timer */}
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '3px solid var(--border-glow)',
            borderRadius: 16,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
              MISSION COMMAND • LEVEL {level}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fbbf24' }}>
              SOL {sol} / {maxSol}
            </div>
          </div>

          <div style={{ borderLeft: '2px solid #334155', paddingLeft: 14 }}>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>NEXT SOL TIMER</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
              {isPaused
                ? '⏸ GAME PAUSED'
                : reducedMotion
                ? '⏸ PAUSED (REDUCED MOTION)'
                : `⏱ ${countdown}s`}
            </div>
          </div>
        </div>

        {/* Colour-Blind Safe O2 Gauge */}
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '3px solid #64748b',
            borderRadius: 16,
            padding: '10px 16px',
            minWidth: 250,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, marginBottom: 6 }}>
            <span>OXYGEN GAUGE</span>
            <span>{o2Meta.icon} {o2Meta.label}</span>
          </div>
          <svg width="100%" height="18" style={{ borderRadius: 8, border: '2px solid #f8fafc', overflow: 'hidden' }}>
            <rect width="100%" height="100%" fill="#0f172a" />
            <rect width={`${o2Meta.pct}%`} height="100%" fill={o2Meta.pattern} />
          </svg>
        </div>

        {/* Accessibility, Graphics & Pause Bar */}
        <div
          style={{
            background: 'var(--bg-panel)',
            border: '3px solid #64748b',
            borderRadius: 16,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.8rem',
          }}
        >
          <button
            type="button"
            onClick={onToggleReducedMotion}
            style={{
              background: reducedMotion ? '#059669' : '#334155',
              color: '#fff',
              border: '2px solid #94a3b8',
              borderRadius: 10,
              padding: '6px 10px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {reducedMotion ? '✓ Reduced Motion ON' : 'Reduced Motion OFF'}
          </button>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800 }}>
            GFX:
            <select
              value={graphicsPreset}
              onChange={(e) => onChangeGraphics(e.target.value)}
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                border: '2px solid #38bdf8',
                borderRadius: 8,
                padding: '4px 8px',
                fontWeight: 800,
              }}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </label>

          <span style={{ color: fps < 30 ? '#f87171' : '#34d399', fontWeight: 900 }}>
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
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'absolute',
            top: '24%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#7f1d1d',
            border: '4px solid #fca5a5',
            borderRadius: 20,
            padding: '20px 28px',
            maxWidth: 480,
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
            zIndex: 40,
          }}
        >
          <div style={{ fontSize: '2rem' }}>☀️⚡ SOLAR FLARE DETECTED!</div>
          <p style={{ fontSize: '1rem', lineHeight: 1.4, margin: '10px 0 16px' }}>
            {alertModal.message || 'Incoming Coronal Mass Ejection! Retract Solar Panels [1/P] and raise your Shield Dome [2/S]!'}
          </p>
          <button
            type="button"
            onClick={onDismissAlert}
            style={{
              background: '#fbbf24',
              color: '#0f172a',
              fontWeight: 900,
              padding: '10px 20px',
              borderRadius: 12,
              border: '3px solid #0f172a',
              cursor: 'pointer',
            }}
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
