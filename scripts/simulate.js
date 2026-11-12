/**
 * @fileoverview Console balance simulator for MOONWATCH: Sol 214.
 * Runs 1,000+ seeded simulations per strategy (first-time heuristic player,
 * cautious player, and optimal player) across Levels 1–3, prints summary tables,
 * and verifies that the Level 1 first-time player win rate is between 40% and 60%.
 */

import { buildDebrief } from '../src/engine/debrief.js';
import { getEventsForSol, normalizeEventType } from '../src/engine/events.js';
import { createRNG } from '../src/engine/rng.js';
import { createInitialState, resolveSol214Choice, tick } from '../src/engine/tick.js';

const NUM_RUNS = 1000;

/**
 * Strategy 1: Simulated First-Time Player (target Level 1 win rate: 40%–60%).
 * Models a 9–14 year old learning the controls on their first run:
 * - Reacts to some alerts, but is tempted to leave panels out after Lunar Night
 * - Sometimes leaves the shield on too long (draining battery) or forgets to raise it
 * - Uses Low Oxygen aggressively when scared by low battery, eroding crew health/oxygen
 */
export function firstTimeStrategy(state, agentRng) {
  const eventsToday = getEventsForSol(state.timeline, state.sol).map((e) => ({
    ...e,
    type: normalizeEventType(e.type || e.code),
  }));

  const hasFlareOrCme = eventsToday.some((e) => e.type === 'flare' || e.type === 'cme');
  const hasDust = eventsToday.some((e) => e.type === 'dust');
  const isNight = eventsToday.some((e) => e.type === 'night');
  const isSol214 = eventsToday.some((e) => e.type === 'sol214');

  // First-time player is tempted to leave panels out on Sol 214 because Sols 4-6 were Lunar Night!
  const sol214Decision = agentRng.chance(0.52) ? 'retract' : 'leave-out';

  let panelsOut = true;
  if (isSol214) {
    panelsOut = sol214Decision === 'leave-out';
  } else if (hasFlareOrCme) {
    // Only realizes flares surge extended panels about half the time
    panelsOut = !agentRng.chance(0.45);
  } else if (hasDust) {
    panelsOut = !agentRng.chance(0.5);
  } else if (isNight) {
    panelsOut = agentRng.chance(0.5);
  }

  // First-time player raises shield during flares ~58% of the time,
  // and sometimes leaves shield on during calm/night Sols (~28% of the time), draining battery!
  let shieldOn = false;
  if (hasFlareOrCme || isSol214) {
    shieldOn = agentRng.chance(0.58);
  } else {
    shieldOn = agentRng.chance(0.28);
  }

  // First-time player often switches to Low Oxygen when battery looks below 52%,
  // or boosts oxygen when it drops below 50%
  let oxygenLevel = 'normal';
  if (state.gauges.power < 52 && agentRng.chance(0.55)) {
    oxygenLevel = 'low';
  } else if (state.gauges.oxygen < 52 && state.gauges.power > 42 && agentRng.chance(0.55)) {
    oxygenLevel = 'high';
  }

  // Level 2 & 3 choices for first-timer
  const waterGreenhouse = state.level >= 2 && (!isNight || state.gauges.oxygen < 50) && agentRng.chance(0.58);
  const queueComms = state.level >= 3 && state.sol % 4 === 2 && agentRng.chance(0.55);

  return {
    panelsOut,
    shieldOn,
    oxygenLevel,
    waterGreenhouse,
    tendGreenhouse: waterGreenhouse,
    queueComms,
    sol214Decision,
  };
}

/**
 * Strategy 2: Cautious Player.
 * Prioritizes crew safety and shield protection, occasionally over-spending power on shields.
 */
export function cautiousStrategy(state, agentRng) {
  const eventsToday = getEventsForSol(state.timeline, state.sol).map((e) => ({
    ...e,
    type: normalizeEventType(e.type || e.code),
  }));

  const hasFlareOrCme = eventsToday.some((e) => e.type === 'flare' || e.type === 'cme');
  const hasDust = eventsToday.some((e) => e.type === 'dust');
  const isNight = eventsToday.some((e) => e.type === 'night');
  const isSol214 = eventsToday.some((e) => e.type === 'sol214');

  const sol214Decision = agentRng.chance(0.82) ? 'retract' : 'leave-out';

  let panelsOut = true;
  if (isSol214) {
    panelsOut = sol214Decision === 'leave-out';
  } else if (hasFlareOrCme || hasDust) {
    panelsOut = !agentRng.chance(0.78);
  } else if (isNight) {
    panelsOut = false;
  }

  const shieldOn = hasFlareOrCme || isSol214 ? agentRng.chance(0.88) : agentRng.chance(0.1);

  let oxygenLevel = 'normal';
  if (state.gauges.oxygen < 65 && state.gauges.power >= 45) {
    oxygenLevel = 'high';
  } else if (state.gauges.power < 22 && state.gauges.oxygen > 55) {
    oxygenLevel = 'low';
  }

  const waterGreenhouse =
    state.level >= 2 &&
    ((!isNight && state.gauges.power >= 25) || state.gauges.oxygen < 65) &&
    agentRng.chance(0.82);
  const queueComms =
    state.level >= 3 && !isNight && (state.sol === 2 || state.sol % 4 === 0) && agentRng.chance(0.8);

  return {
    panelsOut,
    shieldOn,
    oxygenLevel,
    waterGreenhouse,
    tendGreenhouse: waterGreenhouse,
    queueComms,
    sol214Decision,
  };
}

/**
 * Strategy 3: Optimal Player.
 * Reads the timeline cleanly, retracts panels on storms/flares/Sol 214, energizes shield
 * strictly on flare/CME Sols, charges battery before Lunar Night, and manages L2/L3 systems.
 */
export function optimalStrategy(state) {
  const eventsToday = getEventsForSol(state.timeline, state.sol).map((e) => ({
    ...e,
    type: normalizeEventType(e.type || e.code),
  }));

  const hasFlareOrCme = eventsToday.some((e) => e.type === 'flare' || e.type === 'cme');
  const hasDust = eventsToday.some((e) => e.type === 'dust');
  const isNight = eventsToday.some((e) => e.type === 'night');
  const isSol214 = eventsToday.some((e) => e.type === 'sol214');

  const sol214Decision = 'retract';
  const panelsOut = !(isNight || hasDust || hasFlareOrCme || isSol214);
  const shieldOn = Boolean((hasFlareOrCme || isSol214) && state.gauges.power >= 14);

  let oxygenLevel = 'normal';
  if (state.gauges.oxygen <= 68 && state.gauges.power >= 45 && !isNight) {
    oxygenLevel = 'high';
  } else if (state.gauges.power <= 14 && state.gauges.oxygen >= 50) {
    oxygenLevel = 'low';
  }

  const waterGreenhouse =
    state.level >= 2 &&
    ((!isNight && state.gauges.power >= 30) || state.greenhouse.neglectedStreak >= 1);
  const queueComms =
    state.level >= 3 && !isNight && state.gauges.power >= 40 && state.sol % 4 === 2;

  return {
    panelsOut,
    shieldOn,
    oxygenLevel,
    waterGreenhouse,
    tendGreenhouse: waterGreenhouse,
    queueComms,
    sol214Decision,
  };
}

/**
 * Runs a single full game simulation for a given level, seed, and strategy function.
 *
 * @param {number} level
 * @param {number} seed
 * @param {Function} strategyFn
 * @returns {Object} Final GameState
 */
export function simulateSingleRun(level, seed, strategyFn) {
  let state = createInitialState({ level, seed });
  const agentRng = createRNG(seed ^ 0x5a5a5a5a);

  let safetyCounter = 0;
  while (state.status === 'playing' && safetyCounter < 100) {
    safetyCounter += 1;
    const decisionChoices = strategyFn(state, agentRng);

    // If Sol 214 hero event is on this Sol, resolve it via resolveSol214Choice first
    const hasSol214Today = getEventsForSol(state.timeline, state.sol).some(
      (e) => normalizeEventType(e.type || e.code) === 'sol214'
    );
    if (hasSol214Today && !state.sol214.resolved) {
      state = resolveSol214Choice(state, decisionChoices.sol214Decision || 'retract');
      if (state.status !== 'playing') break;
    }

    const tickRng = createRNG(state.seed + state.sol * 101);
    state = tick(state, decisionChoices, tickRng);
  }

  return state;
}

/**
 * Runs `numRuns` seeded simulations for a given level and strategy, returning aggregated stats.
 *
 * @param {Object} params
 * @param {number} params.level
 * @param {string} params.strategyName
 * @param {Function} params.strategyFn
 * @param {number} [params.numRuns=NUM_RUNS]
 * @returns {Object}
 */
export function runBatchSimulation({ level, strategyName, strategyFn, numRuns = NUM_RUNS }) {
  let wins = 0;
  let totalSolsSurvived = 0;
  let totalFinalPower = 0;
  let totalFinalOxygen = 0;
  const causeCounts = {};

  for (let i = 1; i <= numRuns; i += 1) {
    const seed = 100000 + i * 37 + level * 1009;
    const finalState = simulateSingleRun(level, seed, strategyFn);
    if (finalState.status === 'won') {
      wins += 1;
    } else {
      const debrief = buildDebrief(finalState);
      causeCounts[debrief.primaryCause] = (causeCounts[debrief.primaryCause] || 0) + 1;
    }
    totalSolsSurvived += finalState.solsSurvived;
    totalFinalPower += finalState.gauges.power;
    totalFinalOxygen += finalState.gauges.oxygen;
  }

  const winRate = (wins / numRuns) * 100;
  return {
    level,
    strategyName,
    numRuns,
    wins,
    losses: numRuns - wins,
    winRate: Number(winRate.toFixed(1)),
    avgSolsSurvived: Number((totalSolsSurvived / numRuns).toFixed(1)),
    avgFinalPower: Number((totalFinalPower / numRuns).toFixed(1)),
    avgFinalOxygen: Number((totalFinalOxygen / numRuns).toFixed(1)),
    topFailureCauses: causeCounts,
  };
}

/**
 * Main CLI entry point when executed via `npm run simulate`.
 */
export function runCliSimulation() {
  console.log('========================================================================');
  console.log(' MOONWATCH: Sol 214 — Engine Balance Simulator (1,000+ Seeded Runs/Tier)');
  console.log('========================================================================\n');

  const strategies = [
    { name: 'First-Time Player (Heuristic)', fn: firstTimeStrategy },
    { name: 'Cautious Player', fn: cautiousStrategy },
    { name: 'Optimal Commander', fn: optimalStrategy },
  ];

  const allResults = [];

  for (const level of [1, 2, 3]) {
    console.log(`--- LEVEL ${level} (${NUM_RUNS} seeded runs per archetype) ---`);
    for (const strat of strategies) {
      const stats = runBatchSimulation({
        level,
        strategyName: strat.name,
        strategyFn: strat.fn,
        numRuns: NUM_RUNS,
      });
      allResults.push(stats);
      console.log(
        `  ${strat.name.padEnd(32)} | Win Rate: ${String(stats.winRate.toFixed(1)).padStart(5)}% (${stats.wins}/${stats.numRuns}) | Avg Sols: ${String(stats.avgSolsSurvived).padStart(4)} | Avg End Pwr: ${String(stats.avgFinalPower).padStart(4)} | Avg End O2: ${String(stats.avgFinalOxygen).padStart(4)}`
      );
    }
    console.log('');
  }

  const l1FirstTime = allResults.find(
    (r) => r.level === 1 && r.strategyName.startsWith('First-Time')
  );

  console.log('------------------------------------------------------------------------');
  console.log(
    `Target Check — Level 1 First-Time Player Win Rate: ${l1FirstTime.winRate}% (Target: 40.0% – 60.0%)`
  );

  if (l1FirstTime.winRate < 40 || l1FirstTime.winRate > 60) {
    console.error(
      `[FAIL] Level 1 First-Time Player win rate (${l1FirstTime.winRate}%) is outside the 40%–60% target band!`
    );
    process.exitCode = 1;
  } else {
    console.log(
      `[PASS] Level 1 First-Time Player win rate (${l1FirstTime.winRate}%) is squarely within the 40%–60% target band.`
    );
  }
  console.log('========================================================================');

  return allResults;
}

// Execute when run directly via `node scripts/simulate.js`
const isMain =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('scripts/simulate.js');

if (isMain) {
  runCliSimulation();
}
