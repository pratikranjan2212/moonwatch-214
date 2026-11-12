import useGameStore from '../../store/useGameStore.js';

const TUTORIAL_STEPS = [
  {
    step: 0,
    title: 'Step 1 of 4: Read the Space Weather Forecast',
    badge: 'FORECAST PANEL (RIGHT HUD)',
    summary:
      'Every Sol begins by checking the 4-Sol Space Weather Forecast on the right side of your HUD.',
    details: [
      'Real solar flares (FLR) and coronal mass ejections (CME) from NASA DONKI appear with a lead-time warning.',
      'Lunar Night arrives every 4 Sols and lasts for 3 dark Sols where solar panels generate 0 power.',
      'Each event card includes a kid-friendly science fact explaining how space weather works!',
    ],
    proTip: 'Look ahead! Charge your battery above 75% before a 3-Sol Lunar Night begins.',
  },
  {
    step: 1,
    title: 'Step 2 of 4: Monitor Power, Oxygen & Shield Gauges',
    badge: 'TELEMETRY GAUGES (BOTTOM LEFT)',
    summary:
      'Your outpost has 3 big gauges (0–100%) plus individual health bars for your 4 crew specialists.',
    details: [
      'Power (#FFB020, Bolt icon): Charges during daytime when panels are out; drains during night and when shields run.',
      'Oxygen (#35D0E6, Droplet icon): Keeps the crew breathing. If Battery hits 0%, the oxygen generator shuts down!',
      'Shield (#8E6CFF, Dome icon): Absorbs 80% of solar flare and CME radiation when turned ON.',
    ],
    proTip: 'Every gauge uses distinct icons, numbers, and patterns—not just colour!',
  },
  {
    step: 2,
    title: 'Step 3 of 4: Allocate Power & Toggles Each Sol',
    badge: 'COMMAND CONTROLS (BOTTOM RIGHT)',
    summary:
      'Every Sol is a trade-off. Toggle your outpost systems using mouse clicks or keyboard shortcuts:',
    details: [
      '[1] or [P] — Solar Panels: EXTENDED (+18 Power/Sol in daylight, vulnerable to flares/dust) vs RETRACTED (0 Power, safe).',
      '[2] or [S] — Shield Dome: ON (-6 Power/Sol, blocks 80% of flare damage) vs OFF (saves power).',
      '[3] or [O] — Oxygen Level: Cycle LOW (saves power, hurts crew), NORMAL, or HIGH (+7 O₂/Sol, costs +3 power).',
    ],
    proTip: 'In Level 2 you also water the Greenhouse; in Level 3 you queue delayed Earth Comms!',
  },
  {
    step: 3,
    title: 'Step 4 of 4: Advance to Next Sol & Survive Sol 214',
    badge: 'NEXT SOL & SOL 214 HERO CHOICE',
    summary:
      'Once your power allocation is set, press Next Sol ([Space] or [Enter]) to resolve the day.',
    details: [
      'On Mission Sol 214 (Sol 7 of Level 1), a real X3.9 Super-Flare triggers a 10-second live decision!',
      'Retracting panels protects the solar array; leaving them out risks a massive geomagnetic surge.',
      'At the end of every run, the Debrief screen links the exact Cause Chain of what happened so you can learn and replay.',
    ],
    proTip: 'Ready, Commander Nova? Launch into the lunar outpost now!',
  },
];

export function TutorialScreen() {
  const tutorialStep = useGameStore((s) => s.ui?.tutorialStep) ?? 0;
  const nextTutorialStep = useGameStore((s) => s.nextTutorialStep);
  const setScreen = useGameStore((s) => s.setScreen);

  const clampedIndex = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, tutorialStep));
  const current = TUTORIAL_STEPS[clampedIndex];

  return (
    <main className="screen-shell" aria-label="Interactive Mission Tutorial">
      <div className="screen-container" style={{ maxWidth: '820px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span className="nasa-badge">{current.badge}</span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {TUTORIAL_STEPS.map((s) => (
              <span
                key={s.step}
                style={{
                  width: '32px',
                  height: '8px',
                  borderRadius: '999px',
                  background:
                    s.step === clampedIndex
                      ? 'var(--power)'
                      : s.step < clampedIndex
                        ? 'var(--oxygen)'
                        : 'rgba(138, 141, 153, 0.35)',
                }}
              />
            ))}
          </div>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            color: 'var(--sun-highlight)',
          }}
        >
          {current.title}
        </h1>

        <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
          {current.summary}
        </p>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <ul style={{ margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.5rem' }}>
            {current.details.map((line) => (
              <li key={line} style={{ color: 'var(--text-primary)' }}>
                {line}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: '0.4rem',
              padding: '0.65rem 0.85rem',
              borderRadius: '6px',
              background: 'rgba(53, 208, 230, 0.14)',
              borderLeft: '3px solid var(--oxygen)',
              fontSize: '0.95rem',
            }}
          >
            <strong style={{ color: 'var(--oxygen)' }}>Commander Tip: </strong>
            <span>{current.proTip}</span>
          </div>
        </div>

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
            onClick={() => setScreen('game')}
          >
            Skip Tutorial → Play Now
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => nextTutorialStep()}
            style={{ minWidth: '190px' }}
          >
            {clampedIndex < TUTORIAL_STEPS.length - 1
              ? `Next Step (${clampedIndex + 2}/4) →`
              : 'Finish Tutorial & Start Game →'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default TutorialScreen;
