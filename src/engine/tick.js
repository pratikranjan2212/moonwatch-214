/**
 * @fileoverview Pure deterministic simulation step `tick(state, choices, rng)`,
 * hero event resolver `resolveSol214Choice(state, decision)`, and initial state factory.
 * Never mutates input state.
 */

import { BALANCE } from './balance.js';
import { buildTimeline, getEventsForSol, getFactSheet, isLunarNightSol, normalizeEventType } from './events.js';
import { COMMANDER, createInitialCrew, getLevelConfig } from './levels.js';
import { createRNG, normalizeSeed } from './rng.js';

/**
 * Clamps a numeric value to [min, max] and rounds to at most 2 decimal places.
 *
 * @param {number} value
 * @param {number} [min=BALANCE.minGauge]
 * @param {number} [max=BALANCE.maxGauge]
 * @returns {number}
 */
export function clampGauge(value, min = BALANCE.minGauge, max = BALANCE.maxGauge) {
  const num = Number(value);
  if (Number.isNaN(num)) return min;
  const clamped = Math.min(max, Math.max(min, num));
  return Math.round(clamped * 100) / 100;
}

/**
 * Deep-clones a GameState object so no caller or engine step ever mutates references.
 *
 * @param {Object} state
 * @returns {Object}
 */
export function cloneState(state) {
  return {
    ...state,
    commander: state.commander ? { ...state.commander } : { ...COMMANDER },
    gauges: { ...state.gauges },
    crew: Array.isArray(state.crew) ? state.crew.map((c) => ({ ...c })) : createInitialCrew(),
    choices: { ...state.choices },
    timeline: Array.isArray(state.timeline)
      ? state.timeline.map((e) => ({
          ...e,
          factSheet: e.factSheet ? { ...e.factSheet } : undefined,
        }))
      : [],
    activeEvents: Array.isArray(state.activeEvents) ? state.activeEvents.map((e) => ({ ...e })) : [],
    eventsLog: Array.isArray(state.eventsLog) ? state.eventsLog.map((e) => ({ ...e })) : [],
    causeLog: Array.isArray(state.causeLog) ? state.causeLog.map((c) => ({ ...c })) : [],
    sol214: state.sol214
      ? { ...state.sol214 }
      : {
          sol: BALANCE.sol214TargetSol,
          missionSol: BALANCE.sol214MissionSol,
          pending: false,
          resolved: false,
          decision: null,
          panelDamagedSolsRemaining: 0,
        },
    greenhouse: state.greenhouse
      ? { ...state.greenhouse }
      : {
          watered: false,
          tendedStreak: 0,
          neglectedStreak: 0,
          totalOxygenProduced: 0,
        },
    comms: state.comms
      ? {
          ...state.comms,
          queue: Array.isArray(state.comms.queue) ? state.comms.queue.map((q) => ({ ...q })) : [],
        }
      : {
          delaySols: BALANCE.comms.defaultDelaySols,
          queue: [],
          lastQueuedSol: 0,
          packetsDelivered: 0,
        },
  };
}

/**
 * Creates a fresh deterministic initial GameState for a given level and seed.
 *
 * @param {Object} [options={}]
 * @param {number} [options.level=1]
 * @param {number|string} [options.seed=2142026]
 * @param {Array<Object>} [options.externalEvents=[]]
 * @param {Array<Object>} [options.timeline]
 * @returns {Object} Initial GameState
 */
export function createInitialState(options = {}) {
  const levelConfig = getLevelConfig(options.level ?? 1);
  const normalizedSeed = normalizeSeed(options.seed ?? 2142026);
  const timeline = Array.isArray(options.timeline)
    ? options.timeline.map((e) => ({ ...e }))
    : buildTimeline({
        level: levelConfig.id,
        seed: normalizedSeed,
        externalEvents: options.externalEvents ?? [],
      });

  return {
    sol: 1,
    solsSurvived: 0,
    missionSol: levelConfig.missionStartSol + 1,
    targetSols: levelConfig.targetSols,
    level: levelConfig.id,
    seed: normalizedSeed,
    commander: { ...COMMANDER },
    gauges: {
      power: BALANCE.startingBattery,
      oxygen: BALANCE.startingOxygen,
      shield: BALANCE.startingShield,
    },
    crew: createInitialCrew(),
    choices: {
      panelsOut: true,
      shieldOn: false,
      oxygenLevel: 'normal',
      waterGreenhouse: false,
      tendGreenhouse: false,
      queueComms: false,
    },
    timeline,
    activeEvents: getEventsForSol(timeline, 1),
    eventsLog: [],
    causeLog: [],
    status: 'playing',
    sol214: {
      sol: levelConfig.sol214Sol || BALANCE.sol214TargetSol,
      missionSol: BALANCE.sol214MissionSol,
      pending: false,
      resolved: false,
      decision: null,
      panelDamagedSolsRemaining: 0,
    },
    greenhouse: {
      watered: false,
      tendedStreak: 0,
      neglectedStreak: 0,
      totalOxygenProduced: 0,
    },
    comms: {
      delaySols: BALANCE.comms.defaultDelaySols,
      queue: [],
      lastQueuedSol: 0,
      packetsDelivered: 0,
    },
  };
}

/**
 * Normalizes any Sol 214 decision value into `'retract'` or `'leave-out'`.
 *
 * @param {string|boolean|Object} decision
 * @returns {'retract'|'leave-out'}
 */
export function normalizeSol214Decision(decision) {
  if (typeof decision === 'boolean') {
    return decision ? 'retract' : 'leave-out';
  }
  if (typeof decision === 'object' && decision !== null) {
    if (decision.decision) return normalizeSol214Decision(decision.decision);
    if (typeof decision.retractPanels === 'boolean') {
      return decision.retractPanels ? 'retract' : 'leave-out';
    }
    if (typeof decision.panelsOut === 'boolean') {
      return decision.panelsOut ? 'leave-out' : 'retract';
    }
  }
  const str = String(decision || 'retract')
    .trim()
    .toLowerCase();
  if (
    str === 'retract' ||
    str === 'retract-panels' ||
    str === 'retract_panels' ||
    str === 'safe' ||
    str === 'protect'
  ) {
    return 'retract';
  }
  return 'leave-out';
}

/**
 * Pure function resolving the Sol 214 hero countdown decision ('retract' vs 'leave-out').
 * Never mutates input state.
 *
 * @param {Object} state - Current GameState
 * @param {'retract'|'leave-out'|string|boolean|Object} decision - Player decision
 * @returns {Object} New GameState with Sol 214 outcome applied
 */
export function resolveSol214Choice(state, decision = 'retract') {
  const next = cloneState(state);
  if (next.status !== 'playing') {
    return next;
  }

  const branch = normalizeSol214Decision(decision);
  const sol214Sheet = getFactSheet('sol214');
  const currentSol = next.sol;

  if (branch === 'retract') {
    const spec = BALANCE.sol214.retract;
    next.choices.panelsOut = false;
    next.choices.shieldOn = true;
    next.gauges.power = clampGauge(next.gauges.power + spec.powerDelta);
    next.gauges.shield = clampGauge(next.gauges.shield + spec.shieldDelta);
    next.sol214 = {
      ...next.sol214,
      pending: false,
      resolved: true,
       resolvedAtSol: currentSol,
      decision: 'retract',
      panelDamagedSolsRemaining: 0,
    };

    next.crew = next.crew.map((member) => ({
      ...member,
      mood: member.health > 0 ? 'run-to-shelter' : 'exhausted',
    }));

    next.causeLog.push({
      sol: currentSol,
      cause: 'sol214',
      label: 'Sol 214: Panels retracted in time',
      effect: `power ${spec.powerDelta}, shield ${spec.shieldDelta}, solar array protected`,
      mitigatedBy: 'panelsRetracted',
      decision: 'retract',
      scienceFact: sol214Sheet.oneLineFact,
      tip: sol214Sheet.tryThisTip,
    });
  } else {
    const spec = BALANCE.sol214.leaveOut;
    const shieldActive = Boolean(next.choices.shieldOn && next.gauges.shield > 0 && next.gauges.power > 0);
    const crewDmg = shieldActive ? spec.crewDamageShielded : spec.crewDamageUnshielded;

    next.choices.panelsOut = true;
    next.gauges.power = clampGauge(next.gauges.power + spec.powerDelta);
    next.gauges.shield = clampGauge(next.gauges.shield + spec.shieldDelta);
    next.sol214 = {
      ...next.sol214,
      pending: false,
      resolved: true,
      resolvedAtSol: currentSol,
      decision: 'leave-out',
      panelDamagedSolsRemaining: spec.damagedDurationSols,
    };

    next.crew = next.crew.map((member) => ({
      ...member,
      health: member.health > 0 ? clampGauge(member.health - crewDmg) : 0,
      mood: 'run-to-shelter',
    }));

    next.causeLog.push({
      sol: currentSol,
      cause: 'flare',
      label: 'Flare hit',
      effect: `X3.9 super-flare struck (shield ${spec.shieldDelta}, crew -${crewDmg})`,
      mitigatedBy: shieldActive ? 'shield' : null,
      decision: 'leave-out',
      scienceFact: sol214Sheet.oneLineFact,
      tip: sol214Sheet.tryThisTip,
    });

    next.causeLog.push({
      sol: currentSol,
      cause: 'panels-exposed',
      label: 'Panels left out',
      effect: `power ${spec.powerDelta}, array scorched (${Math.round(spec.damagedSolarMultiplier * 100)}% output for ${spec.damagedDurationSols} Sols)`,
      mitigatedBy: null,
      decision: 'leave-out',
      scienceFact:
        'Geomagnetic currents from X-class flares can surge through extended solar arrays and fry power converters.',
      tip: 'Retract solar panels before an X-class flare arrives to prevent power surges and cell damage.',
    });

    if (next.gauges.power <= 0) {
      next.causeLog.push({
        sol: currentSol,
        cause: 'battery-drained',
        label: 'Battery drained',
        effect: 'power 0 (surge emptied battery reserve)',
        mitigatedBy: null,
        scienceFact:
          'Without battery reserves, lunar habitats immediately lose heaters and active life support.',
        tip: 'Keep at least 25% battery reserve before solar storms and lunar night.',
      });
    }

    if (crewDmg > 0) {
      next.causeLog.push({
        sol: currentSol,
        cause: 'crew-health-fell',
        label: 'Crew health fell',
        effect: `crew health -${crewDmg}`,
        mitigatedBy: shieldActive ? 'shield' : null,
        scienceFact:
          'High-energy protons from solar storms penetrate unshielded suits and damage human cells.',
        tip: 'Raise the Shield dome and send the crew to shelter during major flares.',
      });
    }
  }

  const allCrewLost = next.crew.every((c) => c.health <= 0);
  if (next.gauges.oxygen <= 0 || allCrewLost) {
    next.status = 'lost';
  }

  return next;
}

/**
 * Computes crew mood from current Sol events and resource gauges.
 * Valid moods: 'idle' | 'worried' | 'run-to-shelter' | 'cheer' | 'exhausted'.
 *
 * @param {Object} params
 * @returns {'idle'|'worried'|'run-to-shelter'|'cheer'|'exhausted'}
 */
function resolveCrewMood({
  memberHealth,
  hadFlareOrCme,
  hadDustStorm,
  survivedHazardPrevSol,
  power,
  oxygen,
  isNight,
  wonLevel,
}) {
  if (memberHealth <= 0) return 'exhausted';
  if (wonLevel) return 'cheer';
  if (hadFlareOrCme) return 'run-to-shelter';
  if (oxygen <= BALANCE.lowOxygenThreshold || memberHealth <= 40) return 'worried';
  if (power <= 20 || (isNight && power <= 35)) return 'exhausted';
  if (hadDustStorm || survivedHazardPrevSol) return 'cheer';
  return 'idle';
}

/**
 * Pure deterministic engine step for one Sol.
 * Never mutates `state`, `choices`, or `timeline`.
 *
 * Resolution sequence:
 * 1. Apply solar generation (if panelsOut and daytime, scaled by dust storm / panel damage).
 * 2. Apply power consumption (base, shield, oxygen level, L2 greenhouse, L3 comms).
 * 3. Resolve scheduled events for this Sol (flare, CME, dust storm, lunar night, comms, Sol 214).
 * 4. Update oxygen, L2 greenhouse, L3 comms queue, and crew health.
 * 5. Append structured `causeLog` entries (`{ sol, cause, label, effect, mitigatedBy, scienceFact, tip }`).
 * 6. Update crew moods ('idle', 'worried', 'run-to-shelter', 'cheer', 'exhausted') and win/lose status.
 *
 * @param {Object} state - Current GameState
 * @param {Object} [choices] - Player choices for this Sol (defaults to `state.choices`)
 * @param {Function|number|string} [rng] - Optional seeded RNG or seed
 * @returns {Object} New immutable GameState
 */
export function tick(state, choices = undefined, rng = undefined) {
  const baseState = cloneState(state);
  if (baseState.status !== 'playing') {
    return baseState;
  }

  // Ensure deterministic RNG is available if needed
  const _rng = createRNG(rng ?? (baseState.seed + baseState.sol * 101));
  void _rng;

  const currentSol = baseState.sol;
  const targetSols = baseState.targetSols || getLevelConfig(baseState.level).targetSols;

  const effectiveChoices = {
    panelsOut: true,
    shieldOn: false,
    oxygenLevel: 'normal',
    waterGreenhouse: false,
    tendGreenhouse: false,
    queueComms: false,
    ...baseState.choices,
    ...(choices || {}),
  };
  baseState.choices = effectiveChoices;

  // Gather scheduled events for this Sol
  const rawEventsOnSol = getEventsForSol(baseState.timeline, currentSol);
  const normalizedEventsOnSol = rawEventsOnSol.map((evt) => ({
    ...evt,
    type: normalizeEventType(evt.type || evt.code),
  }));

  // Determine night status: explicit 'night' event on this Sol, or default cycle when timeline is empty
  const hasExplicitNightEvent = normalizedEventsOnSol.some((e) => e.type === 'night');
  const hasAnyTimelineEvents = Array.isArray(baseState.timeline) && baseState.timeline.length > 0;
  const isNight = hasExplicitNightEvent || (!hasAnyTimelineEvents && isLunarNightSol(currentSol));

  const hasDustStorm = normalizedEventsOnSol.some((e) => e.type === 'dust');
  const hasCommsEvent = normalizedEventsOnSol.some((e) => e.type === 'comms');
  const flareAndCmeEvents = normalizedEventsOnSol.filter(
    (e) => e.type === 'flare' || e.type === 'cme'
  );
  const sol214Event = normalizedEventsOnSol.find((e) => e.type === 'sol214');

  // If Sol 214 event is on this Sol and wasn't resolved prior to tick(), resolve it now
  let workingState = baseState;
  const sol214ResolvedBeforeTick =
    Boolean(baseState.sol214?.resolved) && baseState.sol214?.resolvedAtSol === currentSol;

  if (sol214Event && !baseState.sol214?.resolved) {
    const decision =
      effectiveChoices.sol214Decision ?? (effectiveChoices.panelsOut ? 'leave-out' : 'retract');
    workingState = resolveSol214Choice(baseState, decision);
    // Sync effectiveChoices with Sol 214 resolution
    effectiveChoices.panelsOut = workingState.choices.panelsOut;
    effectiveChoices.shieldOn = workingState.choices.shieldOn;
  }

  let power = workingState.gauges.power;
  let oxygen = workingState.gauges.oxygen;
  let shield = workingState.gauges.shield;
  let crewHealthDelta = 0;

  // 1. Solar Generation
  let solarGenerated = 0;
  if (effectiveChoices.panelsOut && !isNight) {
    solarGenerated = BALANCE.solarGenerationDay; // +18/Sol
    if (hasDustStorm) {
      solarGenerated *= BALANCE.dustStormSolarMultiplier; // * 0.3
    }
    if (
      workingState.sol214?.panelDamagedSolsRemaining > 0 &&
      !sol214Event // apply on subsequent Sols after Sol 214 damage
    ) {
      solarGenerated *= BALANCE.sol214.leaveOut.damagedSolarMultiplier;
    }
    solarGenerated = Math.round(solarGenerated * 100) / 100;
  }

  if (isNight) {
    const nightSheet = getFactSheet('night');
    workingState.causeLog.push({
      sol: currentSol,
      cause: 'night',
      label: 'Lunar night (0 solar)',
      effect: 'solar +0',
      mitigatedBy: !effectiveChoices.panelsOut ? 'batteryReserve' : null,
      scienceFact: nightSheet.oneLineFact,
      tip: nightSheet.tryThisTip,
    });
  }

  // 2. Power Consumption
  const o2Key =
    effectiveChoices.oxygenLevel === 'low' ||
    effectiveChoices.oxygenLevel === 'normal' ||
    effectiveChoices.oxygenLevel === 'high'
      ? effectiveChoices.oxygenLevel
      : 'normal';
  const o2Spec = BALANCE.oxygenConsumptionByLevel[o2Key];

  const greenhouseActive =
    workingState.level >= 2 &&
    Boolean(effectiveChoices.waterGreenhouse || effectiveChoices.tendGreenhouse);
  const commsQueuedThisSol = workingState.level >= 3 && Boolean(effectiveChoices.queueComms);

  const powerConsumption =
    BALANCE.baseConsumption +
    (effectiveChoices.shieldOn ? BALANCE.shieldCost : 0) +
    o2Spec.powerCost +
    (greenhouseActive ? BALANCE.greenhouse.waterPowerCost : 0) +
    (commsQueuedThisSol ? BALANCE.comms.antennaPowerCost : 0);

  power = power + solarGenerated - powerConsumption;

  // 3. Scheduled Hazards Resolution (Dust, Flare, CME, Comms)
  if (hasDustStorm) {
    const dustSheet = getFactSheet('dust');
    if (effectiveChoices.panelsOut) {
      power -= BALANCE.dustStormPanelPowerLoss;
      shield -= BALANCE.dustStormPanelShieldWear;
      workingState.causeLog.push({
        sol: currentSol,
        cause: 'dust',
        label: 'Panels left out in dust storm',
        effect: `solar x${BALANCE.dustStormSolarMultiplier}, power -${BALANCE.dustStormPanelPowerLoss}, shield -${BALANCE.dustStormPanelShieldWear}`,
        mitigatedBy: null,
        scienceFact: dustSheet.oneLineFact,
        tip: dustSheet.tryThisTip,
      });
    } else {
      workingState.causeLog.push({
        sol: currentSol,
        cause: 'dust',
        label: 'Dust storm weathered safely',
        effect: 'panels retracted and protected from regolith abrasion',
        mitigatedBy: 'panelsRetracted',
        scienceFact: dustSheet.oneLineFact,
        tip: dustSheet.tryThisTip,
      });
    }
  }

  // Resolve Solar Flares (FLR) & CMEs
  let hadFlareOrCme = Boolean(sol214Event);
  flareAndCmeEvents.forEach((evt) => {
    hadFlareOrCme = true;
    const isCme = evt.type === 'cme';
    const severity =
      evt.severity === 'minor' || evt.severity === 'major' || evt.severity === 'extreme'
        ? evt.severity
        : 'major';
    const table = isCme ? BALANCE.cme : BALANCE.flare;
    const spec = table[severity] || table.major;
    const sheet = getFactSheet(evt.type);

    // Shield mitigates 80% of crew radiation damage if shieldOn AND battery/shield > 0
    const shieldCanMitigate = Boolean(effectiveChoices.shieldOn && shield > 0 && power > 0);
    const crewDamage = shieldCanMitigate
      ? Math.round(spec.crewDamage * (1 - BALANCE.flareShieldMitigation))
      : spec.crewDamage;
    const shieldDrain = shieldCanMitigate
      ? Math.round(spec.shieldDamage * 0.6)
      : spec.shieldDamage;

    shield = Math.max(0, shield - shieldDrain);
    crewHealthDelta -= crewDamage;

    workingState.causeLog.push({
      sol: currentSol,
      cause: evt.type,
      label: isCme ? 'CME storm hit' : 'Flare hit',
      effect: `shield -${shieldDrain}, crew health -${crewDamage}`,
      mitigatedBy: shieldCanMitigate ? 'shield' : null,
      severity,
      scienceFact: evt.factText || sheet.oneLineFact,
      tip: sheet.tryThisTip,
    });

    // If solar panels were left extended during a flare/CME, surge damages array & battery
    if (effectiveChoices.panelsOut) {
      power -= spec.exposedPanelPowerLoss;
      workingState.causeLog.push({
        sol: currentSol,
        cause: 'panels-exposed',
        label: 'Panels left out',
        effect: `power -${spec.exposedPanelPowerLoss} (solar array surge)`,
        mitigatedBy: null,
        scienceFact:
          'Extended solar panels act like antennas during solar storms, channeling surges into batteries.',
        tip: 'Retract solar panels before a flare or CME arrives to protect your power grid.',
      });
    }
  });

  // Passive shield capacitor recovery on calm powered Sols
  if (!hadFlareOrCme && !hasDustStorm && power > 0 && shield < BALANCE.maxGauge) {
    shield = Math.min(BALANCE.maxGauge, shield + BALANCE.shieldPassiveRegen);
  }

  // Clamp Power & check for Battery Drained
  power = clampGauge(power);
  const batteryDrained = power <= 0;
  if (batteryDrained) {
    power = 0;
    workingState.causeLog.push({
      sol: currentSol,
      cause: 'battery-drained',
      label: 'Battery drained',
      effect: 'power 0 (life support & oxygen generators offline)',
      mitigatedBy: null,
      scienceFact:
        'When habitat batteries hit 0%, electrolysis oxygen generators and cabin heaters shut down.',
      tip: 'Retract panels during storms and lower power draw before Lunar Night so batteries never hit 0%.',
    });
  }

  // 4. Oxygen, Greenhouse (Level 2), and Comms Delay Queue (Level 3)
  if (batteryDrained) {
    // Oxygen systems off!
    oxygen -= BALANCE.powerOutageOxygenDrain;
    crewHealthDelta -= BALANCE.powerOutageCrewDamage;
    workingState.causeLog.push({
      sol: currentSol,
      cause: 'oxygen-off',
      label: 'Oxygen systems off',
      effect: `oxygen -${BALANCE.powerOutageOxygenDrain}, crew health -${BALANCE.powerOutageCrewDamage}`,
      mitigatedBy: null,
      scienceFact:
        'Without electrical power to split water molecules or scrub CO₂, breathable cabin air drops rapidly.',
      tip: 'Keep battery power above 0% so the Oxygen Generator stays online every Sol.',
    });
  } else {
    oxygen += o2Spec.netOxygenDelta;
    crewHealthDelta += o2Spec.crewHealthDelta;

    if (o2Key === 'low') {
      workingState.causeLog.push({
        sol: currentSol,
        cause: 'low-oxygen-mode',
        label: 'Low oxygen setting used',
        effect: `oxygen ${o2Spec.netOxygenDelta}, crew health ${o2Spec.crewHealthDelta}, saved ${Math.abs(o2Spec.powerCost)} power`,
        mitigatedBy: 'powerSave',
        scienceFact:
          'Lowering cabin oxygen pressure saves generator power, but thin air fatigues astronauts over time.',
        tip: 'Use Low Oxygen only briefly during power emergencies, then return to Normal or High.',
      });
    }
  }

  // Level 2+: Greenhouse & CO2 scrubbing
  if (workingState.level >= 2) {
    oxygen -= BALANCE.greenhouse.co2OxygenDrainPerSol;
    if (greenhouseActive && !batteryDrained) {
      oxygen += BALANCE.greenhouse.oxygenBoost;
      crewHealthDelta += BALANCE.greenhouse.crewHealthBoost;
      workingState.greenhouse.watered = true;
      workingState.greenhouse.tendedStreak += 1;
      workingState.greenhouse.neglectedStreak = 0;
      workingState.greenhouse.totalOxygenProduced += BALANCE.greenhouse.oxygenBoost;

      workingState.causeLog.push({
        sol: currentSol,
        cause: 'greenhouse',
        label: 'Greenhouse watered & tended',
        effect: `oxygen +${BALANCE.greenhouse.oxygenBoost}, crew health +${BALANCE.greenhouse.crewHealthBoost}`,
        mitigatedBy: 'greenhouse',
        scienceFact:
          'Hydroponic plants absorb astronaut CO₂ and release fresh breathable oxygen through photosynthesis.',
        tip: 'Water the Greenhouse regularly in Level 2 to counter rising cabin CO₂.',
      });
    } else {
      workingState.greenhouse.watered = false;
      workingState.greenhouse.tendedStreak = 0;
      workingState.greenhouse.neglectedStreak += 1;
      if (workingState.greenhouse.neglectedStreak >= 2) {
        oxygen -= BALANCE.greenhouse.wiltOxygenPenalty;
        workingState.causeLog.push({
          sol: currentSol,
          cause: 'greenhouse-neglected',
          label: 'Greenhouse wilted (CO₂ rising)',
          effect: `oxygen -${BALANCE.greenhouse.co2OxygenDrainPerSol + BALANCE.greenhouse.wiltOxygenPenalty}`,
          mitigatedBy: null,
          scienceFact:
            'When hydroponic crops wilt without water and light, cabin CO₂ builds up faster.',
          tip: 'Toggle Greenhouse watering on daytime Sols when you have spare solar power.',
        });
      }
    }
  }

  // Level 3: Communications Delay Queue & Antenna Sync
  if (workingState.level >= 3) {
    const commsSheet = getFactSheet('comms');
    const delaySols = hasCommsEvent
      ? BALANCE.comms.blackoutDelaySols
      : BALANCE.comms.defaultDelaySols;
    workingState.comms.delaySols = delaySols;

    // Deliver any queued messages scheduled for arrival on or before currentSol
    workingState.comms.queue = workingState.comms.queue.map((packet) => {
      if (!packet.delivered && packet.deliverSol <= currentSol) {
        power = clampGauge(power + BALANCE.comms.telemetryPowerBonus);
        shield = clampGauge(shield + BALANCE.comms.telemetryShieldBonus);
        oxygen = clampGauge(oxygen + BALANCE.comms.telemetryOxygenBonus);
        workingState.comms.packetsDelivered += 1;

        workingState.causeLog.push({
          sol: currentSol,
          cause: 'comms-delivered',
          label: 'Delayed Earth telemetry arrived',
          effect: `power +${BALANCE.comms.telemetryPowerBonus}, shield +${BALANCE.comms.telemetryShieldBonus}, oxygen +${BALANCE.comms.telemetryOxygenBonus}`,
          mitigatedBy: 'commsQueue',
          scienceFact: commsSheet.oneLineFact,
          tip: commsSheet.tryThisTip,
        });
        return { ...packet, delivered: true };
      }
      return packet;
    });

    // Enqueue new packet if requested and powered
    if (commsQueuedThisSol && !batteryDrained) {
      const deliverSol = currentSol + delaySols;
      workingState.comms.lastQueuedSol = currentSol;
      workingState.comms.queue.push({
        id: `comms-sol-${currentSol}`,
        sentSol: currentSol,
        deliverSol,
        delaySols,
        type: 'telemetry-sync',
        delivered: false,
      });
      workingState.causeLog.push({
        sol: currentSol,
        cause: 'comms-queued',
        label: `Earth telemetry queued (${delaySols}-Sol delay)`,
        effect: `arrives on Sol ${deliverSol}`,
        mitigatedBy: 'antennaSync',
        scienceFact: commsSheet.oneLineFact,
        tip: commsSheet.tryThisTip,
      });
    } else if (
      hasCommsEvent &&
      currentSol - (workingState.comms.lastQueuedSol || 0) >= BALANCE.comms.desyncPenaltyIntervalSols
    ) {
      power = clampGauge(power - BALANCE.comms.desyncPowerPenalty);
      workingState.causeLog.push({
        sol: currentSol,
        cause: 'comms',
        label: 'Comms blackout drift',
        effect: `power -${BALANCE.comms.desyncPowerPenalty} (uncalibrated telemetry)`,
        mitigatedBy: null,
        scienceFact: commsSheet.oneLineFact,
        tip: commsSheet.tryThisTip,
      });
    }
  }

  // Clamp Oxygen & apply low/zero oxygen effects on Crew Health
  oxygen = clampGauge(oxygen);
  shield = clampGauge(shield);

  if (oxygen <= 0) {
    oxygen = 0;
    crewHealthDelta -= 25;
    workingState.causeLog.push({
      sol: currentSol,
      cause: 'oxygen-depleted',
      label: 'Oxygen depleted',
      effect: 'oxygen 0, crew health -25',
      mitigatedBy: null,
      scienceFact:
        'Humans cannot survive more than a few minutes without breathable oxygen pressure.',
      tip: 'Use High Oxygen mode or tend the Greenhouse before cabin Oxygen drops below 25%.',
    });
  } else if (oxygen <= BALANCE.criticalOxygenThreshold) {
    crewHealthDelta -= BALANCE.criticalOxygenCrewDamage;
    workingState.causeLog.push({
      sol: currentSol,
      cause: 'low-oxygen',
      label: 'Cabin oxygen critically low',
      effect: `oxygen ${oxygen}, crew health -${BALANCE.criticalOxygenCrewDamage}`,
      mitigatedBy: null,
      scienceFact:
        'Very low oxygen partial pressure causes severe hypoxia, dizziness, and rapid exhaustion.',
      tip: 'Switch Oxygen to High immediately when the gauge drops into the danger zone.',
    });
  } else if (oxygen <= BALANCE.lowOxygenThreshold) {
    crewHealthDelta -= BALANCE.lowOxygenCrewDamage;
    workingState.causeLog.push({
      sol: currentSol,
      cause: 'low-oxygen',
      label: 'Cabin oxygen low',
      effect: `oxygen ${oxygen}, crew health -${BALANCE.lowOxygenCrewDamage}`,
      mitigatedBy: null,
      scienceFact:
        'Below 35% nominal cabin oxygen, astronauts experience altitude-like fatigue and headaches.',
      tip: 'Keep Oxygen on Normal or High whenever battery reserves allow.',
    });
  }

  // Apply crewHealthDelta & record Crew Health Fell in causeLog if health dropped
  const prevAvgHealth =
    workingState.crew.reduce((sum, c) => sum + c.health, 0) / (workingState.crew.length || 1);

  workingState.crew = workingState.crew.map((member) => {
    if (member.health <= 0) {
      return { ...member, health: 0 };
    }
    return {
      ...member,
      health: clampGauge(member.health + crewHealthDelta),
    };
  });

  const newAvgHealth =
    workingState.crew.reduce((sum, c) => sum + c.health, 0) / (workingState.crew.length || 1);

  if (newAvgHealth < prevAvgHealth && crewHealthDelta < 0) {
    workingState.causeLog.push({
      sol: currentSol,
      cause: 'crew-health-fell',
      label: 'Crew health fell',
      effect: `crew health ${crewHealthDelta} (avg ${Math.round(newAvgHealth)}%)`,
      mitigatedBy: null,
      scienceFact:
        'Astronaut health depends on steady cabin oxygen, thermal power, and radiation shielding.',
      tip: 'Balance battery reserves before storms so oxygen and shields stay powered.',
    });
  }

  // Decrement Sol 214 damaged panel timer if active from an earlier Sol
  if (
    workingState.sol214?.panelDamagedSolsRemaining > 0 &&
    !sol214Event &&
    !sol214ResolvedBeforeTick
  ) {
    workingState.sol214.panelDamagedSolsRemaining = Math.max(
      0,
      workingState.sol214.panelDamagedSolsRemaining - 1
    );
  }

  // Update gauges
  workingState.gauges = {
    power,
    oxygen,
    shield,
  };

  // 5. Check Win / Lose conditions
  const allCrewLost = workingState.crew.every((c) => c.health <= 0);
  if (oxygen <= 0 || allCrewLost) {
    workingState.status = 'lost';
    workingState.solsSurvived = Math.max(0, currentSol - 1);
  } else if (currentSol >= targetSols) {
    workingState.status = 'won';
    workingState.solsSurvived = targetSols;
  } else {
    workingState.status = 'playing';
    workingState.solsSurvived = currentSol;
  }

  // 6. Update Crew Moods ('idle', 'worried', 'run-to-shelter', 'cheer', 'exhausted')
  const prevSolEvents = getEventsForSol(workingState.timeline, currentSol - 1);
  const survivedHazardPrevSol = prevSolEvents.some((e) => {
    const t = normalizeEventType(e.type || e.code);
    return t === 'flare' || t === 'cme' || t === 'dust' || t === 'sol214';
  });

  workingState.crew = workingState.crew.map((member) => ({
    ...member,
    mood: resolveCrewMood({
      memberHealth: member.health,
      hadFlareOrCme,
      hadDustStorm: hasDustStorm,
      survivedHazardPrevSol,
      power,
      oxygen,
      isNight,
      wonLevel: workingState.status === 'won',
    }),
  }));

  // Record resolved events in eventsLog
  workingState.eventsLog = [...workingState.eventsLog, ...normalizedEventsOnSol];

  // Advance Sol counter if still playing
  if (workingState.status === 'playing') {
    const nextSol = currentSol + 1;
    workingState.sol = nextSol;
    workingState.missionSol = workingState.missionSol + 1;
    workingState.activeEvents = getEventsForSol(workingState.timeline, nextSol);

    // Flag Sol 214 pending if entering the Sol 214 hero Sol
    const enteringSol214 = workingState.activeEvents.some(
      (e) => normalizeEventType(e.type || e.code) === 'sol214'
    );
    if (enteringSol214 && !workingState.sol214.resolved) {
      workingState.sol214.pending = true;
    }
  } else {
    workingState.activeEvents = normalizedEventsOnSol;
  }

  return workingState;
}

export default {
  tick,
  resolveSol214Choice,
  normalizeSol214Decision,
  createInitialState,
  cloneState,
  clampGauge,
};
