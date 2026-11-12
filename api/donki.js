/**
 * @fileoverview Vercel Serverless Function `GET /api/donki`
 * Proxies and caches NASA CCMC DONKI (`/FLR` and `/CME`) using server-side `NASA_API_KEY`
 * and Supabase `donki_cache`, returning normalized MOONWATCH game events.
 */

import { createClient } from '@supabase/supabase-js';
import { mapDonkiPayloadToEvents } from '../src/data/donkiMapper.js';
import {
  applySecurityHeaders,
  assertAllowedOutboundUrl,
  checkRateLimit,
  logSecurityEvent,
  validateDonkiQuery,
} from './_security.js';

const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function getServerSupabaseClient() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !key || !url.startsWith('https://')) {
    return null;
  }
  assertAllowedOutboundUrl(url);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function fetchJsonWithTimeout(url, timeoutMs = 4000) {
  assertAllowedOutboundUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstream HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  applySecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rate = checkRateLimit(req, res, {
    bucket: 'api_donki',
    limit: 20,
    windowMs: 60_000,
  });
  if (!rate.allowed) {
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfterSeconds: rate.retryAfterSeconds,
    });
  }

  const validation = validateDonkiQuery(req.query || {});
  if (!validation.ok) {
    logSecurityEvent('donki_invalid_query', { error: validation.error });
    return res.status(validation.status || 400).json({ error: validation.error });
  }

  const { start, end } = validation;
  const cacheKey = `RANGE:${start}:${end}`;

  try {
    const supabase = getServerSupabaseClient();

    // 1) Check Supabase `donki_cache` first
    if (supabase) {
      const { data: cachedRow } = await supabase
        .from('donki_cache')
        .select('payload, fetched_at')
        .eq('event_key', cacheKey)
        .maybeSingle();

      if (cachedRow && cachedRow.payload) {
        const fetchedAtMs = Date.parse(cachedRow.fetched_at || '') || 0;
        if (Date.now() - fetchedAtMs < CACHE_TTL_MS) {
          const cachedEvents = Array.isArray(cachedRow.payload.events)
            ? cachedRow.payload.events
            : [];
          if (cachedEvents.length > 0) {
            res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
            return res.status(200).json({
              source: 'live',
              cached: true,
              period: { start, end },
              events: cachedEvents,
            });
          }
        }
      }
    }

    // 2) Fetch live NASA DONKI using server-only NASA_API_KEY
    const nasaApiKey = String(process.env.NASA_API_KEY || '').trim();
    if (!nasaApiKey) {
      logSecurityEvent('donki_missing_nasa_key', { start, end });
      return res.status(502).json({
        source: 'error',
        error: 'Live space-weather feed unavailable; use bundled snapshot fallback.',
        events: [],
      });
    }

    const flrUrl = new URL('https://api.nasa.gov/DONKI/FLR');
    flrUrl.searchParams.set('startDate', start);
    flrUrl.searchParams.set('endDate', end);
    flrUrl.searchParams.set('api_key', nasaApiKey);

    const cmeUrl = new URL('https://api.nasa.gov/DONKI/CME');
    cmeUrl.searchParams.set('startDate', start);
    cmeUrl.searchParams.set('endDate', end);
    cmeUrl.searchParams.set('api_key', nasaApiKey);

    const [flrData, cmeData] = await Promise.all([
      fetchJsonWithTimeout(flrUrl.toString(), 4000).catch(() => []),
      fetchJsonWithTimeout(cmeUrl.toString(), 4000).catch(() => []),
    ]);

    const events = mapDonkiPayloadToEvents({
      flr: Array.isArray(flrData) ? flrData : [],
      cme: Array.isArray(cmeData) ? cmeData : [],
      targetSols: 14,
      maxEvents: 6,
      sourceLabel: 'NASA DONKI Live',
    });

    // 3) Store normalized payload in Supabase `donki_cache` if service role key is present
    if (supabase && process.env.SUPABASE_SERVICE_ROLE_KEY && events.length > 0) {
      await supabase
        .from('donki_cache')
        .upsert(
          [
            {
              event_type: 'FLR',
              event_key: cacheKey,
              start_time: `${start}T00:00:00Z`,
              payload: { start, end, events },
              fetched_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'event_key' }
        )
        .catch(() => null);
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json({
      source: 'live',
      cached: false,
      period: { start, end },
      events,
    });
  } catch (err) {
    logSecurityEvent('donki_proxy_error', {
      message: err instanceof Error ? err.message : 'Unknown error',
    });
    return res.status(502).json({
      source: 'error',
      error: 'Upstream space-weather service unavailable.',
      events: [],
    });
  }
}
