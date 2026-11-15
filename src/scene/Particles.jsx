/**
 * @fileoverview Environmental particle systems for the Lunar Outpost Diorama.
 * Provides distinct, independently operating systems for:
 * 1. Directional Lunar Dust Storms (high-speed horizontal winds sweeping regolith across the surface)
 * 2. Solar Storm Flares (blazing coronal particles and cosmic radiation shimmer)
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function DustStormField({ quality = 'high', reducedMotion = false }) {
  const pointsRef = useRef(null);

  const count = useMemo(() => {
    if (quality === 'low') return 60;
    if (quality === 'medium') return 160;
    return 360;
  }, [quality]);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Deterministic spread across the base perimeter
      const s1 = Math.sin(i * 14.332) * 43758.5453;
      const s2 = Math.sin(i * 47.193) * 43758.5453;
      const s3 = Math.sin(i * 89.721) * 43758.5453;
      const rx = s1 - Math.floor(s1);
      const ry = s2 - Math.floor(s2);
      const rz = s3 - Math.floor(s3);

      pos[i * 3] = (rx - 0.5) * 24;
      pos[i * 3 + 1] = -0.65 + ry * 2.8; // Low sweeping layer hugging the lunar surface
      pos[i * 3 + 2] = (rz - 0.5) * 18;
      vel[i] = 6.0 + ry * 3.5; // Wind speed variation
    }
    return { positions: pos, velocities: vel };
  }, [count]);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current || reducedMotion) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position');
    if (!posAttr) return;

    const arr = posAttr.array;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      // Fast directional horizontal storm wind along the X axis
      arr[i * 3] += delta * velocities[i];
      // Slight vertical turbulence
      arr[i * 3 + 1] += Math.sin(t * 3.5 + i) * delta * 0.18;

      // Wrap around bounds
      if (arr[i * 3] > 12) {
        arr[i * 3] = -12;
      }
      if (arr[i * 3 + 1] > 2.2) {
        arr[i * 3 + 1] = -0.65;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} name="DustStormParticles">
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#C8A275"
        size={0.11}
        transparent
        opacity={0.68}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  );
}

function SolarFlareField({ quality = 'high', reducedMotion = false }) {
  const pointsRef = useRef(null);

  const count = useMemo(() => {
    if (quality === 'low') return 50;
    if (quality === 'medium') return 120;
    return 240;
  }, [quality]);

  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const s1 = Math.sin(i * 22.812) * 43758.5453;
      const s2 = Math.sin(i * 61.442) * 43758.5453;
      const s3 = Math.sin(i * 93.109) * 43758.5453;
      const rx = s1 - Math.floor(s1);
      const ry = s2 - Math.floor(s2);
      const rz = s3 - Math.floor(s3);

      pos[i * 3] = (rx - 0.5) * 20;
      pos[i * 3 + 1] = -0.2 + ry * 6.5;
      pos[i * 3 + 2] = (rz - 0.5) * 16;
      ph[i] = rx * Math.PI * 2;
    }
    return { positions: pos, phases: ph };
  }, [count]);

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current || reducedMotion) return;
    const posAttr = pointsRef.current.geometry.getAttribute('position');
    if (!posAttr) return;

    const arr = posAttr.array;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      // Descending cosmic energetic rays
      arr[i * 3 + 1] -= delta * 2.2;
      arr[i * 3] += Math.sin(t * 4 + phases[i]) * delta * 0.4;

      if (arr[i * 3 + 1] < -0.4) {
        arr[i * 3 + 1] = 6.2;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} name="SolarFlareParticles">
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFA726"
        size={0.14}
        transparent
        opacity={0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Particles({
  isDust = false,
  isFlare = false,
  quality = 'high',
  reducedMotion = false,
}) {
  return (
    <group name="EnvironmentalHazards">
      {isDust && <DustStormField quality={quality} reducedMotion={reducedMotion} />}
      {isFlare && <SolarFlareField quality={quality} reducedMotion={reducedMotion} />}
    </group>
  );
}

export default Particles;
