/**
 * @fileoverview Pure mapper converting raw NASA CCMC DONKI `/FLR` (`FLRObject`)
 * and `/CME` (`CMEJSON`) payloads into normalized, winnable MOONWATCH game events.
 *
 * Verified against NASA DONKI OpenAPI 3.0 schema (`docs/DONKI_NOTES.md`).
 */

import { getFactSheet } from '../engine/events.js';

const ALLOWED_FLARE_CLASSES = new Set(['A', 'B', 'C', 'M', 'X']);

/**
 * Parses a GOES X-ray flare classification string (e.g. `"X5.8"`, `"M4.2"`, `"C9.1"`)
 * into its class letter, numerical multiplier, and game hazard severity.
 *
 * @param {string|null|undefined} classType
 * @returns {{ classType: string, letter: string, magnitude: number, severity: 'minor'|'major'|'extreme' }}
 */
export function parseFlareClass(classType) {
  if (typeof classType !== 'string' || classType.trim().length === 0) {
    return { classType: 'M1.0', letter: 'M', magnitude: 1.0, severity: 'major' };
  }

  const cleaned = classType.trim().toUpperCase();
  const letter = ALLOWED_FLARE_CLASSES.has(cleaned.charAt(0)) ? cleaned.charAt(0) : 'C';
  const rawMag = Number.parseFloat(cleaned.slice(1));
  const magnitude = Number.isFinite(rawMag) && rawMag > 0 ? rawMag : 1.0;

  let severity = 'minor';
  if (letter === 'X' || (letter === 'M' && magnitude >= 5.0)) {
    severity = 'extreme';
  } else if (letter === 'M' || (letter === 'C' && magnitude >= 7.0)) {
    severity = 'major';
  }

  return {
    classType: `${letter}${magnitude.toFixed(1).replace(/\.0$/, '.0')}`,
    letter,
    magnitude,
    severity,
  };
}

/**
 * Selects the most accurate CME analysis entry (`isMostAccurate === true`),
 * or falls back to the fastest/first entry in `cmeAnalyses`.
 *
 * @param {Array<Object>|null|undefined} cmeAnalyses
 * @returns {{ speed: number, scoreType: string, halfAngle: number|null, latitude: number|null, longitude: number|null, severity: 'minor'|'major'|'extreme', leadTime: number }}
 */
export function selectMostAccurateAnalysis(cmeAnalyses) {
  if (!Array.isArray(cmeAnalyses) || cmeAnalyses.length === 0) {
    return {
      speed: 620,
      scoreType: 'C',
      halfAngle: 35,
      latitude: 0,
      longitude: 0,
      severity: 'major',
      leadTime: 3,
    };
  }

  const chosen =
    cmeAnalyses.find((item) => item && item.isMostAccurate === true) ||
    cmeAnalyses.find((item) => item && Number(item.speed) > 0) ||
    cmeAnalyses[0];

  const rawSpeed = Number(chosen?.speed);
  const speed = Number.isFinite(rawSpeed) && rawSpeed > 0 ? Math.round(rawSpeed) : 620;
  const scoreType = typeof chosen?.type === 'string' && chosen.type.trim() ? chosen.type.trim() : 'C';

  let severity = 'minor';
  if (speed >= 1200 || scoreType === 'R' || scoreType === 'ER') {
    severity = 'extreme';
  } else if (speed >= 650 || scoreType === 'C' || scoreType === 'O') {
    severity = 'major';
  }

  const leadTime = speed >= 1300 ? 1 : speed >= 750 ? 2 : 3;

  return {
    speed,
    scoreType,
    halfAngle: Number.isFinite(Number(chosen?.halfAngle)) ? Number(chosen.halfAngle) : null,
    latitude: Number.isFinite(Number(chosen?.latitude)) ? Number(chosen.latitude) : null,
    longitude: Number.isFinite(Number(chosen?.longitude)) ? Number(chosen.longitude) : null,
    severity,
    leadTime,
  };
}

/**
 * Sanitizes free-text notes from external APIs to strip HTML/script characters
 * and truncate to a clean single sentence for ages 9–14.
 *
 * @param {string|null|undefined} text
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeDonkiNote(text, fallback = '') {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return fallback;
  }
  const stripped = text
    .replace(/[<>&"'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return fallback;
  return stripped.length > 220 ? `${stripped.slice(0, 217)}...` : stripped;
}

/**
 * Maps a single raw NASA DONKI `FLRObject` record to a normalized game event.
 *
 * @param {Object} rawFlr
 * @param {number} [solOffset=3]
 * @param {string} [sourceLabel='NASA DONKI']
 * @returns {Object}
 */
export function mapFlrToGameEvent(rawFlr = {}, solOffset = 3, sourceLabel = 'NASA DONKI') {
  const parsed = parseFlareClass(rawFlr.classType);
  const factSheet = getFactSheet('flare');
  const rawTime = String(rawFlr.peakTime || rawFlr.beginTime || rawFlr.endTime || '');
  const date = /^\d{4}-\d{2}-\d{2}/.test(rawTime) ? rawTime.slice(0, 10) : '2024-05-11';
  const activeRegionNum = Number.isInteger(Number(rawFlr.activeRegionNum))
    ? Number(rawFlr.activeRegionNum)
    : null;
  const activeRegion = activeRegionNum ? `AR ${activeRegionNum}` : null;
  const sourceLocation =
    typeof rawFlr.sourceLocation === 'string' && rawFlr.sourceLocation.trim()
      ? rawFlr.sourceLocation.trim().slice(0, 16)
      : null;

  const id = String(rawFlr.flrID || rawFlr.id || `donki-flr-${date}-${solOffset}`).replace(
    /[^a-zA-Z0-9:_-]/g,
    '-'
  );

  const defaultDesc = `Class ${parsed.classType} solar flare detected${
    activeRegion ? ` from sunspot region ${activeRegion}` : ''
  }${sourceLocation ? ` (${sourceLocation})` : ''}.`;

  return {
    id,
    type: 'flare',
    code: 'FLR',
    severity: parsed.severity,
    solOffset,
    sol: solOffset,
    leadTime: 2,
    leadTimeSols: 2,
    title: `Solar Flare (${parsed.classType})`,
    label: 'Flare hit',
    description: sanitizeDonkiNote(rawFlr.note, defaultDesc),
    factText: factSheet.oneLineFact,
    factSheet,
    source: sourceLabel,
    date,
    beginTime: rawFlr.beginTime || null,
    peakTime: rawFlr.peakTime || null,
    endTime: rawFlr.endTime || null,
    classType: parsed.classType,
    activeRegionNum,
    activeRegion,
    sourceLocation,
    speed: null,
    isRealNasaEvent: true,
  };
}

/**
 * Maps a single raw NASA DONKI `CMEJSON` record to a normalized game event.
 *
 * @param {Object} rawCme
 * @param {number} [solOffset=5]
 * @param {string} [sourceLabel='NASA DONKI']
 * @returns {Object}
 */
export function mapCmeToGameEvent(rawCme = {}, solOffset = 5, sourceLabel = 'NASA DONKI') {
  const analysis = selectMostAccurateAnalysis(rawCme.cmeAnalyses);
  const factSheet = getFactSheet('cme');
  const rawTime = String(rawCme.startTime || '');
  const date = /^\d{4}-\d{2}-\d{2}/.test(rawTime) ? rawTime.slice(0, 10) : '2024-05-11';
  const activeRegionNum = Number.isInteger(Number(rawCme.activeRegionNum))
    ? Number(rawCme.activeRegionNum)
    : null;
  const activeRegion = activeRegionNum ? `AR ${activeRegionNum}` : null;
  const sourceLocation =
    typeof rawCme.sourceLocation === 'string' && rawCme.sourceLocation.trim()
      ? rawCme.sourceLocation.trim().slice(0, 16)
      : null;

  const id = String(rawCme.activityID || rawCme.id || `donki-cme-${date}-${solOffset}`).replace(
    /[^a-zA-Z0-9:_-]/g,
    '-'
  );

  const defaultDesc = `Coronal Mass Ejection traveling at ${analysis.speed} km/s (SCORE type ${
    analysis.scoreType
  })${activeRegion ? ` from ${activeRegion}` : ''}.`;

  return {
    id,
    type: 'cme',
    code: 'CME',
    severity: analysis.severity,
    solOffset,
    sol: solOffset,
    leadTime: analysis.leadTime,
    leadTimeSols: analysis.leadTime,
    title: `CME Storm (${analysis.speed} km/s)`,
    label: 'CME storm hit',
    description: sanitizeDonkiNote(rawCme.note, defaultDesc),
    factText: factSheet.oneLineFact,
    factSheet,
    source: sourceLabel,
    date,
    startTime: rawCme.startTime || null,
    classType: null,
    activeRegionNum,
    activeRegion,
    sourceLocation,
    speed: analysis.speed,
    scoreType: analysis.scoreType,
    halfAngle: analysis.halfAngle,
    isRealNasaEvent: true,
  };
}

/**
 * Compresses and maps raw DONKI `/FLR` and `/CME` arrays onto the mission Sol timeline,
 * clamping event counts and extreme spikes so every level stays winnable.
 *
 * @param {Object} options
 * @param {Array<Object>} [options.flr=[]]
 * @param {Array<Object>} [options.cme=[]]
 * @param {number} [options.targetSols=14]
 * @param {number} [options.maxEvents=6]
 * @param {string} [options.sourceLabel='NASA DONKI']
 * @returns {Array<Object>}
 */
export function mapDonkiPayloadToEvents({
  flr = [],
  cme = [],
  targetSols = 14,
  maxEvents = 6,
  sourceLabel = 'NASA DONKI',
} = {}) {
  const safeFlr = Array.isArray(flr) ? flr : [];
  const safeCme = Array.isArray(cme) ? cme : [];

  // Sort flares by intensity (X > M > C) so the most memorable real events are picked
  const rankedFlr = [...safeFlr].sort((a, b) => {
    const pa = parseFlareClass(a?.classType);
    const pb = parseFlareClass(b?.classType);
    const rank = { X: 3, M: 2, C: 1, B: 0, A: 0 };
    if (rank[pb.letter] !== rank[pa.letter]) {
      return rank[pb.letter] - rank[pa.letter];
    }
    return pb.magnitude - pa.magnitude;
  });

  // Sort CMEs by speed descending
  const rankedCme = [...safeCme].sort((a, b) => {
    const sa = selectMostAccurateAnalysis(a?.cmeAnalyses).speed;
    const sb = selectMostAccurateAnalysis(b?.cmeAnalyses).speed;
    return sb - sa;
  });

  const maxFlrCount = Math.max(1, Math.ceil(maxEvents * 0.65));
  const maxCmeCount = Math.max(1, maxEvents - maxFlrCount);

  const chosenRaw = [
    ...rankedFlr.slice(0, maxFlrCount).map((item) => ({ kind: 'FLR', raw: item })),
    ...rankedCme.slice(0, maxCmeCount).map((item) => ({ kind: 'CME', raw: item })),
  ].slice(0, maxEvents);

  // Sort chronologically by timestamp before spreading across Sols
  chosenRaw.sort((a, b) => {
    const ta = Date.parse(a.raw?.beginTime || a.raw?.startTime || '') || 0;
    const tb = Date.parse(b.raw?.beginTime || b.raw?.startTime || '') || 0;
    return ta - tb;
  });

  // Build candidate Sol slots (2..targetSols, reserving Sol 7 for the Sol 214 Hero Choice)
  const candidateSols = [];
  for (let s = 2; s <= targetSols; s += 1) {
    if (s !== 7) {
      candidateSols.push(s);
    }
  }

  let extremeCount = 0;
  return chosenRaw.map((entry, idx) => {
    const slotIndex = Math.min(
      candidateSols.length - 1,
      Math.floor((idx * candidateSols.length) / Math.max(1, chosenRaw.length))
    );
    const solOffset = candidateSols[slotIndex] || Math.min(targetSols, idx + 2);

    const mapped =
      entry.kind === 'CME'
        ? mapCmeToGameEvent(entry.raw, solOffset, sourceLabel)
        : mapFlrToGameEvent(entry.raw, solOffset, sourceLabel);

    // Cap non-Sol214 extreme events at 2 per batch so runs stay fair and winnable
    if (mapped.severity === 'extreme') {
      extremeCount += 1;
      if (extremeCount > 2) {
        mapped.severity = 'major';
      }
    }

    return mapped;
  });
}

export default {
  parseFlareClass,
  selectMostAccurateAnalysis,
  sanitizeDonkiNote,
  mapFlrToGameEvent,
  mapCmeToGameEvent,
  mapDonkiPayloadToEvents,
};
