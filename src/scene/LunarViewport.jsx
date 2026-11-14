import React from 'react';

export default function LunarViewport({
  sol,
  level,
  solarExtended,
  shieldActive,
  oxygenLevel,
  greenhouseActive,
  commsQueued,
  activeAlert,
  onDismissAlert,
  reducedMotion,
  graphicsPreset,
  characterPos,
}) {
  const isHigh = graphicsPreset === 'HIGH';
  const isMedium = graphicsPreset === 'MEDIUM' || isHigh;

  // Apply camera shake only during active solar storms when Reduced Motion is OFF
  const shouldShake = activeAlert && !reducedMotion && isMedium;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '380px',
        backgroundColor: '#070b14',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #1e293b',
        animation: shouldShake ? 'cameraShake 0.4s infinite' : 'none',
      }}
    >
      {/* Inline Keyframes for Shake & Pulse */}
      <style>{`
        @keyframes cameraShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-3px, 2px); }
          50% { transform: translate(3px, -2px); }
          75% { transform: translate(-2px, -2px); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.65; }
        }
      `}</style>

      {/* HD-2D Styled SVG Game Canvas */}
      <svg viewBox="0 0 800 380" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <defs>
          {/* Color-blind safe pattern fills */}
          <pattern id="solarGrid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#38bdf8" strokeWidth="1" />
          </pattern>
          <pattern id="shieldHatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#a855f7" strokeWidth="1.5" />
          </pattern>
          {isHigh && (
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          )}
        </defs>

        {/* Starfield (Scales with Graphics Preset) */}
        {isMedium &&
          Array.from({ length: isHigh ? 45 : 18 }).map((_, i) => (
            <circle
              key={i}
              cx={(i * 97) % 800}
              cy={(i * 53) % 210}
              r={i % 3 === 0 ? 1.8 : 1}
              fill="#e2e8f0"
              opacity={0.7}
            />
          ))}

        {/* Earth in Lunar Sky */}
        <circle cx="680" cy="70" r="24" fill="#1d4ed8" />
        <path d="M668 62 Q680 55 692 68 T675 84 Z" fill="#22c55e" opacity="0.8" />

        {/* Lunar Surface Horizon */}
        <path d="M0 260 Q220 235 450 255 T800 245 L800 380 L0 380 Z" fill="#1e293b" />
        <ellipse cx="140" cy="310" rx="55" ry="14" fill="#0f172a" />
        <ellipse cx="640" cy="325" rx="70" ry="18" fill="#0f172a" />

        {/* 1. SOLAR PANELS (Left Wing) */}
        <g transform="translate(90, 210)">
          <rect x="35" y="15" width="10" height="45" fill="#64748b" />
          {solarExtended ? (
            <g filter={isHigh ? 'url(#neonGlow)' : undefined}>
              <rect x="-40" y="0" width="160" height="24" rx="3" fill="#0284c7" stroke="#7dd3fc" strokeWidth="2" />
              <rect x="-40" y="0" width="160" height="24" fill="url(#solarGrid)" />
            </g>
          ) : (
            <rect x="25" y="5" width="30" height="18" rx="2" fill="#475569" stroke="#94a3b8" strokeWidth="1.5" />
          )}
          <text x="40" y="75" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            SOLAR: {solarExtended ? 'EXTENDED' : 'RETRACTED'}
          </text>
        </g>

        {/* 4. GREENHOUSE MODULE (Level 2+) */}
        <g transform="translate(520, 205)" opacity={level >= 2 ? 1 : 0.35}>
          <path d="M0 55 A45 45 0 0 1 90 55 Z" fill={greenhouseActive ? '#14532d' : '#334155'} stroke="#cbd5e1" strokeWidth="2" />
          {greenhouseActive && (
            <>
              <circle cx="25" cy="45" r="7" fill="#4ade80" />
              <circle cx="45" cy="40" r="9" fill="#22c55e" />
              <circle cx="65" cy="45" r="7" fill="#4ade80" />
            </>
          )}
          <text x="45" y="75" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            {level >= 2 ? (greenhouseActive ? 'CROPS: TENDED' : 'CROPS: IDLE') : 'LVL 2 LOCKED'}
          </text>
        </g>

        {/* 5. EARTH COMMS ARRAY (Level 3) */}
        <g transform="translate(675, 195)" opacity={level >= 3 ? 1 : 0.35}>
          <rect x="18" y="30" width="8" height="35" fill="#94a3b8" />
          <path d="M5 10 Q22 35 40 10" fill="none" stroke={commsQueued ? '#f59e0b' : '#cbd5e1'} strokeWidth="4" />
          {commsQueued && (
            <circle cx="22" cy="8" r="5" fill="#fbbf24" />
          )}
          <text x="22" y="82" fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="monospace">
            {level >= 3 ? (commsQueued ? 'COMMS: QUEUED' : 'COMMS: STANDBY') : 'LVL 3 LOCKED'}
          </text>
        </g>

        {/* MAIN HABITAT DOME & OXYGEN INDICATOR */}
        <g transform="translate(310, 175)">
          <path d="M0 90 A90 85 0 0 1 180 90 Z" fill="#334155" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Habitat Viewport Window reflecting Oxygen Level */}
          <rect
            x="55"
            y="42"
            width="70"
            height="22"
            rx="11"
            fill={oxygenLevel === 'HIGH' ? '#38bdf8' : oxygenLevel === 'NORMAL' ? '#22c55e' : '#f97316'}
          />
          <text x="90" y="57" fill="#0f172a" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            O2: {oxygenLevel}
          </text>
        </g>

        {/* 2. SHIELD DOME OVERLAY */}
        {shieldActive && (
          <path
            d="M275 270 A125 115 0 0 1 525 270 Z"
            fill="url(#shieldHatch)"
            stroke="#c084fc"
            strokeWidth="3"
            style={{ animation: reducedMotion ? 'none' : 'pulseGlow 2.5s infinite' }}
          />
        )}

        {/* MOVABLE ASTRONAUT / BASE OPERATOR CHARACTER */}
        <g
          transform={`translate(${characterPos}, 248)`}
          style={{
            transition: reducedMotion ? 'none' : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Backpack */}
          <rect x="-8" y="4" width="6" height="14" rx="2" fill="#94a3b8" />
          {/* Suit Body */}
          <rect x="-2" y="2" width="12" height="18" rx="4" fill="#f8fafc" />
          {/* Helmet & Gold Visor */}
          <circle cx="4" cy="-4" r="7" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="2" y="-7" width="8" height="5" rx="2" fill="#f59e0b" />
          {/* Legs */}
          <rect x="-1" y="20" width="4" height="8" fill="#cbd5e1" />
          <rect x="5" y="20" width="4" height="8" fill="#cbd5e1" />
        </g>

        {/* HUD Top Bar Inside Viewport */}
        <text x="18" y="28" fill="#f8fafc" fontSize="14" fontWeight="bold" fontFamily="monospace">
          SOL {sol} / 214  |  CLEARANCE LVL {level}
        </text>
      </svg>

      {/* SPACE-WEATHER ALERT MODAL (Dismiss with ESC) */}
      {activeAlert && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="alert-title"
          style={{
            position: 'absolute',
            inset: '20px',
            backgroundColor: 'rgba(15, 23, 42, 0.94)',
            border: '2px solid #f97316',
            borderRadius: '10px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            color: '#f8fafc',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: '28px', marginBottom: '6px' }}>⚠️</span>
          <h3 id="alert-title" style={{ margin: '0 0 8px', color: '#fb923c', fontFamily: 'monospace' }}>
            NASA DONKI SPACE-WEATHER ALERT: {activeAlert.title}
          </h3>
          <p style={{ margin: '0 0 16px', maxWidth: '480px', fontSize: '14px', color: '#cbd5e1' }}>
            {activeAlert.message}
          </p>
          <button
            onClick={onDismissAlert}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f97316',
              color: '#0f172a',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontFamily: 'monospace',
            }}
          >
            ACKNOWLEDGE & DISMISS [ESC]
          </button>
        </div>
      )}
    </div>
  );
}
