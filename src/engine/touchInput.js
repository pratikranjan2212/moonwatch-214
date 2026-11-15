/**
 * @fileoverview Zero-allocation shared virtual joystick input channel for 60fps R3F navigation,
 * paired with pure vector normalization / deadzone helpers for mobile touch controls.
 */

const joystickState = {
  x: 0,
  y: 0,
  active: false,
};

/**
 * Converts a pointer delta (in CSS pixels from joystick center) into normalized
 * movement axes and clamped visual puck coordinates.
 * DOM Y points downward, so dragging up (`deltaY < 0`) yields positive forward `y` (+1).
 *
 * @param {number} deltaX
 * @param {number} deltaY
 * @param {number} [maxRadius=44]
 * @param {number} [deadzone=0.14]
 * @returns {{ x: number, y: number, knobX: number, knobY: number, magnitude: number }}
 */
export function computeJoystickVector(deltaX, deltaY, maxRadius = 44, deadzone = 0.14) {
  if (
    !Number.isFinite(deltaX) ||
    !Number.isFinite(deltaY) ||
    !Number.isFinite(maxRadius) ||
    maxRadius <= 0
  ) {
    return { x: 0, y: 0, knobX: 0, knobY: 0, magnitude: 0 };
  }

  const rawDist = Math.hypot(deltaX, deltaY);
  if (rawDist <= 0.0001) {
    return { x: 0, y: 0, knobX: 0, knobY: 0, magnitude: 0 };
  }

  const ux = deltaX / rawDist;
  const uy = deltaY / rawDist;
  const clampedDist = Math.min(rawDist, maxRadius);
  const knobX = ux * clampedDist;
  const knobY = uy * clampedDist;

  const safeDeadzone = Number.isFinite(deadzone)
    ? Math.max(0, Math.min(0.95, deadzone))
    : 0.14;
  const ratio = clampedDist / maxRadius;
  if (ratio <= safeDeadzone) {
    return { x: 0, y: 0, knobX, knobY, magnitude: 0 };
  }

  const magnitude = (ratio - safeDeadzone) / (1 - safeDeadzone);
  return {
    x: ux * magnitude,
    y: -uy * magnitude,
    knobX,
    knobY,
    magnitude,
  };
}

/**
 * Updates the shared virtual joystick axis state (consumed in Diorama's `useFrame`).
 *
 * @param {{ x?: number, y?: number, active?: boolean }} [next]
 */
export function setVirtualJoystick(next = {}) {
  const x = Number.isFinite(next.x) ? Math.max(-1, Math.min(1, next.x)) : 0;
  const y = Number.isFinite(next.y) ? Math.max(-1, Math.min(1, next.y)) : 0;
  joystickState.x = x;
  joystickState.y = y;
  joystickState.active = next.active !== undefined ? Boolean(next.active) : Math.hypot(x, y) > 0;
}

/**
 * Clears virtual joystick axes back to rest.
 */
export function resetVirtualJoystick() {
  joystickState.x = 0;
  joystickState.y = 0;
  joystickState.active = false;
}

/**
 * Returns the live mutable joystick vector without allocating per frame.
 *
 * @returns {{ x: number, y: number, active: boolean }}
 */
export function getVirtualJoystick() {
  return joystickState;
}
