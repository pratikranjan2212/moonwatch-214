import { useEffect } from 'react';
import soundManager from '../../audio/soundManager.js';
import { getFactSheet, normalizeEventType } from '../../engine/events.js';
import useGameStore from '../../store/useGameStore.js';

export function AlertModal() {
  const activeAlert = useGameStore((s) => s.ui?.activeAlert);
  const sol214Open = useGameStore((s) => s.ui?.sol214Open);
  const dismissAlert = useGameStore((s) => s.dismissAlert);

  useEffect(() => {
    if (!activeAlert || sol214Open) return undefined;

    const canonicalType = normalizeEventType(activeAlert.type || activeAlert.code);
    if (canonicalType === 'dust') {
      soundManager.play('dust');
    } else if (canonicalType === 'flare' || canonicalType === 'cme') {
      soundManager.play('flare');
    } else {
      soundManager.play('warning');
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissAlert();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeAlert, sol214Open, dismissAlert]);

  if (!activeAlert || sol214Open) {
    return null;
  }

  const canonical = normalizeEventType(activeAlert.type || activeAlert.code);
  const sheet = activeAlert.factSheet || getFactSheet(canonical);
  const isRealNasa =
    Boolean(activeAlert.isRealNasaEvent) ||
    (typeof activeAlert.source === 'string' && activeAlert.source.includes('NASA DONKI'));

  const manualTip =
    canonical === 'flare' || canonical === 'cme'
      ? 'Walk to the Solar Array & Shield Dome with WASD and press [E] to retract panels and activate shielding.'
      : canonical === 'dust'
        ? 'Walk to the Solar Array with WASD and press [E] to retract panels safely underground.'
        : canonical === 'comms'
          ? 'Walk to Earth Comms with WASD and press [E] to queue a telemetry packet.'
          : 'Walk around your Moon base with WASD and press [E] near any station to adjust systems.';

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="modal-card alert-danger">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            flexWrap: 'wrap',
          }}
        >
          <span className={`severity-badge severity-${activeAlert.severity || 'major'}`}>
            ⚠ INCOMING SPACE WEATHER ALERT · DAY {activeAlert.sol}
          </span>

          <span className="forecast-sol-pill">
            Lead Warning: {activeAlert.leadTimeSols || 2} Days
          </span>
        </div>

        <div>
          <h2
            id="alert-modal-title"
            style={{
              margin: '0 0 0.4rem 0',
              fontFamily: 'var(--font-display)',
              fontSize: '2.15rem',
              lineHeight: 0.95,
              textTransform: 'uppercase',
              color: 'var(--power)',
            }}
          >
            {activeAlert.title || 'Solar Hazard Detected'}
          </h2>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            {isRealNasa && (
              <span className="nasa-badge">
                <span>★ Real NASA event</span>
                {activeAlert.date && <span>· {activeAlert.date}</span>}
              </span>
            )}
            {activeAlert.classType && (
              <span className="kbd-hint">Class {activeAlert.classType}</span>
            )}
            {activeAlert.activeRegion && (
              <span className="kbd-hint">Region {activeAlert.activeRegion}</span>
            )}
            {activeAlert.speed && <span className="kbd-hint">{activeAlert.speed} km/s</span>}
          </div>

          <p style={{ margin: 0, color: 'var(--text-primary)' }}>
            {activeAlert.description || sheet?.realWorldImpact}
          </p>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            padding: '0.85rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
          }}
        >
          <div>
            <strong style={{ color: 'var(--oxygen)' }}>Science Note: </strong>
            <span>{sheet?.oneLineFact || activeAlert.factText}</span>
          </div>
          <div>
            <strong style={{ color: 'var(--power)' }}>What You Need To Do: </strong>
            <span>{manualTip}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <button type="button" className="btn btn-primary" onClick={dismissAlert}>
            <span>Got It — Go Prepare Base</span>
            <span className="kbd-hint">[Esc]</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
