/**
 * @fileoverview Dust storm and solar flare particle systems for the HD-2D diorama.
 * Scales particle count by quality preset and disables motion when `reducedMotion` is on.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Particles({
  isDust = false,
  isFlare = false,
  quality = 'high',
  reducedMotion = false,
}) {
  const pointsRef = useRef(null);

  const count = useMemo(() => {
    if (!isDust && !isFlare) return 0;
    if (quality === 'low') return 35;
    if (quality === 'medium') return 90;
    return 180;
  }, [isDust, isFlare, quality]);

  const positions = useMemo(() => {
    if (count === 0) return new Float32Array(0);
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Deterministic pseudo-random distribution
      const s1 = Math.sin(i * 12.9898) * 43758.5453;
      const s2 = Math.sin(i * 78.233) * 43758.5453;
      const s3 = Math.sin(i * 39.425) * 43758.5453;
      const rx = s1 - Math.floor(s1);
      const ry = s2 - Math.floor(s2);
      const rz = s3 - Math.floor(s3);

      arr[i * 3] = (rx - 0.5) * 16;
      arr[i * 3 + 1] = 0.2 + ry * 5.5;
      arr[i * 3 + 2] = (rz - 0.5) * 12;
    }
    return arr;
  }, [count]);

  useFrame((_, delta) => {
    if (!pointsRef.current || reducedMotion || count === 0) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.getAttribute('position');
    if (!posAttr) return;

    const arr = posAttr.array;
    for (let i = 0; i < count; i++) {
      if (isDust) {
        arr[i * 3] += delta * 2.4;
        if (arr[i * 3] > 8) arr[i * 3] = -8;
      } else if (isFlare) {
        arr[i * 3 + 1] -= delta * 1.8;
        if (arr[i * 3 + 1] < 0.2) arr[i * 3 + 1] = 5.5;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (count === 0) return null;

  const color = isFlare ? '#FFB020' : '#C9A878';
  const size = isFlare ? 0.14 : 0.11;

  return (
    <points ref={pointsRef} name="HazardParticles">
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        transparent
        opacity={isFlare ? 0.85 : 0.6}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default Particles;
