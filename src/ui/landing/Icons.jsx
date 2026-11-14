/**
 * Square white badge containing the black tilted ringed-planet emblem
 * used in the top-left MOONWATCH / NASA Space Apps header lockup.
 */
export function AstraPlanetBadge({ className = '' }) {
  return (
    <div className={`mw-planet-badge ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g transform="rotate(-28 18 18)">
          <path
            d="M4.5 18C4.5 14.9 10.5 12.6 18 12.6C25.5 12.6 31.5 14.9 31.5 18"
            stroke="#000000"
            strokeWidth="2.4"
            strokeLinecap="square"
          />
          <circle cx="18" cy="18" r="6.8" fill="#000000" />
          <path
            d="M3.5 18C3.5 21.4 10 24 18 24C26 24 32.5 21.4 32.5 18"
            stroke="#FFFFFF"
            strokeWidth="4.2"
            strokeLinecap="square"
          />
          <path
            d="M4.5 18C4.5 21.1 10.5 23.4 18 23.4C25.5 23.4 31.5 21.1 31.5 18"
            stroke="#000000"
            strokeWidth="2.4"
            strokeLinecap="square"
          />
        </g>
      </svg>
    </div>
  );
}

/**
 * Pixelated dotted right-chevron arrow matching editorial CTA buttons.
 */
export function PixelChevron({ className = '' }) {
  const dots = [
    [0, 0],
    [0, 6],
    [1, 1],
    [1, 5],
    [2, 0],
    [2, 2],
    [2, 4],
    [2, 6],
    [3, 1],
    [3, 3],
    [3, 5],
    [4, 2],
    [4, 4],
    [5, 3],
  ];

  return (
    <svg
      viewBox="0 0 12 14"
      className={`mw-chevron ${className}`.trim()}
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      {dots.map(([col, row], idx) => (
        <rect key={idx} x={col * 2} y={row * 2} width="1.65" height="1.65" />
      ))}
    </svg>
  );
}

/**
 * Minimal crisp close icon for modal headers without requiring external icon packages.
 */
export function CloseIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  );
}
