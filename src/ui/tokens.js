/**
 * @fileoverview Official DESIGN_DOC Section 8 palette tokens, colour-blind safe
 * pattern/shape definitions, and tactical HUD design tokens for MOONWATCH: Sol 214.
 */

export const PALETTE = {
  moonSurface: '#8A8D99',
  shadow: '#1C1F3A',
  deepSpace: '#1C1F3A',
  sunHighlight: '#FFF1C9',
  power: '#FFB020',
  oxygen: '#35D0E6',
  shield: '#8E6CFF',
  alert: '#FF4D4D',
  dust: '#C9A878',
};

export const COLOUR_BLIND_PALETTE = {
  moonSurface: '#9CA0AD',
  shadow: '#12152B',
  deepSpace: '#12152B',
  sunHighlight: '#FFF8DE',
  power: '#FFA500', // High-contrast Okabe-Ito orange/amber
  oxygen: '#56B4E9', // Sky blue
  shield: '#CC79A7', // Reddish purple / violet
  alert: '#D55E00', // Vermilion alert
  dust: '#E69F00', // Ochre
};

export const GAUGE_META = {
  power: {
    key: 'power',
    label: 'Power',
    unit: '%',
    color: PALETTE.power,
    cbColor: COLOUR_BLIND_PALETTE.power,
    patternId: 'pattern-power-diagonal',
    shapeLabel: 'BOLT',
    description: 'Habitat battery bank charge',
  },
  oxygen: {
    key: 'oxygen',
    label: 'Oxygen',
    unit: '%',
    color: PALETTE.oxygen,
    cbColor: COLOUR_BLIND_PALETTE.oxygen,
    patternId: 'pattern-oxygen-dots',
    shapeLabel: 'DROP',
    description: 'Breathable cabin O₂ pressure',
  },
  shield: {
    key: 'shield',
    label: 'Shield',
    unit: '%',
    color: PALETTE.shield,
    cbColor: COLOUR_BLIND_PALETTE.shield,
    patternId: 'pattern-shield-crosshatch',
    shapeLabel: 'DOME',
    description: 'Magnetic radiation dome integrity',
  },
};

export const MOOD_META = {
  idle: {
    label: 'READY',
    badgeClass: 'mood-idle',
    icon: '●',
    description: 'On station and nominal',
  },
  worried: {
    label: 'WORRIED',
    badgeClass: 'mood-worried',
    icon: '▲',
    description: 'Anxious about low oxygen or health',
  },
  'run-to-shelter': {
    label: 'SHELTER!',
    badgeClass: 'mood-shelter',
    icon: '◆',
    description: 'Bracing in storm shelter during radiation event',
  },
  cheer: {
    label: 'CHEERING',
    badgeClass: 'mood-cheer',
    icon: '★',
    description: 'Celebrating storm survival',
  },
  exhausted: {
    label: 'EXHAUSTED',
    badgeClass: 'mood-exhausted',
    icon: '▼',
    description: 'Fatigued from cold or low power',
  },
};

export const EVENT_VISUALS = {
  flare: {
    code: 'FLR',
    shortLabel: 'SOLAR FLARE',
    color: PALETTE.alert,
    accent: PALETTE.power,
  },
  cme: {
    code: 'CME',
    shortLabel: 'CME STORM',
    color: PALETTE.shield,
    accent: PALETTE.alert,
  },
  dust: {
    code: 'DUST',
    shortLabel: 'DUST STORM',
    color: PALETTE.dust,
    accent: PALETTE.power,
  },
  night: {
    code: 'NIGHT',
    shortLabel: 'LUNAR NIGHT',
    color: PALETTE.oxygen,
    accent: PALETTE.moonSurface,
  },
  comms: {
    code: 'COMMS',
    shortLabel: 'COMMS DELAY',
    color: PALETTE.sunHighlight,
    accent: PALETTE.oxygen,
  },
  sol214: {
    code: 'SOL 214',
    shortLabel: 'X-CLASS SUPER-FLARE',
    color: PALETTE.alert,
    accent: PALETTE.sunHighlight,
  },
};

export const TOKENS = {
  palette: PALETTE,
  colourBlindPalette: COLOUR_BLIND_PALETTE,
  gauges: GAUGE_META,
  moods: MOOD_META,
  events: EVENT_VISUALS,
  typography: {
    minBodyPx: 16,
    fontMono: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', monospace",
    fontDisplay: "'Orbitron', 'Chakra Petch', 'Segoe UI', system-ui, sans-serif",
    fontBody: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  },
  breakpoints: {
    tablet: '768px',
    desktop: '1280px',
  },
};

export default TOKENS;
