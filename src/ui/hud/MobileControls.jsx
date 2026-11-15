import { useEffect, useRef, useState } from 'react';
import soundManager from '../../audio/soundManager.js';
import { BASE_STATIONS, isStationUnlocked } from '../../engine/stations.js';
import {
  computeJoystickVector,
  resetVirtualJoystick,
  setVirtualJoystick,
} from '../../engine/touchInput.js';
import useGameStore from '../../store/useGameStore.js';
import { isCoarseTouchDevice } from '../../utils/fullscreen.js';

function useCoarseTouchControls() {
  const [enabled, setEnabled] = useState(() => isCoarseTouchDevice());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => setEnabled(isCoarseTouchDevice());
    update();

    const queries =
      typeof window.matchMedia === 'function'
        ? [
            window.matchMedia('(pointer: coarse)'),
            window.matchMedia('(any-pointer: coarse)'),
            window.matchMedia('(hover: none)'),
          ]
        : [];

    for (const mq of queries) {
      if (mq.addEventListener) {
        mq.addEventListener('change', update);
      } else if (mq.addListener) {
        mq.addListener(update);
      }
    }
    window.addEventListener('resize', update);

    return () => {
      for (const mq of queries) {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', update);
        } else if (mq.removeListener) {
          mq.removeListener(update);
        }
      }
      window.removeEventListener('resize', update);
    };
  }, []);

  return enabled;
}

function getInteractButtonMeta({ nearbyStation, unlocked, solarBroken, choices }) {
  if (!nearbyStation) {
    return {
      icon: '✋',
      label: 'USE',
      sublabel: 'NEAR OBJECT',
      ariaLabel: 'Walk near an object with the left joystick, then tap to enable or operate it',
      toneClass: 'mobile-interact-btn--idle',
    };
  }

  if (!unlocked) {
    return {
      icon: '🔒',
      label: 'LOCKED',
      sublabel: `DAY ${nearbyStation.unlockSol}`,
      ariaLabel: `${nearbyStation.shortName} unlocks on Day ${nearbyStation.unlockSol}`,
      toneClass: 'mobile-interact-btn--locked',
    };
  }

  if (nearbyStation.id === 'solar' && solarBroken) {
    return {
      icon: '💥',
      label: 'BROKEN',
      sublabel: 'SOLAR',
      ariaLabel: 'Solar Array is broken',
      toneClass: 'mobile-interact-btn--locked',
    };
  }

  let label = 'OPERATE';
  let sublabel = nearbyStation.shortName;

  switch (nearbyStation.id) {
    case 'solar':
      label = choices.panelsOut ? 'RETRACT' : 'EXTEND';
      sublabel = 'SOLAR';
      break;
    case 'shield':
      label = 'SHIELD';
      sublabel = choices.shieldOn ? 'TURN OFF' : 'ACTIVATE';
      break;
    case 'oxygen':
      label = 'O₂ FLOW';
      sublabel = (choices.oxygenLevel || 'normal').toUpperCase();
      break;
    case 'greenhouse':
      label = choices.waterGreenhouse || choices.tendGreenhouse ? 'STANDBY' : 'WATER';
      sublabel = 'CROPS';
      break;
    case 'comms':
      label = choices.queueComms ? 'CANCEL' : 'TRANSMIT';
      sublabel = 'COMMS';
      break;
    default:
      break;
  }

  return {
    icon: nearbyStation.icon,
    label,
    sublabel,
    ariaLabel: `${nearbyStation.name}: ${label}`,
    toneClass: 'mobile-interact-btn--ready',
  };
}

/**
 * Mobile / touch overlay providing:
 * - Left floating virtual thumbstick (navigates astronaut camera-relatively with collision)
 * - Right object interaction button (enables/toggles the nearby lunar base object)
 */
export function MobileControls({ hidden = false }) {
  const touchEnabled = useCoarseTouchControls();
  const nearbyStationId = useGameStore((s) => s.nearbyStationId);
  const game = useGameStore((s) => s.game);
  const sol214Open = Boolean(useGameStore((s) => s.ui?.sol214Open));
  const activeAlert = Boolean(useGameStore((s) => s.ui?.activeAlert));
  const interactWithStation = useGameStore((s) => s.interactWithStation);

  const padRef = useRef(null);
  const knobRef = useRef(null);
  const activePointerIdRef = useRef(null);

  const sol = game?.sol || 1;
  const choices = game?.choices || {};
  const solarBroken = Boolean(game?.solarBroken);
  const nearbyStation = nearbyStationId ? BASE_STATIONS[nearbyStationId] : null;
  const unlocked = nearbyStation ? isStationUnlocked(nearbyStation.id, sol) : false;
  const controlsHidden = Boolean(hidden || sol214Open || activeAlert);

  const releaseStick = () => {
    activePointerIdRef.current = null;
    if (padRef.current) {
      padRef.current.dataset.active = 'false';
    }
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
    }
    resetVirtualJoystick();
  };

  useEffect(() => {
    if (!touchEnabled || controlsHidden) {
      releaseStick();
    }
  }, [touchEnabled, controlsHidden]);

  useEffect(() => {
    window.addEventListener('blur', releaseStick);
    return () => {
      window.removeEventListener('blur', releaseStick);
      resetVirtualJoystick();
    };
  }, []);

  if (!touchEnabled || controlsHidden) {
    return null;
  }

  const updateStickFromClient = (clientX, clientY) => {
    const pad = padRef.current;
    if (!pad) return;
    const rect = pad.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxRadius = Math.max(24, rect.width * 0.36);

    const vec = computeJoystickVector(clientX - cx, clientY - cy, maxRadius);
    if (knobRef.current) {
      knobRef.current.style.transform = `translate3d(${vec.knobX.toFixed(1)}px, ${vec.knobY.toFixed(1)}px, 0px)`;
    }
    setVirtualJoystick({ x: vec.x, y: vec.y, active: true });
  };

  const handleStickPointerDown = (e) => {
    if (activePointerIdRef.current !== null) return;
    e.preventDefault();
    e.stopPropagation();
    activePointerIdRef.current = e.pointerId;
    if (padRef.current) {
      padRef.current.dataset.active = 'true';
    }
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore synthetic PointerEvents without active native pointer capture
    }
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    updateStickFromClient(e.clientX, e.clientY);
  };

  const handleStickPointerEnd = (e) => {
    if (activePointerIdRef.current !== e.pointerId) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Safe fallback
    }
    releaseStick();
  };

  const handleInteractTap = (e) => {
    e.stopPropagation();
    const res = interactWithStation();
    if (res?.sound) {
      soundManager.play(res.sound);
    } else {
      soundManager.play('click');
    }
  };

  const meta = getInteractButtonMeta({
    nearbyStation,
    unlocked,
    solarBroken,
    choices,
  });

  return (
    <div className="mobile-touch-controls" aria-label="Touch Controls">
      <div className="mobile-joystick-zone">
        <div
          ref={padRef}
          className="mobile-joystick-pad"
          data-active="false"
          role="application"
          aria-label="Virtual movement joystick"
          onPointerDown={handleStickPointerDown}
          onPointerMove={handleStickPointerMove}
          onPointerUp={handleStickPointerEnd}
          onPointerCancel={handleStickPointerEnd}
          onLostPointerCapture={handleStickPointerEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <span className="mobile-joystick-axis mobile-joystick-axis--n" aria-hidden="true">
            ▲
          </span>
          <span className="mobile-joystick-axis mobile-joystick-axis--s" aria-hidden="true">
            ▼
          </span>
          <span className="mobile-joystick-axis mobile-joystick-axis--w" aria-hidden="true">
            ◀
          </span>
          <span className="mobile-joystick-axis mobile-joystick-axis--e" aria-hidden="true">
            ▶
          </span>
          <span className="mobile-joystick-ring" aria-hidden="true" />
          <span ref={knobRef} className="mobile-joystick-knob" aria-hidden="true" />
        </div>
        <span className="mobile-control-tag">MOVE</span>
      </div>

      <div className="mobile-interact-zone">
        <button
          type="button"
          className={`mobile-interact-btn ${meta.toneClass}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleInteractTap}
          aria-label={meta.ariaLabel}
          data-station={nearbyStation?.id || 'none'}
        >
          <span className="mobile-interact-icon" aria-hidden="true">
            {meta.icon}
          </span>
          <span className="mobile-interact-label">{meta.label}</span>
          <span className="mobile-interact-sub">{meta.sublabel}</span>
        </button>
        <span className="mobile-control-tag">
          {nearbyStation ? nearbyStation.shortName : 'OBJECT'}
        </span>
      </div>
    </div>
  );
}

export default MobileControls;
