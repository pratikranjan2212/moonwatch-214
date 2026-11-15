import { useState } from 'react';
import useGameStore from '../../store/useGameStore.js';

const TUTORIAL_STEPS = [
  {
    step: 0,
    badge: 'STEP 1 OF 4 // WEATHER CARDS',
    title: 'Check Tomorrow’s Space Weather',
    summary:
      'Every Moon Day starts by peeking at the Space Weather Cards on the right side of your screen.',
    tip: 'Spot a Dark Moon Night early so you can charge your Battery past 75% first!',
  },
  {
    step: 1,
    badge: 'STEP 2 OF 4 // BASE METERS',
    title: 'Watch Battery, Fresh Air & Shield',
    summary:
      'Keep your 3 big base meters healthy and your 4 astronauts smiling! Tap each meter below to learn what it does:',
    tip: 'Every meter has its own shape and number—so it is always quick to read!',
  },
  {
    step: 2,
    badge: 'STEP 3 OF 4 // PRACTICE SWITCHES',
    title: 'Try Flipping Your Base Switches',
    summary:
      'A Sun Storm is heading toward the Moon! Flip these switches to protect your base before tapping Next Step:',
    tip: 'On Level 2 you also water Space Wheat plants for extra fresh air!',
  },
  {
    step: 3,
    badge: 'STEP 4 OF 4 // QUICK ALERT',
    title: 'Get Ready for Surprise Alerts!',
    summary:
      'On Day 7 of Level 1, a giant Sun Storm triggers a fast pop-up card. Practice making the safe call below:',
    tip: 'Ready, Commander Nova? Let’s launch to the Moon base!',
  },
];

const WEATHER_CARDS = [
  {
    id: 'sun',
    label: '☀️ SUNNY DAY',
    headline: 'Bright Sunlight',
    desc: 'Great time to leave your Solar Panels OUT so your Battery fills up fast!',
  },
  {
    id: 'storm',
    label: '⚡ SUN STORM',
    headline: 'Burst of Sun Energy',
    desc: 'Turn ON your Shield Bubble and tuck your Solar Panels inside so storms bounce away!',
  },
  {
    id: 'night',
    label: '🌙 DARK NIGHT',
    headline: '3 Dark Moon Days',
    desc: 'Sun Panels make 0 power in the dark! Your saved Battery keeps the lights and air going.',
  },
];

const METER_CARDS = [
  {
    id: 'power',
    label: '⚡ BATTERY POWER',
    color: 'var(--power)',
    percent: 82,
    whatItDoes: 'Runs your lights, Fresh Air machine, and Shield Bubble.',
    watchOut: 'If Battery reaches 0%, the Air Machine stops working!',
  },
  {
    id: 'oxygen',
    label: '💧 FRESH AIR',
    color: 'var(--oxygen)',
    percent: 95,
    whatItDoes: 'Gives Commander Nova and your 4 astronauts clean air to breathe.',
    watchOut: 'Keep Air above 40% so your crew stays strong and happy!',
  },
  {
    id: 'shield',
    label: '🛡️ SHIELD BUBBLE',
    color: 'var(--shield)',
    percent: 100,
    whatItDoes: 'Blocks most of a Sun Storm’s zap when you switch it ON.',
    watchOut: 'Leave it OFF on calm days to save Battery power!',
  },
];

export function TutorialScreen() {
  const tutorialStep = useGameStore((s) => s.ui?.tutorialStep) ?? 0;
  const nextTutorialStep = useGameStore((s) => s.nextTutorialStep);
  const setScreen = useGameStore((s) => s.setScreen);

  const [pickedWeather, setPickedWeather] = useState('sun');
  const [pickedMeter, setPickedMeter] = useState('power');
  const [practicePanelsOut, setPracticePanelsOut] = useState(true);
  const [practiceShieldOn, setPracticeShieldOn] = useState(false);
  const [practiceHighAir, setPracticeHighAir] = useState(false);
  const [alertChoice, setAlertChoice] = useState(null);

  const clampedIndex = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, tutorialStep));
  const current = TUTORIAL_STEPS[clampedIndex];

  const activeWeather =
    WEATHER_CARDS.find((w) => w.id === pickedWeather) || WEATHER_CARDS[0];
  const activeMeter = METER_CARDS.find((m) => m.id === pickedMeter) || METER_CARDS[0];
  const baseSafeForStorm = !practicePanelsOut && practiceShieldOn;

  return (
    <main className="screen-shell" aria-label="Interactive Junior Astronaut Tutorial">
      <div className="screen-container" style={{ maxWidth: '840px' }}>
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
                  background:
                    s.step === clampedIndex
                      ? 'var(--power)'
                      : s.step < clampedIndex
                        ? 'var(--oxygen)'
                        : 'rgba(255, 255, 255, 0.25)',
                }}
              />
            ))}
          </div>
        </div>

        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '2.4rem',
            lineHeight: 0.94,
            textTransform: 'uppercase',
            color: 'var(--power)',
          }}
        >
          {current.title}
        </h1>

        <p style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
          {current.summary}
        </p>

        {/* Interactive Step Content */}
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: '1rem 1.15rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          {clampedIndex === 0 && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {WEATHER_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setPickedWeather(card.id)}
                    aria-pressed={pickedWeather === card.id}
                    className={`btn btn-sm ${
                      pickedWeather === card.id ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    {card.label}
                  </button>
                ))}
              </div>
              <div
                style={{
                  border: '1px solid var(--power)',
                  background: 'rgba(255, 143, 85, 0.1)',
                  padding: '0.85rem 1rem',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--power)',
                    marginBottom: '0.25rem',
                    textTransform: 'uppercase',
                  }}
                >
                  {activeWeather.label} — {activeWeather.headline}
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)' }}>{activeWeather.desc}</p>
              </div>
            </>
          )}

          {clampedIndex === 1 && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: '0.55rem',
                }}
              >
                {METER_CARDS.map((m) => {
                  const selected = pickedMeter === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPickedMeter(m.id)}
                      aria-pressed={selected}
                      style={{
                        textAlign: 'left',
                        padding: '0.7rem',
                        cursor: 'pointer',
                        background: selected ? 'rgba(255, 255, 255, 0.08)' : '#050302',
                        border: `1px solid ${selected ? m.color : 'var(--border-subtle)'}`,
                        color: 'var(--text-primary)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          color: m.color,
                          marginBottom: '0.35rem',
                        }}
                      >
                        <span>{m.label}</span>
                        <span>{m.percent}%</span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          background: '#050302',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                        }}
                      >
                        <div style={{ width: `${m.percent}%`, height: '100%', background: m.color }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  border: `1px solid ${activeMeter.color}`,
                  padding: '0.85rem 1rem',
                  background: '#050302',
                }}
              >
                <div style={{ fontWeight: 700, color: activeMeter.color, marginBottom: '0.25rem' }}>
                  {activeMeter.label}
                </div>
                <p style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                  {activeMeter.whatItDoes}
                </p>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <strong>Watch out:</strong> {activeMeter.watchOut}
                </p>
              </div>
            </>
          )}

          {clampedIndex === 2 && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: '0.55rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPracticePanelsOut((prev) => !prev)}
                  className={`control-toggle-btn ${!practicePanelsOut ? 'active-power' : ''}`}
                >
                  <span className="control-top-line">
                    <span>☀️ SOLAR PANELS</span>
                    <span>[1]</span>
                  </span>
                  <span className="control-state-value">
                    {practicePanelsOut ? 'OUT (SUNLIGHT)' : 'TUCKED SAFE'}
                  </span>
                  <span className="control-cost-hint">
                    {practicePanelsOut ? 'Tap to tuck before storms!' : 'Safe from sun storms!'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPracticeShieldOn((prev) => !prev)}
                  className={`control-toggle-btn ${practiceShieldOn ? 'active-shield' : ''}`}
                >
                  <span className="control-top-line">
                    <span>🛡️ SHIELD BUBBLE</span>
                    <span>[2]</span>
                  </span>
                  <span className="control-state-value">{practiceShieldOn ? 'ON' : 'OFF'}</span>
                  <span className="control-cost-hint">
                    {practiceShieldOn ? 'Blocking storm energy!' : 'Tap to turn ON!'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setPracticeHighAir((prev) => !prev)}
                  className={`control-toggle-btn ${practiceHighAir ? 'active-oxygen' : ''}`}
                >
                  <span className="control-top-line">
                    <span>💧 FRESH AIR</span>
                    <span>[3]</span>
                  </span>
                  <span className="control-state-value">
                    {practiceHighAir ? 'SUPER' : 'NORMAL'}
                  </span>
                  <span className="control-cost-hint">Tap to test boost mode</span>
                </button>
              </div>

              <div
                style={{
                  padding: '0.7rem 0.9rem',
                  border: `1px solid ${baseSafeForStorm ? '#10b981' : 'var(--power)'}`,
                  background: baseSafeForStorm
                    ? 'rgba(16, 185, 129, 0.14)'
                    : 'rgba(255, 143, 85, 0.12)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                {baseSafeForStorm
                  ? '✓ BASE SAFE FOR SUN STORM! Solar Panels are tucked AND Shield Bubble is ON.'
                  : practicePanelsOut && !practiceShieldOn
                    ? '→ CHALLENGE: Tuck Solar Panels AND turn Shield Bubble ON to get storm-ready!'
                    : practicePanelsOut
                      ? '→ ALMOST! Your Shield is ON—now tap Solar Panels to tuck them inside!'
                      : '→ ALMOST! Your Panels are tucked—now tap Shield Bubble to turn protection ON!'}
              </div>
            </>
          )}

          {clampedIndex === 3 && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => setAlertChoice('safe')}
                  className={`btn ${alertChoice === 'safe' ? 'btn-primary' : 'btn-ghost'}`}
                >
                  🛡️ TUCK PANELS INSIDE (SAFE!)
                </button>
                <button
                  type="button"
                  onClick={() => setAlertChoice('risky')}
                  className={`btn ${alertChoice === 'risky' ? 'btn-danger' : 'btn-ghost'}`}
                >
                  ⚡ KEEP PANELS OUT (RISKY)
                </button>
              </div>

              <div
                style={{
                  padding: '0.75rem 0.9rem',
                  border: `1px solid ${
                    alertChoice === 'safe'
                      ? '#10b981'
                      : alertChoice === 'risky'
                        ? 'var(--alert)'
                        : 'var(--border-subtle)'
                  }`,
                  background: '#050302',
                }}
              >
                {alertChoice === 'safe' && (
                  <span style={{ color: '#6ee7b7' }}>
                    <strong>Smart choice!</strong> Tucking panels protects your Moon Base during the
                    big Day 7 Sun Storm so they keep working after the storm passes.
                  </span>
                )}
                {alertChoice === 'risky' && (
                  <span style={{ color: '#fecaca' }}>
                    <strong>Careful!</strong> Leaving panels outside during a huge storm can zap and
                    break them! Try clicking Tuck Panels Inside instead.
                  </span>
                )}
                {!alertChoice && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Pick one of the two choices above to see what happens during a giant Sun Storm!
                  </span>
                )}
              </div>
            </>
          )}

          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: 'rgba(53, 208, 230, 0.12)',
              borderLeft: '3px solid var(--oxygen)',
              fontSize: '0.94rem',
            }}
          >
            <strong style={{ color: 'var(--oxygen)' }}>Commander Nova’s Tip: </strong>
            <span>{current.tip}</span>
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
            style={{ minWidth: '205px' }}
          >
            {clampedIndex < TUTORIAL_STEPS.length - 1
              ? `Next Step (${clampedIndex + 2}/4) →`
              : 'Finish Tutorial & Play! →'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default TutorialScreen;
