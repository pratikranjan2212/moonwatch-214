/**
 * @fileoverview Level configurations (Levels 1–3), Commander Nova metadata,
 * and starter crew definitions (Engineer, Doctor, Botanist, Pilot).
 */

import { BALANCE } from './balance.js';

/**
 * Valid crew mood reaction states for HUD portraits and 3D/2D sprite actors.
 */
export const CREW_MOODS = ['idle', 'worried', 'run-to-shelter', 'cheer', 'exhausted'];

/**
 * Player avatar metadata (Commander Nova).
 */
export const COMMANDER = {
  id: 'commander-nova',
  name: 'Commander Nova',
  callsign: 'Nova',
  role: 'Mission Commander',
  personality: 'Calm, decisive',
  bio: 'Mission Commander of Shackleton Outpost. Coordinates power, shielding, and crew safety across the lunar day-night cycle.',
  portrait: 'commander',
  sprite: 'commander',
};

/**
 * Starter crew of 4 specialists.
 */
export const STARTER_CREW = [
  {
    id: 'engineer',
    name: 'Kip Vance',
    role: 'Engineer',
    domain: 'Power and repairs',
    personality: 'Practical, jokes under stress',
    bio: 'Keeps the solar array and battery bank humming even when regolith dust coats the hinges.',
    health: BALANCE.startingCrewHealth,
    mood: 'idle',
    portrait: 'engineer',
    sprite: 'engineer',
  },
  {
    id: 'doctor',
    name: 'Dr. Mei Lin',
    role: 'Doctor',
    domain: 'Crew health',
    personality: 'Gentle, cautious',
    bio: 'Monitors cabin oxygen and radiation dosimeters so every crew member stays fit for lunar duty.',
    health: BALANCE.startingCrewHealth,
    mood: 'idle',
    portrait: 'doctor',
    sprite: 'doctor',
  },
  {
    id: 'botanist',
    name: 'Soli Patel',
    role: 'Botanist',
    domain: 'Greenhouse (L2)',
    personality: 'Cheerful, nature-loving',
    bio: 'Tends the hydroponic dwarf-wheat dome that scrubs CO₂ and boosts fresh oxygen in Level 2.',
    health: BALANCE.startingCrewHealth,
    mood: 'idle',
    portrait: 'botanist',
    sprite: 'botanist',
  },
  {
    id: 'pilot',
    name: 'Juno Reyes',
    role: 'Pilot',
    domain: 'Rover and comms',
    personality: 'Bold, restless',
    bio: 'Steers the lunar rover and aligns the high-gain dish to keep Houston telemetry locked.',
    health: BALANCE.startingCrewHealth,
    mood: 'idle',
    portrait: 'pilot',
    sprite: 'pilot',
  },
];

/**
 * Returns a fresh deep-cloned array of the 4 starter crew members.
 *
 * @returns {Array<{id:string, name:string, role:string, domain:string, personality:string, bio:string, health:number, mood:string, portrait:string, sprite:string}>}
 */
export function createInitialCrew() {
  return STARTER_CREW.map((member) => ({
    ...member,
    health: BALANCE.startingCrewHealth,
    mood: 'idle',
  }));
}

/**
 * Level definitions indexed by level number (1, 2, 3).
 */
export const LEVELS = {
  1: {
    id: 1,
    level: 1,
    name: 'Power Basics',
    theme: 'Power basics',
    subtitle: 'Solar, Battery, Lunar Night & Sol 214',
    targetSols: 14,
    sols: 14,
    missionStartSol: 207, // Sol 1 = Mission Sol 208, Sol 7 = Mission Sol 214
    sol214Sol: 7,
    hasSol214Choice: true,
    introduces: ['Solar panels', 'Battery reserve', 'Lunar night', 'Solar flares', 'Sol 214 choice'],
    mechanics: {
      solar: true,
      battery: true,
      lunarNight: true,
      flares: true,
      dustStorms: true,
      sol214: true,
      greenhouse: false,
      commsDelay: false,
    },
    hazardBudget: {
      flares: 2,
      cmes: 1,
      dustStorms: 1,
      commsDelays: 0,
    },
    briefing: {
      headline: 'Level 1: Power Basics & The Sol 214 Super-Flare',
      summary:
        'Keep Shackleton Outpost powered for 14 Sols. Charge batteries during daylight, conserve power through the 3-Sol lunar night, and prepare for the massive Sol 214 solar storm!',
      objectives: [
        'Survive 14 Sols with cabin Oxygen and Crew Health above zero.',
        'Store battery power before Lunar Night (Sols 4–6 and 11–13).',
        'Make the critical 10-second decision when the Sol 214 X-Class flare strikes on Sol 7.',
      ],
    },
  },

  2: {
    id: 2,
    level: 2,
    name: 'Life Support & Greenhouse',
    theme: 'Life support',
    subtitle: 'Greenhouse, Oxygen/CO₂ Balance & Crew Health',
    targetSols: 21,
    sols: 21,
    missionStartSol: 221,
    sol214Sol: null,
    hasSol214Choice: false,
    introduces: ['Hydroponic Greenhouse', 'CO₂ scrubbing', 'Crew health management'],
    mechanics: {
      solar: true,
      battery: true,
      lunarNight: true,
      flares: true,
      dustStorms: true,
      sol214: false,
      greenhouse: true,
      commsDelay: false,
    },
    hazardBudget: {
      flares: 3,
      cmes: 1,
      dustStorms: 2,
      commsDelays: 0,
    },
    briefing: {
      headline: 'Level 2: Life Support & Hydroponic Greenhouse',
      summary:
        'Extend operations to 21 Sols! Rising cabin CO₂ drains extra oxygen each Sol. Water and tend Botanist Soli’s greenhouse to naturally scrub CO₂ and keep the crew healthy.',
      objectives: [
        'Survive 21 Sols across three lunar day-night cycles.',
        `Water and tend the Greenhouse to offset cabin CO₂ build-up (+${BALANCE.greenhouse.oxygenBoost} O₂/Sol).`,
        'Protect the crew from multi-Sol CMEs and dust storms.',
      ],
    },
  },

  3: {
    id: 3,
    level: 3,
    name: 'Communications & Earth Delay',
    theme: 'Communications',
    subtitle: 'Earth Signal Delay, High-Gain Antenna & Deep Space Weather',
    targetSols: 28,
    sols: 28,
    missionStartSol: 242,
    sol214Sol: null,
    hasSol214Choice: false,
    commsDelaySols: BALANCE.comms.defaultDelaySols,
    introduces: ['Earth comms delay queue', 'High-gain antenna sync', 'Delayed telemetry boosts'],
    mechanics: {
      solar: true,
      battery: true,
      lunarNight: true,
      flares: true,
      dustStorms: true,
      sol214: false,
      greenhouse: true,
      commsDelay: true,
    },
    hazardBudget: {
      flares: 3,
      cmes: 2,
      dustStorms: 2,
      commsDelays: 2,
    },
    briefing: {
      headline: 'Level 3: Deep Comms & Solar Maximum',
      summary:
        'Command a full 28-Sol lunar month during peak solar activity! Radio interference delays Earth instructions by 2–3 Sols. Queue antenna packets ahead of time and rely on your local forecast.',
      objectives: [
        'Survive 28 Sols through intense solar flares, CMEs, and comms blackouts.',
        'Queue Earth Comms via the high-gain antenna to receive delayed power and shield calibrations.',
        'Act on the local forecast instead of waiting for delayed Earth orders.',
      ],
    },
  },
};

export const LEVEL_LIST = [LEVELS[1], LEVELS[2], LEVELS[3]];

/**
 * Retrieves the configuration object for the requested level (defaults to Level 1).
 *
 * @param {number} [levelNumber=1]
 * @returns {typeof LEVELS[1]}
 */
export function getLevelConfig(levelNumber = 1) {
  const numeric = Number(levelNumber);
  return LEVELS[numeric] || LEVELS[1];
}

export default LEVELS;
