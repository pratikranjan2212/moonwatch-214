import { useEffect, useState } from 'react';
import soundManager from '../../audio/soundManager.js';
import { BALANCE } from '../../engine/balance.js';
import { getFactSheet } from '../../engine/events.js';
import useGameStore from '../../store/useGameStore.js';

export function Sol214Card() {
  const sol214Open = useGameStore((s) => s.ui?.sol214Open);
  const reducedMotion = useGameStore((s) => s.settings?.reducedMotion) || false;
  const resolveSol214 = useGameStore((s) => s.resolveSol214);
  const dismissAlert = useGameStore((s) => s.dismissAlert);

  const totalSeconds = BALANCE.sol214?.countdownSeconds || 10;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!sol214Open) {
      setSecondsLeft(totalSeconds);
      setPaused(false);
      return undefined;
    }

    soundManager.play('siren');

    // If reducedMotion is enabled, give a relaxed/paused timer by default or slower tick
    if (paused || reducedMotion) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [sol214Open, paused, reducedMotion, totalSeconds]);

  useEffect(() => {
    if (sol214Open && secondsLeft === 0 && !paused && !reducedMotion) {
      resolveSol214('retract');
      dismissAlert();
    }
  }, [sol214Open, secondsLeft, paused, reducedMotion, resolveSol214, dismissAlert]);

  if (!sol214Open) {
    return null;
  }

  const sheet = getFactSheet('sol214');
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - secondsLeft / totalSeconds);

  const handleChoose = (decision) => {
    resolveSol214(decision);
    dismissAlert();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sol214-modal-title"
    >
      <div className="modal-card alert-danger" style={{ maxWidth: '720px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <span className="severity-badge severity-extreme">
            🚨 MISSION SOL 214 EMERGENCY · X3.9 SUPER-FLARE
          </span>

          <span className="nasa-badge">
            <span>★ Real NASA event · 2024-05-10 (AR 13664)</span>
          </span>
        </div>

        <h2
          id="sol214-modal-title"
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.65rem',
            color: 'var(--sun-highlight)',
          }}
        >
          Sol 214 X-Class Super-Flare Incoming!
        </h2>

        {/* 10-Second Live Countdown Ring */}
        <div className="sol214-countdown-wrap">
          <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="rgba(255, 241, 201, 0.2)"
              strokeWidth="6"
            />
            <circle
              cx="38"
              cy="38"
              r={radius}
              fill="none"
              stroke="var(--alert)"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 38 38)"
            />
            <text
              x="38"
              y="44"
              textAnchor="middle"
              fill="var(--sun-highlight)"
              fontFamily="var(--font-mono)"
              fontWeight="800"
              fontSize="20"
            >
              {secondsLeft}s
            </text>
          </svg>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: 'var(--sun-highlight)', fontSize: '1.05rem' }}>
              {reducedMotion || paused
                ? 'Countdown Paused (Accessibility Mode) — Take Your Time!'
                : `${secondsLeft} Seconds to Impact — Commander Nova, Your Call!`}
            </div>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              {sheet.oneLineFact}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setPaused((p) => !p)}
            style={{ padding: '0.35rem 0.65rem', minHeight: '36px', fontSize: '0.85rem' }}
          >
            {paused || reducedMotion ? 'Resume Timer' : 'Pause Timer'}
          </button>
        </div>

        {/* Crew Voice Callouts */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '0.65rem',
          }}
        >
          <div
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(15, 17, 35, 0.78)',
              borderLeft: '3px solid var(--power)',
              fontSize: '0.9rem',
            }}
          >
            <strong style={{ color: 'var(--power)' }}>Kip Vance (Engineer):</strong>{' '}
            &ldquo;If we leave the solar array out, the geomagnetic surge could fry our battery
            inverters and scorch the cells!&rdquo;
          </div>
          <div
            style={{
              padding: '0.65rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(15, 17, 35, 0.78)',
              borderLeft: '3px solid var(--oxygen)',
              fontSize: '0.9rem',
            }}
          >
            <strong style={{ color: 'var(--oxygen)' }}>Dr. Mei Lin (Doctor):</strong>{' '}
            &ldquo;Retracting the panels and raising the Shield Dome keeps the crew safe in the
            storm shelter!&rdquo;
          </div>
        </div>

        {/* Two Hero Choices */}
        <div className="sol214-choices-grid">
          <button
            type="button"
            className="choice-card-btn retract-choice"
            onClick={() => handleChoose('retract')}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--oxygen)',
                }}
              >
                🛡 Retract Panels
              </span>
              <span className="severity-badge severity-minor">RECOMMENDED</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Protects solar array and activates the radiation shield. Cuts solar generation this
              Sol ({BALANCE.sol214.retract.powerDelta} Power, {BALANCE.sol214.retract.shieldDelta}{' '}
              Shield, 0 Crew damage).
            </p>
          </button>

          <button
            type="button"
            className="choice-card-btn leave-choice"
            onClick={() => handleChoose('leave-out')}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: 'var(--power)',
                }}
              >
                ⚡ Leave Panels Out
              </span>
              <span className="severity-badge severity-extreme">HIGH RISK</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Attempts to harvest solar energy through the storm, but risks a massive surge (
              {BALANCE.sol214.leaveOut.powerDelta} Power, {BALANCE.sol214.leaveOut.shieldDelta}{' '}
              Shield, and scorches panels to 45% output for 3 Sols).
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sol214Card;
