import { getFactSheet, getForecast, normalizeEventType } from '../../engine/events.js';
import useGameStore from '../../store/useGameStore.js';
import { PALETTE } from '../tokens.js';

function EventIcon({ type }) {
  const canonical = normalizeEventType(type);

  if (canonical === 'flare' || canonical === 'sol214') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill={PALETTE.alert} />
        <path
          d="M12 2v4M12 18v4M2 12h4M18 12h4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M19.1 4.9l-2.8 2.8M7.7 16.3l-2.8 2.8"
          stroke={PALETTE.sunHighlight}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (canonical === 'cme') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 12c3-6 9-6 12 0s9 6 6-3"
          fill="none"
          stroke={PALETTE.shield}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <circle cx="8" cy="12" r="3" fill={PALETTE.power} />
      </svg>
    );
  }
  if (canonical === 'dust') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 9h13a2 2 0 1 0-2-2M2 14h16a2 2 0 1 1-2 2M5 19h10"
          fill="none"
          stroke={PALETTE.dust}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (canonical === 'night') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
          fill={PALETTE.oxygen}
          stroke={PALETTE.sunHighlight}
          strokeWidth="1.4"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 18l6-6M14 4a6 6 0 0 1 6 6M11 7a3 3 0 0 1 3 3"
        fill="none"
        stroke={PALETTE.sunHighlight}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="6" cy="16" r="2" fill={PALETTE.oxygen} />
    </svg>
  );
}

export function Forecast() {
  const timeline = useGameStore((s) => s.game?.timeline) || [];
  const currentSol = useGameStore((s) => s.game?.sol) || 1;
  const targetSols = useGameStore((s) => s.game?.targetSols) || 14;

  const upcoming = getForecast(timeline, currentSol, 4);

  return (
    <aside className="hud-panel forecast-panel" aria-label="Space Weather Forecast (Next 4 Sols)">
      <div className="hud-section-title">
        <span>Space Weather Forecast</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Sols {currentSol}–{Math.min(targetSols, currentSol + 4)}
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div
          className="forecast-card"
          style={{ borderLeftColor: '#34D399', alignItems: 'flex-start' }}
        >
          <div className="forecast-title-wrap">
            <span style={{ color: '#34D399' }}>●</span>
            <span>Clear Lunar Skies</span>
          </div>
          <p className="forecast-fact">
            No solar flares, CMEs, or lunar night windows detected in the immediate 4-Sol telemetry
            window. Ideal conditions to extend solar panels and recharge the battery bank!
          </p>
        </div>
      ) : (
        <div className="forecast-list">
          {upcoming.slice(0, 5).map((evt) => {
            const canonical = normalizeEventType(evt.type || evt.code);
            const solsUntil = Math.max(0, (evt.sol || currentSol) - currentSol);
            const offsetLabel =
              solsUntil === 0
                ? `ACTIVE NOW (Sol ${evt.sol})`
                : solsUntil === 1
                  ? `In 1 Sol (Sol ${evt.sol})`
                  : `In ${solsUntil} Sols (Sol ${evt.sol})`;

            const isRealNasa =
              Boolean(evt.isRealNasaEvent) ||
              (typeof evt.source === 'string' && evt.source.includes('NASA DONKI'));

            const sheet = evt.factSheet || getFactSheet(canonical);
            const oneLineFact = evt.factText || sheet?.oneLineFact;
            const severity = evt.severity || 'normal';

            return (
              <article
                key={evt.id || `${canonical}-${evt.sol}`}
                className={`forecast-card type-${canonical}`}
              >
                <div className="forecast-card-top">
                  <div className="forecast-title-wrap">
                    <EventIcon type={canonical} />
                    <span>{evt.title || canonical.toUpperCase()}</span>
                  </div>
                  <span className="forecast-sol-pill">{offsetLabel}</span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span className={`severity-badge severity-${severity}`}>
                    {severity.toUpperCase()}
                  </span>

                  {isRealNasa && (
                    <span className="nasa-badge" title={`Source: ${evt.source || 'NASA DONKI'}`}>
                      <span>★ Real NASA event</span>
                      {evt.date && <span>· {evt.date}</span>}
                    </span>
                  )}

                  {evt.activeRegion && (
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {evt.activeRegion}
                    </span>
                  )}
                </div>

                {oneLineFact && (
                  <p className="forecast-fact" title={sheet?.howAstronautsRespond || ''}>
                    <strong>Science Fact:</strong> {oneLineFact}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}

export default Forecast;
