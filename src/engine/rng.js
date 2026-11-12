/**
 * @fileoverview Pure deterministic seeded RNG (Mulberry32) with string/number seed
 * normalization and helper methods (nextFloat, nextInt, pick, shuffle, fork).
 */

const DEFAULT_SEED = 2142026;

/**
 * Normalizes any seed value (number, string, bigint, null/undefined) into an
 * unsigned 32-bit integer suitable for Mulberry32.
 *
 * @param {number|string|bigint|null|undefined} seed
 * @returns {number} Unsigned 32-bit integer
 */
export function normalizeSeed(seed) {
  if (seed === null || seed === undefined || seed === '') {
    return DEFAULT_SEED >>> 0;
  }

  if (typeof seed === 'number') {
    if (!Number.isFinite(seed) || Number.isNaN(seed)) {
      return DEFAULT_SEED >>> 0;
    }
    if (Number.isInteger(seed)) {
      return seed >>> 0;
    }
    // Hash float representation deterministically
    return normalizeSeed(String(seed));
  }

  if (typeof seed === 'bigint') {
    return Number(seed & 0xffffffffn) >>> 0;
  }

  // FNV-1a 32-bit hash for strings and other values
  const str = String(seed);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Raw Mulberry32 PRNG factory.
 * Returns a pure stateful closure yielding floats in [0, 1).
 *
 * @param {number|string} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let state = normalizeSeed(seed);
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a deterministic RNG object (which is also directly callable as `rng()`)
 * equipped with `.nextFloat()`, `.nextInt()`, `.pick()`, `.shuffle()`, `.fork()`.
 *
 * @param {number|string|Function|Object} [seed]
 * @returns {Function & {
 *   seed: number,
 *   next: () => number,
 *   nextFloat: () => number,
 *   nextInt: (min: number, max?: number) => number,
 *   pick: <T>(arr: T[]) => T | undefined,
 *   shuffle: <T>(arr: T[]) => T[],
 *   chance: (probability: number) => boolean,
 *   fork: (salt?: number|string) => ReturnType<typeof createRNG>,
 *   getState: () => number,
 *   clone: () => ReturnType<typeof createRNG>
 * }}
 */
export function createRNG(seed = DEFAULT_SEED) {
  // If an existing createRNG instance is passed, return it directly
  if (typeof seed === 'function' && typeof seed.nextFloat === 'function') {
    return seed;
  }

  const initialSeed = normalizeSeed(seed);
  let internalState = initialSeed;

  function stepFloat() {
    internalState = (internalState + 0x6d2b79f5) | 0;
    let t = Math.imul(internalState ^ (internalState >>> 15), 1 | internalState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng = function rngCallable() {
    return stepFloat();
  };

  rng.seed = initialSeed;
  rng.next = stepFloat;
  rng.nextFloat = stepFloat;

  /**
   * Returns a deterministic integer in [min, max] inclusive.
   * If called with a single argument `max`, returns an integer in [0, max] inclusive.
   *
   * @param {number} min
   * @param {number} [max]
   * @returns {number}
   */
  rng.nextInt = function nextInt(min, max) {
    let lo = min;
    let hi = max;
    if (hi === undefined) {
      lo = 0;
      hi = min;
    }
    const ceilLo = Math.ceil(Math.min(lo, hi));
    const floorHi = Math.floor(Math.max(lo, hi));
    if (floorHi <= ceilLo) {
      return ceilLo;
    }
    return Math.floor(stepFloat() * (floorHi - ceilLo + 1)) + ceilLo;
  };

  /**
   * Picks a random element from a non-empty array without mutating it.
   *
   * @template T
   * @param {T[]} array
   * @returns {T|undefined}
   */
  rng.pick = function pick(array) {
    if (!Array.isArray(array) || array.length === 0) {
      return undefined;
    }
    const idx = Math.floor(stepFloat() * array.length);
    return array[idx];
  };

  /**
   * Returns a new shuffled copy of `array` using Fisher-Yates shuffle.
   * Never mutates the input array.
   *
   * @template T
   * @param {T[]} array
   * @returns {T[]}
   */
  rng.shuffle = function shuffle(array) {
    if (!Array.isArray(array)) {
      return [];
    }
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(stepFloat() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  };

  /**
   * Returns true with probability `p` (0..1).
   *
   * @param {number} probability
   * @returns {boolean}
   */
  rng.chance = function chance(probability) {
    if (probability <= 0) return false;
    if (probability >= 1) return true;
    return stepFloat() < probability;
  };

  /**
   * Derives a child RNG deterministically from the current state and an optional salt.
   *
   * @param {number|string} [salt='fork']
   * @returns {ReturnType<typeof createRNG>}
   */
  rng.fork = function fork(salt = 'fork') {
    const baseSample = Math.floor(stepFloat() * 0xffffffff) >>> 0;
    const saltHash = normalizeSeed(salt);
    const derivedSeed = (baseSample ^ Math.imul(saltHash, 0x9e3779b1)) >>> 0;
    return createRNG(derivedSeed);
  };

  /**
   * Returns the current internal 32-bit state integer.
   *
   * @returns {number}
   */
  rng.getState = function getState() {
    return internalState >>> 0;
  };

  /**
   * Clones the RNG at its exact current state so subsequent calls on the clone
   * produce the identical future sequence.
   *
   * @returns {ReturnType<typeof createRNG>}
   */
  rng.clone = function clone() {
    const cloned = createRNG(internalState >>> 0);
    return cloned;
  };

  return rng;
}

export const createSeededRNG = createRNG;
export default createRNG;
