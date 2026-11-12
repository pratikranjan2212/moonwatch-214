import { COMMANDER, STARTER_CREW } from '../../engine/levels.js';
import useGameStore from '../../store/useGameStore.js';
import { MOOD_META } from '../tokens.js';

const PORTRAIT_COLORS = {
  commander: { suit: '#FFB020', visor: '#35D0E6', hair: '#FFF1C9', skin: '#F4C7A1' },
  engineer: { suit: '#FFB020', visor: '#8A8D99', hair: '#8D5524', skin: '#E0AC69' },
  doctor: { suit: '#35D0E6', visor: '#FFF1C9', hair: '#1C1F3A', skin: '#F9D5B8' },
  botanist: { suit: '#34D399', visor: '#FFB020', hair: '#3B2219', skin: '#C68642' },
  pilot: { suit: '#8E6CFF', visor: '#FF4D4D', hair: '#D97706', skin: '#F1C27D' },
};

function PixelPortrait({ roleKey = 'engineer', mood = 'idle' }) {
  const palette = PORTRAIT_COLORS[roleKey] || PORTRAIT_COLORS.engineer;

  // Dynamic pixel mouth & eyes based on mood
  const isWorried = mood === 'worried';
  const isShelter = mood === 'run-to-shelter';
  const isCheer = mood === 'cheer';
  const isExhausted = mood === 'exhausted';

  return (
    <svg
      width="42"
      height="42"
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {/* Deep space backdrop */}
      <rect width="16" height="16" fill="#1C1F3A" />
      {/* Helmet rim */}
      <rect x="3" y="2" width="10" height="10" fill="#8A8D99" />
      <rect x="4" y="3" width="8" height="8" fill={palette.skin} />
      {/* Hair / Cap */}
      <rect x="4" y="3" width="8" height="2" fill={palette.hair} />
      {/* Eyes */}
      {isExhausted ? (
        <>
          <rect x="5" y="6" width="2" height="1" fill="#1C1F3A" />
          <rect x="9" y="6" width="2" height="1" fill="#1C1F3A" />
        </>
      ) : (
        <>
          <rect x="5" y="6" width="1" height="2" fill="#1C1F3A" />
          <rect x="10" y="6" width="1" height="2" fill="#1C1F3A" />
        </>
      )}
      {/* Mouth expression */}
      {isCheer && <rect x="6" y="9" width="4" height="1" fill="#34D399" />}
      {(isWorried || isShelter) && <rect x="7" y="9" width="2" height="2" fill="#FF4D4D" />}
      {!isCheer && !isWorried && !isShelter && (
        <rect x="6" y="9" width="4" height="1" fill="#1C1F3A" />
      )}
      {/* Suit shoulders */}
      <rect x="2" y="12" width="12" height="4" fill={palette.suit} />
      <rect x="6" y="13" width="4" height="2" fill={palette.visor} />
      {/* Alert beacon on helmet during shelter mood */}
      {isShelter && <rect x="7" y="0" width="2" height="2" fill="#FF4D4D" />}
    </svg>
  );
}

export function CrewPanel() {
  const commander = useGameStore((s) => s.game?.commander) || COMMANDER;
  const crew = useGameStore((s) => s.game?.crew) || STARTER_CREW;

  return (
    <aside className="hud-panel crew-panel" aria-label="Commander and Crew Status">
      <div className="hud-section-title">
        <span>Outpost Crew</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {crew.filter((c) => c.health > 0).length}/{crew.length} Active
        </span>
      </div>

      {/* Commander Nova Badge */}
      <div className="commander-card">
        <div className="crew-portrait-wrap" style={{ borderColor: 'var(--power)' }}>
          <PixelPortrait roleKey="commander" mood="idle" />
        </div>
        <div className="commander-info">
          <div className="commander-name">{commander.name}</div>
          <div className="commander-role">
            {commander.role} · {commander.personality}
          </div>
        </div>
      </div>

      {/* 4 Specialist Crew Cards */}
      <div className="crew-list">
        {crew.map((member) => {
          const hp = Math.max(0, Math.min(100, Math.round(member.health ?? 100)));
          const moodKey = member.mood || 'idle';
          const moodInfo = MOOD_META[moodKey] || MOOD_META.idle;
          const barColor =
            hp <= 25 ? 'var(--alert)' : hp <= 55 ? 'var(--power)' : 'var(--status-optimal)';

          return (
            <div
              key={member.id}
              className={`crew-card ${hp <= 25 ? 'crew-critical' : ''}`}
              role="group"
              aria-label={`${member.name}, ${member.role}, Health ${hp}%, Mood ${moodInfo.label}`}
            >
              <div className="crew-portrait-wrap">
                <PixelPortrait roleKey={member.id} mood={moodKey} />
              </div>

              <div>
                <div className="crew-header-row">
                  <div>
                    <div className="crew-name">{member.name}</div>
                    <div className="crew-role-tag">{member.role}</div>
                  </div>
                  <span className={`mood-badge ${moodInfo.badgeClass}`} title={moodInfo.description}>
                    <span aria-hidden="true">{moodInfo.icon}</span>
                    <span>{moodInfo.label}</span>
                  </span>
                </div>

                <div className="crew-health-row">
                  <div
                    className="crew-health-track"
                    role="progressbar"
                    aria-valuenow={hp}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="crew-health-fill"
                      style={{ width: `${hp}%`, backgroundColor: barColor }}
                    />
                  </div>
                  <span className="crew-health-num" style={{ color: barColor }}>
                    {hp}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default CrewPanel;
