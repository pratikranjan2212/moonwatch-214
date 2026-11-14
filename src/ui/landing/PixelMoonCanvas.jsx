import { useEffect, useRef } from 'react';

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Deterministic procedural craters in normalized sphere coords (x, y, radius, depth)
const CRATERS = [
  { x: -0.34, y: -0.22, r: 0.22, d: 0.38 },
  { x: 0.14, y: -0.38, r: 0.16, d: 0.34 },
  { x: -0.1, y: 0.18, r: 0.26, d: 0.42 },
  { x: -0.52, y: 0.16, r: 0.14, d: 0.3 },
  { x: 0.26, y: 0.08, r: 0.19, d: 0.36 },
  { x: -0.2, y: -0.52, r: 0.12, d: 0.28 },
  { x: -0.44, y: -0.46, r: 0.11, d: 0.26 },
  { x: 0.05, y: 0.5, r: 0.15, d: 0.32 },
  { x: -0.36, y: 0.44, r: 0.13, d: 0.28 },
  { x: 0.42, y: -0.24, r: 0.12, d: 0.3 },
  { x: -0.02, y: -0.1, r: 0.09, d: 0.25 },
  { x: -0.64, y: -0.06, r: 0.1, d: 0.26 },
  { x: 0.34, y: 0.38, r: 0.11, d: 0.28 },
  { x: -0.22, y: 0.04, r: 0.08, d: 0.24 },
  { x: 0.18, y: -0.18, r: 0.07, d: 0.22 },
];

function hash2d(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x, y) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2d(ix, iy);
  const b = hash2d(ix + 1, iy);
  const c = hash2d(ix, iy + 1);
  const d = hash2d(ix + 1, iy + 1);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x, y) {
  let value = 0;
  let amp = 0.55;
  let freq = 1;
  for (let i = 0; i < 4; i++) {
    value += amp * smoothNoise(x * freq, y * freq);
    freq *= 2.05;
    amp *= 0.48;
  }
  return value;
}

/**
 * Renders a crisp, Bayer-dithered pixelated Moon object with craters, lunar maria,
 * Mission Orange (#FF8F55) terminator rim-lighting, and twinkling pixel starfield.
 */
export default function PixelMoonCanvas({ reducedMotion = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return undefined;

    const systemReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isReduced = Boolean(reducedMotion || systemReduced);

    let rafId = null;
    let lastDraw = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const computeGeometry = (w, h) => {
      const isMobile = w < 640;
      const isTablet = w >= 640 && w < 1024;

      const cx = w * 0.5;
      const cy = isMobile ? h * 0.4 : isTablet ? h * 0.415 : h * 0.35;

      const radius = isMobile
        ? Math.min(w * 0.3, h * 0.18)
        : isTablet
          ? Math.min(w * 0.235, h * 0.205)
          : Math.min(w * 0.138, h * 0.205);

      const cell = isMobile ? 5 : 6;
      return { cx, cy, radius, cell };
    };

    const lx = -0.62;
    const ly = -0.38;
    const lz = 0.69;

    const drawFrame = (now) => {
      if (!width || !height) return;
      const t = isReduced ? 0 : now * 0.001;
      const { cx, cy, radius, cell } = computeGeometry(width, height);

      ctx.fillStyle = '#050302';
      ctx.fillRect(0, 0, width, height);

      const aura = ctx.createRadialGradient(
        cx + radius * 0.22,
        cy + radius * 0.12,
        radius * 0.4,
        cx,
        cy,
        radius * 2.65
      );
      aura.addColorStop(0, 'rgba(255, 143, 85, 0.17)');
      aura.addColorStop(0.45, 'rgba(130, 54, 22, 0.08)');
      aura.addColorStop(1, 'rgba(5, 3, 2, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);

      const cols = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);
      const pixelSize = Math.max(2, cell - 1);
      const phaseDrift = isReduced ? 0 : Math.sin(t * 0.25) * 0.02;

      for (let gy = 0; gy < rows; gy++) {
        const py = gy * cell + cell * 0.5;
        const dy = (py - cy) / radius;

        for (let gx = 0; gx < cols; gx++) {
          const px = gx * cell + cell * 0.5;
          const dx = (px - cx) / radius;
          const r2 = dx * dx + dy * dy;

          if (r2 > 1.0) {
            const dist = Math.sqrt(r2);
            if (dist < 1.11) {
              const rimDist = (dist - 1.0) / 0.11;
              const darkSide = Math.max(0, dx * 0.68 + dy * 0.42 + 0.12);
              const haloVal = (1 - rimDist) * (0.28 + darkSide * 0.55);
              const threshold = BAYER_4X4[gy & 3][gx & 3] / 16;
              if (haloVal > threshold * 0.92 + 0.18) {
                const a = Math.min(0.65, haloVal * 0.72);
                ctx.fillStyle = `rgba(255, 143, 85, ${a.toFixed(2)})`;
                ctx.fillRect(gx * cell, gy * cell, pixelSize, pixelSize);
                continue;
              }
            }

            const starRand = hash2d(gx * 0.73, gy * 1.17);
            if (starRand > 0.992 && py < height * 0.84) {
              const twinkle =
                0.45 + 0.55 * Math.sin(t * (1.2 + ((starRand * 10) % 2)) + starRand * 50);
              const isOrangeStar = starRand > 0.9972;
              ctx.fillStyle = isOrangeStar
                ? `rgba(255, 143, 85, ${(0.35 + twinkle * 0.5).toFixed(2)})`
                : `rgba(235, 228, 220, ${(0.22 + twinkle * 0.48).toFixed(2)})`;
              ctx.fillRect(gx * cell, gy * cell, pixelSize, pixelSize);
            }
            continue;
          }

          const nz = Math.sqrt(Math.max(0, 1.0 - r2));
          const sx = dx * 2.2 + phaseDrift;
          const sy = dy * 2.2;

          const mariaNoise = fbm(sx * 1.35 + 4.2, sy * 1.35 + 1.9);
          const highlandGrain = fbm(sx * 5.2 - 2.1, sy * 5.2 + 6.3);
          let albedo = 0.86 + (highlandGrain - 0.5) * 0.28;
          if (mariaNoise < 0.54) {
            const basinDepth = (0.54 - mariaNoise) / 0.54;
            albedo -= basinDepth * 0.38;
          }

          let nx = dx;
          let ny = dy;
          let craterShadowBoost = 0;

          for (let i = 0; i < CRATERS.length; i++) {
            const c = CRATERS[i];
            const cdx = dx - c.x;
            const cdy = dy - c.y;
            const cd = Math.sqrt(cdx * cdx + cdy * cdy);
            if (cd < c.r) {
              const u = cd / Math.max(c.r, 0.001);
              const inv = cd > 0.0001 ? 1 / cd : 0;
              if (u < 0.78) {
                const slope = (u / 0.78) * c.d * 1.45;
                nx -= cdx * inv * slope;
                ny -= cdy * inv * slope;
                craterShadowBoost += (1 - u / 0.78) * 0.08;
              } else {
                const rimPhase = (u - 0.78) / 0.22;
                const slope = (1 - rimPhase) * c.d * 1.25;
                nx += cdx * inv * slope;
                ny += cdy * inv * slope;
              }
            }
          }

          const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
          nx /= nLen;
          ny /= nLen;
          const nnz = nz / nLen;

          const ndotl = Math.max(0, nx * lx + ny * ly + nnz * lz);
          const limb = 0.72 + 0.28 * Math.pow(nnz, 0.4);
          const rawShade = Math.min(
            1,
            Math.pow(ndotl, 0.85) * albedo * limb * 1.12 - craterShadowBoost
          );

          const edgeFactor = Math.pow(Math.max(0, 1 - nnz), 2.1);
          const antiSun = Math.max(0, -(nx * lx + ny * ly + nnz * lz * 0.35) + 0.22);
          const orangeRim = Math.min(1, edgeFactor * antiSun * 1.65);

          const bayer = BAYER_4X4[gy & 3][gx & 3] / 16 - 0.5;
          const ditheredShade = Math.max(0, Math.min(1, rawShade + bayer * 0.13));
          const ditheredRim = Math.max(0, Math.min(1, orangeRim + bayer * 0.16));

          let rCol;
          let gCol;
          let bCol;

          if (ditheredRim > 0.24 && ditheredShade < 0.28) {
            const k = Math.min(1, (ditheredRim - 0.24) / 0.62);
            rCol = Math.round(118 + k * 137);
            gCol = Math.round(46 + k * 97);
            bCol = Math.round(18 + k * 67);
          } else {
            const steps = 6;
            const q = Math.round(ditheredShade * steps) / steps;
            if (q <= 0.01) {
              rCol = 18;
              gCol = 14;
              bCol = 12;
            } else {
              rCol = Math.round(28 + q * 218);
              gCol = Math.round(24 + q * 212);
              bCol = Math.round(22 + q * 204);
              if (ditheredRim > 0.1) {
                const mix = Math.min(0.45, ditheredRim * 0.6);
                rCol = Math.round(rCol * (1 - mix) + 255 * mix);
                gCol = Math.round(gCol * (1 - mix) + 143 * mix);
                bCol = Math.round(bCol * (1 - mix) + 85 * mix);
              }
            }
          }

          ctx.fillStyle = `rgb(${rCol}, ${gCol}, ${bCol})`;
          ctx.fillRect(gx * cell, gy * cell, pixelSize, pixelSize);
        }
      }

      const bottomFade = ctx.createLinearGradient(0, height * 0.72, 0, height);
      bottomFade.addColorStop(0, 'rgba(5, 3, 2, 0)');
      bottomFade.addColorStop(1, 'rgba(5, 3, 2, 0.88)');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, height * 0.72, width, height * 0.28);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawFrame(performance.now());
    };

    const loop = (now) => {
      if (isReduced) return;
      if (now - lastDraw >= 65) {
        lastDraw = now;
        drawFrame(now);
      }
      rafId = requestAnimationFrame(loop);
    };

    resize();
    if (!isReduced) {
      rafId = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} aria-hidden="true" className="mw-moon-canvas" />;
}
