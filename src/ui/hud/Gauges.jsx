import useGameStore from '../../store/useGameStore.js';
import { COLOUR_BLIND_PALETTE, GAUGE_META, PALETTE } from '../tokens.js';

function getGaugeStatus(value) {
  const numeric = Math.round(Number(value ?? 0));
  if (numeric <= 20) {
    return { label: 'CRITICAL', chipClass: 'chip-critical', cardClass: 'status-critical' };
  }
  if (numeric <= 45) {
    return { label: 'LOW', chipClass: 'chip-low', cardClass: 'status-low' };
  }
  return { label: 'OPTIMAL', chipClass: 'chip-optimal', cardClass: 'status-optimal' };
}

function GaugeIcon({ type, color }) {
  if (type === 'power') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M13 2L4 14h7l-1 8 10-12h-7l0-8z"
          fill={color}
          stroke="#FFF1C9"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (type === 'oxygen') {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2C12 2 5 10.2 5 15.2A7 7 0 0 0 19 15.2C19 10.2 12 2 12 2Z"
          fill={color}
          stroke="#FFF1C9"
          strokeWidth="1.2"
        />
        <circle cx="9.5" cy="15" r="1.6" fill="#0F1123" />
        <circle cx="14" cy="17" r="1.1" fill="#0F1123" />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2L4 5.5v6.2c0 5.1 3.4 9.7 8 10.8 4.6-1.1 8-5.7 8-10.8V5.5L12 2z"
        fill={color}
        stroke="#FFF1C9"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M12 5v14" stroke="#0F1123" strokeWidth="1.4" opacity="0.5" />
    </svg>
  );
}

export function Gauges() {
  const gauges = useGameStore((s) => s.game?.gauges) || { power: 80, oxygen: 100, shield: 100 };
  const colourBlind = useGameStore((s) => s.settings?.colourBlind) || false;
  const activePalette = colourBlind ? COLOUR_BLIND_PALETTE : PALETTE;

  const items = [
    { ...GAUGE_META.power, value: Math.round(gauges.power ?? 0), fill: activePalette.power },
    { ...GAUGE_META.oxygen, value: Math.round(gauges.oxygen ?? 0), fill: activePalette.oxygen },
    { ...GAUGE_META.shield, value: Math.round(gauges.shield ?? 0), fill: activePalette.shield },
  ];

  return (
    <section className="hud-panel gauges-panel" aria-label="Outpost Resource Gauges">
      <div className="hud-section-title">
        <span>Core Systems Telemetry</span>
        {colourBlind && <span className="kbd-hint">PATTERN SAFE MODE</span>}
      </div>

      {/* Shared SVG Pattern Definitions for Colour-Blind Safe Mode */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <pattern
            id="pattern-power-diagonal"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill={activePalette.power} />
            <line x1="0" y1="0" x2="0" y2="8" stroke="#0B0D1B" strokeWidth="3" />
          </pattern>
          <pattern id="pattern-oxygen-dots" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={activePalette.oxygen} />
            <circle cx="4" cy="4" r="2" fill="#0B0D1B" />
          </pattern>
          <pattern id="pattern-shield-crosshatch" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill={activePalette.shield} />
            <path d="M0 0L8 8M8 0L0 8" stroke="#0B0D1B" strokeWidth="1.8" />
          </pattern>
        </defs>
      </svg>

      <div className="gauges-grid">
        {items.map((g) => {
          const status = getGaugeStatus(g.value);
          const clampedWidth = Math.max(0, Math.min(100, g.value));
          const barFill = colourBlind ? `url(#${g.patternId})` : g.fill;

          return (
            <div
              key={g.key}
              className={`gauge-card ${status.cardClass}`}
              role="region"
              aria-label={`${g.label} gauge ${g.value}% ${status.label}`}
            >
              <div className="gauge-header">
                <div className="gauge-title-group">
                  <GaugeIcon type={g.key} color={g.fill} />
                  <span className="gauge-name">{g.label}</span>
                </div>
                <span className={`gauge-status-chip ${status.chipClass}`}>{status.label}</span>
              </div>

              <div className="gauge-value-row">
                <span className="gauge-number" style={{ color: g.fill }}>
                  {g.value}%
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  [{g.shapeLabel}]
                </span>
              </div>

              <svg
                className="gauge-bar-svg"
                viewBox="0 0 100 16"
                preserveAspectRatio="none"
                role="progressbar"
                aria-valuenow={g.value}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <rect x="0" y="0" width="100" height="16" fill="#0B0D1B" />
                <rect x="0" y="0" width={clampedWidth} height="16" fill={barFill} />
                {/* 25%, 50%, 75% tick marks for crisp readability */}
                <line x1="25" y1="0" x2="25" y2="16" stroke="#1C1F3A" strokeWidth="0.8" />
                <line x1="50" y1="0" x2="50" y2="16" stroke="#1C1F3A" strokeWidth="0.8" />
                <line x1="75" y1="0" x2="75" y2="16" stroke="#1C1F3A" strokeWidth="0.8" />
              </svg>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {g.description}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Gauges;
