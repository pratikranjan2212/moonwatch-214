import { getEventsForSol, isLunarNightSol, normalizeEventType } from '../../engine/events.js';
import useGameStore from '../../store/useGameStore.js';
import Controls from '../hud/Controls.jsx';
import CrewPanel from '../hud/CrewPanel.jsx';
import Forecast from '../hud/Forecast.jsx';
import Gauges from '../hud/Gauges.jsx';
import TopBar from '../hud/TopBar.jsx';
import AlertModal from '../modals/AlertModal.jsx';
import Sol214Card from '../modals/Sol214Card.jsx';
import { PALETTE } from '../tokens.js';

function PlaceholderDiorama() {
  const game = useGameStore((s) => s.game);
  const sol = game?.sol || 1;
  const level = game?.level || 1;
  const gauges = game?.gauges || { power: 80, oxygen: 100, shield: 100 };
  const choices = game?.choices || { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' };
  const crew = game?.crew || [];
  const timeline = game?.timeline || [];

  const eventsToday = getEventsForSol(timeline, sol).map((e) =>
    normalizeEventType(e.type || e.code)
  );
  const isNight = eventsToday.includes('night') || isLunarNightSol(sol);
  const isFlare =
    eventsToday.includes('flare') || eventsToday.includes('cme') || eventsToday.includes('sol214');
  const isDust = eventsToday.includes('dust');
  const isLowPower = (gauges.power ?? 80) <= 25;

  const skyGradientId = isFlare
    ? 'sky-flare'
    : isDust
      ? 'sky-dust'
      : isNight
        ? 'sky-night'
        : 'sky-day';

  const environmentLabel = isFlare
    ? 'SOLAR STORM / RADIATION ALERT'
    : isDust
      ? 'ELECTROSTATIC DUST HAZE'
      : isNight
        ? 'LONG LUNAR NIGHT (EARTHLIGHT)'
        : 'LUNAR DAYLIGHT (SUNLIT)';

  const windowColor = isLowPower ? '#FF4D4D' : '#FFF1C9';
  const windowOpacity = (gauges.power ?? 80) <= 0 ? 0.15 : isLowPower ? 0.55 : 0.95;

  return (
    <div className="diorama-viewport" role="region" aria-label="Lunar Outpost HD-2D Tactical Viewport">
      {/* Top Overlay Status Pill */}
      <div className="diorama-overlay-top">
        <div className="diorama-status-pill">
          <span>{isNight ? '🌑' : isFlare ? '☄️' : isDust ? '🌪️' : '☀️'}</span>
          <span>{environmentLabel}</span>
        </div>
        <div className="diorama-status-pill">
          <span>SHACKLETON RIM DIORAMA</span>
        </div>
      </div>

      {/* Interactive SVG HD-2D Lunar Base Canvas */}
      <svg
        className="diorama-svg"
        viewBox="0 0 800 420"
        preserveAspectRatio="xMidYMid slice"
        aria-label="Shackleton Outpost Base Nodes: Habitat, SolarArray, ShieldDome, Antenna, Rover, Greenhouse, Terrain"
      >
        <defs>
          <linearGradient id="sky-day" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0E1124" />
            <stop offset="65%" stopColor="#1C1F3A" />
            <stop offset="100%" stopColor="#2E3359" />
          </linearGradient>
          <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#05060F" />
            <stop offset="70%" stopColor="#0F1329" />
            <stop offset="100%" stopColor="#1C1F3A" />
          </linearGradient>
          <linearGradient id="sky-flare" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#451222" />
            <stop offset="55%" stopColor="#2B1638" />
            <stop offset="100%" stopColor="#1C1F3A" />
          </linearGradient>
          <linearGradient id="sky-dust" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B2422" />
            <stop offset="65%" stopColor="#4A3C31" />
            <stop offset="100%" stopColor="#6E5A47" />
          </linearGradient>
          <radialGradient id="shield-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8E6CFF" stopOpacity="0.08" />
            <stop offset="75%" stopColor="#8E6CFF" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#35D0E6" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        {/* Sky Backdrop */}
        <rect x="0" y="0" width="800" height="420" fill={`url(#${skyGradientId})`} />

        {/* Starfield */}
        <g fill="#FFF1C9" opacity={isDust ? 0.35 : 0.85}>
          <circle cx="70" cy="48" r="1.5" />
          <circle cx="155" cy="82" r="1.2" />
          <circle cx="240" cy="36" r="1.8" />
          <circle cx="350" cy="64" r="1.2" />
          <circle cx="480" cy="40" r="1.6" />
          <circle cx="590" cy="75" r="1.4" />
          <circle cx="720" cy="52" r="1.8" />
          <circle cx="660" cy="110" r="1.2" />
        </g>

        {/* Earth in the Sky */}
        <g id="Earth" transform="translate(130, 95)">
          <circle cx="0" cy="0" r="28" fill="#1E6091" stroke="#35D0E6" strokeWidth="1.5" />
          <path d="M-12 -10 Q-2 -16 8 -6 Q14 4 2 14 Q-10 10 -12 -10Z" fill="#34D399" opacity="0.8" />
          <circle cx="-6" cy="-6" r="24" fill="none" stroke="#FFF1C9" strokeWidth="0.8" opacity="0.35" />
        </g>

        {/* Sun or Flare Flash */}
        {!isNight && (
          <g transform="translate(650, 88)">
            <circle
              cx="0"
              cy="0"
              r={isFlare ? 38 : 26}
              fill={isFlare ? PALETTE.alert : PALETTE.sunHighlight}
              opacity="0.28"
            />
            <circle
              cx="0"
              cy="0"
              r={isFlare ? 22 : 16}
              fill={isFlare ? PALETTE.power : PALETTE.sunHighlight}
            />
          </g>
        )}

        {/* Distant Lunar Mountains & Craters (Terrain Node) */}
        <g id="Terrain">
          <polygon
            points="0,285 110,220 235,270 380,205 520,265 670,215 800,275 800,420 0,420"
            fill="#565966"
          />
          <polygon
            points="0,305 160,265 310,295 490,260 660,290 800,270 800,420 0,420"
            fill={PALETTE.moonSurface}
          />
          {/* Regolith foreground */}
          <rect x="0" y="305" width="800" height="115" fill="#777A88" />
          {/* Craters */}
          <ellipse cx="145" cy="355" rx="48" ry="12" fill="#5D606E" stroke="#9CA0B0" strokeWidth="1.5" />
          <ellipse cx="645" cy="365" rx="56" ry="14" fill="#5D606E" stroke="#9CA0B0" strokeWidth="1.5" />
          <ellipse cx="410" cy="382" rx="38" ry="9" fill="#5D606E" />
        </g>

        {/* ShieldDome Node (Translucent glow when choices.shieldOn is true) */}
        <g id="ShieldDome" opacity={choices.shieldOn ? 1 : 0.15}>
          <path
            d="M 155 335 A 245 195 0 0 1 645 335 Z"
            fill={choices.shieldOn ? 'url(#shield-glow)' : 'none'}
            stroke={PALETTE.shield}
            strokeWidth={choices.shieldOn ? '3' : '1'}
            strokeDasharray={choices.shieldOn ? 'none' : '6 6'}
          />
        </g>

        {/* Greenhouse Node (Level 2+ Hydroponic Dome) */}
        <g id="Greenhouse" transform="translate(215, 278)" opacity={level >= 2 ? 1 : 0.55}>
          <path
            d="M 0 50 A 48 42 0 0 1 96 50 Z"
            fill="rgba(53, 208, 230, 0.22)"
            stroke={PALETTE.oxygen}
            strokeWidth="2"
          />
          <rect x="-4" y="48" width="104" height="10" rx="3" fill="#474A57" />
          {/* Hydroponic crops inside */}
          <circle cx="28" cy="40" r="7" fill="#34D399" />
          <circle cx="48" cy="36" r="9" fill="#10B981" />
          <circle cx="68" cy="40" r="7" fill="#34D399" />
        </g>

        {/* Habitat Node (Central Outpost Module with glowing windows & battery bank) */}
        <g id="Habitat" transform="translate(330, 245)">
          {/* Main pressurized module */}
          <rect
            x="0"
            y="18"
            width="145"
            height="72"
            rx="12"
            fill="#D8DCE8"
            stroke="#2E3244"
            strokeWidth="3"
          />
          {/* Upper command cupola */}
          <path d="M 30 18 L 45 0 L 100 0 L 115 18 Z" fill="#B8C0D4" stroke="#2E3244" strokeWidth="2.5" />
          {/* Habitat windows (glow / dim based on power) */}
          <rect
            x="22"
            y="36"
            width="26"
            height="18"
            rx="3"
            fill={windowColor}
            opacity={windowOpacity}
          />
          <rect
            x="59"
            y="36"
            width="26"
            height="18"
            rx="3"
            fill={windowColor}
            opacity={windowOpacity}
          />
          <rect
            x="96"
            y="36"
            width="26"
            height="18"
            rx="3"
            fill={windowColor}
            opacity={windowOpacity}
          />
          {/* Airlock door */}
          <rect x="58" y="62" width="28" height="28" rx="4" fill="#474A57" stroke="#1C1F3A" strokeWidth="2" />
          {/* Battery Bank Indicator bar on side of Habitat */}
          <rect x="6" y="64" width="36" height="10" rx="2" fill="#1C1F3A" />
          <rect
            x="7"
            y="65"
            width={Math.max(2, Math.round(((gauges.power ?? 80) / 100) * 34))}
            height="8"
            rx="1"
            fill={PALETTE.power}
          />
          {/* Red alert beacon on roof */}
          <circle
            cx="72"
            cy="-4"
            r="5"
            fill={isFlare || isLowPower ? PALETTE.alert : '#64748B'}
          />
        </g>

        {/* SolarArray Node (Extends / Retracts based on choices.panelsOut) */}
        <g id="SolarArray" transform="translate(505, 262)">
          {/* Support mast & base */}
          <rect x="35" y="55" width="30" height="16" rx="3" fill="#474A57" />
          <rect x="47" y="25" width="6" height="32" fill="#CBD5E1" />
          {choices.panelsOut ? (
            <g>
              {/* Extended solar wings */}
              <rect
                x="-10"
                y="12"
                width="120"
                height="24"
                rx="2"
                fill="#1E3A8A"
                stroke={PALETTE.power}
                strokeWidth="2"
              />
              <line x1="20" y1="12" x2="20" y2="36" stroke="#60A5FA" strokeWidth="1" />
              <line x1="50" y1="12" x2="50" y2="36" stroke="#60A5FA" strokeWidth="1" />
              <line x1="80" y1="12" x2="80" y2="36" stroke="#60A5FA" strokeWidth="1" />
              <line x1="-10" y1="24" x2="110" y2="24" stroke="#60A5FA" strokeWidth="1" />
            </g>
          ) : (
            <g>
              {/* Retracted compact folded array */}
              <rect
                x="32"
                y="20"
                width="36"
                height="14"
                rx="2"
                fill="#334155"
                stroke="#94A3B8"
                strokeWidth="2"
              />
            </g>
          )}
        </g>

        {/* Antenna Node (High-Gain Dish for Earth Comms) */}
        <g id="Antenna" transform="translate(645, 248)">
          <line x1="20" y1="30" x2="10" y2="75" stroke="#CBD5E1" strokeWidth="4" />
          <line x1="20" y1="30" x2="30" y2="75" stroke="#CBD5E1" strokeWidth="4" />
          <path d="M 0 18 Q 22 42 42 14" fill="none" stroke="#FFF1C9" strokeWidth="4" />
          <circle cx="21" cy="14" r="4" fill={choices.queueComms ? PALETTE.oxygen : PALETTE.power} />
          {(choices.queueComms || level >= 3) && (
            <circle
              cx="21"
              cy="14"
              r="14"
              fill="none"
              stroke={PALETTE.oxygen}
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}
        </g>

        {/* Rover Node */}
        <g id="Rover" transform="translate(105, 302)">
          <rect x="8" y="8" width="44" height="16" rx="4" fill="#E2E8F0" stroke="#1C1F3A" strokeWidth="2" />
          <rect x="16" y="2" width="18" height="8" rx="2" fill={PALETTE.power} />
          <circle cx="16" cy="26" r="7" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
          <circle cx="30" cy="26" r="7" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
          <circle cx="44" cy="26" r="7" fill="#1E293B" stroke="#94A3B8" strokeWidth="2" />
        </g>

        {/* Pixel-Art Crew Billboards on Surface (Commander Nova + 4 Crew) */}
        <g id="CrewSprites" transform="translate(275, 318)">
          {crew.map((member, idx) => {
            const xOffset = idx * 62;
            const inShelter = member.mood === 'run-to-shelter';
            const suitColors = ['#FFB020', '#35D0E6', '#34D399', '#8E6CFF'];
            const suitColor = suitColors[idx % suitColors.length];

            return (
              <g
                key={member.id}
                transform={`translate(${xOffset}, ${inShelter ? -18 : 0})`}
                opacity={member.health > 0 ? 1 : 0.35}
              >
                {/* Shadow */}
                <ellipse cx="10" cy="28" rx="8" ry="3" fill="rgba(0,0,0,0.45)" />
                {/* Pixel Helmet */}
                <rect x="4" y="2" width="12" height="10" fill="#F8FAFC" stroke="#1C1F3A" strokeWidth="1.5" />
                <rect x="6" y="4" width="8" height="5" fill="#35D0E6" />
                {/* Pixel Suit Body */}
                <rect x="4" y="12" width="12" height="11" fill={suitColor} stroke="#1C1F3A" strokeWidth="1.5" />
                {/* Legs */}
                <rect x="5" y="23" width="4" height="5" fill="#CBD5E1" />
                <rect x="11" y="23" width="4" height="5" fill="#CBD5E1" />
              </g>
            );
          })}
        </g>

        {/* Dust Storm Particle Overlay */}
        {isDust && (
          <g fill={PALETTE.dust} opacity="0.45">
            <circle cx="120" cy="260" r="3" />
            <circle cx="280" cy="290" r="4" />
            <circle cx="450" cy="250" r="3.5" />
            <circle cx="610" cy="285" r="4" />
            <circle cx="520" cy="330" r="3" />
          </g>
        )}
      </svg>

      {/* Bottom Node Tag Bar (Matching DESIGN_DOC Section 7 Named Nodes) */}
      <div className="diorama-overlay-bottom">
        <div className="node-tag-list">
          <span className="node-tag active">Habitat</span>
          <span className={`node-tag ${choices.panelsOut ? 'active' : ''}`}>
            SolarArray: {choices.panelsOut ? 'EXTENDED' : 'RETRACTED'}
          </span>
          <span className={`node-tag ${choices.shieldOn ? 'active' : ''}`}>
            ShieldDome: {choices.shieldOn ? 'ON' : 'OFF'}
          </span>
          <span className={`node-tag ${level >= 2 ? 'active' : ''}`}>Greenhouse</span>
          <span className={`node-tag ${level >= 3 ? 'active' : ''}`}>Antenna</span>
          <span className="node-tag active">Rover</span>
          <span className="node-tag active">Terrain</span>
        </div>
      </div>
    </div>
  );
}

export function GameScreen({ SceneComponent = null }) {
  return (
    <div className="game-screen">
      <TopBar />

      <main className="game-main-grid" aria-label="Lunar Outpost Tactical Command Center">
        <div className="game-crew-col">
          <CrewPanel />
        </div>

        <div className="game-viewport-col">
          {SceneComponent ? <SceneComponent /> : <PlaceholderDiorama />}
        </div>

        <div className="game-forecast-col">
          <Forecast />
        </div>
      </main>

      <div className="game-bottom-bar">
        <Gauges />
        <Controls />
      </div>

      {/* Incoming Event Alert Modal & Sol 214 10-Second Hero Decision Modal */}
      <AlertModal />
      <Sol214Card />
    </div>
  );
}

export default GameScreen;
