/**
 * @fileoverview Vercel Serverless Function `/api/runs`
 *  - `POST /api/runs`: Validates and stores anonymous run telemetry in Supabase `runs`
 *  - `GET /api/runs`: Returns aggregated `run_stats` or caller-owned run history (protected against IDOR)
 */

import { createClient } from '@supabase/supabase-js';
import {
  applySecurityHeaders,
  assertAllowedOutboundUrl,
  checkRateLimit,
  enforceBodySizeLimit,
  issueClientSessionCookie,
  logSecurityEvent,
  requireClientOwnership,
  sanitizeRunRecordForResponse,
  validateRunSubmission,
} from './_security.js';

function getServerSupabaseClient({ requireServiceRole = false } = {}) {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = requireServiceRole
    ? String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
    : String(
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
      ).trim();

  if (!url || !key || !url.startsWith('https://')) {
    return null;
  }
  assertAllowedOutboundUrl(url);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default async function handler(req, res) {
  applySecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'POST') {
    const sizeCheck = enforceBodySizeLimit(req, 4096);
    if (!sizeCheck.ok) {
      return res.status(sizeCheck.status || 413).json({ error: sizeCheck.error });
    }

    const parsedBody =
      typeof req.body === 'string'
        ? (() => {
            try {
              return JSON.parse(req.body);
            } catch {
              return null;
            }
          })()
        : req.body;

    const validation = validateRunSubmission(parsedBody);
    if (!validation.ok) {
      logSecurityEvent('runs_invalid_submission', { error: validation.error });
      return res.status(validation.status || 400).json({ error: validation.error });
    }

    const runPayload = validation.value;

    // Area 2: Enforce reusable ownership check between caller identity and payload `client_id`
    const ownership = requireClientOwnership(req, runPayload.client_id);
    if (!ownership.ok) {
      return res.status(ownership.status || 403).json({ error: ownership.error });
    }

    // Area 5: Rate limit per IP and per client_id (max 12 run submissions per minute)
    const rate = checkRateLimit(req, res, {
      bucket: 'api_runs_post',
      limit: 12,
      windowMs: 60_000,
      clientKey: ownership.callerClientId,
    });
    if (!rate.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }

    issueClientSessionCookie(res, ownership.callerClientId);

    try {
      const supabase = getServerSupabaseClient();
      if (!supabase) {
        return res.status(202).json({
          saved: false,
          reason: 'telemetry_disabled',
          run: sanitizeRunRecordForResponse(runPayload),
        });
      }

      const { error } = await supabase.from('runs').insert([runPayload]);
      if (error) {
        logSecurityEvent('runs_insert_error', { code: error.code });
        return res.status(502).json({ error: 'Unable to store run telemetry.' });
      }

      return res.status(201).json({
        saved: true,
        run: sanitizeRunRecordForResponse(runPayload),
      });
    } catch (err) {
      logSecurityEvent('runs_post_exception', {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      return res.status(502).json({ error: 'Unable to store run telemetry.' });
    }
  }

  if (req.method === 'GET') {
    const rate = checkRateLimit(req, res, {
      bucket: 'api_runs_get',
      limit: 30,
      windowMs: 60_000,
    });
    if (!rate.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        retryAfterSeconds: rate.retryAfterSeconds,
      });
    }

    const requestedClientId = req.query?.client_id;
    const rawLimit = Number.parseInt(req.query?.limit, 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(25, Math.max(1, rawLimit)) : 10;

    try {
      const supabase = getServerSupabaseClient();

      // If caller requests a specific client_id's runs, enforce anti-IDOR ownership check and require service_role key
      if (requestedClientId !== undefined) {
        const ownership = requireClientOwnership(req, String(requestedClientId));
        if (!ownership.ok) {
          return res.status(ownership.status || 403).json({ error: ownership.error });
        }

        const privilegedSupabase = getServerSupabaseClient({ requireServiceRole: true });
        if (!privilegedSupabase) {
          return res.status(200).json({ runs: [] });
        }

        const { data, error } = await privilegedSupabase
          .from('runs')
          .select('level, seed, event_source, outcome, sols_survived, primary_cause, created_at')
          .eq('client_id', ownership.callerClientId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          return res.status(502).json({ error: 'Unable to fetch run records.' });
        }

        return res.status(200).json({
          runs: (data || []).map((row) => sanitizeRunRecordForResponse(row)),
        });
      }

      // Otherwise return public aggregated `run_stats` summary
      if (!supabase) {
        return res.status(200).json({ stats: [] });
      }

      const { data, error } = await supabase
        .from('run_stats')
        .select('level, outcome, primary_cause, run_count, avg_sols_survived')
        .limit(limit);

      if (error) {
        return res.status(200).json({ stats: [] });
      }

      return res.status(200).json({ stats: data || [] });
    } catch {
      return res.status(200).json({ stats: [] });
    }
  }

  res.setHeader('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'Method Not Allowed' });
}
