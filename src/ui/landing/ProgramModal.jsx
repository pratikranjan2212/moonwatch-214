import { useEffect } from 'react';
import { COMMANDER, LEVEL_LIST, STARTER_CREW } from '../../engine/levels.js';
import { CloseIcon, PixelChevron } from './Icons.jsx';

const HOW_TO_PLAY_STEPS = [
  {
    step: '01 // MONITOR TELEMETRY',
    title: 'Track Real NASA Solar Flares',
    detail:
      'Watch incoming C, M, and X-class flare forecasts and CME alerts pulled from NASA DONKI, backed by our offline Sol 214 event snapshot.',
  },
  {
    step: '02 // CREW DECISIONS',
    title: 'Balance Power, Life Support & Shielding',
    detail:
      'Allocate limited outpost power between Battery Storage, Oxygen Generation, Magnetic Shielding, Greenhouse CO2 scrubbing, and Deep Comms.',
  },
  {
    step: '03 // SURVIVE THE CYCLE',
    title: 'Command Shackleton Outpost',
    detail:
      'Survive lunar nights, handle the timed Sol 214 emergency choice, and inspect the cause-and-effect Debrief chain after every shift.',
  },
];

const MODAL_TABS = [
  { id: 'how-to-play', label: '01 / HOW TO PLAY' },
  { id: 'start-game', label: '02 / START GAME' },
  { id: 'credits', label: '03 / CREDITS' },
];

/**
 * Editorial mission modal connecting the welcome landing hero to MOONWATCH
 * campaign selection, mission replay seed controls, interactive tutorial,
 * and NASA DONKI science background.
 */
export default function ProgramModal({
  activeTab,
  onClose,
  onSwitchTab,
  selectedLevel,
  onSelectLevel,
  seedInput,
  onChangeSeed,
  onRandomizeSeed,
  onStartMission,
  onStartTutorial,
  feedLabel,
  feedSubdetail,
}) {
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

  return (
    <div
      className="mw-landing-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="MOONWATCH Mission Console"
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
                <span className="mw-modal-kicker">MISSION BRIEFING</span>
              </div>

              <div className="mw-step-list">
                {HOW_TO_PLAY_STEPS.map((item) => (
                  <div key={item.step} className="mw-step-card">
                    <div className="mw-step-label">{item.step}</div>
                    <h4 className="mw-step-title">{item.title}</h4>
                    <p className="mw-step-detail">{item.detail}</p>
                  </div>
                ))}
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
                  INTERACTIVE TUTORIAL
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchTab('start-game')}
                  className="mw-btn-primary"
                >
                  PROCEED TO START GAME
                  <PixelChevron />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'start-game' && (
            <div className="mw-modal-section">
              <div className="mw-modal-heading-row">
                <h3 className="mw-modal-h3">SELECT MISSION</h3>
                <span className="mw-modal-kicker">
                  {LEVEL_LIST.length} CAMPAIGNS &bull; {activeLevelConfig.targetSols} SOLS SELECTED
                </span>
              </div>

              <div className="mw-mode-grid">
                {LEVEL_LIST.map((lvl) => {
                  const active = selectedLevel === lvl.level;
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
                          LEVEL 0{lvl.level} &bull; {lvl.targetSols} SOLS
                        </div>
                        <div className="mw-mode-name">{lvl.name}</div>
                      </div>

                      <p className="mw-mode-subtitle">{lvl.subtitle}</p>

                      <div className="mw-mode-tags">
                        {lvl.introduces.slice(0, 3).map((tag) => (
                          <span key={tag} className="mw-mode-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mw-seed-bar">
                <div className="mw-seed-controls">
                  <label htmlFor="mw-seed-input" className="mw-seed-label">
                    MISSION SEED
                  </label>
                  <input
                    id="mw-seed-input"
                    type="text"
                    className="mw-seed-input"
                    value={seedInput}
                    onChange={(e) => onChangeSeed(e.target.value)}
                    placeholder="2142026"
                  />
                  <button
                    type="button"
                    onClick={onRandomizeSeed}
                    className="mw-btn-secondary"
                  >
                    RANDOMIZE
                  </button>
                </div>
                <span className="mw-step-detail">
                  Same seed replays the exact flare timeline.
                </span>
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
                  LAUNCH LEVEL {activeLevelConfig.level}: {activeLevelConfig.name}
                  <PixelChevron />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'credits' && (
            <div className="mw-modal-section">
              <div className="mw-modal-heading-row">
                <h3 className="mw-modal-h3">SCIENCE &amp; CREDITS</h3>
                <span className="mw-modal-kicker">{feedLabel}</span>
              </div>

              <div className="mw-step-list">
                <div className="mw-step-card">
                  <div className="mw-step-label">01 // REAL SPACE WEATHER DATA</div>
                  <h4 className="mw-step-title">NASA DONKI + Offline Sol 214 Snapshot</h4>
                  <p className="mw-step-detail">
                    Space weather hazards in MOONWATCH translate real solar flares (C, M, and X-class)
                    and Coronal Mass Ejections (CMEs) from NASA&apos;s DONKI catalog into outpost
                    power, oxygen, and shielding challenges. Current telemetry status: {feedSubdetail}
                  </p>
                </div>

                <div className="mw-step-card">
                  <div className="mw-step-label">02 // SHACKLETON OUTPOST CREW</div>
                  <h4 className="mw-step-title">{COMMANDER.name} &amp; Specialist Team</h4>
                  <p className="mw-step-detail">
                    {STARTER_CREW.map((c) => `${c.name} (${c.role} — ${c.domain})`).join(' • ')}
                  </p>
                </div>

                <div className="mw-step-card">
                  <div className="mw-step-label">03 // CHALLENGE &amp; OPEN ACCESS</div>
                  <h4 className="mw-step-title">NASA Space Apps Challenge 2026</h4>
                  <p className="mw-step-detail">
                    Challenge: &ldquo;Build a Junior Astronaut Mission Trainer.&rdquo; Built with procedural
                    3D lunar diorama rendering, accessible keyboard controls, and zero accounts or tracking.
                  </p>
                </div>
              </div>

              <div className="mw-modal-actions">
                <button
                  type="button"
                  onClick={() => onSwitchTab('start-game')}
                  className="mw-btn-primary"
                >
                  SELECT MISSION
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
