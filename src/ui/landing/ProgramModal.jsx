import { useEffect, useState } from 'react';
import { COMMANDER, LEVEL_LIST, STARTER_CREW } from '../../engine/levels.js';
import { CloseIcon, PixelChevron } from './Icons.jsx';

const HOW_TO_PLAY_STEPS = [
  {
    id: 0,
    badge: 'RULE 1 // LOOK AHEAD',
    shortTitle: 'Check Tomorrow’s Sky',
    title: 'Peek at the Space Weather Cards',
    detail:
      'Before starting each Moon Day, look at the Weather Cards on the right. They tell you if tomorrow brings bright sunlight, a zapping Sun Storm, or Dark Moon Nights.',
    tip: 'If a Dark Night or Sun Storm is coming tomorrow, get your base ready today!',
  },
  {
    id: 1,
    badge: 'RULE 2 // WALK & OPERATE',
    shortTitle: 'Walk Up & Flip Switches',
    title: 'Explore in Orbit, TPP, or FPP & Operate Stations',
    detail:
      'Press [V] to pick Orbit, Third-Person (TPP), or First-Person (FPP) view. Move around your Moon Base with WASD, move your mouse to look around, walk up close to Solar Panels, Shield Bubble, or Air Tanks, and press [E] (or click!) to flip them.',
    tip: 'Your Air Maker keeps everyone breathing nicely all day and all night.',
  },
  {
    id: 2,
    badge: 'RULE 3 // KEEP CREW SAFE',
    shortTitle: 'Reach the Last Day',
    title: 'Keep Battery, Air & Crew Above 0%',
    detail:
      'Click "Advance to Next Day" when your switches look good. Keep your 4 astronauts healthy through every Moon Day and Night to win your mission badge!',
    tip: 'Make sure your Battery has lots of energy saved before a 3-day Dark Night!',
  },
];

const KID_LEVEL_CARDS = {
  1: {
    name: 'Power Basics',
    subtitle: 'Catch sunlight, save Battery power for Dark Nights, and block a big Sun Storm!',
    tags: ['Sun Panels', 'Battery Saver', 'Dark Nights'],
  },
  2: {
    name: 'Space Greenhouse',
    subtitle: 'Grow space wheat with Botanist Soli to make extra fresh air for your astronauts!',
    tags: ['Plant Room', 'Fresh Air', 'Crew Health'],
  },
  3: {
    name: 'Radio to Earth',
    subtitle: 'Send messages home to Earth even when Sun static slows space radio signals down!',
    tags: ['Radio Dish', 'Plan Ahead', 'Master Level'],
  },
};

const MODAL_TABS = [
  { id: 'how-to-play', label: '01 / HOW TO PLAY' },
  { id: 'start-game', label: '02 / START GAME' },
  { id: 'credits', label: '03 / CREDITS' },
];

/**
 * Editorial mission modal connecting the welcome landing hero to a
 * kid-friendly interactive How to Play sandbox, clean campaign picker,
 * interactive tutorial link, and simple NASA mission story.
 */
export default function ProgramModal({
  activeTab,
  onClose,
  onSwitchTab,
  selectedLevel,
  onSelectLevel,
  onStartMission,
  onStartTutorial,
  feedLabel,
  feedSubdetail,
}) {
  const [selectedRule, setSelectedRule] = useState(0);
  const [practicePanelsOut, setPracticePanelsOut] = useState(true);
  const [practiceShieldOn, setPracticeShieldOn] = useState(false);
  const [practiceHighAir, setPracticeHighAir] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState({
    tone: 'neutral',
    text: 'Try flipping a switch below, then tap "Test a Sun Storm" to see how your base reacts!',
  });

  useEffect(() => {
    if (!activeTab) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, onClose]);

  if (!activeTab) return null;

  const activeLevelConfig =
    LEVEL_LIST.find((lvl) => lvl.level === selectedLevel) || LEVEL_LIST[0];
  const currentRule = HOW_TO_PLAY_STEPS[selectedRule] || HOW_TO_PLAY_STEPS[0];

  const practicePower = Math.max(
    15,
    Math.min(100, 65 + (practicePanelsOut ? 25 : -10) - (practiceShieldOn ? 20 : 0) - (practiceHighAir ? 10 : 0))
  );
  const practiceAir = practiceHighAir ? 100 : 80;
  const practiceSafety = practiceShieldOn ? 100 : practicePanelsOut ? 45 : 70;

  const handleTogglePanels = () => {
    const next = !practicePanelsOut;
    setPracticePanelsOut(next);
    setPracticeFeedback({
      tone: 'neutral',
      text: next
        ? 'Sun Panels OUT: You catch plenty of sunlight to charge the battery, but storms can zap exposed panels!'
        : 'Sun Panels TUCKED: Safe inside the base! Storms cannot hurt them now.',
    });
  };

  const handleToggleShield = () => {
    const next = !practiceShieldOn;
    setPracticeShieldOn(next);
    setPracticeFeedback({
      tone: 'neutral',
      text: next
        ? 'Shield Bubble ON: Your base is wrapped in protection! Keep an eye on Battery power while it runs.'
        : 'Shield Bubble OFF: Saves Battery power on calm sunny days, but leaves the base open during storms.',
    });
  };

  const handleToggleAir = () => {
    const next = !practiceHighAir;
    setPracticeHighAir(next);
    setPracticeFeedback({
      tone: 'neutral',
      text: next
        ? 'Fresh Air SUPER: Extra crisp air boosts crew comfort using a little extra Battery!'
        : 'Fresh Air NORMAL: Steady clean air for all astronauts while saving Battery.',
    });
  };

  const handleTestSunStorm = () => {
    if (practiceShieldOn && !practicePanelsOut) {
      setPracticeFeedback({
        tone: 'good',
        text: 'AWESOME MOVE! Your Shield Bubble bounced the Sun Storm away and your tucked panels stayed 100% safe!',
      });
    } else if (!practiceShieldOn && practicePanelsOut) {
      setPracticeFeedback({
        tone: 'warn',
        text: 'WHOOPS! Both your Shield was OFF and your Sun Panels were OUT! Try turning Shield ON and tucking Panels first.',
      });
    } else if (!practiceShieldOn) {
      setPracticeFeedback({
        tone: 'warn',
        text: 'CLOSE! Your panels were safely tucked, but turn your Shield Bubble ON to protect your crew!',
      });
    } else {
      setPracticeFeedback({
        tone: 'warn',
        text: 'ALMOST! Your Shield helped, but Sun Storms can damage panels left outside—tuck Sun Panels inside too!',
      });
    }
  };

  const handleTestDarkNight = () => {
    if (practicePower >= 60) {
      setPracticeFeedback({
        tone: 'good',
        text: 'NICE JOB! Your Battery is charged up, so lights and fresh air stay cozy all through the Dark Night!',
      });
    } else {
      setPracticeFeedback({
        tone: 'warn',
        text: 'BATTERY LOW! In the dark, Sun Panels make 0 power. Turn OFF Shield or extend Panels in daylight to save energy!',
      });
    }
  };

  return (
    <div
      className="mw-landing-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="MOONWATCH Junior Astronaut Guide"
      onClick={onClose}
    >
      <div className="mw-landing-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="mw-modal-header">
          <div className="mw-modal-header-left">
            <span className="mw-modal-dot" />
            <span className="mw-modal-title-tag">
              MOONWATCH // NASA SPACE APPS CHALLENGE 2026
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="mw-modal-close"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="mw-modal-tabs" role="tablist" aria-label="Welcome Console Tabs">
          {MODAL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onSwitchTab(tab.id)}
              className={`mw-modal-tab ${
                activeTab === tab.id ? 'mw-modal-tab--active' : ''
              }`.trim()}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mw-modal-body">
          {activeTab === 'how-to-play' && (
            <div className="mw-modal-section">
              <div className="mw-modal-heading-row">
                <h3 className="mw-modal-h3">HOW TO PLAY</h3>
                <span className="mw-modal-kicker">JUNIOR COMMANDER GUIDE (AGES 7–12)</span>
              </div>

              <div className="mw-kid-step-pills" role="tablist" aria-label="How to Play Steps">
                {HOW_TO_PLAY_STEPS.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    aria-selected={selectedRule === step.id}
                    onClick={() => setSelectedRule(step.id)}
                    className={`mw-kid-step-pill ${
                      selectedRule === step.id ? 'mw-kid-step-pill--active' : ''
                    }`.trim()}
                  >
                    <span className="mw-kid-step-num">{step.badge}</span>
                    <span className="mw-kid-step-heading">{step.shortTitle}</span>
                  </button>
                ))}
              </div>

              <div className="mw-kid-spotlight">
                <div className="mw-step-label">{currentRule.badge}</div>
                <h4 className="mw-step-title">{currentRule.title}</h4>
                <p className="mw-step-detail">{currentRule.detail}</p>
                <p
                  className="mw-step-detail"
                  style={{ marginTop: '0.45rem', fontWeight: 700, color: '#c2571a' }}
                >
                  Tip: {currentRule.tip}
                </p>
              </div>

              <div className="mw-kid-practice-box" aria-label="Interactive Practice Controls">
                <div className="mw-practice-header">
                  <span className="mw-practice-title">TRY YOUR BASE SWITCHES!</span>
                  <span className="mw-practice-sub">Click switches to see what happens</span>
                </div>

                <div className="mw-practice-meters">
                  <div className="mw-practice-meter">
                    <div className="mw-practice-meter-top">
                      <span>⚡ BATTERY</span>
                      <span>{practicePower}%</span>
                    </div>
                    <div className="mw-practice-track">
                      <div
                        className="mw-practice-fill"
                        style={{ width: `${practicePower}%`, background: '#ff8f55' }}
                      />
                    </div>
                  </div>
                  <div className="mw-practice-meter">
                    <div className="mw-practice-meter-top">
                      <span>💧 FRESH AIR</span>
                      <span>{practiceAir}%</span>
                    </div>
                    <div className="mw-practice-track">
                      <div
                        className="mw-practice-fill"
                        style={{ width: `${practiceAir}%`, background: '#35d0e6' }}
                      />
                    </div>
                  </div>
                  <div className="mw-practice-meter">
                    <div className="mw-practice-meter-top">
                      <span>🛡️ STORM SAFETY</span>
                      <span>{practiceSafety}%</span>
                    </div>
                    <div className="mw-practice-track">
                      <div
                        className="mw-practice-fill"
                        style={{
                          width: `${practiceSafety}%`,
                          background: practiceSafety >= 85 ? '#10b981' : '#8e6cff',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mw-practice-switches">
                  <button
                    type="button"
                    onClick={handleTogglePanels}
                    aria-pressed={practicePanelsOut}
                    className={`mw-practice-switch ${
                      practicePanelsOut ? 'mw-practice-switch--on' : ''
                    }`.trim()}
                  >
                    <span className="mw-practice-switch-kicker">SUN PANELS</span>
                    <span className="mw-practice-switch-state">
                      {practicePanelsOut ? 'OUT (SUNLIGHT)' : 'TUCKED (SAFE)'}
                    </span>
                    <span className="mw-practice-switch-hint">
                      {practicePanelsOut ? '+Battery power' : 'Safe from storms'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleShield}
                    aria-pressed={practiceShieldOn}
                    className={`mw-practice-switch ${
                      practiceShieldOn ? 'mw-practice-switch--on' : ''
                    }`.trim()}
                  >
                    <span className="mw-practice-switch-kicker">SHIELD BUBBLE</span>
                    <span className="mw-practice-switch-state">
                      {practiceShieldOn ? 'ON (PROTECTED)' : 'OFF'}
                    </span>
                    <span className="mw-practice-switch-hint">
                      {practiceShieldOn ? 'Blocks sun storms' : 'Saves battery power'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleAir}
                    aria-pressed={practiceHighAir}
                    className={`mw-practice-switch ${
                      practiceHighAir ? 'mw-practice-switch--on' : ''
                    }`.trim()}
                  >
                    <span className="mw-practice-switch-kicker">FRESH AIR</span>
                    <span className="mw-practice-switch-state">
                      {practiceHighAir ? 'SUPER BOOST' : 'NORMAL'}
                    </span>
                    <span className="mw-practice-switch-hint">
                      {practiceHighAir ? '100% air fast' : 'Balanced power'}
                    </span>
                  </button>
                </div>

                <div className="mw-practice-test-row">
                  <button
                    type="button"
                    onClick={handleTestSunStorm}
                    className="mw-btn-secondary"
                  >
                    ⚡ TEST A SUN STORM!
                  </button>
                  <button
                    type="button"
                    onClick={handleTestDarkNight}
                    className="mw-btn-secondary"
                  >
                    🌙 TEST A DARK NIGHT!
                  </button>
                </div>

                <div
                  className={`mw-practice-feedback ${
                    practiceFeedback.tone === 'good'
                      ? 'mw-practice-feedback--good'
                      : practiceFeedback.tone === 'warn'
                        ? 'mw-practice-feedback--warn'
                        : ''
                  }`.trim()}
                  role="status"
                >
                  {practiceFeedback.text}
                </div>
              </div>

              <div className="mw-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartTutorial();
                  }}
                  className="mw-btn-secondary"
                >
                  PRACTICE FULL TUTORIAL
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchTab('start-game')}
                  className="mw-btn-primary"
                >
                  PICK A LEVEL
                  <PixelChevron />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'start-game' && (
            <div className="mw-modal-section">
              <div className="mw-modal-heading-row">
                <h3 className="mw-modal-h3">CHOOSE YOUR ADVENTURE</h3>
                <span className="mw-modal-kicker">
                  {LEVEL_LIST.length} LEVELS &bull; {activeLevelConfig.targetSols} MOON DAYS
                </span>
              </div>

              <div className="mw-mode-grid">
                {LEVEL_LIST.map((lvl) => {
                  const active = selectedLevel === lvl.level;
                  const copy = KID_LEVEL_CARDS[lvl.level] || {
                    name: lvl.name,
                    subtitle: lvl.subtitle,
                    tags: lvl.introduces,
                  };
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => onSelectLevel(lvl.level)}
                      aria-pressed={active}
                      className={`mw-mode-card ${active ? 'mw-mode-card--active' : ''}`.trim()}
                    >
                      <div>
                        <div className="mw-mode-badge">
                          LEVEL 0{lvl.level} &bull; {lvl.targetSols} MOON DAYS
                        </div>
                        <div className="mw-mode-name">{copy.name}</div>
                      </div>

                      <p className="mw-mode-subtitle">{copy.subtitle}</p>

                      <div className="mw-mode-tags">
                        {copy.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="mw-mode-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mw-modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartTutorial();
                  }}
                  className="mw-btn-secondary"
                >
                  ? TUTORIAL
                </button>
                <button type="button" onClick={onStartMission} className="mw-btn-primary">
                  PLAY LEVEL {activeLevelConfig.level}:{' '}
                  {(KID_LEVEL_CARDS[activeLevelConfig.level] || activeLevelConfig).name}
                  <PixelChevron />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="mw-modal-section">
              <div className="mw-modal-heading-row">
                <h3 className="mw-modal-h3">ABOUT MOONWATCH</h3>
                <span className="mw-modal-kicker">{feedLabel}</span>
              </div>

              <div className="mw-step-list">
                <div className="mw-step-card">
                  <div className="mw-step-label">01 // REAL SPACE WEATHER</div>
                  <h4 className="mw-step-title">Powered by NASA Sun Weather Reports</h4>
                  <p className="mw-step-detail">
                    The sun storms in MOONWATCH are inspired by real bursts of light and energy spotted
                    by NASA space telescopes! Status: {feedSubdetail}
                  </p>
                </div>

                <div className="mw-step-card">
                  <div className="mw-step-label">02 // YOUR MOON CREW</div>
                  <h4 className="mw-step-title">{COMMANDER.name} &amp; Friends</h4>
                  <p className="mw-step-detail">
                    {STARTER_CREW.map((c) => `${c.name} (${c.role})`).join(' • ')}
                  </p>
                </div>

                <div className="mw-step-card">
                  <div className="mw-step-label">03 // BUILT FOR YOUNG EXPLORERS</div>
                  <h4 className="mw-step-title">NASA Space Apps Challenge 2026</h4>
                  <p className="mw-step-detail">
                    Designed for junior astronauts ages 7–12 with clear icons, big keyboard shortcuts,
                    and fun Moon-base teamwork.
                  </p>
                </div>
              </div>

              <div className="mw-modal-actions">
                <button
                  type="button"
                  onClick={() => onSwitchTab('start-game')}
                  className="mw-btn-primary"
                >
                  CHOOSE A LEVEL
                  <PixelChevron />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
