/**
 * @fileoverview Safe client-side Supabase wrapper (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)
 * and anonymous telemetry helpers. All operations fail silently so gameplay works 100%
 * offline and with Supabase disabled.
 */

import { createClient } from '@supabase/supabase-js';
import { fetchWithTimeout } from './donkiClient.js';

const CLIENT_ID_STORAGE_KEY = 'moonwatch_client_id';
const CLIENT_SESSION_KEY = 'moonwatch_client_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7-day rolling anonymous session

const supabaseUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? String(import.meta.env.VITE_SUPABASE_URL || '').trim()
    : '';

const supabaseAnonKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()
    : '';

/**
 * Public RLS-protected Supabase client instance, or `null` if not configured.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

/**
 * Generates an RFC 4122 v4 UUID using Web Crypto API (or deterministic-safe fallback).
 *
 * @returns {string}
 */
export function generateUuidV4() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Returns a validated anonymous `client_id` UUID from `localStorage`, rotating
 * expired sessions automatically.
 *
 * @returns {string}
 */
export function getOrCreateClientId() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return generateUuidV4();
    }

    const now = Date.now();
    const rawSession = window.localStorage.getItem(CLIENT_SESSION_KEY);
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (
        parsed &&
        typeof parsed.clientId === 'string' &&
        UUID_V4_REGEX.test(parsed.clientId) &&
        typeof parsed.expiresAt === 'number' &&
        parsed.expiresAt > now
      ) {
        return parsed.clientId;
      }
    }

    const existingLegacy = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    const clientId =
      existingLegacy && UUID_V4_REGEX.test(existingLegacy)
        ? existingLegacy
        : generateUuidV4();

    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
    window.localStorage.setItem(
      CLIENT_SESSION_KEY,
      JSON.stringify({
        clientId,
        issuedAt: now,
        expiresAt: now + SESSION_TTL_MS,
      })
    );
    return clientId;
  } catch {
    return generateUuidV4();
  }
}

/**
 * Validates and normalizes a run telemetry payload before sending.
 *
 * @param {Object} runData
 * @returns {Object}
 */
export function normalizeRunPayload(runData = {}) {
  const level = Math.min(3, Math.max(1, Number.parseInt(runData.level, 10) || 1));
  const seed = Math.max(1, Math.min(2147483647, Math.abs(Number.parseInt(runData.seed, 10) || 2142026)));
  const event_source = runData.event_source === 'live' ? 'live' : 'snapshot';
  const outcome = runData.outcome === 'won' ? 'won' : 'lost';
  const sols_survived = Math.min(
    60,
    Math.max(0, Number.parseInt(runData.sols_survived ?? runData.solsSurvived, 10) || 0)
  );
  const rawCause = String(runData.primary_cause ?? runData.primaryCause ?? 'none')
    .replace(/[^a-zA-Z0-9 _:-]/g, '')
    .trim()
    .slice(0, 64);
  const client_id =
    typeof runData.client_id === 'string' && UUID_V4_REGEX.test(runData.client_id)
      ? runData.client_id
      : getOrCreateClientId();

  return {
    level,
    seed,
    event_source,
    outcome,
    sols_survived,
    primary_cause: rawCause || 'none',
    client_id,
    website: '', // Honeypot field (must remain empty)
  };
}

/**
 * Submits an anonymous run summary to `/api/runs` (falling back to RLS-protected
 * Supabase anon insert if the serverless endpoint is unreachable).
 * Always resolves safely without throwing.
 *
 * @param {Object} runData
 * @param {Object} [options={}]
 * @param {number} [options.timeoutMs=3000]
 * @returns {Promise<{ saved: boolean, via: 'api'|'supabase'|'none' }>}
 */
export async function saveRunResult(runData = {}, options = {}) {
  const timeoutMs = options.timeoutMs || 3000;
  const payload = normalizeRunPayload(runData);

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { saved: false, via: 'none' };
  }

  // 1. Primary path: POST /api/runs
  try {
    const res = await fetchWithTimeout(
      '/api/runs',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-client-id': payload.client_id,
        },
        body: JSON.stringify(payload),
      },
      timeoutMs
    );

    if (res.ok) {
      return { saved: true, via: 'api' };
    }
  } catch {
    // Fall through to optional direct RLS insert
  }

  // 2. Fallback path: direct RLS-protected anon insert if Supabase client is configured
  if (supabase) {
    try {
      const dbRow = {
        level: payload.level,
        seed: payload.seed,
        event_source: payload.event_source,
        outcome: payload.outcome,
        sols_survived: payload.sols_survived,
        primary_cause: payload.primary_cause,
        client_id: payload.client_id,
      };
      const { error } = await supabase.from('runs').insert([dbRow]);
      if (!error) {
        return { saved: true, via: 'supabase' };
      }
    } catch {
      // Ignore errors silently per TECH_STACK Section 8
    }
  }

  return { saved: false, via: 'none' };
}

export default {
  supabase,
  generateUuidV4,
  getOrCreateClientId,
  normalizeRunPayload,
  saveRunResult,
};
