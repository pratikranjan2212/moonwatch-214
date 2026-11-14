// src/scene/SpriteActor.jsx
import React from 'react';

const STATION_COORDS = {
  SOLAR: { left: '17%', label: 'Adjusting Solar Array!' },
  SHIELD: { left: '32%', label: 'Calibrating Shield Dome!' },
  OXYGEN: { left: '41%', label: 'Cycling O2 Scrubber!' },
  GREENHOUSE: { left: '61%', label: 'Watering Lunar Crops!' },
  COMMS: { left: '79%', label: 'Beaming Data to Earth!' },
};

export default function SpriteActor({
  activeStation = 'OXYGEN',
  reducedMotion = false,
  character,
}) {
  const target = STATION_COORDS[activeStation] || STATION_COORDS.OXYGEN;
  const suitColor = character?.suitColor || '#f8fafc';
  const visorColor = character?.visorColor || '#f59e0b';
  const charName = character?.name || 'Commander Nova';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '19%',
        left: target.left,
        transition: reducedMotion ? 'none' : 'left 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Speech Bubble showing your selected character */}
      <div
        style={{
          background: '#fbbf24',
          color: '#0f172a',
          fontWeight: 800,
          fontSize: 'clamp(0.68rem, 2vw, 0.78rem)',
          padding: '4px 8px',
          borderRadius: '12px',
          marginBottom: '6px',
          whiteSpace: 'nowrap',
          maxWidth: '85vw',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          border: '2px solid #0f172a',
          boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
        }}
      >
        {character?.avatar || '👩‍🚀'} <strong>{charName}:</strong> {target.label}
      </div>

      {/* 2D SVG Astronaut Character customized to selected crew member */}
      <svg width="58" height="72" viewBox="0 0 60 75">
        <rect x="10" y="24" width="40" height="32" rx="6" fill="#94a3b8" stroke="#0f172a" strokeWidth="3" />
        <rect x="16" y="28" width="28" height="30" rx="8" fill={suitColor} stroke="#0f172a" strokeWidth="3" />
        <circle cx="25" cy="40" r="4" fill="#2563eb" />
        <rect x="31" y="37" width="8" height="6" fill="#ef4444" />
        <circle cx="30" cy="18" r="15" fill={suitColor} stroke="#0f172a" strokeWidth="3" />
        <rect x="20" y="11" width="20" height="13" rx="6" fill={visorColor} stroke="#0f172a" strokeWidth="2" />
        <rect x="17" y="58" width="10" height="12" rx="4" fill="#475569" stroke="#0f172a" strokeWidth="2" />
        <rect x="33" y="58" width="10" height="12" rx="4" fill="#475569" stroke="#0f172a" strokeWidth="2" />
      </svg>
    </div>
  );
}
