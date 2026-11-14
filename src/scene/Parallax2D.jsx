// src/scene/Parallax2D.jsx
import React from 'react';

const SPACE_ASSETS = {
  nebulaBg: 'https://images-assets.nasa.gov/image/PIA17563/PIA17563~orig.jpg',
  earthRise: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/NASA_Earth_America_2002.jpg',
};

export default function Parallax2D({
  graphicsPreset = 'HIGH', // 'LOW' | 'MEDIUM' | 'HIGH'
  solarExtended = true,
  shieldActive = false,
  greenhouseActive = false,
  commsQueued = false,
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#050814',
        overflow: 'hidden',
        zIndex: 1,
      }}
    >
      {/* Deep Space 2D Reference Backdrop (Hidden on LOW preset to save GPU fill-rate) */}
      {graphicsPreset !== 'LOW' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${SPACE_ASSETS.nebulaBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: graphicsPreset === 'HIGH' ? 0.45 : 0.25,
          }}
        />
      )}

      {/* Earth in the Lunar Sky */}
      <img
        src={SPACE_ASSETS.earthRise}
        alt="Earth from Lunar Base"
        style={{
          position: 'absolute',
          top: '12%',
          right: '14%',
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          objectFit: 'cover',
          boxShadow: '0 0 28px rgba(56, 189, 248, 0.6)',
        }}
      />

      {/* Interactive 2D Lunar Base SVG Stations */}
      <svg
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', bottom: 0, width: '100%', height: '82%' }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Lunar Crater Horizon */}
        <path
          d="M0,470 Q300,430 600,465 T1200,450 L1200,600 L0,600 Z"
          fill="#334155"
        />
        <path
          d="M0,505 Q450,485 900,510 T1200,495 L1200,600 L0,600 Z"
          fill="#1e293b"
        />

        {/* Shield Dome Overlay (Station 2) */}
        {shieldActive && (
          <path
            d="M 130,490 A 470,310 0 0,1 1070,490 Z"
            fill="url(#shieldGrad)"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeDasharray="12 6"
          />
        )}

        {/* Station 1: Solar Array (Left, X ~ 220) */}
        <g transform="translate(180, 370)">
          <rect x="35" y="60" width="14" height="65" fill="#94a3b8" />
          <rect
            x={solarExtended ? '0' : '28'}
            y="35"
            width={solarExtended ? '85' : '28'}
            height="32"
            rx="4"
            fill="#0284c7"
            stroke="#bae6fd"
            strokeWidth="3"
          />
          <text x="42" y="22" fill="#bae6fd" fontSize="14" fontWeight="bold" textAnchor="middle">
            [1/P] SOLAR: {solarExtended ? 'EXTENDED' : 'RETRACTED'}
          </text>
        </g>

        {/* Station 3: Hab & O2 Core (Center-Left, X ~ 480) */}
        <g transform="translate(420, 360)">
          <path d="M 0,130 A 75,75 0 0,1 150,130 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="4" />
          <rect x="50" y="85" width="50" height="45" rx="6" fill="#0f172a" />
          <text x="75" y="40" fill="#f8fafc" fontSize="14" fontWeight="bold" textAnchor="middle">
            [3/O] O2 LIFE SUPPORT
          </text>
        </g>

        {/* Station 4: Hydroponic Greenhouse (Center-Right, X ~ 740) */}
        <g transform="translate(680, 380)">
          <path d="M 0,110 A 65,55 0 0,1 130,110 Z" fill={greenhouseActive ? '#065f46' : '#1e293b'} stroke="#34d399" strokeWidth="3" />
          <circle cx="45" cy="90" r="12" fill={greenhouseActive ? '#4ade80' : '#475569'} />
          <circle cx="85" cy="90" r="12" fill={greenhouseActive ? '#4ade80' : '#475569'} />
          <text x="65" y="38" fill="#6ee7b7" fontSize="14" fontWeight="bold" textAnchor="middle">
            [4/G] GREENHOUSE
          </text>
        </g>

        {/* Station 5: Deep Space Earth Comms Dish (Right, X ~ 980) */}
        <g transform="translate(940, 345)">
          <line x1="40" y1="85" x2="40" y2="145" stroke="#cbd5e1" strokeWidth="10" />
          <path d="M 10,60 Q 40,105 85,55" fill="none" stroke="#f8fafc" strokeWidth="6" />
          {commsQueued && (
            <circle cx="48" cy="45" r="18" fill="none" stroke="#fbbf24" strokeWidth="3" strokeDasharray="4 4" />
          )}
          <text x="45" y="25" fill="#fde68a" fontSize="14" fontWeight="bold" textAnchor="middle">
            [5/C] EARTH COMMS
          </text>
        </g>
      </svg>
    </div>
  );
}
