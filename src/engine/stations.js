/**
 * @fileoverview Base Station definitions for physical character interaction.
 * Specifies world coordinates, required interaction points, system keys,
 * and day-based infrastructure progression requirements.
 */

export const BASE_STATIONS = {
  shield: {
    id: 'shield',
    name: 'Main Shield Station',
    shortName: 'Shield Dome',
    icon: '🛡️',
    color: '#8E6CFF',
    // Position on lunar ground apron (Y = -0.45 center -> feet at Y = -0.72 ground)
    position: [0.0, -0.45, 1.8],
    interactPoints: [
      [0.0, -0.45, 1.8],
      [1.4, -0.45, 0.25],
    ],
    interactRadius: 1.75,
    lookAt: [0.0, 0.4, 0.0],
    description: 'Central Base Airlock & Radiation Shield Generator',
    unlockSol: 1,
    actionKey: 'shieldOn',
  },
  solar: {
    id: 'solar',
    name: 'Solar Panel Installation',
    shortName: 'Solar Array',
    icon: '☀️',
    color: '#FFB020',
    position: [-2.8, -0.45, 0.8],
    interactPoints: [
      [-2.8, -0.45, 0.8],
      [-4.25, -0.45, -0.85],
      [-4.25, -0.45, 0.8],
    ],
    interactRadius: 2.0,
    lookAt: [-4.2, 0.0, 0.5],
    description: 'Articulated Photovoltaic Deployment Controls',
    unlockSol: 1,
    actionKey: 'panelsOut',
  },
  oxygen: {
    id: 'oxygen',
    name: 'Oxygen Storage Station',
    shortName: 'Oxygen Supply',
    icon: '💧',
    color: '#35D0E6',
    position: [2.0, -0.45, -1.4],
    interactPoints: [
      [2.0, -0.45, -1.4],
      [3.32, -0.45, -1.46],
    ],
    interactRadius: 1.65,
    lookAt: [3.2, 0.0, -1.4],
    description: 'Pressurized O₂ Life Support Storage & Regulation',
    unlockSol: 1,
    actionKey: 'oxygenLevel',
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Greenhouse Control Station',
    shortName: 'Greenhouse Deck',
    icon: '🌿',
    color: '#34D399',
    position: [2.2, -0.45, 1.4],
    interactPoints: [
      [2.2, -0.45, 1.4],
      [3.32, -0.45, 2.71],
    ],
    interactRadius: 1.8,
    lookAt: [3.2, 0.2, 1.8],
    description: 'Hydroponics & Crop Irrigation Management',
    unlockSol: 2,
    actionKey: 'greenhouse',
  },
  comms: {
    id: 'comms',
    name: 'Earth Communications Unit',
    shortName: 'Earth Comms',
    icon: '📡',
    color: '#60A5FA',
    position: [0.6, -0.45, -1.6],
    interactPoints: [
      [0.6, -0.45, -1.6],
      [0.58, -0.45, -0.3],
    ],
    interactRadius: 1.4,
    lookAt: [1.2, 1.2, -1.6],
    description: 'Deep Space High-Gain Antenna Terminal',
    unlockSol: 3,
    actionKey: 'queueComms',
  },
};

/**
 * Checks whether a given station is unlocked on the specified Sol.
 * @param {string} stationId
 * @param {number} sol
 * @returns {boolean}
 */
export function isStationUnlocked(stationId, sol = 1) {
  const station = BASE_STATIONS[stationId];
  if (!station) return false;
  return (sol ?? 1) >= (station.unlockSol ?? 1);
}

/**
 * Computes minimum XZ distance from character position to a station's beacon or mesh anchors.
 * @param {number[]} characterPosition
 * @param {string|Object} stationOrId
 * @returns {number}
 */
export function getDistanceToStation(characterPosition = [0, -0.45, 1.8], stationOrId) {
  const station =
    typeof stationOrId === 'string' ? BASE_STATIONS[stationOrId] : stationOrId;
  if (!station) return Infinity;
  const cx = characterPosition?.[0] ?? 0;
  const cz = characterPosition?.[2] ?? 0;
  const points =
    Array.isArray(station.interactPoints) && station.interactPoints.length > 0
      ? station.interactPoints
      : [station.position];

  let minDist = Infinity;
  for (const pt of points) {
    const d = Math.hypot(cx - pt[0], cz - pt[2]);
    if (d < minDist) {
      minDist = d;
    }
  }
  return minDist;
}

/**
 * Checks whether the player character is close enough to physically interact with a station.
 * @param {number[]} characterPosition
 * @param {string|Object} stationOrId
 * @returns {boolean}
 */
export function isNearStation(characterPosition, stationOrId) {
  const station =
    typeof stationOrId === 'string' ? BASE_STATIONS[stationOrId] : stationOrId;
  if (!station) return false;
  const radius = station.interactRadius ?? 1.6;
  return getDistanceToStation(characterPosition, station) <= radius;
}

/**
 * Finds the nearest station to the player character and whether it is in interaction range.
 * @param {number[]} characterPosition
 * @param {number} [sol=1]
 * @returns {{ station: Object|null, distance: number, inRange: boolean }}
 */
export function findNearestStation(characterPosition = [0, -0.45, 1.8], sol = 1) {
  let bestInRange = null;
  let bestInRangeScore = Infinity;
  let bestOverall = null;
  let bestOverallDist = Infinity;

  for (const station of Object.values(BASE_STATIONS)) {
    const dist = getDistanceToStation(characterPosition, station);
    const radius = station.interactRadius ?? 1.6;

    if (dist < bestOverallDist) {
      bestOverallDist = dist;
      bestOverall = station;
    }

    if (dist <= radius) {
      // Slightly prefer unlocked stations if interaction halos brush near one another
      const score = isStationUnlocked(station.id, sol) ? dist : dist + 1.0;
      if (score < bestInRangeScore) {
        bestInRangeScore = score;
        bestInRange = { station, distance: dist, inRange: true };
      }
    }
  }

  if (bestInRange) return bestInRange;
  return {
    station: bestOverall,
    distance: bestOverallDist,
    inRange: false,
  };
}
