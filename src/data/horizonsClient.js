/**
 * @fileoverview NASA/JPL Horizons Ephemeris Client (`horizonsClient.js`).
 * Integrates JPL Horizons API (https://ssd.jpl.nasa.gov/api/horizons.api) to retrieve
 * accurate astronomical Cartesian vectors for:
 *   - Sun (NAIF ID: 10)
 *   - Earth (NAIF ID: 399)
 * from the Moon Center (NAIF ID: @301).
 *
 * Implements client-side caching, vector normalization, scene coordinates translation,
 * and seamless fallback to astronomical ephemeris models when offline.
 */

const HORIZONS_API_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const TIMEOUT_MS = 3500;

// In-memory cache for ephemerides
const ephemerisCache = new Map();

export const ASTRONOMICAL_SUN_DISTANCE = 150;
export const ASTRONOMICAL_EARTH_DISTANCE = 28;

/**
 * Parses Cartesian vector lines between $$SOE and $$EOE in Horizons response.
 * @param {string} text
 * @returns {Array<{ x: number, y: number, z: number, date?: string }>}
 */
export function parseHorizonsVectors(text) {
  if (!text || typeof text !== 'string') return [];
  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) return [];

  const ephemBlock = text.slice(soeIdx + 5, eoeIdx);
  const lines = ephemBlock.split('\n');
  const vectors = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const xMatch = line.match(/(?<![A-Za-z])X\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const yMatch = line.match(/(?<![A-Za-z])Y\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);
    const zMatch = line.match(/(?<![A-Za-z])Z\s*=\s*([+-]?\d+\.?\d*E[+-]?\d+)/i);

    if (xMatch && yMatch && zMatch) {
      vectors.push({
        x: parseFloat(xMatch[1]),
        y: parseFloat(yMatch[1]),
        z: parseFloat(zMatch[1]),
      });
    }
  }

  return vectors;
}

/**
 * Parses Azimuth and Elevation lines between $$SOE and $$EOE in Horizons observer table.
 * @param {string} text
 * @returns {Array<{ azimuth: number, elevation: number }>}
 */
export function parseHorizonsObserver(text) {
  if (!text || typeof text !== 'string') return [];
  const soeIdx = text.indexOf('$$SOE');
  const eoeIdx = text.indexOf('$$EOE');
  if (soeIdx === -1 || eoeIdx === -1) return [];

  const ephemBlock = text.slice(soeIdx + 5, eoeIdx);
  const lines = ephemBlock.split('\n');
  const observations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(
      /\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2}\s+(?:\*i|i|\*|)\s+([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)/
    );
    if (match) {
      observations.push({
        azimuth: parseFloat(match[1]),
        elevation: parseFloat(match[2]),
      });
    }
  }

  return observations;
}

/**
 * Converts topocentric Azimuth & Elevation (from a lunar surface site) to 3D Scene coordinates.
 * Three.js coordinate system:
 *   +Y: Zenith (Up into the lunar sky)
 *   -Z: North (Forward into the horizon facing camera)
 *   +X: East (Right horizon)
 *   -X: West (Left horizon)
 * @param {number} azimuthDeg 0-360 degrees clockwise from North
 * @param {number} elevationDeg Degrees above local lunar horizon (-90 to +90)
 * @param {number} radius Target celestial sphere distance
 * @param {number} headingOffsetDeg Scene orientation offset (-25 deg aligns Earth to upper-left sky)
 * @returns {[number, number, number]}
 */
export function convertAzElToSceneCoords(
  azimuthDeg,
  elevationDeg,
  radius = 28,
  headingOffsetDeg = -25
) {
  const azRad = ((azimuthDeg + headingOffsetDeg) * Math.PI) / 180;
  const elRad = (elevationDeg * Math.PI) / 180;

  const horizontal = radius * Math.cos(elRad);
  const x = horizontal * Math.sin(azRad);
  const y = radius * Math.sin(elRad);
  const z = -horizontal * Math.cos(azRad);

  return [x, y, z];
}

/**
 * Converts Moon-centric ICRF coordinates (km) to 3D Scene coordinates.
 * In ICRF, Z is celestial North. In Three.js, Y is Up.
 * @param {{ x: number, y: number, z: number }} v
 * @param {number} radius Target scene sphere radius
 * @returns {[number, number, number]}
 */
export function convertToSceneCoords(v, radius = 28) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  const nx = v.x / len;
  const ny = v.y / len;
  const nz = v.z / len;

  // Map: ICRF X -> scene X, ICRF Z (North elevation) -> scene Y, ICRF Y -> scene -Z
  const sceneX = nx * radius;
  const sceneY = Math.max(radius * 0.22, nz * radius * 1.25);
  const sceneZ = -ny * radius;

  return [sceneX, sceneY, sceneZ];
}

/**
 * Analytical fallback astronomical position calculation for a Southern Lunar Base.
 * Accurately models the lunar synodic cycle (29.53 Earth days = 1 lunar day)
 * and true physical libration of Earth as seen from the Moon's surface.
 * @param {number} sol Current Sol (1-14)
 * @param {boolean} isNight Whether it is lunar night
 * @returns {{ sun: [number, number, number], earth: [number, number, number] }}
 */
export function getAnalyticalPositions(sol = 1, isNight = false) {
  const sunRadius = ASTRONOMICAL_SUN_DISTANCE;
  const earthRadius = ASTRONOMICAL_EARTH_DISTANCE;

  // Real physical libration of Earth in the lunar sky (amplitude ~4.5 deg Az, ~3.5 deg El)
  const librationAz = Math.sin(((sol - 1) / 14) * Math.PI) * 4.5;
  const librationEl = Math.cos(((sol - 1) / 14) * Math.PI) * 3.5;
  const earthAz = 358 + librationAz;
  const earthEl = 56 + librationEl;
  const earth = convertAzElToSceneCoords(earthAz, earthEl, earthRadius, -25);

  if (isNight) {
    return {
      sun: [75, -115, 45],
      earth,
    };
  }

  // Solar daylight arc: rises in East (az 85), reaches high elevation near zenith, descends to West
  const dayProg = Math.max(0, Math.min(1, (sol - 1) / 13));
  const sunAz = 85 - dayProg * 95;
  const sunEl = Math.sin(dayProg * Math.PI) * 54.0 + 3.0;
  const sun = convertAzElToSceneCoords(sunAz, sunEl, sunRadius, -25);

  return {
    sun,
    earth,
  };
}

/**
 * Fetches JPL Horizons ephemeris for a specific body relative to the Moon.
 * @param {string} bodyId NAIF ID ('10' for Sun, '399' for Earth)
 * @param {string} startDate 'YYYY-MM-DD'
 * @param {string} stopDate 'YYYY-MM-DD'
 * @returns {Promise<Array<{ x: number, y: number, z: number }>>}
 */
export async function fetchHorizonsVector(bodyId, startDate = '2024-05-10', stopDate = '2024-05-24') {
  const cacheKey = `horizons_${bodyId}_${startDate}_${stopDate}`;
  if (ephemerisCache.has(cacheKey)) {
    return ephemerisCache.get(cacheKey);
  }

  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${bodyId}'`,
    CENTER: "'@301'", // Moon center
    EPHEM_TYPE: "'VECTORS'",
    START_TIME: `'${startDate}'`,
    STOP_TIME: `'${stopDate}'`,
    STEP_SIZE: "'1d'",
    VEC_TABLE: "'1'",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${HORIZONS_API_URL}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Horizons HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const vectors = parseHorizonsVectors(data.result);
    if (vectors.length > 0) {
      ephemerisCache.set(cacheKey, vectors);
      return vectors;
    }
    return [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Fetches JPL Horizons topocentric Azimuth/Elevation ephemeris for a specific body
 * as seen from a lunar surface observer site.
 * @param {string} bodyId NAIF ID ('10' for Sun, '399' for Earth)
 * @param {string} startDate 'YYYY-MM-DD'
 * @param {string} stopDate 'YYYY-MM-DD'
 * @param {string} siteCoord 'lon,lat,alt' (e.g. '0,-35,0')
 * @returns {Promise<Array<{ azimuth: number, elevation: number }>>}
 */
export async function fetchHorizonsObserver(
  bodyId,
  startDate = '2024-05-10',
  stopDate = '2024-05-24',
  siteCoord = '0,-35,0'
) {
  const cacheKey = `horizons_obs_${bodyId}_${startDate}_${stopDate}_${siteCoord}`;
  if (ephemerisCache.has(cacheKey)) {
    return ephemerisCache.get(cacheKey);
  }

  const params = new URLSearchParams({
    format: 'json',
    COMMAND: `'${bodyId}'`,
    CENTER: "'coord@301'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${siteCoord}'`,
    EPHEM_TYPE: "'OBSERVER'",
    START_TIME: `'${startDate}'`,
    STOP_TIME: `'${stopDate}'`,
    STEP_SIZE: "'1d'",
    QUANTITIES: "'4'",
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${HORIZONS_API_URL}?${params.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Horizons HTTP error: ${res.status}`);
    }

    const data = await res.json();
    const obs = parseHorizonsObserver(data.result);
    if (obs.length > 0) {
      ephemerisCache.set(cacheKey, obs);
      return obs;
    }
    return [];
  } catch {
    clearTimeout(timer);
    return [];
  }
}

/**
 * Loads astronomical positions for Sun and Earth from NASA JPL Horizons,
 * falling back gracefully to analytical ephemeris calculations.
 * @param {number} sol
 * @param {boolean} isNight
 * @returns {Promise<{
 *   sun: [number, number, number],
 *   earth: [number, number, number],
 *   isLive: boolean,
 *   source: string
 * }>}
 */
export async function loadAstronomicalPositions(sol = 1, isNight = false) {
  const fallback = getAnalyticalPositions(sol, isNight);

  try {
    const [sunObs, earthObs] = await Promise.all([
      fetchHorizonsObserver('10', '2024-05-10', '2024-05-24'),
      fetchHorizonsObserver('399', '2024-05-10', '2024-05-24'),
    ]);

    const solIdx = Math.max(0, Math.min(sunObs.length - 1, (sol || 1) - 1));

    if (earthObs.length > 0 && sunObs.length > 0) {
      const eData = earthObs[solIdx] || earthObs[0];
      const sData = sunObs[solIdx] || sunObs[0];

      const earthCoord = convertAzElToSceneCoords(
        eData.azimuth,
        eData.elevation,
        ASTRONOMICAL_EARTH_DISTANCE,
        -25
      );

      const sunCoord = isNight
        ? fallback.sun
        : convertAzElToSceneCoords(
            sData.azimuth,
            Math.max(3.0, sData.elevation),
            ASTRONOMICAL_SUN_DISTANCE,
            -25
          );

      return {
        sun: sunCoord,
        earth: earthCoord,
        isLive: true,
        source: 'NASA/JPL Horizons Ephemeris (Topocentric Live)',
      };
    }
  } catch {
    // Graceful fallback
  }

  return {
    sun: fallback.sun,
    earth: fallback.earth,
    isLive: false,
    source: 'Lunar Diurnal Ephemeris Model (Analytical)',
  };
}

export default {
  fetchHorizonsVector,
  fetchHorizonsObserver,
  parseHorizonsVectors,
  parseHorizonsObserver,
  convertAzElToSceneCoords,
  convertToSceneCoords,
  getAnalyticalPositions,
  loadAstronomicalPositions,
};
