import React, { useEffect } from 'react';
import { CREW_ROSTER } from './BriefingScreen.jsx';

export const MODAL_TABS = [
  { id: 'OVERVIEW', label: 'Overview', icon: '📖', subtitle: 'Colony Dossier' },
  { id: 'TUTORIAL', label: 'How to Play', icon: '🎮', subtitle: 'Flight Academy' },
  { id: 'HEROES', label: 'Crew Heroes', icon: '🧑‍🚀', subtitle: 'Astronaut Powers' },
  { id: 'WEATHER', label: 'Space Weather', icon: '☀️', subtitle: 'NASA DONKI Flares' },
];

export default function GameInfoModal({
  activeTab = 'OVERVIEW',
  onSelectTab,
  onClose,
  onStartMission,
  currentHero,
}) {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activeTab) return null;

  return (
    <div className="game-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="game-modal-chassis" onClick={(e) => e.stopPropagation()}>
        {/* Holographic Top Status HUD */}
        <div className="game-modal-top-bar">
          <div className="game-modal-telemetry-tag">
            <span className="telemetry-live-pulse" />
            <span className="telemetry-tag-label">NASA DONKI // LIVE FEED ONLINE</span>
            <span className="telemetry-sector-label">• SHACKLETON SECTOR 214</span>
          </div>

          <button
            type="button"
            className="game-modal-close-btn"
            onClick={onClose}
            aria-label="Close Modal"
          >
            <span>✕</span>
          </button>
        </div>

        {/* Tab Navigation Strip (Arcade Switcher) */}
        <div className="game-modal-tabs-strip" role="tablist">
          {MODAL_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`game-modal-tab-btn ${isActive ? 'is-active' : ''}`}
                onClick={() => onSelectTab?.(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-text-wrap">
                  <span className="tab-title">{tab.label}</span>
                  <span className="tab-sub">{tab.subtitle}</span>
                </span>
                {isActive && <span className="tab-active-glow" />}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="game-modal-body">
          {/* ==================== TAB 1: OVERVIEW ==================== */}
          {activeTab === 'OVERVIEW' && (
            <div className="game-modal-view view-overview animate-fade-in">
              <div className="view-banner-header">
                <div className="view-banner-badge">🌕 ARTEMIS PROGRAM SIMULATION</div>
                <h2 className="view-banner-title">Welcome to Shackleton Outpost!</h2>
                <p className="view-banner-desc">
                  You are in charge of Earth’s first solar-powered lunar colony. Real high-energy solar storms detected by NASA DONKI satellites are traveling across the solar system toward your base — survive the mission and keep your crew safe!
                </p>
              </div>

              {/* 3 Core Game Pillars */}
              <div className="overview-pillars-grid">
                <div className="overview-pillar-card" style={{ '--pillar-accent': '#fbbf24' }}>
                  <div className="pillar-header">
                    <span className="pillar-badge-icon">🛰️</span>
                    <div>
                      <span className="pillar-cat">NASA DONKI TELEMETRY</span>
                      <h3 className="pillar-title">Real Space Weather</h3>
                    </div>
                  </div>
                  <p className="pillar-desc">
                    Not made-up video game storms! The game pulls actual Coronal Mass Ejection (CME) data from NASA spacecraft like SOHO and STEREO.
                  </p>
                  <div className="pillar-footer-tag">
                    <span>⚡ Real Solar Physics</span>
                  </div>
                </div>

                <div className="overview-pillar-card" style={{ '--pillar-accent': '#38bdf8' }}>
                  <div className="pillar-header">
                    <span className="pillar-badge-icon">🛡️</span>
                    <div>
                      <span className="pillar-cat">COLONY MANAGEMENT</span>
                      <h3 className="pillar-title">Base Survival Strategy</h3>
                    </div>
                  </div>
                  <p className="pillar-desc">
                    Balance battery power, plasma shield domes, cabin oxygen, and fresh crops across 14 to 28 lunar Sols. Every choice counts!
                  </p>
                  <div className="pillar-footer-tag">
                    <span>🔋 Power vs Protection</span>
                  </div>
                </div>

                <div className="overview-pillar-card" style={{ '--pillar-accent': '#4ade80' }}>
                  <div className="pillar-header">
                    <span className="pillar-badge-icon">🧑‍🚀</span>
                    <div>
                      <span className="pillar-cat">HERO SPECIALISTS</span>
                      <h3 className="pillar-title">Unique Astronaut Powers</h3>
                    </div>
                  </div>
                  <p className="pillar-desc">
                    Pick your favorite astronaut! From Commander Nova’s boosted shields to Kip’s fast-charging solar arrays and Soli’s plant greenhouse.
                  </p>
                  <div className="pillar-footer-tag">
                    <span>⭐ 5 Playable Characters</span>
                  </div>
                </div>
              </div>

              {/* Mission Specs Quick Strip */}
              <div className="overview-quick-stats">
                <div className="quick-stat-item">
                  <span className="stat-label">OUTPOST LOCATION</span>
                  <span className="stat-value">Shackleton Crater • Moon South Pole</span>
                </div>
                <div className="quick-stat-item">
                  <span className="stat-label">EXPLORER AGES</span>
                  <span className="stat-value">Ages 9–14+ Cadets</span>
                </div>
                <div className="quick-stat-item">
                  <span className="stat-label">SESSION LENGTH</span>
                  <span className="stat-value">3–8 Minutes Per Level</span>
                </div>
                <div className="quick-stat-item">
                  <span className="stat-label">DIFFICULTY LEVELS</span>
                  <span className="stat-value">Cadet (14 Sols) • Pilot (21 Sols) • Commander (28 Sols)</span>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: HOW TO PLAY ==================== */}
          {activeTab === 'TUTORIAL' && (
            <div className="game-modal-view view-tutorial animate-fade-in">
              <div className="view-banner-header">
                <div className="view-banner-badge">🎮 FLIGHT MANUAL & CADET ACADEMY</div>
                <h2 className="view-banner-title">How to Play in 4 Easy Steps</h2>
                <p className="view-banner-desc">
                  {currentHero ? (
                    <>Playing as <strong>{currentHero.name}</strong> ({currentHero.perk}). Master these 4 steps to protect your colony!</>
                  ) : (
                    <>Simple to learn, exciting to master! Remember the astronaut rule: Sunlight = Panels Open ☀️ | Solar Storm = Shield ON 🛡️</>
                  )}
                </p>
              </div>

              {/* 4 Step Arcade Mission Cards */}
              <div className="howtoplay-cards-grid">
                {/* Step 1 */}
                <div className="htp-card" style={{ '--step-accent': '#fbbf24' }}>
                  <div className="htp-step-marker">
                    <span className="htp-step-num">01</span>
                    <span className="htp-step-icon">☀️</span>
                  </div>
                  <div className="htp-card-content">
                    <div className="htp-title-row">
                      <h3 className="htp-title">Deploy Solar Arrays</h3>
                      <div className="htp-keycaps">
                        <kbd className="arcade-key">1</kbd>
                        <span className="key-divider">or</span>
                        <kbd className="arcade-key">P</kbd>
                      </div>
                    </div>
                    <div className="htp-action-badge">ACTION: CATCH SUNLIGHT</div>
                    <p className="htp-desc">
                      On calm, sunny lunar days, open your gold solar arrays to charge your habitat battery bank up to 100%!
                    </p>
                    <div className="htp-tip">
                      💡 <em>Tip: Panels produce ZERO power during lunar night or storms.</em>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="htp-card" style={{ '--step-accent': '#38bdf8' }}>
                  <div className="htp-step-marker">
                    <span className="htp-step-num">02</span>
                    <span className="htp-step-icon">🛡️</span>
                  </div>
                  <div className="htp-card-content">
                    <div className="htp-title-row">
                      <h3 className="htp-title">Raise Plasma Shield</h3>
                      <div className="htp-keycaps">
                        <kbd className="arcade-key">2</kbd>
                        <span className="key-divider">or</span>
                        <kbd className="arcade-key">S</kbd>
                      </div>
                    </div>
                    <div className="htp-action-badge">ACTION: DEFLECT RADIATION</div>
                    <p className="htp-desc">
                      When NASA DONKI sends an alert that a solar flare is inbound, RETRACT panels and turn ON the plasma shield dome!
                    </p>
                    <div className="htp-tip">
                      ⚠️ <em>Warning: Shields consume battery, so only raise them when needed!</em>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="htp-card" style={{ '--step-accent': '#34d399' }}>
                  <div className="htp-step-marker">
                    <span className="htp-step-num">03</span>
                    <span className="htp-step-icon">🌱</span>
                  </div>
                  <div className="htp-card-content">
                    <div className="htp-title-row">
                      <h3 className="htp-title">Keep Crew Healthy</h3>
                      <div className="htp-keycaps">
                        <kbd className="arcade-key">3</kbd>
                        <span className="key-divider">or</span>
                        <kbd className="arcade-key">O</kbd>
                      </div>
                    </div>
                    <div className="htp-action-badge">ACTION: PUMP CLEAN OXYGEN</div>
                    <p className="htp-desc">
                      Keep life support humming and tend the hydroponic dwarf-wheat greenhouse dome to scrub CO₂ into crisp fresh breathing air.
                    </p>
                    <div className="htp-tip">
                      ❤️ <em>Health depends on clean oxygen and shelter from radiation.</em>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="htp-card" style={{ '--step-accent': '#a855f7' }}>
                  <div className="htp-step-marker">
                    <span className="htp-step-num">04</span>
                    <span className="htp-step-icon">🚀</span>
                  </div>
                  <div className="htp-card-content">
                    <div className="htp-title-row">
                      <h3 className="htp-title">Advance the Sol</h3>
                      <div className="htp-keycaps">
                        <kbd className="arcade-key wide-key">SPACEBAR</kbd>
                      </div>
                    </div>
                    <div className="htp-action-badge">ACTION: PROGRESS TIME</div>
                    <p className="htp-desc">
                      Once your base is prepared for the day or night, press Space to advance to the next Sol. Survive all Sols to win!
                    </p>
                    <div className="htp-tip">
                      🏆 <em>Survive 14 Sols (Cadet), 21 Sols (Pilot), or 28 Sols (Commander)!</em>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tip Banner */}
              <div className="game-pro-tip-callout">
                <span className="callout-icon">⭐</span>
                <div>
                  <strong>Cadet Golden Rule:</strong> Watch the NASA flare speed! Faster flares (over 1,000 km/s) hit in fewer Sols, giving you less time to retract your delicate solar wings!
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: CREW HEROES ==================== */}
          {activeTab === 'HEROES' && (
            <div className="game-modal-view view-heroes animate-fade-in">
              <div className="view-banner-header">
                <div className="view-banner-badge">🧑‍🚀 SHACKLETON COLONY ROSTER</div>
                <h2 className="view-banner-title">Meet Your 5 Astronaut Heroes</h2>
                <p className="view-banner-desc">
                  Every astronaut brings a unique game superpower to your lunar outpost. Choose who commands your mission!
                </p>
              </div>

              <div className="crew-heroes-grid">
                {CREW_ROSTER.map((hero) => (
                  <div
                    key={hero.id}
                    className="hero-character-card"
                    style={{ '--hero-accent': hero.accent }}
                  >
                    <div className="hero-card-header">
                      <div className="hero-avatar-bubble">
                        <span className="hero-emoji">{hero.avatar}</span>
                        <span className="hero-class-tag">{hero.vibe}</span>
                      </div>
                      <div className="hero-name-block">
                        <h3 className="hero-name">{hero.name}</h3>
                        <span className="hero-rank">{hero.role}</span>
                      </div>
                    </div>

                    <div className="hero-perk-ribbon">
                      <span className="perk-label">{hero.perk}</span>
                    </div>

                    <p className="hero-bio">{hero.bio}</p>

                    {/* RPG-Style Stat Meters for Kids */}
                    <div className="hero-stat-bars">
                      <div className="hero-stat-row">
                        <span className="stat-name">SHIELD BOOST</span>
                        <div className="stat-bar-track">
                          <div
                            className="stat-bar-fill"
                            style={{
                              width: hero.id === 'nova' ? '95%' : hero.id === 'mei' ? '70%' : '55%',
                              background: hero.accent,
                            }}
                          />
                        </div>
                      </div>
                      <div className="hero-stat-row">
                        <span className="stat-name">BATTERY CHARGE</span>
                        <div className="stat-bar-track">
                          <div
                            className="stat-bar-fill"
                            style={{
                              width: hero.id === 'kip' ? '98%' : hero.id === 'juno' ? '75%' : '60%',
                              background: hero.accent,
                            }}
                          />
                        </div>
                      </div>
                      <div className="hero-stat-row">
                        <span className="stat-name">LIFE SUPPORT</span>
                        <div className="stat-bar-track">
                          <div
                            className="stat-bar-fill"
                            style={{
                              width: hero.id === 'soli' ? '100%' : hero.id === 'mei' ? '92%' : '65%',
                              background: hero.accent,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==================== TAB 4: SPACE WEATHER ==================== */}
          {activeTab === 'WEATHER' && (
            <div className="game-modal-view view-weather animate-fade-in">
              <div className="view-banner-header">
                <div className="view-banner-badge">☀️ NASA DONKI SPACE WEATHER LAB</div>
                <h2 className="view-banner-title">Live Solar Storms & Real Science</h2>
                <p className="view-banner-desc">
                  The Sun is an active magnetic star that constantly blasts giant clouds of plasma into space. NASA’s Space Weather Database of Notifications, Knowledge, Information (DONKI) tracks them 24/7!
                </p>
              </div>

              {/* Solar Threat Scale Meter */}
              <div className="weather-threat-scale-box">
                <div className="threat-scale-header">
                  <span className="threat-scale-title">⚡ NASA SOLAR FLARE THREAT METER</span>
                  <span className="threat-scale-subtitle">From Everyday Sunbeams to Planetary EMPs</span>
                </div>
                <div className="threat-tiers-grid">
                  <div className="threat-tier-pill tier-c">
                    <span className="tier-tag">C-CLASS</span>
                    <span className="tier-name">Minor Flares</span>
                    <span className="tier-desc">Common solar background. Little effect on lunar base.</span>
                  </div>
                  <div className="threat-tier-pill tier-m">
                    <span className="tier-tag">M-CLASS</span>
                    <span className="tier-name">Moderate Storms</span>
                    <span className="tier-desc">Radio blackouts on Earth. Requires caution on the Moon!</span>
                  </div>
                  <div className="threat-tier-pill tier-x">
                    <span className="tier-tag">X-CLASS</span>
                    <span className="tier-name">Monster Flares</span>
                    <span className="tier-desc">Extreme radiation wave! Must raise full shield dome!</span>
                  </div>
                </div>
              </div>

              {/* Historic Real Superstorms Dossier */}
              <div className="weather-dossier-grid">
                <div className="dossier-card" style={{ '--dossier-accent': '#f43f5e' }}>
                  <div className="dossier-header">
                    <span className="dossier-icon">⚡</span>
                    <div>
                      <span className="dossier-tag">HISTORIC SUPERSTORM // MAY 2024</span>
                      <h3 className="dossier-title">The G5 Aurora Superstorm</h3>
                    </div>
                  </div>
                  <div className="dossier-stat-row">
                    <span>SPEED: ~1,200 KM/S</span>
                    <span>SOURCE: SUNSPOT AR3664</span>
                  </div>
                  <p className="dossier-body">
                    The most powerful geomagnetic storm in over 20 years! Sunspot region AR3664 launched 7 consecutive coronal mass ejections that collided with Earth and the Moon, turning the night sky into brilliant pink and violet auroras.
                  </p>
                  <div className="dossier-game-impact">
                    🎮 <strong>In-Game Defense:</strong> Full shields required! A storm of this magnitude will drain unprotected batteries in a single Sol.
                  </div>
                </div>

                <div className="dossier-card" style={{ '--dossier-accent': '#ea580c' }}>
                  <div className="dossier-header">
                    <span className="dossier-icon">🎃</span>
                    <div>
                      <span className="dossier-tag">RECORD BREAKER // OCT 2003</span>
                      <h3 className="dossier-title">The Halloween Solar Flares (X17)</h3>
                    </div>
                  </div>
                  <div className="dossier-stat-row">
                    <span>SPEED: &gt; 2,000 KM/S</span>
                    <span>STATUS: EXTREME CME</span>
                  </div>
                  <p className="dossier-body">
                    A colossal solar storm that traveled from the Sun to Earth in only 19 hours! It overwhelmed satellite sensors, rerouted airliners, and shut down power grids in Sweden.
                  </p>
                  <div className="dossier-game-impact">
                    🎮 <strong>In-Game Defense:</strong> Super-high velocity gives you almost zero warning time to retract your delicate solar wings!
                  </div>
                </div>
              </div>

              {/* Fun Kid-Friendly Science Fact */}
              <div className="weather-fun-fact-box">
                <div className="fun-fact-badge">🛰️ ASTRONAUT SCIENCE FACT</div>
                <p className="fun-fact-text">
                  <strong>Why does the Moon need shields?</strong> Unlike Earth, which is shielded by a thick atmosphere and a giant magnetic field, the Moon has NO atmosphere! Space radiation strikes the lunar surface directly — making your Moonwatch base shields the crew’s only protection!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="game-modal-footer">
          <div className="footer-keyboard-hint">
            <kbd className="arcade-key mini-key">ESC</kbd>
            <span>to close or click outside</span>
          </div>

          <div className="footer-actions">
            <button
              type="button"
              className="game-modal-action-btn secondary-action"
              onClick={onClose}
            >
              Back
            </button>

            {onStartMission && (
              <button
                type="button"
                className="game-modal-action-btn primary-action"
                onClick={() => {
                  onClose?.();
                  onStartMission();
                }}
              >
                <span>Select Level & Launch</span>
                <span className="action-arrow">❯</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

