/**
 * @fileoverview Billboarded pixel-art sprite actor for React Three Fiber.
 * Uses THREE.NearestFilter on `/sprites/crew_atlas.png` for crisp HD-2D pixels
 * and animates frames according to crew mood (`idle`, `walk`, `worried`, `run`, `cheer`).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const MOOD_FRAME_RANGES = {
  idle: { startCol: 0, count: 2, fps: 2 },
  walk: { startCol: 2, count: 4, fps: 5 },
  worried: { startCol: 6, count: 2, fps: 4 },
  'run-to-shelter': { startCol: 8, count: 4, fps: 8 },
  run: { startCol: 8, count: 4, fps: 8 },
  cheer: { startCol: 12, count: 3, fps: 6 },
  exhausted: { startCol: 6, count: 2, fps: 1.5 },
};

const CHARACTER_ROWS = {
  commander: 0,
  engineer: 1,
  doctor: 2,
  botanist: 3,
  pilot: 4,
};

let sharedBaseTexture = null;

function getCrewBaseTexture() {
  if (sharedBaseTexture) return sharedBaseTexture;
  const loader = new THREE.TextureLoader();
  const tex = loader.load('/sprites/crew_atlas.png');
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  sharedBaseTexture = tex;
  return tex;
}

export function SpriteActor({
  id = 'engineer',
  name = 'Crew',
  mood = 'idle',
  health = 100,
  position = [0, 0.65, 2.2],
  reducedMotion = false,
}) {
  const groupRef = useRef(null);
  const row = CHARACTER_ROWS[id] ?? 1;
  const totalCols = 15;
  const totalRows = 5;

  const spriteTexture = useMemo(() => {
    const base = getCrewBaseTexture();
    const clone = base.clone();
    clone.magFilter = THREE.NearestFilter;
    clone.minFilter = THREE.NearestFilter;
    clone.generateMipmaps = false;
    clone.repeat.set(1 / totalCols, 1 / totalRows);
    clone.needsUpdate = true;
    return clone;
  }, []);

  useEffect(() => {
    return () => {
      spriteTexture.dispose();
    };
  }, [spriteTexture]);

  useFrame(({ camera, clock }) => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);
    }

    const anim = MOOD_FRAME_RANGES[mood] || MOOD_FRAME_RANGES.idle;
    const elapsed = clock.getElapsedTime();
    const frameIdx = reducedMotion ? 0 : Math.floor(elapsed * anim.fps) % anim.count;
    const col = anim.startCol + frameIdx;

    // UV origin is bottom-left in Three.js
    const u = col / totalCols;
    const v = 1 - (row + 1) / totalRows;
    spriteTexture.offset.set(u, v);
  });

  const shelterZ = mood === 'run-to-shelter' ? position[2] - 0.9 : position[2];

  return (
    <group
      ref={groupRef}
      name={`SpriteActor_${id}`}
      position={[position[0], position[1], shelterZ]}
    >
      {/* Crisp nearest-neighbour pixel billboard */}
      <mesh castShadow>
        <planeGeometry args={[0.85, 1.25]} />
        <meshStandardMaterial
          map={spriteTexture}
          transparent
          alphaTest={0.45}
          roughness={0.8}
          metalness={0.05}
          opacity={health > 0 ? 1 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Subtle ground contact shadow */}
      <mesh position={[0, -0.58, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 12]} />
        <meshBasicMaterial color="#1C1F3A" transparent opacity={0.45} />
      </mesh>
      <group userData={{ actorName: name, mood, health }} />
    </group>
  );
}

export default SpriteActor;
