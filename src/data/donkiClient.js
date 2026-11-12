/**
 * @fileoverview Client-side NASA DONKI loader with a 3-second timeout (`AbortController`)
 * and automatic fallback to the bundled `/snapshots/*.json` curated historical storm periods.
 */

import { mapDonkiPayloadToEvents } from './donkiMapper.js';

export const DONKI_TIMEOUT_MS = 3000;

export const SNAPSHOT_CATALOG = [
  {
    id: 'may-2024-superstorm',
    title: 'May 2024 Gannon Superstorm (AR 13664)',
    file: '/snapshots/may-2024-superstorm.json',
    period: { start: '2024-05-08', end: '2024-05-15' },
  },
  {
    id: 'halloween-2003',
    title: 'October–November 2003 Halloween Solar Storms (AR 10486)',
    file: '/snapshots/halloween-2003.json',
    period: { start: '2003-10-26', end: '2003-11-04' },
  },
  {
    id: 'bastille-2000',
    title: 'July 2000 Bastille Day Solar Storm (AR 9077)',
    file: '/snapshots/bastille-2000.json',
    period: { start: '2000-07-11', end: '2000-07-18' },
  },
  {
    id: 'st-patricks-2015',
    title: "March 2015 St. Patrick's Day Storm (AR 12297)",
    file: '/snapshots/st-patricks-2015.json',
    period: { start: '2015-03-11', end: '2015-03-18' },
  },
];

/**
 * Embedded emergency fallback dataset in case the browser is completely offline
 * before `/snapshots/*.json` is cached by the browser.
 */
const EMERGENCY_EMBEDDED_SNAPSHOT = {
  id: 'may-2024-superstorm',
  title: 'May 2024 Gannon Superstorm (AR 13664)',
  flr: [
    {
      flrID: '2024-05-08T04:37:00-FLR-001',
      beginTime: '2024-05-08T04:37Z',
      peakTime: '2024-05-08T05:09Z',
      endTime: '2024-05-08T05:32Z',
      classType: 'X1.0',
      sourceLocation: 'N22W12',
      activeRegionNum: 13664,
      note: 'Major X1.0 flare from sunspot group AR 13664.',
    },
    {
      flrID: '2024-05-11T01:10:00-FLR-001',
      beginTime: '2024-05-11T01:10Z',
      peakTime: '2024-05-11T01:23Z',
      endTime: '2024-05-11T01:39Z',
      classType: 'X5.8',
      sourceLocation: 'N17W44',
      activeRegionNum: 13664,
      note: 'Intense X5.8 solar flare during the May 2024 Gannon Superstorm.',
    },
  ],
  cme: [
    {
      activityID: '2024-05-11T01:36:00-CME-001',
      startTime: '2024-05-11T01:36Z',
      sourceLocation: 'N17W44',
      activeRegionNum: 13664,
      note: 'Fast R-type halo CME associated with the X5.8 solar flare.',
      cmeAnalyses: [
        {
          isMostAccurate: true,
          speed: 1520.0,
          type: 'R',
          halfAngle: 52.0,
          latitude: 15.0,
          longitude: 38.0,
        },
      ],
    },
  ],
};

/**
 * Helper that runs `fetch` with an explicit `AbortController` timeout.
 *
 * @param {string} url
 * @param {RequestInit} [options={}]
 * @param {number} [timeoutMs=DONKI_TIMEOUT_MS]
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = DONKI_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads and normalizes a bundled historical DONKI snapshot from `/snapshots/*.json`.
 *
 * @param {string} [snapshotId='may-2024-superstorm']
 * @param {Object} [options={}]
 * @param {number} [options.targetSols=14]
 * @param {number} [options.timeoutMs=DONKI_TIMEOUT_MS]
 * @returns {Promise<{ source: 'snapshot', snapshotId: string, snapshotTitle: string, events: Array<Object> }>}
 */
export async function loadSnapshotEvents(snapshotId = 'may-2024-superstorm', options = {}) {
  const targetSols = options.targetSols || 14;
  const timeoutMs = options.timeoutMs || DONKI_TIMEOUT_MS;
  const entry =
    SNAPSHOT_CATALOG.find((item) => item.id === snapshotId) || SNAPSHOT_CATALOG[0];

  try {
    const res = await fetchWithTimeout(entry.file, { headers: { Accept: 'application/json' } }, timeoutMs);
    if (!res.ok) {
      throw new Error(`Snapshot HTTP ${res.status}`);
    }
    const payload = await res.json();
    const events = Array.isArray(payload.events)
      ? payload.events
      : mapDonkiPayloadToEvents({
          flr: payload.flr || [],
          cme: payload.cme || [],
          targetSols,
          sourceLabel: 'NASA DONKI Snapshot',
        });

    return {
      source: 'snapshot',
      snapshotId: payload.id || entry.id,
      snapshotTitle: payload.title || entry.title,
      events,
    };
  } catch {
    const events = mapDonkiPayloadToEvents({
      flr: EMERGENCY_EMBEDDED_SNAPSHOT.flr,
      cme: EMERGENCY_EMBEDDED_SNAPSHOT.cme,
      targetSols,
      sourceLabel: 'NASA DONKI Snapshot',
    });
    return {
      source: 'snapshot',
      snapshotId: EMERGENCY_EMBEDDED_SNAPSHOT.id,
      snapshotTitle: EMERGENCY_EMBEDDED_SNAPSHOT.title,
      events,
    };
  }
}

/**
 * Queries `/api/donki` with a strict 3-second timeout and automatically falls back
 * to `/snapshots/*.json` when offline, timed out, or when `/api/donki` returns an error.
 *
 * @param {Object} [options={}]
 * @param {string} [options.start='2024-05-08']
 * @param {string} [options.end='2024-05-15']
 * @param {string} [options.snapshotId='may-2024-superstorm']
 * @param {boolean} [options.preferSnapshot=false]
 * @param {number} [options.targetSols=14]
 * @param {number} [options.timeoutMs=DONKI_TIMEOUT_MS]
 * @returns {Promise<{ source: 'live'|'snapshot', snapshotId: string|null, snapshotTitle: string, events: Array<Object> }>}
 */
export async function loadSpaceWeatherEvents(options = {}) {
  const {
    start = '2024-05-08',
    end = '2024-05-15',
    snapshotId = 'may-2024-superstorm',
    preferSnapshot = false,
    targetSols = 14,
    timeoutMs = DONKI_TIMEOUT_MS,
  } = options;

  const isOffline =
    typeof navigator !== 'undefined' && navigator.onLine === false;

  if (preferSnapshot || isOffline) {
    return loadSnapshotEvents(snapshotId, { targetSols, timeoutMs });
  }

  try {
    const params = new URLSearchParams({ start, end });
    const res = await fetchWithTimeout(
      `/api/donki?${params.toString()}`,
      { headers: { Accept: 'application/json' } },
      timeoutMs
    );

    if (!res.ok) {
      throw new Error(`DONKI API returned ${res.status}`);
    }

    const data = await res.json();
    let events = [];

    if (Array.isArray(data.events) && data.events.length > 0) {
      events = data.events;
    } else if (Array.isArray(data.flr) || Array.isArray(data.cme)) {
      events = mapDonkiPayloadToEvents({
        flr: data.flr || [],
        cme: data.cme || [],
        targetSols,
        sourceLabel: data.source === 'cache' ? 'NASA DONKI (Cached)' : 'NASA DONKI Live',
      });
    }

    if (events.length === 0) {
      return loadSnapshotEvents(snapshotId, { targetSols, timeoutMs });
    }

    return {
      source: data.source === 'snapshot' ? 'snapshot' : 'live',
      snapshotId: null,
      snapshotTitle: `Live NASA DONKI (${start} to ${end})`,
      events,
    };
  } catch {
    return loadSnapshotEvents(snapshotId, { targetSols, timeoutMs });
  }
}

export default {
  DONKI_TIMEOUT_MS,
  SNAPSHOT_CATALOG,
  fetchWithTimeout,
  loadSnapshotEvents,
  loadSpaceWeatherEvents,
};
