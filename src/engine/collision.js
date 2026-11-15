/**
 * @fileoverview 2D XZ footprint collision geometry and smooth wall-sliding solver
 * matching `Moon_base.glb` world-space structures (compound walls, solar bay/panels,
 * oxygen cylinders, habitat hub, greenhouse dome, communications antenna, and rover pad).
 */

export const WALK_BOUNDS = {
  minX: -11.5,
  maxX: 11.5,
  minZ: -9.5,
  maxZ: 9.5,
};

export const PLAYER_RADIUS = 0.22;

/**
 * Static AABB colliders always present from Sol 1 (world XZ coordinates at floor level).
 * Derived directly from `Moon_base.glb` geometry at position `[0.6, -0.72, -0.3]`, scale `0.42`.
 */
export const BASE_STATIC_BOXES = [
  // Base Courtyard Perimeter Parapet Walls (opening on East side Z in [-1.58..0.90])
  { id: 'west_wall', minX: -1.28, maxX: -1.04, minZ: -7.02, maxZ: 6.42 },
  { id: 'north_wall', minX: -1.28, maxX: 6.14, minZ: -7.02, maxZ: -6.78 },
  { id: 'south_wall', minX: -1.28, maxX: 6.14, minZ: 6.18, maxZ: 6.42 },
  { id: 'east_wall_north', minX: 5.88, maxX: 6.14, minZ: -7.02, maxZ: -1.58 },
  { id: 'east_wall_south', minX: 5.88, maxX: 6.14, minZ: 0.90, maxZ: 6.42 },

  // Central Shield & Habitat Hub (`base+shield`)
  { id: 'base_hub', minX: 2.82, maxX: 4.05, minZ: -0.80, maxZ: 0.20 },

  // Pressurized Oxygen Storage Manifold & Twin Cylinder Racks (`oxygen_storage`)
  { id: 'oxygen_rack', minX: 2.10, maxX: 4.54, minZ: -5.37, maxZ: -1.60 },
  { id: 'oxygen_corridor', minX: 3.04, maxX: 3.60, minZ: -1.62, maxZ: -0.56 },

  // Rover Pad Platform (`rover_pad`)
  { id: 'rover_pad', minX: 2.80, maxX: 4.43, minZ: 4.33, maxZ: 5.73 },

  // Excavated Underground Solar Bay Housing (`base_metal` pit)
  { id: 'solar_bay', minX: -6.72, maxX: -1.80, minZ: -5.20, maxZ: 3.36 },
];

/**
 * Returns all active AABB boxes and cylindrical circles for the current mission state.
 * @param {{ sol?: number, panelsOut?: boolean, solarBroken?: boolean }} options
 */
export function getActiveObstacles({ sol = 1, panelsOut = true, solarBroken = false } = {}) {
  const boxes = [...BASE_STATIC_BOXES];
  const circles = [];

  if (panelsOut && !solarBroken) {
    // Extended photovoltaic wings overhang past the west edge of the solar bay
    boxes.push({
      id: 'solar_panels_extended',
      minX: -7.42,
      maxX: -2.84,
      minZ: -5.20,
      maxZ: 3.36,
    });
  }

  if ((sol ?? 1) >= 2) {
    boxes.push(
      {
        id: 'greenhouse_corridor',
        minX: 3.04,
        maxX: 3.60,
        minZ: 0.02,
        maxZ: 1.56,
      },
      {
        id: 'greenhouse_rover_gap',
        minX: 2.80,
        maxX: 4.43,
        minZ: 3.00,
        maxZ: 5.73,
      }
    );
    circles.push({
      id: 'greenhouse_dome',
      cx: 3.32,
      cz: 2.71,
      r: 1.28,
    });
  }

  if ((sol ?? 1) >= 3) {
    boxes.push({
      id: 'antenna_bridge',
      minX: 1.55,
      maxX: 3.02,
      minZ: -0.58,
      maxZ: -0.02,
    });
    circles.push({
      id: 'antenna_tower',
      cx: 0.58,
      cz: -0.30,
      r: 1.13,
    });
  }

  return { boxes, circles };
}

function clampToBounds(x, z, bounds, radius) {
  return {
    x: Math.max(bounds.minX + radius, Math.min(bounds.maxX - radius, x)),
    z: Math.max(bounds.minZ + radius, Math.min(bounds.maxZ - radius, z)),
  };
}

function pushCircleOutOfAabb(x, z, radius, box) {
  const closestX = Math.max(box.minX, Math.min(box.maxX, x));
  const closestZ = Math.max(box.minZ, Math.min(box.maxZ, z));
  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) {
    return { x, z };
  }

  if (distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    return {
      x: x + (dx / dist) * push,
      z: z + (dz / dist) * push,
    };
  }

  // Center is inside AABB: eject along shallowest axis
  const dLeft = x - box.minX;
  const dRight = box.maxX - x;
  const dTop = z - box.minZ;
  const dBottom = box.maxZ - z;
  const minPen = Math.min(dLeft, dRight, dTop, dBottom);

  if (minPen === dLeft) return { x: box.minX - radius, z };
  if (minPen === dRight) return { x: box.maxX + radius, z };
  if (minPen === dTop) return { x, z: box.minZ - radius };
  return { x, z: box.maxZ + radius };
}

function pushCircleOutOfCircle(x, z, radius, circle) {
  const dx = x - circle.cx;
  const dz = z - circle.cz;
  const minDist = radius + circle.r;
  const distSq = dx * dx + dz * dz;

  if (distSq >= minDist * minDist) {
    return { x, z };
  }

  const dist = Math.sqrt(distSq);
  if (dist > 1e-6) {
    return {
      x: circle.cx + (dx / dist) * minDist,
      z: circle.cz + (dz / dist) * minDist,
    };
  }

  return { x: circle.cx, z: circle.cz + minDist };
}

/**
 * Resolves a desired XZ position against all active outpost walls and structures
 * using iterative circle-vs-AABB and circle-vs-circle pushout for smooth sliding.
 *
 * @param {number} targetX
 * @param {number} targetZ
 * @param {{ sol?: number, panelsOut?: boolean, solarBroken?: boolean, bounds?: typeof WALK_BOUNDS, radius?: number }} options
 * @returns {{ x: number, z: number }}
 */
export function resolveCharacterMovement(targetX, targetZ, options = {}) {
  const bounds = options.bounds || WALK_BOUNDS;
  const radius = options.radius ?? PLAYER_RADIUS;
  const { boxes, circles } = getActiveObstacles(options);

  let { x, z } = clampToBounds(targetX, targetZ, bounds, radius);

  for (let pass = 0; pass < 4; pass += 1) {
    for (let i = 0; i < boxes.length; i += 1) {
      ({ x, z } = pushCircleOutOfAabb(x, z, radius, boxes[i]));
    }
    for (let i = 0; i < circles.length; i += 1) {
      ({ x, z } = pushCircleOutOfCircle(x, z, radius, circles[i]));
    }
    ({ x, z } = clampToBounds(x, z, bounds, radius));
  }

  return { x, z };
}

/**
 * Checks whether a candidate XZ point intersects any solid collider or lies outside bounds.
 */
export function isPositionBlocked(x, z, options = {}) {
  const bounds = options.bounds || WALK_BOUNDS;
  const radius = options.radius ?? PLAYER_RADIUS;
  if (
    x < bounds.minX + radius ||
    x > bounds.maxX - radius ||
    z < bounds.minZ + radius ||
    z > bounds.maxZ - radius
  ) {
    return true;
  }

  const resolved = resolveCharacterMovement(x, z, options);
  return Math.hypot(resolved.x - x, resolved.z - z) > 1e-4;
}
