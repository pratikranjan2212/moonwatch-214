/**
 * @fileoverview Debrief cause-chain builder `buildDebrief(state)`.
 * Converts `causeLog` and final GameState into 3–5 linked cause-chain cards
 * (e.g., Flare hit -> Panels left out -> Battery drained -> Oxygen systems off -> Crew health fell),
 * each with a one-line science explanation and a "Try this instead" tip, plus summary stats
 * and a `primaryCause` string.
 */

import { getFactSheet } from './events.js';
import { getLevelConfig } from './levels.js';

/**
 * Canonical causal stage ordering so Debrief cards read as a natural cause-and-effect chain:
 * Stage 1 (Hazard) -> Stage 2 (Exposure/Choice) -> Stage 3 (Power/Grid) -> Stage 4 (Life Support/O2) -> Stage 5 (Crew/Outcome).
 */
const CAUSE_STAGE_ORDER = {
  flare: 1,
  cme: 1,
  sol214: 1,
  dust: 1,
  night: 1,
  comms: 1,
  'panels-exposed': 2,
  'low-oxygen-mode': 2,
  'greenhouse-neglected': 2,
  'greenhouse': 2,
  'comms-queued': 2,
  'comms-delivered': 3,
  'battery-drained': 3,
  'oxygen-off': 4,
  'low-oxygen': 4,
  'oxygen-depleted': 4,
  'crew-health-fell': 5,
};

/**
 * Clean display titles matching DESIGN_DOC cause-chain examples.
 */
const CANONICAL_TITLES = {
  flare: 'Flare hit',
  cme: 'CME storm hit',
  sol214: 'Sol 214 super-flare',
  dust: 'Dust storm hit',
  night: 'Lunar night',
  comms: 'Comms delay',
  'panels-exposed': 'Panels left out',
  'battery-drained': 'Battery drained',
  'oxygen-off': 'Oxygen systems off',
  'low-oxygen': 'Cabin oxygen low',
  'oxygen-depleted': 'Oxygen depleted',
  'low-oxygen-mode': 'Low oxygen mode',
  'greenhouse-neglected': 'Greenhouse wilted',
  greenhouse: 'Greenhouse tended',
  'comms-delivered': 'Earth telemetry arrived',
  'comms-queued': 'Earth telemetry queued',
  'crew-health-fell': 'Crew health fell',
};

/**
 * Default fallback cards used to complete a 3–5 card causal chain when a run has fewer raw entries.
 */
const FALLBACK_CHAIN_TEMPLATES = {
  hazard: {
    sol: 1,
    cause: 'flare',
    title: 'Flare hit',
    label: 'Flare hit',
    effect: 'Solar radiation wave swept across Shackleton Outpost',
    mitigatedBy: null,
    scienceFact: getFactSheet('flare').oneLineFact,
    tip: getFactSheet('flare').tryThisTip,
  },
  exposure: {
    sol: 2,
    cause: 'panels-exposed',
    title: 'Panels left out',
    label: 'Panels left out',
    effect: 'Extended solar arrays absorbed storm surge and dust abrasion',
    mitigatedBy: null,
    scienceFact:
      'Extended solar panels act like antennas during solar storms, channeling surges into batteries.',
    tip: 'Retract solar panels before a flare or dust storm strikes.',
  },
  battery: {
    sol: 4,
    cause: 'battery-drained',
    title: 'Battery drained',
    label: 'Battery drained',
    effect: 'Habitat battery reserve dropped to 0%',
    mitigatedBy: null,
    scienceFact:
      'During the 14-Earth-day lunar night, solar panels produce zero power and habitats rely on batteries.',
    tip: 'Charge batteries above 75% before Lunar Night and avoid running the shield unnecessarily.',
  },
  oxygen: {
    sol: 5,
    cause: 'oxygen-off',
    title: 'Oxygen systems off',
    label: 'Oxygen systems off',
    effect: 'Life-support electrolysis offline; cabin oxygen fell rapidly',
    mitigatedBy: null,
    scienceFact:
      'Splitting water into breathable oxygen on the Moon requires continuous electrical power.',
    tip: 'Keep battery power above 0% or switch Oxygen to High before reserves run low.',
  },
  crew: {
    sol: 6,
    cause: 'crew-health-fell',
    title: 'Crew health fell',
    label: 'Crew health fell',
    effect: 'Crew suffered hypoxia and radiation fatigue',
    mitigatedBy: null,
    scienceFact:
      'Astronauts need steady atmospheric pressure, warmth, and radiation shielding to stay healthy.',
    tip: 'Raise the Shield dome during flares and keep Oxygen on Normal or High.',
  },
};

/**
 * Normalizes a raw causeLog item into a complete Debrief card object.
 *
 * @param {Object} entry
 * @param {number} index
 * @param {number} total
 * @returns {Object}
 */
function formatCard(entry, index, total) {
  const causeKey = String(entry.cause || 'flare');
  const title = entry.title || CANONICAL_TITLES[causeKey] || entry.label || 'Mission event';
  const scienceFact =
    entry.scienceFact ||
    getFactSheet(causeKey)?.oneLineFact ||
    'Space weather and power allocation directly affect life support on the Moon.';
  const rawTip =
    entry.tip ||
    getFactSheet(causeKey)?.tryThisTip ||
    'Check the 3-Sol forecast panel before allocating power each Sol.';
  const tip = String(rawTip).replace(/^Try this instead:\s*/i, '').trim();

  return {
    id: `debrief-card-${index + 1}`,
    step: index + 1,
    sol: Number(entry.sol || index + 1),
    cause: causeKey,
    title,
    label: title,
    effect: String(entry.effect || 'Impacted outpost systems'),
    mitigatedBy: entry.mitigatedBy ?? null,
    scienceFact,
    tip,
    tryThisInstead: tip,
    linkedToNext: index < total - 1,
  };
}

/**
 * Determines the primaryCause slug from the state and causeLog.
 *
 * @param {Object} state
 * @param {Array<Object>} causeLog
 * @returns {string}
 */
function resolvePrimaryCause(state, causeLog) {
  if (state?.status === 'won') {
    return 'mission_complete';
  }

  const causes = new Set(causeLog.map((c) => c.cause));
  if (causes.has('sol214') && state?.sol214?.decision === 'leave-out') {
    return 'sol214_panels_exposed';
  }
  if (causes.has('battery-drained') || causes.has('oxygen-off')) {
    return 'battery_drained';
  }
  if ((state?.gauges?.oxygen ?? 100) <= 0 || causes.has('oxygen-depleted')) {
    return 'oxygen_depleted';
  }
  const unshieldedFlare = causeLog.find(
    (c) => (c.cause === 'flare' || c.cause === 'cme') && !c.mitigatedBy
  );
  if (unshieldedFlare) {
    return 'unshielded_flare';
  }
  if (causes.has('greenhouse-neglected')) {
    return 'greenhouse_neglected';
  }
  if (state?.crew?.every((c) => c.health <= 0)) {
    return 'crew_health_zero';
  }
  return 'resource_depletion';
}

/**
 * Builds the Debrief analysis from a GameState (or raw causeLog array).
 * Always returns 3–5 linked cause-chain cards with one-line science facts,
 * actionable tips, summary statistics, and `primaryCause`.
 *
 * @param {Object|Array<Object>} stateOrCauseLog
 * @param {Object} [optionalState]
 * @returns {{
 *   outcome: 'won'|'lost'|'playing',
 *   headline: string,
 *   summary: string,
 *   primaryCause: string,
 *   causeChainText: string,
 *   cards: Array<{
 *     id: string,
 *     step: number,
 *     sol: number,
 *     cause: string,
 *     title: string,
 *     label: string,
 *     effect: string,
 *     mitigatedBy: string|null,
 *     scienceFact: string,
 *     tip: string,
 *     tryThisInstead: string,
 *     linkedToNext: boolean
 *   }>,
 *   stats: Object
 * }}
 */
export function buildDebrief(stateOrCauseLog, optionalState = undefined) {
  const isArrayInput = Array.isArray(stateOrCauseLog);
  const state = isArrayInput ? optionalState || {} : stateOrCauseLog || {};
  const causeLog = isArrayInput
    ? stateOrCauseLog
    : Array.isArray(state.causeLog)
      ? state.causeLog
      : [];

  const outcome = state.status || 'lost';
  const levelNum = Number(state.level || 1);
  const levelConfig = getLevelConfig(levelNum);
  const targetSols = Number(state.targetSols || levelConfig.targetSols || 14);
  const solsSurvived =
    typeof state.solsSurvived === 'number'
      ? state.solsSurvived
      : outcome === 'won'
        ? targetSols
        : Math.max(0, Number(state.sol || 1) - 1);

  const primaryCause = resolvePrimaryCause(state, causeLog);

  // Deduplicate causeLog by canonical cause type, keeping the most impactful/latest entry per stage
  const byCause = new Map();
  causeLog.forEach((entry) => {
    if (!entry || !entry.cause) return;
    const key = entry.cause === 'cme' ? 'flare' : entry.cause;
    // Prefer unmitigated failures when outcome is lost, or mitigated successes when won
    const existing = byCause.get(key);
    if (!existing) {
      byCause.set(key, entry);
    } else if (outcome !== 'won' && !entry.mitigatedBy && existing.mitigatedBy) {
      byCause.set(key, entry);
    } else if (outcome === 'won' && entry.mitigatedBy && !existing.mitigatedBy) {
      byCause.set(key, entry);
    } else {
      byCause.set(key, entry);
    }
  });

  let selectedEntries = [];

  if (outcome === 'won') {
    // Build a 3–5 card mission victory highlights chain
    const mitigatedEntries = causeLog.filter((c) => Boolean(c.mitigatedBy));
    const pool = mitigatedEntries.length >= 3 ? mitigatedEntries : causeLog;
    const uniqueByCause = [];
    const seen = new Set();
    for (let i = 0; i < pool.length; i += 1) {
      const item = pool[i];
      if (!seen.has(item.cause)) {
        seen.add(item.cause);
        uniqueByCause.push({
          ...item,
          title: item.label || CANONICAL_TITLES[item.cause] || 'Hazard managed',
        });
      }
      if (uniqueByCause.length === 4) break;
    }

    selectedEntries = uniqueByCause;

    // Ensure at least 3 cards on victory
    const victoryFallbacks = [
      {
        sol: 4,
        cause: 'night',
        title: 'Lunar night survived',
        effect: 'Battery reserves carried the habitat through 3 dark Sols',
        mitigatedBy: 'batteryReserve',
        scienceFact: getFactSheet('night').oneLineFact,
        tip: getFactSheet('night').tryThisTip,
      },
      {
        sol: 7,
        cause: 'sol214',
        title: 'Sol 214 storm weathered',
        effect: 'Commander Nova guided the crew safely through peak solar activity',
        mitigatedBy: 'shield',
        scienceFact: getFactSheet('sol214').oneLineFact,
        tip: getFactSheet('sol214').tryThisTip,
      },
      {
        sol: targetSols,
        cause: 'crew-health-fell',
        title: 'Crew safe at mission end',
        effect: `Survived all ${targetSols} Sols with life support online`,
        mitigatedBy: 'commander',
        scienceFact:
          'Smart power management and space-weather forecasting keep lunar habitats safe.',
        tip: 'Try the next level to test your skills with Hydroponic Greenhouses and Earth Comms Delay!',
      },
    ];

    for (let i = 0; i < victoryFallbacks.length && selectedEntries.length < 3; i += 1) {
      selectedEntries.push(victoryFallbacks[i]);
    }
  } else {
    // Lost or incomplete run: assemble the classic cause-and-effect chain (up to 5 cards):
    // 1. Hazard (flare / cme / sol214 / dust / night)
    // 2. Exposure (panels-exposed / low-oxygen-mode / greenhouse-neglected)
    // 3. Battery drained (battery-drained)
    // 4. Oxygen systems off / low (oxygen-off / oxygen-depleted / low-oxygen)
    // 5. Crew health fell (crew-health-fell)
    const chainCandidates = [];

    const hazardEntry =
      byCause.get('flare') ||
      byCause.get('sol214') ||
      byCause.get('dust') ||
      byCause.get('night') ||
      byCause.get('comms');
    if (hazardEntry) {
      chainCandidates.push({
        ...hazardEntry,
        title: CANONICAL_TITLES[hazardEntry.cause] || hazardEntry.label,
      });
    }

    const exposureEntry =
      byCause.get('panels-exposed') ||
      byCause.get('greenhouse-neglected') ||
      byCause.get('low-oxygen-mode');
    if (exposureEntry) {
      chainCandidates.push({
        ...exposureEntry,
        title: CANONICAL_TITLES[exposureEntry.cause] || exposureEntry.label,
      });
    }

    const batteryEntry = byCause.get('battery-drained');
    if (batteryEntry) {
      chainCandidates.push({
        ...batteryEntry,
        title: 'Battery drained',
      });
    }

    const oxygenEntry =
      byCause.get('oxygen-off') || byCause.get('oxygen-depleted') || byCause.get('low-oxygen');
    if (oxygenEntry) {
      chainCandidates.push({
        ...oxygenEntry,
        title: CANONICAL_TITLES[oxygenEntry.cause] || 'Oxygen systems off',
      });
    }

    const crewEntry = byCause.get('crew-health-fell');
    if (crewEntry) {
      chainCandidates.push({
        ...crewEntry,
        title: 'Crew health fell',
      });
    }

    // Sort by causal stage order so the narrative flows naturally
    chainCandidates.sort(
      (a, b) => (CAUSE_STAGE_ORDER[a.cause] || 3) - (CAUSE_STAGE_ORDER[b.cause] || 3)
    );

    selectedEntries = chainCandidates;

    // Pad with contextually appropriate fallback links if fewer than 3 entries were logged
    const fallbackOrder = [
      FALLBACK_CHAIN_TEMPLATES.hazard,
      FALLBACK_CHAIN_TEMPLATES.exposure,
      FALLBACK_CHAIN_TEMPLATES.battery,
      FALLBACK_CHAIN_TEMPLATES.oxygen,
      FALLBACK_CHAIN_TEMPLATES.crew,
    ];
    for (let i = 0; i < fallbackOrder.length && selectedEntries.length < 3; i += 1) {
      const candidate = fallbackOrder[i];
      if (!selectedEntries.some((e) => e.title === candidate.title)) {
        selectedEntries.push({ ...candidate });
      }
    }

    // Re-sort after any padding
    selectedEntries.sort(
      (a, b) => (CAUSE_STAGE_ORDER[a.cause] || 3) - (CAUSE_STAGE_ORDER[b.cause] || 3)
    );
  }

  // Clamp to 3–5 cards
  const clampedEntries = selectedEntries.slice(0, 5);
  const cards = clampedEntries.map((entry, idx) => formatCard(entry, idx, clampedEntries.length));

  const causeChainText = cards.map((c) => c.title).join(' → ');

  const crewArray = Array.isArray(state.crew) ? state.crew : [];
  const totalCrew = crewArray.length || 4;
  const survivingCrew = crewArray.length
    ? crewArray.filter((c) => c.health > 0).length
    : outcome === 'won'
      ? 4
      : 0;
  const averageCrewHealth = crewArray.length
    ? Math.round(crewArray.reduce((sum, c) => sum + c.health, 0) / crewArray.length)
    : outcome === 'won'
      ? 80
      : 0;

  const hazardsFaced = causeLog.filter((c) =>
    ['flare', 'cme', 'dust', 'sol214', 'comms'].includes(c.cause)
  ).length;
  const hazardsMitigated = causeLog.filter((c) => Boolean(c.mitigatedBy)).length;

  const headline =
    outcome === 'won'
      ? `Mission Success! Outpost Survived ${targetSols} Sols`
      : `Mission Debrief — Outpost Lost on Sol ${Math.max(1, solsSurvived + 1)}`;

  const summary =
    outcome === 'won'
      ? `Commander Nova led the crew through ${targetSols} Sols of lunar day-night cycles and real NASA space weather. Cause chain: ${causeChainText}.`
      : `Here is how one event led to another: ${causeChainText}. Review the science notes below and replay with a new strategy!`;

  return {
    outcome,
    headline,
    summary,
    primaryCause,
    causeChainText,
    cards,
    stats: {
      level: levelNum,
      seed: state.seed ?? 2142026,
      solsSurvived,
      targetSols,
      finalPower: state.gauges?.power ?? 0,
      finalOxygen: state.gauges?.oxygen ?? 0,
      finalShield: state.gauges?.shield ?? 0,
      survivingCrew,
      totalCrew,
      averageCrewHealth,
      hazardsFaced,
      hazardsMitigated,
      sol214Decision: state.sol214?.decision ?? null,
    },
  };
}

export const build = buildDebrief;
export default buildDebrief;
