/**
 * @fileoverview Courtyard placement and roster split helpers for rendering
 * the controllable main astronaut and the four non-playable companion crew
 * members directly inside the lunar outpost environment.
 */

import { COMMANDER, STARTER_CREW } from './levels.js';

export const CHARACTER_META = {
  commander: {
    id: 'commander',
    name: COMMANDER.name,
    role: COMMANDER.role,
    color: '#FFB020',
  },
  engineer: {
    id: 'engineer',
    name: 'Kip Vance',
    role: 'Engineer',
    color: '#FF8F55',
  },
  doctor: {
    id: 'doctor',
    name: 'Dr. Mei Lin',
    role: 'Doctor',
    color: '#35D0E6',
  },
  botanist: {
    id: 'botanist',
    name: 'Soli Patel',
    role: 'Botanist',
    color: '#34D399',
  },
  pilot: {
    id: 'pilot',
    name: 'Juno Reyes',
    role: 'Pilot',
    color: '#8E6CFF',
  },
};

/**
 * Collision-free courtyard spots (verified against Sol 1–3 obstacles and
 * the -0.9m shelter offset during solar flares) for the four non-main crewmates.
 */
export const COMPANION_BASE_SPOTS = {
  engineer: {
    position: [-0.75, -0.45, -5.25],
    flipX: false,
    zone: 'North-West Courtyard',
  },
  doctor: {
    position: [1.72, -0.45, -5.55],
    flipX: true,
    zone: 'North Oxygen Walkway',
  },
  botanist: {
    position: [1.45, -0.45, 4.15],
    flipX: false,
    zone: 'Greenhouse Deck',
  },
  pilot: {
    position: [-0.65, -0.45, 3.95],
    flipX: false,
    zone: 'South Courtyard',
  },
};

function clampHealth(value) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : 100;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

/**
 * Splits the 5-person outpost roster into the single controllable main actor
 * and the 4 companion crew actors rendered in the 3D lunar outpost scene.
 *
 * @param {Object} params
 * @param {Object} [params.commander]
 * @param {Array<Object>} [params.crew]
 * @param {string} [params.selectedCrewId='commander']
 * @param {boolean} [params.isFlare=false]
 * @param {boolean} [params.shieldOn=false]
 * @param {boolean} [params.isLowPower=false]
 * @returns {{ mainActor: Object, companions: Array<Object> }}
 */
export function splitCrewForScene({
  commander = null,
  crew = [],
  selectedCrewId = 'commander',
  isFlare = false,
  shieldOn = false,
  isLowPower = false,
} = {}) {
  const normSelected =
    selectedCrewId === 'commander-nova' || !selectedCrewId ? 'commander' : selectedCrewId;

  const crewList =
    Array.isArray(crew) && crew.length > 0
      ? crew
      : STARTER_CREW.map((c) => ({ ...c, health: 100, mood: 'idle' }));

  const avgCrewHealth = clampHealth(
    crewList.reduce((sum, member) => sum + clampHealth(member.health), 0) / crewList.length
  );

  const commanderMood = isFlare
    ? shieldOn
      ? 'idle'
      : 'run-to-shelter'
    : isLowPower
      ? 'worried'
      : 'idle';

  const commanderActor = {
    id: 'commander',
    name: commander?.name || CHARACTER_META.commander.name,
    role: commander?.role || CHARACTER_META.commander.role,
    color: CHARACTER_META.commander.color,
    health: avgCrewHealth,
    mood: commanderMood,
  };

  const specialistActors = crewList.map((member) => {
    const meta = CHARACTER_META[member.id] || CHARACTER_META.engineer;
    return {
      id: member.id,
      name: member.name || meta.name,
      role: member.role || meta.role,
      color: meta.color,
      health: clampHealth(member.health),
      mood: member.mood || 'idle',
    };
  });

  if (normSelected === 'commander') {
    return {
      mainActor: commanderActor,
      companions: specialistActors.map((member) => ({
        ...member,
        ...(COMPANION_BASE_SPOTS[member.id] || COMPANION_BASE_SPOTS.engineer),
      })),
    };
  }

  const chosenSpecialist = specialistActors.find((member) => member.id === normSelected);
  if (!chosenSpecialist) {
    return {
      mainActor: commanderActor,
      companions: specialistActors.map((member) => ({
        ...member,
        ...(COMPANION_BASE_SPOTS[member.id] || COMPANION_BASE_SPOTS.engineer),
      })),
    };
  }

  const remainingSpecialists = specialistActors
    .filter((member) => member.id !== chosenSpecialist.id)
    .map((member) => ({
      ...member,
      ...(COMPANION_BASE_SPOTS[member.id] || COMPANION_BASE_SPOTS.engineer),
    }));

  const commanderCompanion = {
    ...commanderActor,
    ...(COMPANION_BASE_SPOTS[chosenSpecialist.id] || COMPANION_BASE_SPOTS.engineer),
  };

  return {
    mainActor: chosenSpecialist,
    companions: [commanderCompanion, ...remainingSpecialists],
  };
}

export default {
  CHARACTER_META,
  COMPANION_BASE_SPOTS,
  splitCrewForScene,
};
