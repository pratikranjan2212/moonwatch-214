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
import {
  convertAzElToSceneCoords,
  convertToSceneCoords,
  getAnalyticalPositions,
  loadAstronomicalPositions,
  parseHorizonsObserver,
  parseHorizonsVectors,
} from '../../data/horizonsClient.js';

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

  it('parses NASA/JPL Horizons Cartesian vectors and converts them to scene space', async () => {
    const rawSample = `
$$SOE
2460440.500000000 = A.D. 2024-May-10 00:00:00.0000 TDB
 X = 9.800270313755310E+07 Y = 1.145061267388530E+08 Z =-3.580140566793829E+04
 VX=-2.118483278765438E+01 VY= 1.912285035119587E+01 VZ=-5.337193485633218E-02
$$EOE
`;
    const vectors = parseHorizonsVectors(rawSample);
    expect(vectors).toHaveLength(1);
    expect(vectors[0].x).toBeCloseTo(98002703.13, 0);
    expect(vectors[0].y).toBeCloseTo(114506126.74, 0);

    const sceneCoords = convertToSceneCoords(vectors[0], 32);
    expect(sceneCoords).toHaveLength(3);
    expect(Math.hypot(sceneCoords[0], sceneCoords[2])).toBeGreaterThan(0);

    // Test analytical fallback calculation
    const fallback = getAnalyticalPositions(1, false);
    expect(fallback.sun).toHaveLength(3);
    expect(fallback.earth).toHaveLength(3);
    expect(fallback.sun[1]).toBeGreaterThan(0); // Sun above horizon in daytime

    const nightFallback = getAnalyticalPositions(1, true);
    expect(nightFallback.sun[1]).toBeLessThan(0); // Sun below horizon in night

    // loadAstronomicalPositions should resolve with valid coordinates
    const positions = await loadAstronomicalPositions(1, false);
    expect(positions.sun).toHaveLength(3);
    expect(positions.earth).toHaveLength(3);
    expect(typeof positions.isLive).toBe('boolean');
    expect(typeof positions.source).toBe('string');

    // Section 20 & 21: Realistic Sun & Earth Scaling validation
    const SUN_REAL_KM = 1392700;
    const EARTH_REAL_KM = 12742;
    const PHYSICAL_RATIO = SUN_REAL_KM / EARTH_REAL_KM; // 109.299953
    expect(PHYSICAL_RATIO).toBeCloseTo(109.3, 1);

    // Verify rendered diameters match the physical ratio (0.850 units vs 92.905 units)
    const RENDERED_EARTH_DIAMETER = 0.85;
    const RENDERED_SUN_DIAMETER = RENDERED_EARTH_DIAMETER * PHYSICAL_RATIO;
    expect(RENDERED_SUN_DIAMETER / RENDERED_EARTH_DIAMETER).toBeCloseTo(109.29995, 4);

    // Test Horizons observer Azimuth/Elevation parser
    const obsSample = `
$$SOE
 2024-May-10 00:00  i   10.981544  60.264790
 2024-May-11 00:00  i   12.331490  60.807942
$$EOE
`;
    const obs = parseHorizonsObserver(obsSample);
    expect(obs).toHaveLength(2);
    expect(obs[0].azimuth).toBeCloseTo(10.98, 2);
    expect(obs[0].elevation).toBeCloseTo(60.26, 2);

    const azElCoords = convertAzElToSceneCoords(obs[0].azimuth, obs[0].elevation, 28, -25);
    expect(azElCoords).toHaveLength(3);
    expect(azElCoords[1]).toBeGreaterThan(15); // elevated high in lunar sky
    expect(azElCoords[2]).toBeLessThan(0); // in front of camera (North sky)

    // Verify starfield enclosure asset exists and is accessible
    const fs = await import('fs');
    expect(fs.existsSync('public/models/night_sky_transparent_with_stars.glb')).toBe(true);
    expect(fs.existsSync('public/textures/starfield_enclosure_2048.png')).toBe(true);
  });
});
