import React from 'react';

function AccessibleGauge({ label, value, icon, patternType }) {
  // Color-blind safe palette (Blue / Amber / Purple) + distinct geometric icon + text status
  const statusText = value >= 70 ? 'OPTIMAL' : value >= 35 ? 'CAUTION' : 'CRITICAL';
  const barColor = value >= 70 ? '#38bdf8' : value >= 35 ? '#f59e0b' : '#e11d48';

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '10px 12px',
        flex: '1 1 160px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
        <span style={{ fontWeight: 'bold', color: '#e2e8f0' }}>
          {icon} {label}
        </span>
        <span style={{ fontFamily: 'monospace', color: barColor }}>
          {value}% ({statusText})
        </span>
      </div>
      <div
        style={{
          height: '10px',
          backgroundColor: '#1e293b',
          borderRadius: '5px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: '100%',
            backgroundColor: barColor,
            backgroundImage:
              patternType === 'striped'
                ? 'repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(15,23,42,0.45) 6px, rgba(15,23,42,0.45) 12px)'
                : patternType === 'dotted'
                ? 'radial-gradient(rgba(15,23,42,0.55) 2px, transparent 2px)'
                : 'none',
            backgroundSize: patternType === 'dotted' ? '8px 8px' : 'auto',
          }}
        />
      </div>
    </div>
  );
}

export default function ControlDeck({
  power,
  integrity,
  oxygenStore,
  level,
  solarExtended,
  shieldActive,
  oxygenLevel,
  greenhouseActive,
  commsQueued,
  onToggleSolar,
  onToggleShield,
  onCycleOxygen,
  onToggleGreenhouse,
  onToggleComms,
  onNextSol,
  reducedMotion,
  setReducedMotion,
  graphicsPreset,
  setGraphicsPreset,
  fps,
  timerPaused,
  timeLeft,
}) {
  const buttonStyle = (active, disabled = false) => ({
    padding: '10px 12px',
    borderRadius: '8px',
    border: active ? '2px solid #38bdf8' : '1px solid #334155',
    backgroundColor: disabled ? '#0f172a' : active ? '#1e3a8a' : '#1e293b',
    color: disabled ? '#475569' : '#f8fafc',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'monospace',
    fontSize: '12px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
      {/* Color-Blind Safe Gauges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        <AccessibleGauge label="POWER BUS" value={power} icon="⚡" patternType="solid" />
        <AccessibleGauge label="DOME INTEGRITY" value={integrity} icon="🛡️" patternType="striped" />
        <AccessibleGauge label="O2 RESERVES" value={oxygenStore} icon="💠" patternType="dotted" />
      </div>

      {/* Primary Interactive Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '10px',
        }}
      >
        <button onClick={onToggleSolar} style={buttonStyle(solarExtended)}>
          <strong>[1 / P] Solar Panels</strong>
          <span>Status: {solarExtended ? 'EXTENDED' : 'RETRACTED'}</span>
        </button>

        <button onClick={onToggleShield} style={buttonStyle(shieldActive)}>
          <strong>[2 / S] Shield Dome</strong>
          <span>Status: {shieldActive ? 'ON (Protected)' : 'OFF'}</span>
        </button>

        <button onClick={onCycleOxygen} style={buttonStyle(oxygenLevel !== 'LOW')}>
          <strong>[3 / O] Oxygen Flow</strong>
          <span>Rate: {oxygenLevel}</span>
        </button>

        <button
          onClick={onToggleGreenhouse}
          disabled={level < 2}
          style={buttonStyle(greenhouseActive, level < 2)}
        >
          <strong>[4 / G] Greenhouse {level < 2 ? '🔒 (Lvl 2)' : ''}</strong>
          <span>{level < 2 ? 'Unlocks at Sol 3' : greenhouseActive ? 'TENDING ACTIVE' : 'IDLE'}</span>
        </button>

        <button
          onClick={onToggleComms}
          disabled={level < 3}
          style={buttonStyle(commsQueued, level < 3)}
        >
          <strong>[5 / C] Earth Comms {level < 3 ? '🔒 (Lvl 3)' : ''}</strong>
          <span>{level < 3 ? 'Unlocks at Sol 6' : commsQueued ? 'PACKET QUEUED' : 'STANDBY'}</span>
        </button>

        <button
          onClick={onNextSol}
          style={{
            ...buttonStyle(true),
            backgroundColor: '#0369a1',
            border: '2px solid #7dd3fc',
          }}
        >
          <strong>[SPACE / ENTER] Next Sol →</strong>
          <span>
            {timerPaused ? 'Timer Paused (Reduced Motion)' : `Auto-advance in ${timeLeft}s`}
          </span>
        </button>
      </div>

      {/* Accessibility & Performance Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #1e293b',
          fontSize: '12px',
          color: '#cbd5e1',
          fontFamily: 'monospace',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
          />
          Reduced Motion (Disables Shake & Pauses Sol 214 Timer)
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Graphics:</span>
          {['LOW', 'MEDIUM', 'HIGH'].map((preset) => (
            <button
              key={preset}
              onClick={() => setGraphicsPreset(preset)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: graphicsPreset === preset ? '1px solid #38bdf8' : '1px solid #334155',
                backgroundColor: graphicsPreset === preset ? '#1e3a8a' : '#1e293b',
                color: '#f8fafc',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {preset}
            </button>
          ))}
          <span style={{ color: fps < 30 ? '#fb923c' : '#38bdf8' }}>({fps} FPS)</span>
        </div>
      </div>
    </div>
  );
}
