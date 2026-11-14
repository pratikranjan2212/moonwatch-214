import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import PixelMoonCanvas from './PixelMoonCanvas.jsx';
import { AstraPlanetBadge, PixelChevron } from './Icons.jsx';

/**
 * Dynamically scales the giant Handjet wordmark to fill its container width
 * across mobile, tablet, and desktop viewports without horizontal overflow.
 */
function FittedDisplayWordmark({ text }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const el = textRef.current;
    if (!container || !el) return undefined;

    let cancelled = false;
    let lastWidth = 0;

    const fit = () => {
      if (cancelled) return;
      const avail = container.clientWidth;
      if (!avail || Math.abs(avail - lastWidth) < 1) return;
      lastWidth = avail;

      el.style.fontSize = '100px';
      const measured = el.getBoundingClientRect().width;
      if (measured > 0) {
        const computed = Math.max(36, (avail / measured) * 100 * 0.992);
        el.style.fontSize = `${computed}px`;
      }
    };

    fit();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        lastWidth = 0;
        fit();
      });
    }

    const onResize = () => {
      lastWidth = 0;
      fit();
    };

    const ro = new ResizeObserver(fit);
    ro.observe(container);
    window.addEventListener('resize', onResize);

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [text]);

  return (
    <div ref={containerRef} className="mw-wordmark-wrap">
      <h1
        ref={textRef}
        style={{ fontSize: 'clamp(2.5rem, 15.2vw, 13.5rem)' }}
        className="mw-wordmark"
      >
        {text}
      </h1>
    </div>
  );
}

/**
 * Full-bleed editorial welcome hero featuring the animated pixel Moon,
 * top navigation strip, Space Apps tagline, and real mission telemetry.
 */
export default function HeroSection({
  onOpenModal,
  onStartTutorial,
  onOpenSettings,
  missionCount = 3,
  selectedTargetSols = 14,
  feedLabel = 'DONKI: SOL 214 SNAPSHOT',
  reducedMotion = false,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'HOW TO PLAY', active: true, onClick: () => onOpenModal('how-to-play') },
    { label: 'TUTORIAL', active: false, onClick: onStartTutorial },
    { label: 'CREDITS', active: false, onClick: () => onOpenModal('credits') },
    { label: 'SETTINGS', active: false, onClick: onOpenSettings },
  ];

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleNavClick = (item) => {
    setMobileMenuOpen(false);
    item.onClick();
  };

  const formattedMissions = String(missionCount).padStart(2, '0');
  const formattedSols = String(selectedTargetSols).padStart(2, '0');

  return (
    <section id="hero" className="mw-landing" aria-label="MOONWATCH Welcome Screen">
      <PixelMoonCanvas reducedMotion={reducedMotion} />

      <div aria-hidden="true" className="mw-vignette" />

      <div className="mw-container">
        <div>
          <header className="mw-header">
            <a href="#hero" className="mw-brand">
              <AstraPlanetBadge />
              <span className="mw-brand-text">
                NASA SPACE APPS
                <br />
                CHALLENGE
                <br />
                2026
              </span>
            </a>

            <nav aria-label="Primary Navigation" className="mw-nav">
              <ul className="mw-nav-list">
                {navItems.map((item) => (
                  <li key={item.label} className="mw-nav-item">
                    <button
                      type="button"
                      onClick={() => handleNavClick(item)}
                      className="mw-nav-btn"
                    >
                      <span
                        className={`mw-nav-dot ${item.active ? '' : 'mw-nav-dot--muted'}`.trim()}
                      />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onOpenModal('start-game')}
                className="mw-start-cta"
              >
                START GAME
                <PixelChevron />
              </button>
            </nav>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="mw-hamburger"
            >
              <span
                className={`mw-hamburger-bar ${
                  mobileMenuOpen ? 'mw-hamburger-bar--top-open' : ''
                }`.trim()}
              />
              <span
                className={`mw-hamburger-bar ${
                  mobileMenuOpen ? 'mw-hamburger-bar--mid-open' : ''
                }`.trim()}
              />
              <span
                className={`mw-hamburger-bar ${
                  mobileMenuOpen ? 'mw-hamburger-bar--bot-open' : ''
                }`.trim()}
              />
            </button>
          </header>

          {mobileMenuOpen && (
            <div className="mw-mobile-drawer">
              <ul className="mw-mobile-list">
                {navItems.map((item) => (
                  <li key={item.label} className="mw-mobile-item">
                    <button
                      type="button"
                      onClick={() => handleNavClick(item)}
                      className="mw-mobile-link"
                    >
                      <span className="mw-mobile-link-left">
                        <span
                          className={`mw-mobile-dot ${
                            item.active ? 'mw-mobile-dot--active' : ''
                          }`.trim()}
                        />
                        {item.label}
                      </span>
                      <PixelChevron />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenModal('start-game');
                }}
                className="mw-mobile-cta"
              >
                START GAME
                <PixelChevron />
              </button>
            </div>
          )}

          <p className="mw-tagline">
            Keep your crew alive.
            <br />
            Real NASA flares.
            <br />
            Your call.
          </p>
        </div>

        <div className="mw-stage-spacer" aria-hidden="true" />

        <div className="mw-bottom-lockup">
          <div className="mw-telemetry-row">
            <span>
              MISSIONS: {formattedMissions} &bull; SOLS: {formattedSols}
            </span>
          </div>

          <FittedDisplayWordmark text="Moonwatch" />

          <div className="mw-attribution-row">
            <div className="mw-attribution">
              POWERED BY <span className="mw-attribution-accent">NASA DONKI</span>
            </div>
            <div className="mw-feed-status">{feedLabel}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
