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
