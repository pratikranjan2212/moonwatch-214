/**
 * @fileoverview Pure helpers for character-referenced 3D camera targeting and Orbit tracking.
 * Ensures all camera views (Orbit, TPP, FPP) move relative to the active character
 * rather than pivoting around fixed outpost environment coordinates.
 */

export const DEFAULT_CHARACTER_SPAWN = [0.0, -0.45, 1.8];
export const ORBIT_TARGET_HEIGHT_OFFSET = 0.14;
export const DEFAULT_ORBIT_DISTANCE = 10.5;
export const DEFAULT_ORBIT_PITCH = 0.54;

/**
 * Returns the world-space look/orbit target centered on the character torso.
 *
 * @param {number[]} [characterPos=DEFAULT_CHARACTER_SPAWN]
 * @param {number} [heightOffset=ORBIT_TARGET_HEIGHT_OFFSET]
 * @returns {[number, number, number]}
 */
export function getCharacterCameraTarget(
  characterPos = DEFAULT_CHARACTER_SPAWN,
  heightOffset = ORBIT_TARGET_HEIGHT_OFFSET
) {
  const x = characterPos?.[0] ?? 0;
  const y = characterPos?.[1] ?? -0.45;
  const z = characterPos?.[2] ?? 1.8;
  return [x, y + heightOffset, z];
}

/**
 * Computes an Orbit camera position around a character target given yaw, pitch, and distance.
 *
 * @param {{ target: number[], yaw?: number, distance?: number, pitch?: number }} params
 * @returns {[number, number, number]}
 */
export function computeOrbitCameraPosition({
  target,
  yaw = 0,
  distance = DEFAULT_ORBIT_DISTANCE,
  pitch = DEFAULT_ORBIT_PITCH,
}) {
  const tx = target?.[0] ?? 0;
  const ty = target?.[1] ?? -0.31;
  const tz = target?.[2] ?? 1.8;
  const horiz = distance * Math.cos(pitch);
  return [
    tx + Math.sin(yaw) * horiz,
    ty + distance * Math.sin(pitch),
    tz + Math.cos(yaw) * horiz,
  ];
}

/**
 * Computes the next Orbit controls target and translated camera position so moving
 * the character shifts the entire orbit rig without altering camera offset or angle.
 *
 * @param {{ controlsTarget: number[], cameraPos: number[], characterPos: number[], heightOffset?: number }} params
 * @returns {{ nextTarget: [number, number, number], nextCameraPos: [number, number, number] }}
 */
export function followOrbitTargetStep({
  controlsTarget,
  cameraPos,
  characterPos,
  heightOffset = ORBIT_TARGET_HEIGHT_OFFSET,
}) {
  const nextTarget = getCharacterCameraTarget(characterPos, heightOffset);
  const dx = nextTarget[0] - (controlsTarget?.[0] ?? nextTarget[0]);
  const dy = nextTarget[1] - (controlsTarget?.[1] ?? nextTarget[1]);
  const dz = nextTarget[2] - (controlsTarget?.[2] ?? nextTarget[2]);

  return {
    nextTarget,
    nextCameraPos: [
      (cameraPos?.[0] ?? 0) + dx,
      (cameraPos?.[1] ?? 0) + dy,
      (cameraPos?.[2] ?? 0) + dz,
    ],
  };
}
