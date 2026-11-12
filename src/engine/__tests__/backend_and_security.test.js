import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applySecurityHeaders,
  assertAllowedOutboundUrl,
  checkAuthLockout,
  checkBotHoneypot,
  enforceBodySizeLimit,
  getClientIp,
  hashSecretWithScrypt,
  redactSecrets,
  recordAuthFailure,
  requireClientOwnership,
  resetSecurityStores,
  sanitizeRunRecordForResponse,
  validateDonkiQuery,
  validateRunSubmission,
  verifySecretWithScrypt,
} from '../../../api/_security.js';
import donkiHandler from '../../../api/donki.js';
import runsHandler from '../../../api/runs.js';
import { scanRepositoryForSecrets } from '../../../scripts/secretScan.js';
import { loadSnapshotEvents, loadSpaceWeatherEvents } from '../../data/donkiClient.js';
import {
  mapCmeToGameEvent,
  mapDonkiPayloadToEvents,
  mapFlrToGameEvent,
  parseFlareClass,
  selectMostAccurateAnalysis,
} from '../../data/donkiMapper.js';
import { normalizeRunPayload, saveRunResult } from '../../data/supabaseClient.js';

function createMockRes() {
  const headers = {};
  const res = {
    statusCode: 200,
    headers,
    body: null,
    ended: false,
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      res.ended = true;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

describe('Step 7 — DONKI Mapper, Offline Fallback & Supabase-Off Resilience', () => {
  beforeEach(() => {
    resetSecurityStores();
    vi.restoreAllMocks();
  });

  it('maps raw NASA DONKI FLR and CME payloads into normalized game events', () => {
    expect(parseFlareClass('X5.8').severity).toBe('extreme');
    expect(parseFlareClass('M2.4').severity).toBe('major');
    expect(parseFlareClass('C4.0').severity).toBe('minor');

    const flrEvt = mapFlrToGameEvent(
      {
        flrID: '2024-05-11T01:10:00-FLR-001',
        beginTime: '2024-05-11T01:10Z',
        peakTime: '2024-05-11T01:23Z',
        classType: 'X5.8',
        activeRegionNum: 13664,
        sourceLocation: 'N17W44',
        note: 'Intense <script>alert(1)</script> X5.8 solar flare.',
      },
      4
    );
    expect(flrEvt.type).toBe('flare');
    expect(flrEvt.severity).toBe('extreme');
    expect(flrEvt.classType).toBe('X5.8');
    expect(flrEvt.description).not.toContain('<script>');

    const cmeAnalysis = selectMostAccurateAnalysis([
      { isMostAccurate: false, speed: 600, type: 'C' },
      { isMostAccurate: true, speed: 1520, type: 'R', halfAngle: 52 },
    ]);
    expect(cmeAnalysis.speed).toBe(1520);
    expect(cmeAnalysis.severity).toBe('extreme');

    const cmeEvt = mapCmeToGameEvent(
      {
        activityID: '2024-05-11T01:36:00-CME-001',
        startTime: '2024-05-11T01:36Z',
        activeRegionNum: 13664,
        cmeAnalyses: [{ isMostAccurate: true, speed: 1520, type: 'R' }],
      },
      6
    );
    expect(cmeEvt.type).toBe('cme');
    expect(cmeEvt.speed).toBe(1520);

    const batch = mapDonkiPayloadToEvents({
      flr: [
        { flrID: '1', beginTime: '2024-05-08T04:00Z', classType: 'X1.0' },
        { flrID: '2', beginTime: '2024-05-09T04:00Z', classType: 'X2.2' },
        { flrID: '3', beginTime: '2024-05-10T04:00Z', classType: 'X5.8' },
      ],
      cme: [
        {
          activityID: 'c1',
          startTime: '2024-05-11T01:36Z',
          cmeAnalyses: [{ isMostAccurate: true, speed: 1500, type: 'R' }],
        },
      ],
      targetSols: 14,
      maxEvents: 4,
    });
    expect(batch.length).toBe(4);
    // Caps extreme events at 2 so levels stay winnable
    const extremeCount = batch.filter((e) => e.severity === 'extreme').length;
    expect(extremeCount).toBeLessThanOrEqual(2);
    // Never overwrites Sol 7 (Sol 214 slot)
    expect(batch.some((e) => e.sol === 7)).toBe(false);
  });

  it('falls back to bundled snapshots when network is offline or /api/donki fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));

    const result = await loadSpaceWeatherEvents({ timeoutMs: 100 });
    expect(result.source).toBe('snapshot');
    expect(result.events.length).toBeGreaterThan(0);

    const snap = await loadSnapshotEvents('may-2024-superstorm', { timeoutMs: 100 });
    expect(snap.source).toBe('snapshot');
    expect(snap.events.length).toBeGreaterThan(0);
  });

  it('saves runs safely without throwing when both network and Supabase are off', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));
    const res = await saveRunResult(
      {
        level: 1,
        seed: 2142026,
        event_source: 'snapshot',
        outcome: 'won',
        sols_survived: 14,
        primary_cause: 'none',
      },
      { timeoutMs: 50 }
    );
    expect(res).toEqual({ saved: false, via: 'none' });
  });
});

describe('Step 8d — Production Security Areas 1 to 6', () => {
  beforeEach(() => {
    resetSecurityStores();
  });

  it('Area 1 (Secure Auth): hashes secrets with scrypt, verifies in constant time, and enforces lockout', () => {
    const secret = 'LunarOutpostStrongSecret#214';
    const hash = hashSecretWithScrypt(secret);
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(verifySecretWithScrypt(secret, hash)).toBe(true);
    expect(verifySecretWithScrypt('WrongSecretPassword123!', hash)).toBe(false);
    expect(() => hashSecretWithScrypt('short')).toThrow();

    const key = '198.51.100.10:commander';
    for (let i = 0; i < 5; i += 1) {
      recordAuthFailure(key, 1000);
    }
    const lockout = checkAuthLockout(key, 1500);
    expect(lockout.locked).toBe(true);
    expect(lockout.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('Area 2 (Anti-IDOR & Ownership): blocks cross-client access and strips internal IDs', () => {
    const ownerUuid = '550e8400-e29b-41d4-a716-446655440000';
    const otherUuid = '660e8400-e29b-41d4-a716-446655440111';

    const missingAuth = requireClientOwnership({ headers: {} }, ownerUuid);
    expect(missingAuth.ok).toBe(false);
    expect(missingAuth.status).toBe(401);

    const idorAttempt = requireClientOwnership(
      { headers: { 'x-client-id': ownerUuid } },
      otherUuid
    );
    expect(idorAttempt.ok).toBe(false);
    expect(idorAttempt.status).toBe(403);

    const validOwner = requireClientOwnership(
      { headers: { 'x-client-id': ownerUuid } },
      ownerUuid
    );
    expect(validOwner.ok).toBe(true);

    const projected = sanitizeRunRecordForResponse({
      id: 'internal-uuid',
      client_id: ownerUuid,
      level: 1,
      seed: 214,
      event_source: 'snapshot',
      outcome: 'won',
      sols_survived: 14,
      primary_cause: 'none',
    });
    expect(projected.id).toBeUndefined();
    expect(projected.client_id).toBeUndefined();
    expect(projected.outcome).toBe('won');
  });

  it('Area 3 & 4 (Deployment Headers, Secret Redaction & Server-Only Secrets): sets HSTS/CSP and redacts secrets', () => {
    const req = { headers: { origin: 'https://moonwatch-214.vercel.app' } };
    const res = createMockRes();
    applySecurityHeaders(req, res);

    expect(res.getHeader('strict-transport-security')).toContain('max-age=63072000');
    expect(res.getHeader('content-security-policy')).toContain("default-src 'self'");
    expect(res.getHeader('x-content-type-options')).toBe('nosniff');
    expect(res.getHeader('x-frame-options')).toBe('DENY');
    expect(res.getHeader('access-control-allow-origin')).toBe('https://moonwatch-214.vercel.app');

    const redacted = redactSecrets({
      apiKey: 'secret-123',
      service_role: 'sb_secret_abcdef123456',
      url: 'https://api.nasa.gov/DONKI/FLR?api_key=MY_SECRET_KEY',
    });
    expect(redacted.apiKey).toBe('[REDACTED]');
    expect(redacted.service_role).toBe('[REDACTED]');
    expect(redacted.url).toContain('api_key=[REDACTED_KEY]');

    // Prioritizes x-vercel-forwarded-for over x-forwarded-for
    expect(
      getClientIp({
        headers: {
          'x-vercel-forwarded-for': '198.51.100.77',
          'x-forwarded-for': '203.0.113.1',
        },
      })
    ).toBe('198.51.100.77');

    // Area 4: Repository & git history secret scan must report 0 leaked secrets
    const scanResult = scanRepositoryForSecrets();
    expect(scanResult.findings).toEqual([]);
  });

  it('Area 5 (Rate Limiting, Body Size & Bot Protection): returns 429 + Retry-After and rejects bots', async () => {
    // Keep this test hermetic: no real Supabase or NASA calls
    for (const key of [
      'SUPABASE_URL',
      'VITE_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'VITE_SUPABASE_ANON_KEY',
      'NASA_API_KEY',
    ]) {
      vi.stubEnv(key, '');
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const req = {
      method: 'GET',
      headers: { 'x-forwarded-for': '203.0.113.55' },
      query: { start: '2024-05-08', end: '2024-05-15' },
    };

    let lastRes = createMockRes();
    for (let i = 0; i < 21; i += 1) {
      lastRes = createMockRes();
      await donkiHandler(req, lastRes);
    }
    expect(lastRes.statusCode).toBe(429);
    expect(Number(lastRes.getHeader('retry-after'))).toBeGreaterThan(0);

    expect(checkBotHoneypot({ website: 'http://spam.example' }).isBot).toBe(true);
    expect(enforceBodySizeLimit({ headers: { 'content-length': '99999' } }, 4096).ok).toBe(false);

    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('Area 6 (Input Validation & SSRF Prevention): rejects SQLi/XSS/traversal and untrusted outbound hosts', async () => {
    expect(validateDonkiQuery({ start: '../etc/passwd', end: '2024-05-15' }).ok).toBe(false);
    expect(validateDonkiQuery({ start: '2024-05-20', end: '2024-05-10' }).ok).toBe(false);
    expect(validateDonkiQuery({ start: '2024-01-01', end: '2024-03-15' }).ok).toBe(false);
    expect(validateDonkiQuery({ start: '2024-05-08', end: '2024-05-15' }).ok).toBe(true);

    const validClient = '550e8400-e29b-41d4-a716-446655440000';
    expect(
      validateRunSubmission({
        level: 1,
        seed: 2142026,
        event_source: 'snapshot',
        outcome: 'won',
        sols_survived: 14,
        primary_cause: 'Solar Flare; DROP TABLE runs--',
        client_id: validClient,
      }).ok
    ).toBe(false);

    const validRun = normalizeRunPayload({
      level: 1,
      seed: 2142026,
      event_source: 'snapshot',
      outcome: 'won',
      sols_survived: 14,
      primary_cause: 'flare',
      client_id: validClient,
    });
    expect(validateRunSubmission(validRun).ok).toBe(true);

    // SSRF allowlist check
    expect(() => assertAllowedOutboundUrl('https://api.nasa.gov/DONKI/FLR')).not.toThrow();
    expect(() => assertAllowedOutboundUrl('http://169.254.169.254/latest/meta-data')).toThrow();
    expect(() => assertAllowedOutboundUrl('https://evil.example.com/steal')).toThrow();

    // Test /api/runs IDOR protection end-to-end
    const postRes = createMockRes();
    await runsHandler(
      {
        method: 'POST',
        headers: { 'x-client-id': '660e8400-e29b-41d4-a716-446655440111' },
        body: validRun,
      },
      postRes
    );
    expect(postRes.statusCode).toBe(403);
  });
});
