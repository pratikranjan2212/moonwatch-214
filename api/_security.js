/**
 * @fileoverview Production security middleware & helpers for MOONWATCH: Sol 214 Vercel Functions.
 * Implements Areas 1–6 of `docs/production-security-master-prompt.md`:
 *  - Area 1: Scrypt secret/password hashing, timing-safe comparison, expiring HttpOnly/Secure/SameSite session cookies, auth lockout
 *  - Area 2: Reusable `requireClientOwnership` anti-IDOR middleware and response field projection
 *  - Area 3: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, strict CORS, and redacted security logging
 *  - Area 4: Server-only secret access (`NASA_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) with zero leakage
 *  - Area 5: Per-IP and per-client rate limiting (`429` + `Retry-After`), body size limit (`413`), and bot honeypot check
 *  - Area 6: Strict schema validation, XSS/SQLi/path-traversal rejection, and outbound SSRF URL allowlist
 */

import crypto from 'node:crypto';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const SAFE_CAUSE_REGEX = /^[a-zA-Z0-9 _:-]{1,64}$/;
const PATH_TRAVERSAL_OR_INJECTION_REGEX = /(\.\.[/\\]|[<>;'"`\\]|--|\/\*|\*\/|\b(select|union|insert|drop|delete|update)\b)/i;

const ALLOWED_OUTBOUND_HOSTS = new Set(['api.nasa.gov']);
const ALLOWED_CORS_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://moonwatch-214.vercel.app',
]);

const MAX_STORE_ENTRIES = 5000;

// In-memory sliding-window rate limit & auth lockout stores (per serverless instance)
const rateLimitStore = new Map();
const authFailureStore = new Map();

function enforceMapCap(mapInstance) {
  if (mapInstance.size <= MAX_STORE_ENTRIES) return;
  const oldestKey = mapInstance.keys().next().value;
  if (oldestKey !== undefined) {
    mapInstance.delete(oldestKey);
  }
}

/**
 * Redacts sensitive keys and token-like values before writing structured logs (Area 3 & 4).
 *
 * @param {any} input
 * @returns {any}
 */
export function redactSecrets(input) {
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    return input
      .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[REDACTED_JWT]')
      .replace(/sb_(secret|publishable)_[a-zA-Z0-9_-]+/g, '[REDACTED_SUPABASE_KEY]')
      .replace(/(api_key=)[^&\s]+/gi, '$1[REDACTED_KEY]');
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item));
  }
  if (typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (/(password|secret|token|key|authorization|cookie|service_role)/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSecrets(v);
      }
    }
    return out;
  }
  return input;
}

/**
 * Emits a structured, secret-redacted security log entry (Area 3).
 *
 * @param {string} eventType
 * @param {Object} [details={}]
 * @returns {Object}
 */
export function logSecurityEvent(eventType, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    service: 'moonwatch-214-api',
    eventType,
    details: redactSecrets(details),
  };
  if (process.env.NODE_ENV !== 'test') {
    console.info(JSON.stringify(entry));
  }
  return entry;
}

/**
 * Extracts a normalized client IP from standard proxy headers.
 *
 * @param {Object} req
 * @returns {string}
 */
export function getClientIp(req) {
  const vff = req?.headers?.['x-vercel-forwarded-for'];
  if (typeof vff === 'string' && vff.trim().length > 0) {
    return vff.split(',')[0].trim().slice(0, 64);
  }
  const xff = req?.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim().length > 0) {
    return xff.split(',')[0].trim().slice(0, 64);
  }
  const realIp = req?.headers?.['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim().slice(0, 64);
  }
  return req?.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Applies production security headers and strict CORS policy (Area 3).
 *
 * @param {Object} req
 * @param {Object} res
 */
export function applySecurityHeaders(req, res) {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const origin = req?.headers?.origin;
  if (
    typeof origin === 'string' &&
    (ALLOWED_CORS_ORIGINS.has(origin) || /^https:\/\/moonwatch-214(-[a-z0-9-]+)?\.vercel\.app$/.test(origin))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-client-id');
}

/**
 * Hashes a password or token using Node's slow, memory-hard `scrypt` KDF (Area 1).
 *
 * @param {string} secret
 * @param {string} [salt]
 * @returns {string} Format: `scrypt$<saltHex>$<hashHex>`
 */
export function hashSecretWithScrypt(secret, salt = crypto.randomBytes(16).toString('hex')) {
  if (typeof secret !== 'string' || secret.length < 12) {
    throw new Error('Secret must be at least 12 characters long.');
  }
  const derived = crypto.scryptSync(secret, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

/**
 * Verifies a plaintext password/secret against an `scrypt` hash in constant time (Area 1).
 *
 * @param {string} secret
 * @param {string} storedHash
 * @returns {boolean}
 */
export function verifySecretWithScrypt(secret, storedHash) {
  if (typeof secret !== 'string' || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  const derived = crypto.scryptSync(secret, salt, 64, { N: 16384, r: 8, p: 1 });
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

/**
 * Sets an expiring `HttpOnly; Secure; SameSite=Strict` session cookie for anonymous telemetry (Area 1).
 *
 * @param {Object} res
 * @param {string} clientId
 * @param {number} [maxAgeSeconds=604800]
 */
export function issueClientSessionCookie(res, clientId, maxAgeSeconds = 604800) {
  if (!UUID_V4_REGEX.test(String(clientId || ''))) return;
  const cookieValue = `mw_cid=${clientId}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  res.setHeader('Set-Cookie', cookieValue);
}

/**
 * Records failed authentication/verification attempts per IP & identifier and enforces exponential lockout (Area 1 & 5).
 *
 * @param {string} key
 * @param {number} [now=Date.now()]
 * @returns {{ locked: boolean, retryAfterSeconds: number, attempts: number }}
 */
export function recordAuthFailure(key, now = Date.now()) {
  const existing = authFailureStore.get(key) || { attempts: 0, lockedUntil: 0 };
  const attempts = existing.attempts + 1;
  const delayMs = attempts >= 5 ? Math.min(300_000, 5000 * 2 ** (attempts - 5)) : 0;
  const lockedUntil = delayMs > 0 ? now + delayMs : 0;
  authFailureStore.set(key, { attempts, lockedUntil });
  enforceMapCap(authFailureStore);
  return {
    locked: lockedUntil > now,
    retryAfterSeconds: lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0,
    attempts,
  };
}

/**
 * Checks whether an IP or account key is currently locked out from authentication attempts (Area 1).
 *
 * @param {string} key
 * @param {number} [now=Date.now()]
 * @returns {{ locked: boolean, retryAfterSeconds: number }}
 */
export function checkAuthLockout(key, now = Date.now()) {
  const existing = authFailureStore.get(key);
  if (!existing || existing.lockedUntil <= now) {
    return { locked: false, retryAfterSeconds: 0 };
  }
  return {
    locked: true,
    retryAfterSeconds: Math.ceil((existing.lockedUntil - now) / 1000),
  };
}

/**
 * Reusable anti-IDOR ownership check middleware/helper (Area 2).
 * Verifies that the caller's `x-client-id` header (or `mw_cid` cookie) is a valid UUID v4
 * and matches the target `client_id` being written or queried.
 *
 * @param {Object} req
 * @param {string} targetClientId
 * @returns {{ ok: boolean, status?: number, error?: string, callerClientId?: string }}
 */
export function requireClientOwnership(req, targetClientId) {
  const headerClientId = String(req?.headers?.['x-client-id'] || '').trim();
  const cookieHeader = String(req?.headers?.cookie || '');
  const cookieMatch = cookieHeader.match(/(?:^|;\s*)mw_cid=([0-9a-f-]{36})/i);
  const callerClientId = headerClientId || (cookieMatch ? cookieMatch[1] : '');

  if (!callerClientId || !UUID_V4_REGEX.test(callerClientId)) {
    logSecurityEvent('ownership_missing_identity', {
      ip: getClientIp(req),
      hasHeader: Boolean(headerClientId),
    });
    return {
      ok: false,
      status: 401,
      error: 'Valid x-client-id header is required.',
    };
  }

  if (!targetClientId || !UUID_V4_REGEX.test(String(targetClientId))) {
    return {
      ok: false,
      status: 400,
      error: 'Target client_id must be a valid UUID v4.',
    };
  }

  if (callerClientId.toLowerCase() !== String(targetClientId).toLowerCase()) {
    logSecurityEvent('idor_ownership_violation', {
      ip: getClientIp(req),
      callerClientId,
      targetClientId,
    });
    return {
      ok: false,
      status: 403,
      error: 'Forbidden: cannot access or modify another client record.',
    };
  }

  return { ok: true, callerClientId: callerClientId.toLowerCase() };
}

/**
 * Projects a database run row to safe public fields, stripping internal IDs (Area 2).
 *
 * @param {Object} row
 * @returns {Object}
 */
export function sanitizeRunRecordForResponse(row = {}) {
  return {
    level: Number(row.level) || 1,
    seed: Number(row.seed) || 0,
    event_source: row.event_source === 'live' ? 'live' : 'snapshot',
    outcome: row.outcome === 'won' ? 'won' : 'lost',
    sols_survived: Number(row.sols_survived) || 0,
    primary_cause: String(row.primary_cause || 'none').slice(0, 64),
    created_at: row.created_at || null,
  };
}

/**
 * Enforces sliding-window rate limits per IP and optional client identifier (Area 5).
 * Sets `Retry-After` header and returns `false` after writing a `429` response if exceeded.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {Object} options
 * @param {string} [options.bucket='default']
 * @param {number} [options.limit=30]
 * @param {number} [options.windowMs=60000]
 * @param {string} [options.clientKey='']
 * @returns {{ allowed: boolean, remaining: number, retryAfterSeconds: number }}
 */
export function checkRateLimit(req, res, options = {}) {
  const {
    bucket = 'default',
    limit = 30,
    windowMs = 60_000,
    clientKey = '',
  } = options;

  const now = Date.now();
  const ip = getClientIp(req);
  const compositeKey = `${bucket}:${ip}:${clientKey || 'anon'}`;

  const entry = rateLimitStore.get(compositeKey) || { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => now - ts < windowMs);

  if (entry.timestamps.length >= limit) {
    const oldest = entry.timestamps[0] || now;
    const retryAfterSeconds = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    rateLimitStore.set(compositeKey, entry);

    logSecurityEvent('rate_limit_exceeded', {
      bucket,
      ip,
      limit,
      retryAfterSeconds,
    });

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(retryAfterSeconds));
    }
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  entry.timestamps.push(now);
  rateLimitStore.set(compositeKey, entry);
  enforceMapCap(rateLimitStore);

  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.timestamps.length),
    retryAfterSeconds: 0,
  };
}

/**
 * Resets in-memory rate limit and lockout stores (used by unit tests).
 */
export function resetSecurityStores() {
  rateLimitStore.clear();
  authFailureStore.clear();
}

/**
 * Enforces a maximum request body size in bytes (Area 5).
 *
 * @param {Object} req
 * @param {number} [maxBytes=8192]
 * @returns {{ ok: boolean, status?: number, error?: string }}
 */
export function enforceBodySizeLimit(req, maxBytes = 8192) {
  const contentLength = Number(req?.headers?.['content-length'] || 0);
  if (contentLength > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Request body exceeds maximum size of ${maxBytes} bytes.`,
    };
  }
  const serialized =
    typeof req?.body === 'string'
      ? req.body
      : req?.body
        ? JSON.stringify(req.body)
        : '';
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    return {
      ok: false,
      status: 413,
      error: `Request body exceeds maximum size of ${maxBytes} bytes.`,
    };
  }
  return { ok: true };
}

/**
 * Detects automated bots filling hidden honeypot fields (Area 5).
 *
 * @param {Object} body
 * @returns {{ isBot: boolean, field?: string }}
 */
export function checkBotHoneypot(body) {
  if (!body || typeof body !== 'object') return { isBot: false };
  for (const field of ['website', 'bot_field', 'confirm_email']) {
    if (body[field] !== undefined && String(body[field]).trim() !== '') {
      return { isBot: true, field };
    }
  }
  return { isBot: false };
}

/**
 * Validates `start` and `end` query parameters for `/api/donki` (Area 6).
 *
 * @param {Object} query
 * @returns {{ ok: boolean, status?: number, error?: string, start?: string, end?: string }}
 */
export function validateDonkiQuery(query = {}) {
  const rawStart = query.start !== undefined ? String(query.start).trim() : '2024-05-08';
  const rawEnd = query.end !== undefined ? String(query.end).trim() : '2024-05-15';

  if (
    PATH_TRAVERSAL_OR_INJECTION_REGEX.test(rawStart) ||
    PATH_TRAVERSAL_OR_INJECTION_REGEX.test(rawEnd)
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Invalid characters in date query parameters.',
    };
  }

  if (!ISO_DATE_REGEX.test(rawStart) || !ISO_DATE_REGEX.test(rawEnd)) {
    return {
      ok: false,
      status: 400,
      error: 'Parameters start and end must use YYYY-MM-DD format.',
    };
  }

  const startMs = Date.parse(`${rawStart}T00:00:00Z`);
  const endMs = Date.parse(`${rawEnd}T00:00:00Z`);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return {
      ok: false,
      status: 400,
      error: 'Parameters start and end must be valid calendar dates.',
    };
  }

  if (endMs < startMs) {
    return {
      ok: false,
      status: 400,
      error: 'Parameter end must not be earlier than start.',
    };
  }

  const spanDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
  if (spanDays > 31) {
    return {
      ok: false,
      status: 400,
      error: 'Date range cannot exceed 31 days per NASA DONKI policy.',
    };
  }

  return { ok: true, start: rawStart, end: rawEnd };
}

/**
 * Strictly validates a run telemetry payload on the server (Area 6).
 * Rejects invalid types, out-of-range numbers, or injection strings with `400`.
 *
 * @param {any} body
 * @returns {{ ok: boolean, status?: number, error?: string, value?: Object }}
 */
export function validateRunSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, status: 400, error: 'Request body must be a JSON object.' };
  }

  const botCheck = checkBotHoneypot(body);
  if (botCheck.isBot) {
    return { ok: false, status: 400, error: 'Bot submission rejected.' };
  }

  const { level, seed, event_source, outcome, sols_survived, primary_cause, client_id } = body;

  if (!Number.isInteger(level) || level < 1 || level > 3) {
    return { ok: false, status: 400, error: 'Field level must be an integer between 1 and 3.' };
  }

  if (!Number.isInteger(seed) || seed < 1 || seed > 2147483647) {
    return { ok: false, status: 400, error: 'Field seed must be a positive 32-bit integer.' };
  }

  if (event_source !== 'live' && event_source !== 'snapshot') {
    return {
      ok: false,
      status: 400,
      error: "Field event_source must be either 'live' or 'snapshot'.",
    };
  }

  if (outcome !== 'won' && outcome !== 'lost') {
    return {
      ok: false,
      status: 400,
      error: "Field outcome must be either 'won' or 'lost'.",
    };
  }

  if (!Number.isInteger(sols_survived) || sols_survived < 0 || sols_survived > 60) {
    return {
      ok: false,
      status: 400,
      error: 'Field sols_survived must be an integer between 0 and 60.',
    };
  }

  const causeStr = primary_cause === undefined || primary_cause === null ? 'none' : String(primary_cause);
  if (!SAFE_CAUSE_REGEX.test(causeStr) || causeStr.includes('..')) {
    return {
      ok: false,
      status: 400,
      error: 'Field primary_cause contains invalid characters or exceeds 64 characters.',
    };
  }

  if (typeof client_id !== 'string' || !UUID_V4_REGEX.test(client_id)) {
    return {
      ok: false,
      status: 400,
      error: 'Field client_id must be a valid UUID v4.',
    };
  }

  return {
    ok: true,
    value: {
      level,
      seed,
      event_source,
      outcome,
      sols_survived,
      primary_cause: causeStr.trim(),
      client_id: client_id.toLowerCase(),
    },
  };
}

/**
 * Verifies that an outbound URL targets an allowlisted HTTPS origin to prevent SSRF (Area 6).
 *
 * @param {string} urlString
 * @returns {URL}
 */
export function assertAllowedOutboundUrl(urlString) {
  const parsed = new URL(urlString);
  if (parsed.protocol !== 'https:') {
    throw new Error('Outbound requests must use HTTPS.');
  }
  const host = parsed.hostname.toLowerCase();
  const isAllowed =
    ALLOWED_OUTBOUND_HOSTS.has(host) || host.endsWith('.supabase.co');
  if (!isAllowed) {
    throw new Error(`Outbound host ${host} is not in the SSRF allowlist.`);
  }
  return parsed;
}

export default {
  redactSecrets,
  logSecurityEvent,
  getClientIp,
  applySecurityHeaders,
  hashSecretWithScrypt,
  verifySecretWithScrypt,
  issueClientSessionCookie,
  recordAuthFailure,
  checkAuthLockout,
  requireClientOwnership,
  sanitizeRunRecordForResponse,
  checkRateLimit,
  resetSecurityStores,
  enforceBodySizeLimit,
  checkBotHoneypot,
  validateDonkiQuery,
  validateRunSubmission,
  assertAllowedOutboundUrl,
};
