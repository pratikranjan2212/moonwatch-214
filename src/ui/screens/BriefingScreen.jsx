import { COMMANDER, getLevelConfig, STARTER_CREW } from '../../engine/levels.js';
import useGameStore from '../../store/useGameStore.js';

export function BriefingScreen() {
  const game = useGameStore((s) => s.game);
  const setScreen = useGameStore((s) => s.setScreen);

  const levelNum = game?.level || 1;
  const levelConfig = getLevelConfig(levelNum);
  const briefing = levelConfig.briefing;

  return (
    <main className="screen-shell" aria-label="Mission Briefing Screen">
      <div className="screen-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <span className="nasa-badge">SHACKLETON RIM OUTPOST · MISSION BRIEFING</span>
            <h1
              style={{
                margin: '0.4rem 0 0 0',
                fontFamily: 'var(--font-display)',
                fontSize: '1.85rem',
                color: 'var(--sun-highlight)',
              }}
            >
              {briefing.headline}
            </h1>
          </div>

          <span className="forecast-sol-pill" style={{ fontSize: '0.9rem' }}>
            Seed #{game?.seed || 2142026} · {levelConfig.targetSols} Sols
          </span>
        </div>

        <p style={{ margin: 0, fontSize: '1.08rem', color: 'var(--text-primary)' }}>
          {briefing.summary}
        </p>

        {/* Objectives */}
        <section
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderLeft: '4px solid var(--power)',
            borderRadius: '8px',
            padding: '1rem 1.25rem',
          }}
          aria-label="Mission Objectives"
        >
          <div className="hud-section-title">
            <span>Primary Mission Objectives</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gap: '0.35rem' }}>
            {briefing.objectives.map((obj) => (
              <li key={obj} style={{ color: 'var(--text-primary)' }}>
                {obj}
              </li>
            ))}
          </ul>
        </section>

        {/* Commander & Crew Roster Introductions */}
        <section aria-label="Commander and Specialist Crew">
          <div className="hud-section-title">
            <span>Command & Specialist Crew Roster</span>
            <span>Keep Crew Health & Oxygen Above 0%</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {/* Commander Nova */}
            <div
              style={{
                padding: '0.85rem',
                borderRadius: '8px',
                background: 'rgba(255, 176, 32, 0.14)',
                border: '1px solid var(--power)',
              }}
            >
              <div style={{ fontWeight: 800, color: 'var(--sun-highlight)' }}>{COMMANDER.name}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--power)', fontWeight: 700 }}>
                {COMMANDER.role} · {COMMANDER.personality}
              </div>
              <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {COMMANDER.bio}
              </p>
            </div>

            {/* 4 Crew Specialists */}
            {STARTER_CREW.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '0.85rem',
                  borderRadius: '8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--oxygen)', fontWeight: 700 }}>
                  {c.role} · {c.personality}
                </div>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {c.bio}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Actions */}
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
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('title')}>
            ← Back to Title
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-cyan" onClick={() => setScreen('tutorial')}>
              ? Launch Tutorial
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setScreen('game')}
              style={{ fontSize: '1.1rem', padding: '0.75rem 1.5rem' }}
            >
              ⚡ Start Sol 1 →
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default BriefingScreen;
