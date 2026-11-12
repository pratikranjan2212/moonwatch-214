import { Fragment } from 'react';
import { buildDebrief } from '../../engine/debrief.js';
import useGameStore from '../../store/useGameStore.js';

export function DebriefScreen() {
  const game = useGameStore((s) => s.game);
  const storeDebrief = useGameStore((s) => s.debrief);
  const restart = useGameStore((s) => s.restart);
  const startLevel = useGameStore((s) => s.startLevel);
  const setScreen = useGameStore((s) => s.setScreen);

  const debrief = storeDebrief || buildDebrief(game);
  const isWon = debrief.outcome === 'won' || game?.status === 'won';
  const cards = Array.isArray(debrief.cards) ? debrief.cards : [];
  const stats = debrief.stats || {};
  const currentLevel = game?.level || stats.level || 1;
  const nextLevel = Math.min(3, currentLevel + 1);

  return (
    <main className="screen-shell" aria-label="Mission Debrief and Cause Chain Analysis">
      <div className="screen-container">
        {/* Outcome Banner */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span
              className={`severity-badge ${isWon ? 'severity-minor' : 'severity-extreme'}`}
              style={{ fontSize: '0.85rem', padding: '0.2rem 0.65rem' }}
            >
              {isWon ? '★ MISSION ACCOMPLISHED' : '⚠ OUTPOST OFFLINE — MISSION LEARNING'}
            </span>
            <h1
              style={{
                margin: '0.45rem 0 0.25rem 0',
                fontFamily: 'var(--font-display)',
                fontSize: '1.9rem',
                color: isWon ? '#34D399' : 'var(--sun-highlight)',
              }}
            >
              {debrief.headline}
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1rem' }}>
              {debrief.summary}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            <span className="forecast-sol-pill">
              Level {currentLevel} · Seed #{stats.seed ?? game?.seed}
            </span>
            <span className="forecast-sol-pill">
              Survived {stats.solsSurvived ?? 0} / {stats.targetSols ?? 14} Sols
            </span>
          </div>
        </div>

        {/* Summary Stats Row */}
        <section
          aria-label="Mission Summary Statistics"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div className="crew-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Final Power</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--power)', fontFamily: 'var(--font-mono)' }}>
              {Math.round(stats.finalPower ?? 0)}%
            </strong>
          </div>
          <div className="crew-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Final Oxygen</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--oxygen)', fontFamily: 'var(--font-mono)' }}>
              {Math.round(stats.finalOxygen ?? 0)}%
            </strong>
          </div>
          <div className="crew-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Final Shield</span>
            <strong style={{ fontSize: '1.35rem', color: 'var(--shield)', fontFamily: 'var(--font-mono)' }}>
              {Math.round(stats.finalShield ?? 0)}%
            </strong>
          </div>
          <div className="crew-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Crew Active</span>
            <strong style={{ fontSize: '1.35rem', color: '#34D399', fontFamily: 'var(--font-mono)' }}>
              {stats.survivingCrew ?? 4} / {stats.totalCrew ?? 4} ({stats.averageCrewHealth ?? 0}% HP)
            </strong>
          </div>
        </section>

        {/* 3-5 Linked Cause Chain Cards joined by arrows (→) */}
        <section aria-label="Mission Cause and Effect Chain">
          <div className="hud-section-title">
            <span>Cause & Effect Chain ({cards.length} Linked Steps)</span>
            <span style={{ color: 'var(--oxygen)' }}>{debrief.causeChainText}</span>
          </div>

          <div className="cause-chain-row">
            {cards.map((card, index) => {
              const effectText = card.effectText || card.effect || 'Impacted outpost systems';
              const tryThisTip = card.tryThisTip || card.tip || card.tryThisInstead;

              return (
                <Fragment key={card.id || `${card.cause}-${index}`}>
                  <article className="cause-card">
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.35rem',
                        }}
                      >
                        <span className="kbd-hint">Step {index + 1}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          Sol {card.sol}
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: '0 0 0.35rem 0',
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.05rem',
                          color: 'var(--sun-highlight)',
                        }}
                      >
                        {card.title}
                      </h3>

                      <p
                        style={{
                          margin: '0 0 0.55rem 0',
                          fontSize: '0.88rem',
                          color: 'var(--power)',
                          fontWeight: 600,
                        }}
                      >
                        {effectText}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.86rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <strong style={{ color: 'var(--oxygen)' }}>Science: </strong>
                        {card.scienceFact}
                      </p>
                    </div>

                    <div
                      style={{
                        marginTop: '0.45rem',
                        padding: '0.5rem 0.6rem',
                        borderRadius: '6px',
                        background: 'rgba(255, 176, 32, 0.12)',
                        border: '1px solid rgba(255, 176, 32, 0.35)',
                        fontSize: '0.82rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <strong style={{ color: 'var(--sun-highlight)' }}>Try this instead: </strong>
                      <span>{tryThisTip}</span>
                    </div>
                  </article>

                  {index < cards.length - 1 && (
                    <div className="cause-arrow" aria-hidden="true">
                      →
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </section>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setScreen('title')}
          >
            ← Title Screen
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => restart({ sameSeed: true })}
            >
              ↺ Try same seed
            </button>

            <button
              type="button"
              className="btn btn-cyan"
              onClick={() => restart({ sameSeed: false })}
            >
              🎲 Replay (new events)
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => startLevel(nextLevel)}
            >
              Next Level (Level {nextLevel}) →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default DebriefScreen;
