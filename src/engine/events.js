/**
 * @fileoverview Event definitions (FLR, CME, dust storm, lunar night, comms delay, Sol 214),
 * kid-friendly science fact sheets, and deterministic timeline builder merging seeded
 * hazards with optional normalized NASA DONKI events.
 */

import { BALANCE } from './balance.js';
import { getLevelConfig } from './levels.js';
import { createRNG } from './rng.js';

export const EVENT_TYPES = {
  FLARE: 'flare',
  CME: 'cme',
  DUST: 'dust',
  NIGHT: 'night',
  COMMS: 'comms',
  SOL214: 'sol214',
};

/**
 * Kid-friendly science fact sheets and metadata for all event types (ages 9–14).
 */
const BASE_EVENT_DEFINITIONS = {
  flare: {
    type: 'flare',
    code: 'FLR',
    title: 'Solar Flare (FLR)',
    label: 'Flare hit',
    defaultSeverity: 'major',
    defaultLeadTime: 2,
    factSheet: {
      whatItIs: 'A sudden, bright flash of magnetic energy and X-rays from the Sun.',
      realWorldImpact: 'High-energy radiation can zap exposed solar panels and harm unshielded astronauts.',
      howAstronautsRespond: 'Power up the radiation shield, retract delicate arrays, and shelter indoors.',
      oneLineFact:
        'Solar flares travel at the speed of light, reaching the Moon in just eight minutes!',
      tryThisTip:
        'Turn the Shield ON and retract solar panels when a Major or Extreme flare is forecast.',
    },
  },

  cme: {
    type: 'cme',
    code: 'CME',
    title: 'Coronal Mass Ejection (CME)',
    label: 'CME storm hit',
    defaultSeverity: 'major',
    defaultLeadTime: 3,
    factSheet: {
      whatItIs: 'A giant cloud of magnetized solar plasma hurled into space by the Sun.',
      realWorldImpact: 'Triggers intense particle storms that overload power grids and spacecraft shields.',
      howAstronautsRespond: 'Track CME speed in the forecast and keep shields energized until it passes.',
      oneLineFact:
        'A fast Coronal Mass Ejection can blast billions of tons of solar plasma across space!',
      tryThisTip:
        'Watch the forecast lead time—charge batteries early and raise your Shield before the CME arrives.',
    },
  },

  dust: {
    type: 'dust',
    code: 'DUST',
    title: 'Electrostatic Dust Hazard',
    label: 'Dust storm hit',
    defaultSeverity: 'normal',
    defaultLeadTime: 2,
    factSheet: {
      whatItIs: 'Sharp, sun-charged lunar dust (regolith) lofted above the Moon’s surface.',
      realWorldImpact: 'Coats solar panels to cut power output by 70% and clogs mechanical joints.',
      howAstronautsRespond: 'Retract solar arrays during heavy dust activity and run on battery reserves.',
      oneLineFact:
        'Sunlight gives lunar dust an electrostatic charge that makes it float and stick to gear!',
      tryThisTip:
        'Retract solar panels during dust storms to prevent abrasion and battery drain.',
    },
  },

  night: {
    type: 'night',
    code: 'NIGHT',
    title: 'Long Lunar Night',
    label: 'Lunar night',
    defaultSeverity: 'normal',
    defaultLeadTime: 3,
    factSheet: {
      whatItIs: 'A freezing stretch of darkness when the outpost rotates away from the Sun.',
      realWorldImpact: 'Solar panels generate zero electricity and surface temperatures plunge below -130°C.',
      howAstronautsRespond: 'Charge batteries to maximum before sunset and avoid unnecessary power draw.',
      oneLineFact:
        'A real lunar night lasts about 14 Earth days—outposts must survive on stored energy!',
      tryThisTip:
        'Extend solar panels during daytime Sols to enter Lunar Night with at least 75% battery.',
    },
  },

  comms: {
    type: 'comms',
    code: 'COMMS',
    title: 'Earth Comms Delay',
    label: 'Comms delay',
    defaultSeverity: 'normal',
    defaultLeadTime: 2,
    factSheet: {
      whatItIs: 'Radio signal delay and solar static between Earth Mission Control and the Moon.',
      realWorldImpact: 'Instructions and telemetry packets arrive 2 to 3 Sols after they are sent.',
      howAstronautsRespond: 'Queue antenna transmissions early and make smart autonomous decisions on-site.',
      oneLineFact:
        'Solar storms can scramble radio waves, forcing lunar crews to rely on their own instruments!',
      tryThisTip:
        'Queue Earth Comms every few Sols in Level 3 so telemetry calibration boosts arrive on time.',
    },
  },

  sol214: {
    type: 'sol214',
    code: 'SOL214',
    title: 'Sol 214 X-Class Super-Flare',
    label: 'Sol 214 super-flare',
    defaultSeverity: 'extreme',
    defaultLeadTime: 3,
    factSheet: {
      whatItIs: 'An extreme X-class solar flare erupting from an active sunspot group on Sol 214.',
      realWorldImpact: 'Leaving solar panels extended risks a massive electrical surge and scorched cells.',
      howAstronautsRespond: 'Make a split-second command decision: retract the array and raise shields immediately.',
      oneLineFact:
        'X-class flares are the biggest explosions in our solar system—10x stronger than M-class flares!',
      tryThisTip:
        'On Sol 214, choose to Retract Panels so the X-flare does not surge and drain your battery bank.',
    },
  },
};

/**
 * Lookup map supporting both canonical types ('flare', 'cme', ...) and DONKI codes ('FLR', 'CME', ...).
 */
export const EVENT_DEFINITIONS = {
  ...BASE_EVENT_DEFINITIONS,
  FLR: BASE_EVENT_DEFINITIONS.flare,
  CME: BASE_EVENT_DEFINITIONS.cme,
  DUST: BASE_EVENT_DEFINITIONS.dust,
  dust_storm: BASE_EVENT_DEFINITIONS.dust,
  NIGHT: BASE_EVENT_DEFINITIONS.night,
  lunar_night: BASE_EVENT_DEFINITIONS.night,
  COMMS: BASE_EVENT_DEFINITIONS.comms,
  comms_delay: BASE_EVENT_DEFINITIONS.comms,
  SOL214: BASE_EVENT_DEFINITIONS.sol214,
  sol_214: BASE_EVENT_DEFINITIONS.sol214,
};

/**
 * Normalizes any event type/code string into one of:
 * 'flare' | 'cme' | 'dust' | 'night' | 'comms' | 'sol214'.
 *
 * @param {string} rawType
 * @returns {'flare'|'cme'|'dust'|'night'|'comms'|'sol214'}
 */
export function normalizeEventType(rawType) {
  const key = String(rawType || 'flare').trim();
  const def = EVENT_DEFINITIONS[key] || EVENT_DEFINITIONS[key.toLowerCase()] || EVENT_DEFINITIONS[key.toUpperCase()];
  return def ? def.type : 'flare';
}

/**
 * Returns the kid-friendly science fact sheet for an event type.
 *
 * @param {string} eventType
 * @returns {{whatItIs:string, realWorldImpact:string, howAstronautsRespond:string, oneLineFact:string, tryThisTip:string}}
 */
export function getFactSheet(eventType) {
  const canonical = normalizeEventType(eventType);
  return BASE_EVENT_DEFINITIONS[canonical].factSheet;
}

/**
 * Determines whether a given 1-based Sol number falls within the 3-Sol Lunar Night
 * window of each 7-Sol cycle (Sols 4–6, 11–13, 18–20, 25–27).
 * Note: Sol 7 (Mission Sol 214) is Daytime so the Sol 214 panel choice is a true trade-off.
 *
 * @param {number} sol
 * @returns {boolean}
 */
export function isLunarNightSol(sol) {
  if (sol < 1) return false;
  const cycleIndex = (sol - 1) % BALANCE.cycleLengthSols;
  return BALANCE.nightCycleOffsets.includes(cycleIndex);
}

/**
 * Infers flare/CME severity ('minor' | 'major' | 'extreme') from DONKI classType or speed.
 *
 * @param {Object} raw
 * @returns {'minor'|'major'|'extreme'}
 */
function inferSeverity(raw) {
  if (raw.severity === 'minor' || raw.severity === 'major' || raw.severity === 'extreme') {
    return raw.severity;
  }
  if (typeof raw.classType === 'string' && raw.classType.length > 0) {
    const prefix = raw.classType.trim().charAt(0).toUpperCase();
    if (prefix === 'X') return 'extreme';
    if (prefix === 'M') return 'major';
    return 'minor';
  }
  const speed = Number(raw.speed || raw.cmeAnalyses?.[0]?.speed || 0);
  if (speed >= 1000) return 'extreme';
  if (speed >= 500) return 'major';
  if (speed > 0) return 'minor';
  return 'major';
}

/**
 * Normalizes an external NASA DONKI event (either pre-mapped or raw DONKI JSON)
 * into a standard timeline event structure.
 *
 * @param {Object} raw
 * @param {number} index
 * @param {number} targetSols
 * @param {number} missionStartSol
 * @returns {Object}
 */
export function normalizeExternalEvent(raw, index = 0, targetSols = 14, missionStartSol = 207) {
  const isCme =
    raw.type === 'cme' ||
    raw.type === 'CME' ||
    Boolean(raw.activityID && String(raw.activityID).includes('CME')) ||
    Array.isArray(raw.cmeAnalyses);

  const type = raw.type ? normalizeEventType(raw.type) : isCme ? 'cme' : 'flare';
  const def = BASE_EVENT_DEFINITIONS[type] || BASE_EVENT_DEFINITIONS.flare;
  const severity = inferSeverity(raw);

  const analysis = Array.isArray(raw.cmeAnalyses)
    ? raw.cmeAnalyses.find((a) => a.isMostAccurate) || raw.cmeAnalyses[0]
    : null;
  const speed = Number(raw.speed || analysis?.speed || 0) || null;
  const classType =
    raw.classType ||
    (type === 'flare' ? (severity === 'extreme' ? 'X1.5' : severity === 'major' ? 'M4.2' : 'C5.0') : null);
  const activeRegion = raw.activeRegion || (raw.activeRegionNum ? `AR ${raw.activeRegionNum}` : null);
  const rawDate = raw.date || raw.beginTime || raw.startTime || null;
  const dateStr = typeof rawDate === 'string' ? rawDate.slice(0, 10) : null;

  let leadTimeSols = Number(raw.leadTime || raw.leadTimeSols || 0);
  if (!leadTimeSols) {
    if (type === 'cme') {
      leadTimeSols = speed && speed >= 1000 ? 1 : speed && speed >= 500 ? 2 : 3;
    } else {
      leadTimeSols = def.defaultLeadTime;
    }
  }

  let sol = Number(raw.sol || raw.solOffset || 0);
  if (!sol || sol < 2 || sol > targetSols) {
    sol = Math.min(targetSols, Math.max(2, ((index * 3 + 2) % (targetSols - 1)) + 2));
  }

  return {
    id: String(raw.id || raw.flrID || raw.activityID || `donki-${type}-${index + 1}`),
    sol,
    missionSol: missionStartSol + sol,
    type,
    code: def.code,
    severity,
    title:
      type === 'flare' && classType
        ? `Solar Flare (${classType})`
        : type === 'cme' && speed
          ? `CME Storm (${Math.round(speed)} km/s)`
          : raw.title || def.title,
    label: def.label,
    description:
      raw.note ||
      raw.description ||
      `${def.title}${activeRegion ? ` from ${activeRegion}` : ''}. ${def.factSheet.oneLineFact}`,
    durationSols: 1,
    leadTimeSols,
    isRealNasaEvent: true,
    source: raw.source || 'NASA DONKI',
    date: dateStr,
    classType,
    activeRegion,
    speed,
    factText: raw.factText || def.factSheet.oneLineFact,
    factSheet: { ...def.factSheet },
  };
}

/**
 * Deterministically builds a complete event timeline for a level, combining:
 * 1. Scheduled Lunar Night Sols (3 Sols per 7-Sol cycle)
 * 2. Guaranteed Sol 214 Hero Choice event on Level 1 (Sol 7 = Mission Sol 214)
 * 3. Optional normalized NASA DONKI externalEvents
 * 4. Seeded flares, CMEs, dust storms, and Level 3 comms delays
 *
 * Accepts either `buildTimeline(level, seed, externalEvents)` or
 * `buildTimeline({ level, seed, externalEvents, rng })`.
 *
 * @param {number|Object} [levelOrOptions=1]
 * @param {number|string} [seedArg=2142026]
 * @param {Array<Object>} [externalEventsArg=[]]
 * @returns {Array<Object>} Sorted array of timeline events
 */
export function buildTimeline(levelOrOptions = 1, seedArg = 2142026, externalEventsArg = []) {
  let levelNum = 1;
  let seed = seedArg;
  let externalEvents = externalEventsArg;
  let rngInstance = null;

  if (typeof levelOrOptions === 'object' && levelOrOptions !== null) {
    levelNum = levelOrOptions.level ?? 1;
    seed = levelOrOptions.seed ?? 2142026;
    externalEvents = levelOrOptions.externalEvents ?? [];
    rngInstance = levelOrOptions.rng ?? null;
  } else {
    levelNum = Number(levelOrOptions) || 1;
  }

  const levelConfig = getLevelConfig(levelNum);
  const targetSols = levelConfig.targetSols;
  const missionStartSol = levelConfig.missionStartSol;
  const rng = rngInstance || createRNG(seed).fork(`timeline-L${levelConfig.id}`);

  const timeline = [];
  const occupiedHazardSols = new Set([1]); // Keep Sol 1 hazard-free so player can orient

  // 1. Schedule Lunar Night events (3 Sols per 7-Sol cycle: Sols 4-6, 11-13, 18-20, 25-27)
  const nightDef = BASE_EVENT_DEFINITIONS.night;
  for (let sol = 1; sol <= targetSols; sol += 1) {
    if (isLunarNightSol(sol)) {
      timeline.push({
        id: `evt-l${levelConfig.id}-sol${sol}-night`,
        sol,
        missionSol: missionStartSol + sol,
        type: 'night',
        code: 'NIGHT',
        severity: 'normal',
        title: nightDef.title,
        label: nightDef.label,
        description: 'The outpost is in lunar shadow. Solar arrays generate 0 power.',
        durationSols: 1,
        leadTimeSols: nightDef.defaultLeadTime,
        isRealNasaEvent: false,
        source: 'Lunar Ephemeris',
        date: null,
        classType: null,
        activeRegion: null,
        speed: null,
        factText: nightDef.factSheet.oneLineFact,
        factSheet: { ...nightDef.factSheet },
      });
    }
  }

  // 2. Guarantee the Sol 214 Hero Choice event on Level 1 at Sol 7 (Mission Sol 214)
  if (levelConfig.hasSol214Choice && levelConfig.sol214Sol) {
    const sol214Sol = levelConfig.sol214Sol;
    const sol214Def = BASE_EVENT_DEFINITIONS.sol214;
    occupiedHazardSols.add(sol214Sol);
    timeline.push({
      id: `evt-l${levelConfig.id}-sol${sol214Sol}-sol214`,
      sol: sol214Sol,
      missionSol: BALANCE.sol214MissionSol, // Mission Sol 214
      type: 'sol214',
      code: 'SOL214',
      severity: 'extreme',
      title: sol214Def.title,
      label: sol214Def.label,
      description:
        'Mission Sol 214 Emergency! NASA DONKI detects an X3.9 super-flare from AR 13664 heading straight for Shackleton Rim. 10 seconds to decide: retract solar panels or leave them out!',
      durationSols: 1,
      leadTimeSols: 3,
      requiresChoice: true,
      countdownSeconds: BALANCE.sol214.countdownSeconds,
      isRealNasaEvent: true,
      source: 'NASA DONKI',
      date: '2024-05-10',
      classType: 'X3.9',
      activeRegion: 'AR 13664',
      speed: 1250,
      factText: sol214Def.factSheet.oneLineFact,
      factSheet: { ...sol214Def.factSheet },
    });
  }

  // Build candidate daytime & night Sol pools for placing hazards without overlapping Sol 214
  const daytimeCandidateSols = [];
  const allCandidateSols = [];
  for (let sol = 2; sol <= targetSols; sol += 1) {
    if (!occupiedHazardSols.has(sol)) {
      allCandidateSols.push(sol);
      if (!isLunarNightSol(sol)) {
        daytimeCandidateSols.push(sol);
      }
    }
  }

  const budget = { ...levelConfig.hazardBudget };
  let remainingFlares = budget.flares || 2;
  let remainingCmes = budget.cmes || 1;
  let remainingDust = budget.dustStorms || 1;
  let remainingComms = budget.commsDelays || 0;

  // 3. Merge optional normalized NASA DONKI events into available candidate Sols
  if (Array.isArray(externalEvents) && externalEvents.length > 0) {
    const maxExternal = remainingFlares + remainingCmes;
    const slicedExternal = externalEvents.slice(0, maxExternal);
    const shuffledSols = rng.shuffle(allCandidateSols);

    slicedExternal.forEach((rawEvt, idx) => {
      const normalized = normalizeExternalEvent(rawEvt, idx, targetSols, missionStartSol);
      let targetSol = normalized.sol;
      if (occupiedHazardSols.has(targetSol) || targetSol < 2 || targetSol > targetSols) {
        targetSol = shuffledSols.find((s) => !occupiedHazardSols.has(s)) || 3;
      }
      occupiedHazardSols.add(targetSol);

      // Keep Level 1 fair for first-time players by capping random extreme flares outside Sol 214
      const clampedSeverity =
        levelConfig.id === 1 && normalized.severity === 'extreme' ? 'major' : normalized.severity;

      timeline.push({
        ...normalized,
        sol: targetSol,
        missionSol: missionStartSol + targetSol,
        severity: clampedSeverity,
      });

      if (normalized.type === 'cme' && remainingCmes > 0) {
        remainingCmes -= 1;
      } else if (remainingFlares > 0) {
        remainingFlares -= 1;
      }
    });
  }

  // Helper to claim a free Sol from a preferred pool
  function claimSol(preferredPool) {
    const shuffled = rng.shuffle(preferredPool);
    for (let i = 0; i < shuffled.length; i += 1) {
      if (!occupiedHazardSols.has(shuffled[i])) {
        occupiedHazardSols.add(shuffled[i]);
        return shuffled[i];
      }
    }
    const fallback = rng.shuffle(allCandidateSols).find((s) => !occupiedHazardSols.has(s));
    if (fallback) {
      occupiedHazardSols.add(fallback);
      return fallback;
    }
    return null;
  }

  // 4. Schedule Dust Storms on daytime Sols (for 2 Sols as specified in DESIGN_DOC)
  const dustDef = BASE_EVENT_DEFINITIONS.dust;
  for (let d = 0; d < remainingDust; d += 1) {
    const startSol = claimSol(daytimeCandidateSols);
    if (startSol !== null) {
      for (let offset = 0; offset < BALANCE.dustStormDurationSols; offset += 1) {
        const s = startSol + offset;
        if (s <= targetSols && !isLunarNightSol(s) && s !== levelConfig.sol214Sol) {
          occupiedHazardSols.add(s);
          timeline.push({
            id: `evt-l${levelConfig.id}-sol${s}-dust-${d + 1}`,
            sol: s,
            missionSol: missionStartSol + s,
            type: 'dust',
            code: 'DUST',
            severity: 'normal',
            title: `${dustDef.title} (Day ${offset + 1}/${BALANCE.dustStormDurationSols})`,
            label: dustDef.label,
            description:
              'Electrostatic regolith haze cuts solar generation to 30% and abrades extended panels.',
            durationSols: BALANCE.dustStormDurationSols,
            leadTimeSols: dustDef.defaultLeadTime,
            isRealNasaEvent: false,
            source: 'Lunar Surface Sensors',
            date: null,
            classType: null,
            activeRegion: null,
            speed: null,
            factText: dustDef.factSheet.oneLineFact,
            factSheet: { ...dustDef.factSheet },
          });
        }
      }
    }
  }

  // 5. Schedule Seeded Solar Flares (FLR) with authentic NASA DONKI flavour
  const flareDef = BASE_EVENT_DEFINITIONS.flare;
  const sampleClasses = {
    minor: ['C3.4', 'C5.1', 'C7.8'],
    major: ['M2.4', 'M5.2', 'M6.8'],
    extreme: ['X1.4', 'X2.2'],
  };
  const sampleRegions = ['AR 13663', 'AR 13664', 'AR 13697', 'AR 13738'];
  const sampleDates = ['2024-05-08', '2024-05-11', '2024-05-14', '2024-10-03'];

  for (let f = 0; f < remainingFlares; f += 1) {
    const sol = claimSol(allCandidateSols);
    if (sol !== null) {
      const severity =
        levelConfig.id === 1
          ? f === 0
            ? 'minor'
            : rng.chance(0.55)
              ? 'major'
              : 'minor'
          : rng.pick(['minor', 'major', 'major', 'extreme']);
      const classType = rng.pick(sampleClasses[severity]);
      const activeRegion = rng.pick(sampleRegions);
      const date = rng.pick(sampleDates);

      timeline.push({
        id: `evt-l${levelConfig.id}-sol${sol}-flr-${f + 1}`,
        sol,
        missionSol: missionStartSol + sol,
        type: 'flare',
        code: 'FLR',
        severity,
        title: `Solar Flare (${classType})`,
        label: flareDef.label,
        description: `Class ${classType} solar flare detected from sunspot region ${activeRegion}.`,
        durationSols: 1,
        leadTimeSols: flareDef.defaultLeadTime,
        isRealNasaEvent: true,
        source: 'NASA DONKI Snapshot',
        date,
        classType,
        activeRegion,
        speed: null,
        factText: flareDef.factSheet.oneLineFact,
        factSheet: { ...flareDef.factSheet },
      });
    }
  }

  // 6. Schedule Seeded Coronal Mass Ejections (CME)
  const cmeDef = BASE_EVENT_DEFINITIONS.cme;
  for (let c = 0; c < remainingCmes; c += 1) {
    const sol = claimSol(allCandidateSols);
    if (sol !== null) {
      const severity = levelConfig.id === 1 ? 'minor' : rng.pick(['minor', 'major']);
      const speed = severity === 'major' ? rng.nextInt(650, 950) : rng.nextInt(400, 620);
      const activeRegion = rng.pick(sampleRegions);
      const date = rng.pick(sampleDates);

      timeline.push({
        id: `evt-l${levelConfig.id}-sol${sol}-cme-${c + 1}`,
        sol,
        missionSol: missionStartSol + sol,
        type: 'cme',
        code: 'CME',
        severity,
        title: `CME Storm (${speed} km/s)`,
        label: cmeDef.label,
        description: `Coronal Mass Ejection traveling at ${speed} km/s from ${activeRegion}.`,
        durationSols: 1,
        leadTimeSols: speed >= 750 ? 2 : 3,
        isRealNasaEvent: true,
        source: 'NASA DONKI Snapshot',
        date,
        classType: null,
        activeRegion,
        speed,
        factText: cmeDef.factSheet.oneLineFact,
        factSheet: { ...cmeDef.factSheet },
      });
    }
  }

  // 7. Schedule Level 3 Comms Delay events
  const commsDef = BASE_EVENT_DEFINITIONS.comms;
  for (let m = 0; m < remainingComms; m += 1) {
    const sol = claimSol(allCandidateSols);
    if (sol !== null) {
      timeline.push({
        id: `evt-l${levelConfig.id}-sol${sol}-comms-${m + 1}`,
        sol,
        missionSol: missionStartSol + sol,
        type: 'comms',
        code: 'COMMS',
        severity: 'normal',
        title: commsDef.title,
        label: commsDef.label,
        description: 'Ionospheric interference stretches Earth-Moon signal delay to 3 Sols.',
        durationSols: 1,
        leadTimeSols: commsDef.defaultLeadTime,
        isRealNasaEvent: false,
        source: 'Deep Space Network',
        date: null,
        classType: null,
        activeRegion: null,
        speed: null,
        factText: commsDef.factSheet.oneLineFact,
        factSheet: { ...commsDef.factSheet },
      });
    }
  }

  // Sort deterministically by Sol ascending, then by priority order
  const typePriority = { sol214: 1, flare: 2, cme: 3, dust: 4, comms: 5, night: 6 };
  timeline.sort((a, b) => {
    if (a.sol !== b.sol) return a.sol - b.sol;
    return (typePriority[a.type] || 9) - (typePriority[b.type] || 9);
  });

  return timeline;
}

/**
 * Returns all events scheduled for a specific Sol.
 *
 * @param {Array<Object>} timeline
 * @param {number} sol
 * @returns {Array<Object>}
 */
export function getEventsForSol(timeline, sol) {
  if (!Array.isArray(timeline)) return [];
  return timeline.filter((evt) => evt.sol === sol);
}

/**
 * Returns upcoming events within `[currentSol, currentSol + lookaheadSols]`
 * whose warning window (`sol - leadTimeSols <= currentSol`) is now visible.
 *
 * @param {Array<Object>} timeline
 * @param {number} currentSol
 * @param {number} [lookaheadSols=4]
 * @returns {Array<Object>}
 */
export function getForecast(timeline, currentSol, lookaheadSols = 4) {
  if (!Array.isArray(timeline)) return [];
  const maxSol = currentSol + lookaheadSols;
  return timeline
    .filter((evt) => {
      if (evt.sol < currentSol || evt.sol > maxSol) return false;
      const lead = evt.leadTimeSols ?? 3;
      return evt.sol - lead <= currentSol;
    })
    .map((evt) => ({
      ...evt,
      solsUntil: Math.max(0, evt.sol - currentSol),
    }));
}

export default {
  EVENT_TYPES,
  EVENT_DEFINITIONS,
  normalizeEventType,
  getFactSheet,
  isLunarNightSol,
  normalizeExternalEvent,
  buildTimeline,
  getEventsForSol,
  getForecast,
};
