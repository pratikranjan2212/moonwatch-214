/**
 * @fileoverview HD-2D React Three Fiber Lunar Outpost Diorama (`Diorama.jsx`).
 * Loads Draco-compressed `.glb` models from `/models/outpost.glb` (using local `/draco/`
 * decoder), renders named nodes (`Habitat`, `SolarArray`, `ShieldDome`, `Antenna`,
 * `Rover`, `Greenhouse`, `Terrain`), Earth in the sky, stars, `Lighting`, `SpriteActor`
 * crew billboards, `Particles`, and `PostFX`.
 * Includes an FPS monitor that exposes `window.__MOONWATCH_FPS__` and gently scales 3D
 * post-processing presets (`high` -> `medium` -> `low`) under sustained active GPU load
 * while ignoring browser idle/tab throttling and keeping 3D rendering active unless WebGL
 * itself is unavailable.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import soundManager from '../audio/soundManager.js';
import { getAnalyticalPositions, loadAstronomicalPositions } from '../data/horizonsClient.js';
import { resolveCharacterMovement } from '../engine/collision.js';
import { getEventsForSol, isLunarNightSol, normalizeEventType } from '../engine/events.js';
import { BASE_STATIONS, findNearestStation, isStationUnlocked } from '../engine/stations.js';
import useGameStore from '../store/useGameStore.js';
import Lighting from './Lighting.jsx';
import MoonBase from './MoonBase.jsx';
import Parallax2D from './Parallax2D.jsx';
import Particles from './Particles.jsx';
import PostFX from './PostFX.jsx';
import SpriteActor from './SpriteActor.jsx';
import StationMarkers from './StationMarkers.jsx';

// Configure local Draco decoder path for 100% offline reliability
useGLTF.setDecoderPath('/draco/');

// Preload assets for instant presentation
useTexture.preload('/textures/starfield_enclosure_2048.png');
useGLTF.preload('/models/night_sky_transparent_with_stars.glb');
useGLTF.preload('/models/Moon_base.glb');

function FpsMonitor({ onFpsUpdate, onAutoDowngrade }) {
  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const lowFpsStreakRef = useRef(0);

  useEffect(() => {
    const resetSampling = () => {
      framesRef.current = 0;
      lastTimeRef.current = performance.now();
      lowFpsStreakRef.current = 0;
    };

    document.addEventListener('visibilitychange', resetSampling);
    window.addEventListener('focus', resetSampling);
    window.addEventListener('blur', resetSampling);

    return () => {
      document.removeEventListener('visibilitychange', resetSampling);
      window.removeEventListener('focus', resetSampling);
      window.removeEventListener('blur', resetSampling);
    };
  }, []);

  useFrame(() => {
    if (typeof document !== 'undefined' && document.hidden) {
      framesRef.current = 0;
      lastTimeRef.current = performance.now();
      lowFpsStreakRef.current = 0;
      return;
    }

    framesRef.current += 1;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;

    if (elapsed >= 1000) {
      // Ignore long browser-throttled/idle frame gaps (> 2.2s between ticks)
      if (elapsed > 2200 || (typeof document !== 'undefined' && !document.hasFocus())) {
        framesRef.current = 0;
        lastTimeRef.current = now;
        lowFpsStreakRef.current = 0;
        return;
      }

      const fps = Math.round((framesRef.current * 1000) / elapsed);
      framesRef.current = 0;
      lastTimeRef.current = now;
      if (typeof window !== 'undefined') {
        window.__MOONWATCH_FPS__ = fps;
      }
      onFpsUpdate?.(fps);

      // Only reduce 3D post-processing after 5 consecutive active focused seconds below 20 FPS
      if (fps < 20) {
        lowFpsStreakRef.current += 1;
        if (lowFpsStreakRef.current >= 5) {
          lowFpsStreakRef.current = 0;
          onAutoDowngrade?.(fps);
        }
      } else {
        lowFpsStreakRef.current = 0;
      }
    }
  });

  return null;
}

function LoadedGlbNodes({ panelsOut, shieldOn }) {
  const gltf = useGLTF('/models/outpost.glb');
  const clonedScene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    const solarNode = clonedScene.getObjectByName('SolarArray');
    if (solarNode) {
      solarNode.scale.set(panelsOut ? 1.5 : 0.45, 1.5, 1.5);
    }
    const shieldNode = clonedScene.getObjectByName('ShieldDome');
    if (shieldNode) {
      shieldNode.visible = Boolean(shieldOn);
    }
  }, [clonedScene, panelsOut, shieldOn]);

  return <primitive object={clonedScene} position={[0, -0.3, 0]} />;
}

function OutpostMeshes({
  panelsOut = true,
  shieldOn = false,
  isLowPower = false,
  isFlare = false,
  power = 80,
  level = 1,
  sol = 1,
  solarBroken = false,
  queueComms = false,
  reducedMotion = false,
  onInteractStation = null,
}) {
  const solarRef = useRef(null);

  useFrame(() => {
    if (solarRef.current) {
      const targetScaleX = panelsOut ? 1 : 0.22;
      solarRef.current.scale.x += (targetScaleX - solarRef.current.scale.x) * 0.12;
    }
  });

  const windowColor = isLowPower ? '#FF4D4D' : '#FFF1C9';
  const windowEmissiveIntensity = power <= 0 ? 0.05 : isLowPower ? 0.55 : 1.4;

  const fallbackMeshes = (
    <group name="LegacyOutpostFallback">
      <Suspense fallback={null}>
        <LoadedGlbNodes panelsOut={panelsOut} shieldOn={shieldOn} />
      </Suspense>

      {/* Named Node: Terrain (Lunar surface & craters) */}
      <group name="Terrain" position={[0, -0.35, 0]}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[28, 22, 16, 16]} />
          <meshStandardMaterial color="#8A8D99" roughness={0.92} metalness={0.05} />
        </mesh>
        {/* Rim craters */}
        <mesh position={[-4.5, 0.05, -2.5]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.9, 1.45, 24]} />
          <meshStandardMaterial color="#686B78" roughness={0.95} />
        </mesh>
        <mesh position={[4.8, 0.05, 1.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 1.2, 24]} />
          <meshStandardMaterial color="#686B78" roughness={0.95} />
        </mesh>
      </group>

      {/* Named Node: Habitat (Central pressurized module with emissive windows) */}
      <group name="Habitat" position={[0, 0.55, -0.4]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[1.65, 1.85, 1.35, 16]} />
          <meshStandardMaterial color="#D8DCE8" roughness={0.55} metalness={0.25} />
        </mesh>
        {/* Emissive habitat windows */}
        {[-0.65, 0, 0.65].map((wx, idx) => (
          <mesh key={idx} position={[wx, 0.1, 1.68]}>
            <boxGeometry args={[0.42, 0.28, 0.08]} />
            <meshStandardMaterial
              color={windowColor}
              emissive={windowColor}
              emissiveIntensity={windowEmissiveIntensity}
            />
          </mesh>
        ))}
        {/* Battery bank charge bar */}
        <mesh position={[-1.35, -0.2, 1.25]}>
          <boxGeometry args={[0.75 * Math.max(0.1, power / 100), 0.16, 0.12]} />
          <meshStandardMaterial
            color="#FFB020"
            emissive="#FFB020"
            emissiveIntensity={0.85}
          />
        </mesh>
      </group>

      {/* Named Node: SolarArray (Extendable solar wings) */}
      <group name="SolarArray" position={[-3.4, 0.65, -0.8]}>
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[0.14, 0.22, 0.9, 8]} />
          <meshStandardMaterial color="#94A3B8" roughness={0.5} metalness={0.4} />
        </mesh>
        <group ref={solarRef}>
          <mesh position={[0, 0.15, 0]} rotation={[0.32, 0, 0]} castShadow>
            <boxGeometry args={[2.6, 0.08, 1.15]} />
            <meshStandardMaterial
              color="#1E3A8A"
              emissive="#FFB020"
              emissiveIntensity={panelsOut ? 0.25 : 0}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>
        </group>
      </group>

      {/* Named Node: ShieldDome (Translucent protective forcefield dome) */}
      <group name="ShieldDome" position={[0, -0.1, 0]} visible={shieldOn}>
        <mesh>
          <sphereGeometry args={[5.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#8E6CFF"
            emissive="#8E6CFF"
            emissiveIntensity={0.65}
            transparent
            opacity={0.22}
            wireframe={false}
          />
        </mesh>
      </group>

      {/* Named Node: Greenhouse (Hydroponic life support dome) */}
      <group name="Greenhouse" position={[3.1, 0.25, 0.5]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#35D0E6"
            emissive="#10B981"
            emissiveIntensity={level >= 2 ? 0.5 : 0.15}
            transparent
            opacity={0.58}
          />
        </mesh>
      </group>

      {/* Named Node: Antenna (Earth deep-space communications dish; unlocked Sol 3+) */}
      {(sol ?? 1) >= 3 && (
        <group name="Antenna" position={[3.6, 0.85, -1.8]}>
          <mesh position={[0, -0.45, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.18, 1.1, 8]} />
            <meshStandardMaterial color="#CBD5E1" metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.25, 0]} rotation={[0.5, -0.4, 0]} castShadow>
            <coneGeometry args={[0.65, 0.35, 16, 1, true]} />
            <meshStandardMaterial
              color="#FFF1C9"
              emissive={queueComms ? '#35D0E6' : '#FFB020'}
              emissiveIntensity={queueComms ? 0.9 : 0.25}
            />
          </mesh>
        </group>
      )}

      {/* Named Node: Rover (Surface exploration vehicle) */}
      <group name="Rover" position={[-2.5, 0.12, 2.1]} rotation={[0, 0.45, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.1, 0.42, 0.7]} />
          <meshStandardMaterial color="#FFF1C9" roughness={0.5} metalness={0.3} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group name="OutpostDioramaRoot">
      {/* Custom Moon Base 3D model with PBR materials, custom colors & Blender animations */}
      <Suspense fallback={fallbackMeshes}>
        <MoonBase
          panelsOut={panelsOut}
          shieldOn={shieldOn}
          isLowPower={isLowPower}
          isFlare={isFlare}
          power={power}
          level={level}
          sol={sol}
          solarBroken={solarBroken}
          queueComms={queueComms}
          reducedMotion={reducedMotion}
          onInteractStation={onInteractStation}
        />
      </Suspense>
    </group>
  );
}

function SunInSky({ position = [40, 60, 30], isNight = false, isFlare = false }) {
  const gltf = useGLTF('/models/Moon_base.glb');
  const sunGroupRef = useRef(null);

  const clonedSun = useMemo(() => {
    const orig = gltf.scene.getObjectByName('The_Sun');
    if (!orig) return null;
    const cloned = orig.clone(true);

    // Realistic physical scale: Sun core diameter = 92.90496 units
    // Raw Sphere001 diameter with sun.scale=1 is 0.8114296
    // targetSunD = 92.90496 -> scaleSun = 114.4954
    const scaleSun = 114.4954;
    cloned.scale.set(scaleSun, scaleSun, scaleSun);

    // Center Sphere001 (photosphere core) at origin (0, 0, 0)
    // In local coords of The_Sun, Sphere001 is at y = 0.4037914
    cloned.position.set(0, -0.4037914 * scaleSun, 0);

    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.material) {
          child.material = child.material.clone();
          child.material.toneMapped = false;
          // Sphere001: Blazing solar photosphere core
          if (child.name.includes('Sphere001') || child.material.name.includes('Material.005')) {
            child.material.emissiveIntensity = isFlare ? 12.0 : 8.0;
          }
          // Sphere002: Solar flare corona halo
          else if (child.name.includes('Sphere002') || child.material.name.includes('Material.006')) {
            child.material.emissiveIntensity = isFlare ? 4.5 : 2.5;
            child.material.transparent = true;
            child.material.opacity = isFlare ? 0.95 : 0.82;
          }
          // Smoke_Domain: Coronal plasma envelope
          else if (child.name.includes('Smoke_Domain') || child.material.name.includes('Smoke Domain')) {
            child.material.transparent = true;
            child.material.opacity = isFlare ? 0.45 : 0.22;
          }
        }
      }
    });

    return cloned;
  }, [gltf.scene, isFlare]);

  if (isNight || !clonedSun) return null;

  return (
    <group ref={sunGroupRef} position={position}>
      <primitive object={clonedSun} />
    </group>
  );
}

function EarthInSky({ position = [-6.5, 24.1, -12.7], reducedMotion = false }) {
  const gltf = useGLTF('/models/Moon_base.glb');
  const earthRef = useRef(null);

  const clonedEarth = useMemo(() => {
    const orig = gltf.scene.getObjectByName('The_earth');
    if (!orig) return null;
    const cloned = orig.clone(true);

    // Realistic physical scale: Earth diameter = 0.850 units
    // Raw Earth diameter with earth.scale=1 is 0.505864
    // targetEarthD = 0.850 -> scaleEarth = 1.680293
    // Sun/Earth diameter ratio = 92.90496 / 0.850 = 109.29995 (Exact 1,392,700 km / 12,742 km)
    const scaleEarth = 1.680293;
    cloned.scale.set(scaleEarth, scaleEarth, scaleEarth);
    cloned.position.set(0, 0, 0);

    cloned.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.material) {
          child.material = child.material.clone();
          // Keep illuminated and dark portions accurately represented:
          // Zero emissive so the night side remains dark, while the day side
          // shines brilliantly under direct solar illumination
          child.material.emissive.set('#000000');
          child.material.emissiveIntensity = 0;

          // Oceano: Ocean water from provided model
          if (child.name.includes('Oceano') || child.material.name.includes('eart_water')) {
            child.material.roughness = 0.22;
            child.material.metalness = 0.12;
            child.material.color.set('#2563EB');
          }
          // tierra: Continents & terrain from provided model
          else if (child.name.includes('tierra') || child.material.name.includes('earth_terrain')) {
            child.material.roughness = 0.72;
            child.material.metalness = 0.05;
            child.material.color.set('#22C55E');
          }
        }
      }
    });

    return cloned;
  }, [gltf.scene]);

  useFrame((_, delta) => {
    if (earthRef.current && !reducedMotion) {
      // Dynamic continuous axial rotation using provided model
      earthRef.current.rotation.y += delta * 0.12;
    }
  });

  if (!clonedEarth) return null;

  return (
    <group ref={earthRef} position={position} rotation={[0.41, 0, 0]}>
      <primitive object={clonedEarth} />
    </group>
  );
}

function StarfieldEnclosure({ reducedMotion = false }) {
  const gltf = useGLTF('/models/night_sky_transparent_with_stars.glb');
  const texture = useTexture('/textures/starfield_enclosure_2048.png');
  const enclosureRef = useRef(null);
  const matRef = useRef(null);

  const starMesh = useMemo(() => {
    const orig = gltf.scene.getObjectByName('Starfield_Enclosure');
    if (!orig) return null;
    const cloned = orig.clone(true);

    // Center enclosure so it encompasses the whole lunar sky symmetrically
    cloned.position.set(0, 0, 0);

    // Setup high-definition star texture
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;

    // Fully transparent enclosure with softly glowing emissive stars and halos
    const starMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0,
      depthWrite: false, // Ensures enclosure NEVER obstructs Sun, Earth, Base, or Camera
      depthTest: true,
      side: THREE.DoubleSide, // Visible from both inside and different viewing angles
      blending: THREE.AdditiveBlending, // Zero visible surface: black space is completely invisible, stars radiate light
      toneMapped: false, // Emissive stars trigger restrained post-processing bloom
    });

    matRef.current = starMaterial;
    cloned.material = starMaterial;
    cloned.renderOrder = -100;
    return cloned;
  }, [gltf.scene, texture]);

  useFrame(({ clock }) => {
    if (enclosureRef.current && !reducedMotion) {
      // Subtle celestial diurnal drift
      enclosureRef.current.rotation.y = clock.getElapsedTime() * 0.0012;
    }
    if (matRef.current) {
      const t = clock.getElapsedTime();
      // Subtle natural stellar shimmer across starfield
      matRef.current.opacity = 1.0 + Math.sin(t * 1.6) * 0.06;
    }
  });

  if (!starMesh) return null;

  return (
    <group ref={enclosureRef} name="SphericalStarfieldEnclosure">
      <primitive object={starMesh} />
    </group>
  );
}

function CharacterAndCameraRig({
  actor,
  sol,
  panelsOut = true,
  solarBroken = false,
  cameraMode = 'orbit',
  positionResetCount = 0,
  reducedMotion = false,
  inputPaused = false,
  setCharacterPosition,
  setNearbyStationId,
}) {
  const { camera, gl } = useThree();
  const orbitRef = useRef(null);
  const actorGroupRef = useRef(null);
  const initialPos = useMemo(
    () => useGameStore.getState().characterPosition || [0.0, -0.45, 1.8],
    []
  );

  const posRef = useRef(new THREE.Vector3(initialPos[0], initialPos[1], initialPos[2]));
  const yawRef = useRef(0);
  const tppPitchRef = useRef(0.36);
  const tppDistRef = useRef(2.6);
  const fppPitchRef = useRef(0.02);
  const walkPhaseRef = useRef(0);

  const keysRef = useRef(new Set());
  const dragRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const hoverRef = useRef({ hasPrev: false, lastX: 0, lastY: 0 });
  const inputPausedRef = useRef(inputPaused);
  inputPausedRef.current = inputPaused;
  const prevModeRef = useRef(cameraMode);
  const prevResetRef = useRef(positionResetCount);
  const lastNearIdRef = useRef(
    (() => {
      const res = findNearestStation(initialPos, sol);
      return res?.inRange ? res.station?.id || null : null;
    })()
  );
  const lastSyncTimeRef = useRef(0);
  const lastSyncPosRef = useRef(new THREE.Vector3(initialPos[0], initialPos[1], initialPos[2]));
  const tmpDirRef = useRef(new THREE.Vector3());
  const tmpCamPosRef = useRef(new THREE.Vector3());

  const [isWalking, setIsWalking] = useState(false);
  const [flipX, setFlipX] = useState(false);
  const walkingStateRef = useRef(false);
  const flipXStateRef = useRef(false);

  // Snap astronaut position on mission restart / new level
  useEffect(() => {
    if (prevResetRef.current === positionResetCount) return;
    prevResetRef.current = positionResetCount;
    const resetPos = useGameStore.getState().characterPosition || [0.0, -0.45, 1.8];
    posRef.current.set(resetPos[0], resetPos[1], resetPos[2]);
    yawRef.current = 0;
    tppPitchRef.current = 0.36;
    tppDistRef.current = 2.6;
    fppPitchRef.current = 0.02;
    lastSyncPosRef.current.copy(posRef.current);
    if (actorGroupRef.current) {
      actorGroupRef.current.position.copy(posRef.current);
    }
    const nearRes = findNearestStation(resetPos, sol);
    const nextNear = nearRes?.inRange ? nearRes.station?.id || null : null;
    lastNearIdRef.current = nextNear;
    setNearbyStationId?.(nextNear);
  }, [positionResetCount, sol, setNearbyStationId]);

  // Keep actor grounded immediately on mount
  useEffect(() => {
    if (actorGroupRef.current) {
      actorGroupRef.current.position.copy(posRef.current);
    }
  }, []);

  // Track WASD + Arrow keys cleanly without stuck keys
  useEffect(() => {
    const onKeyDown = (event) => {
      const state = useGameStore.getState();
      if (state.ui?.screen !== 'game') return;
      if (state.ui?.sol214Open || state.ui?.activeAlert) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const lower = event.key.toLowerCase();
      if (
        lower === 'w' ||
        lower === 'a' ||
        lower === 's' ||
        lower === 'd' ||
        lower === 'shift' ||
        lower === 'arrowup' ||
        lower === 'arrowdown' ||
        lower === 'arrowleft' ||
        lower === 'arrowright'
      ) {
        if (lower.startsWith('arrow')) {
          event.preventDefault();
        }
        keysRef.current.add(lower);
      }
    };

    const onKeyUp = (event) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    const clearKeys = () => {
      keysRef.current.clear();
      dragRef.current.active = false;
      hoverRef.current.hasPrev = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, []);

  useEffect(() => {
    hoverRef.current.hasPrev = false;
    if (inputPaused) {
      keysRef.current.clear();
      dragRef.current.active = false;
      if (document.pointerLockElement === gl?.domElement) {
        document.exitPointerLock?.();
      }
    }
  }, [inputPaused, gl]);

  // Smooth camera transitions when switching between Orbit, TPP, and FPP
  useEffect(() => {
    const prev = prevModeRef.current;
    prevModeRef.current = cameraMode;
    hoverRef.current.hasPrev = false;
    dragRef.current.active = false;
    if (prev === cameraMode) return;

    if (prev === 'orbit' && (cameraMode === 'tpp' || cameraMode === 'fpp')) {
      const dir = tmpDirRef.current;
      camera.getWorldDirection(dir);
      dir.y = 0;
      if (dir.lengthSq() > 0.001) {
        dir.normalize();
        yawRef.current = Math.atan2(-dir.x, -dir.z);
      } else {
        yawRef.current = 0;
      }
      if (cameraMode === 'fpp') {
        fppPitchRef.current = 0.02;
      }
    } else if (cameraMode === 'fpp') {
      fppPitchRef.current = THREE.MathUtils.clamp(fppPitchRef.current, -0.35, 0.35);
    } else if (cameraMode === 'orbit') {
      if (document.pointerLockElement === gl?.domElement) {
        document.exitPointerLock?.();
      }
      camera.position.set(0, 6.2, 14.5);
      if (orbitRef.current) {
        orbitRef.current.target.set(0.2, 0.15, 0.0);
        orbitRef.current.update();
      } else {
        camera.lookAt(0.2, 0.15, 0.0);
      }
    }
  }, [cameraMode, camera, gl]);

  // Direct mouse-movement look + drag look + optional [M] pointer lock + scroll zoom in TPP / FPP modes
  useEffect(() => {
    const dom = gl?.domElement;
    if (cameraMode !== 'tpp' && cameraMode !== 'fpp') {
      dragRef.current.active = false;
      hoverRef.current.hasPrev = false;
      if (dom && document.pointerLockElement === dom) {
        document.exitPointerLock?.();
      }
      return undefined;
    }

    if (!dom) return undefined;

    const isInteractiveHudTarget = (target) => {
      const el = target instanceof Element ? target : target?.parentElement;
      if (!el) return false;
      if (el.closest('.station-3d-badge')) return false;
      return Boolean(
        el.closest(
          '.topbar, .game-crew-col, .game-forecast-col, .mobile-hud-pills, .game-bottom-bar, .station-interact-card, .modal-backdrop, button, a, input, select, textarea'
        )
      );
    };

    const applyLookDelta = (dx, dy) => {
      if (dx === 0 && dy === 0) return;
      yawRef.current -= dx * 0.0062;
      if (cameraMode === 'tpp') {
        tppPitchRef.current = THREE.MathUtils.clamp(
          tppPitchRef.current + dy * 0.0036,
          0.06,
          1.12
        );
      } else {
        fppPitchRef.current = THREE.MathUtils.clamp(
          fppPitchRef.current - dy * 0.004,
          -0.85,
          1.15
        );
      }
    };

    const onPointerDown = (e) => {
      if (e.button !== 0 && e.button !== 2) return;
      dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      hoverRef.current = { hasPrev: true, lastX: e.clientX, lastY: e.clientY };
    };

    const onPointerMove = (e) => {
      if (inputPausedRef.current) {
        hoverRef.current.hasPrev = false;
        dragRef.current.active = false;
        return;
      }

      if (document.pointerLockElement === dom) {
        applyLookDelta(e.movementX || 0, e.movementY || 0);
        return;
      }

      if (dragRef.current.active) {
        const dx = e.clientX - dragRef.current.lastX;
        const dy = e.clientY - dragRef.current.lastY;
        dragRef.current.lastX = e.clientX;
        dragRef.current.lastY = e.clientY;
        hoverRef.current = { hasPrev: true, lastX: e.clientX, lastY: e.clientY };
        applyLookDelta(dx, dy);
        return;
      }

      if (e.pointerType === 'touch') return;

      if (isInteractiveHudTarget(e.target)) {
        hoverRef.current.hasPrev = false;
        return;
      }

      if (!hoverRef.current.hasPrev) {
        hoverRef.current = { hasPrev: true, lastX: e.clientX, lastY: e.clientY };
        return;
      }

      const dx = e.clientX - hoverRef.current.lastX;
      const dy = e.clientY - hoverRef.current.lastY;
      hoverRef.current.lastX = e.clientX;
      hoverRef.current.lastY = e.clientY;
      applyLookDelta(dx, dy);
    };

    const resetLookTracking = () => {
      dragRef.current.active = false;
      hoverRef.current.hasPrev = false;
    };

    const onWheel = (e) => {
      if (cameraMode !== 'tpp') return;
      tppDistRef.current = THREE.MathUtils.clamp(tppDistRef.current + e.deltaY * 0.0025, 1.5, 5.5);
    };

    const onLockKey = (event) => {
      if (inputPausedRef.current) return;
      const state = useGameStore.getState();
      if (state.ui?.screen !== 'game') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (document.pointerLockElement === dom) {
          document.exitPointerLock?.();
        } else {
          try {
            dom.requestPointerLock?.();
          } catch {
            // Ignore environments where Pointer Lock is unavailable
          }
        }
      }
    };

    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', resetLookTracking);
    window.addEventListener('pointercancel', resetLookTracking);
    window.addEventListener('blur', resetLookTracking);
    document.addEventListener('mouseleave', resetLookTracking);
    document.addEventListener('pointerlockchange', resetLookTracking);
    window.addEventListener('keydown', onLockKey);
    dom.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', resetLookTracking);
      window.removeEventListener('pointercancel', resetLookTracking);
      window.removeEventListener('blur', resetLookTracking);
      document.removeEventListener('mouseleave', resetLookTracking);
      document.removeEventListener('pointerlockchange', resetLookTracking);
      window.removeEventListener('keydown', onLockKey);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [cameraMode, gl]);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.1);
    const keys = keysRef.current;

    let movingNow = false;

    if (!inputPaused) {
      if ((cameraMode === 'tpp' || cameraMode === 'fpp') && (keys.has('arrowleft') || keys.has('arrowright'))) {
        const turnInput = (keys.has('arrowleft') ? 1 : 0) - (keys.has('arrowright') ? 1 : 0);
        yawRef.current += turnInput * 2.1 * dt;
      }

      // Compute camera-relative horizontal basis (forward & right on XZ lunar ground)
      let fwdX = 0;
      let fwdZ = -1;
      if (cameraMode === 'orbit') {
        camera.getWorldDirection(tmpDirRef.current);
        tmpDirRef.current.y = 0;
        if (tmpDirRef.current.lengthSq() > 0.0001) {
          tmpDirRef.current.normalize();
          fwdX = tmpDirRef.current.x;
          fwdZ = tmpDirRef.current.z;
        }
      } else {
        fwdX = -Math.sin(yawRef.current);
        fwdZ = -Math.cos(yawRef.current);
      }
      // Cross product forward x (0,1,0) = (-fwdZ, 0, fwdX)
      const rightX = -fwdZ;
      const rightZ = fwdX;

      const moveFwd =
        (keys.has('w') || keys.has('arrowup') ? 1 : 0) -
        (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
      const moveStrafe =
        cameraMode === 'orbit'
          ? (keys.has('d') || keys.has('arrowright') ? 1 : 0) -
            (keys.has('a') || keys.has('arrowleft') ? 1 : 0)
          : (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);

      let vx = fwdX * moveFwd + rightX * moveStrafe;
      let vz = fwdZ * moveFwd + rightZ * moveStrafe;
      const len = Math.hypot(vx, vz);

      if (len > 0.001) {
        movingNow = true;
        vx /= len;
        vz /= len;
        const speed = keys.has('shift') ? 4.6 : 3.0;
        const resolved = resolveCharacterMovement(
          posRef.current.x + vx * speed * dt,
          posRef.current.z + vz * speed * dt,
          { sol, panelsOut, solarBroken }
        );
        posRef.current.x = resolved.x;
        posRef.current.z = resolved.z;
        posRef.current.y = -0.45;
        walkPhaseRef.current += dt * 11;

        const screenRightDot = vx * rightX + vz * rightZ;
        if (screenRightDot < -0.08 && !flipXStateRef.current) {
          flipXStateRef.current = true;
          setFlipX(true);
        } else if (screenRightDot > 0.08 && flipXStateRef.current) {
          flipXStateRef.current = false;
          setFlipX(false);
        }
      }
    }

    // Keep character outside solid obstacles even when structures unfold or unlock around them
    const settled = resolveCharacterMovement(posRef.current.x, posRef.current.z, {
      sol,
      panelsOut,
      solarBroken,
    });
    posRef.current.x = settled.x;
    posRef.current.z = settled.z;

    const wasWalking = walkingStateRef.current;
    if (movingNow !== wasWalking) {
      walkingStateRef.current = movingNow;
      setIsWalking(movingNow);
    }

    if (actorGroupRef.current) {
      actorGroupRef.current.position.copy(posRef.current);
    }

    // Sync nearby station immediately when entering/leaving range, and sync position without 60fps React thrashing
    const posArr = [posRef.current.x, posRef.current.y, posRef.current.z];
    const nearRes = findNearestStation(posArr, sol);
    const nextNearId = nearRes?.inRange ? nearRes.station?.id || null : null;
    if (nextNearId !== lastNearIdRef.current) {
      lastNearIdRef.current = nextNearId;
      setNearbyStationId?.(nextNearId);
    }

    const elapsed = clock.getElapsedTime();
    const movedSinceSync = posRef.current.distanceTo(lastSyncPosRef.current);
    if (
      (movedSinceSync > 0.12 && elapsed - lastSyncTimeRef.current > 0.12) ||
      (wasWalking && !movingNow && movedSinceSync > 0.005)
    ) {
      lastSyncTimeRef.current = elapsed;
      lastSyncPosRef.current.copy(posRef.current);
      setCharacterPosition?.([
        Number(posRef.current.x.toFixed(3)),
        posRef.current.y,
        Number(posRef.current.z.toFixed(3)),
      ]);
    }

    // Drive TPP or FPP camera smoothly
    if (cameraMode === 'tpp') {
      const dist = tppDistRef.current;
      const pitch = tppPitchRef.current;
      const yaw = yawRef.current;
      const horiz = dist * Math.cos(pitch);
      const desired = tmpCamPosRef.current.set(
        posRef.current.x + Math.sin(yaw) * horiz,
        Math.max(-0.5, posRef.current.y + 0.18 + dist * Math.sin(pitch)),
        posRef.current.z + Math.cos(yaw) * horiz
      );
      const alpha = reducedMotion ? 1 : Math.min(1, 1 - Math.exp(-16 * dt));
      camera.position.lerp(desired, alpha);
      camera.lookAt(posRef.current.x, posRef.current.y + 0.14, posRef.current.z);
    } else if (cameraMode === 'fpp') {
      const headBob =
        movingNow && !reducedMotion ? Math.sin(walkPhaseRef.current) * 0.012 : 0;
      const eyeY = posRef.current.y + 0.24 + headBob;
      const cosP = Math.cos(fppPitchRef.current);
      const targetX = posRef.current.x - Math.sin(yawRef.current) * cosP * 10;
      const targetY = eyeY + Math.sin(fppPitchRef.current) * 10;
      const targetZ = posRef.current.z - Math.cos(yawRef.current) * cosP * 10;
      camera.position.set(posRef.current.x, eyeY, posRef.current.z);
      camera.lookAt(targetX, targetY, targetZ);
    }
  });

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        enabled={cameraMode === 'orbit'}
        target={[0.2, 0.15, 0.0]}
        minDistance={5.0}
        maxDistance={24.0}
        minPolarAngle={Math.PI / 12}
        maxPolarAngle={Math.PI / 2.08}
        enableDamping
        dampingFactor={0.06}
      />

      <group ref={actorGroupRef} visible={cameraMode !== 'fpp'}>
        <SpriteActor
          key={actor.id}
          id={actor.id}
          name={actor.name}
          mood={actor.mood}
          health={actor.health}
          position={[0, 0, 0]}
          isWalking={isWalking}
          flipX={flipX}
          reducedMotion={reducedMotion}
        />
      </group>
    </>
  );
}

export function Diorama() {
  const game = useGameStore((s) => s.game);
  const selectedCrewId = useGameStore((s) => s.selectedCrewId) || 'commander';
  const cameraMode = useGameStore((s) => s.cameraMode) || 'orbit';
  const nearbyStationId = useGameStore((s) => s.nearbyStationId);
  const positionResetCount = useGameStore((s) => s.positionResetCount) || 0;
  const setCharacterPosition = useGameStore((s) => s.setCharacterPosition);
  const setNearbyStationId = useGameStore((s) => s.setNearbyStationId);
  const interactWithStation = useGameStore((s) => s.interactWithStation);
  const cycleCameraMode = useGameStore((s) => s.cycleCameraMode);
  const actionToast = useGameStore((s) => s.actionToast);
  const showToast = useGameStore((s) => s.showToast);
  const screen = useGameStore((s) => s.ui?.screen) || 'game';
  const sol214Open = Boolean(useGameStore((s) => s.ui?.sol214Open));
  const activeAlert = useGameStore((s) => s.ui?.activeAlert);

  const dustCountdown = useGameStore((s) => s.dustCountdown);
  const dustWarningActive = useGameStore((s) => s.dustWarningActive);
  const stormResolved = useGameStore((s) => s.stormResolved);
  const setDustCountdown = useGameStore((s) => s.setDustCountdown);
  const setDustWarningActive = useGameStore((s) => s.setDustWarningActive);
  const setStormResolved = useGameStore((s) => s.setStormResolved);
  const setSolarBroken = useGameStore((s) => s.setSolarBroken);
  const solarBroken = Boolean(game?.solarBroken);

  const quality = useGameStore((s) => s.settings?.quality) || 'high';
  const reducedMotion = useGameStore((s) => s.settings?.reducedMotion) || false;
  const updateSettings = useGameStore((s) => s.updateSettings);

  const [fps, setFps] = useState(60);

  const sol = game?.sol || 1;
  const level = game?.level || 1;
  const gauges = game?.gauges || { power: 80, oxygen: 100, shield: 100 };
  const choices = game?.choices || { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' };
  const crew = game?.crew;
  const commander = game?.commander;
  const timeline = game?.timeline || [];

  const rawEventsToday = getEventsForSol(timeline, sol);
  const eventsToday = rawEventsToday.map((e) =>
    normalizeEventType(e.type || e.code)
  );
  const isNight = eventsToday.includes('night') || isLunarNightSol(sol);
  const isFlare =
    eventsToday.includes('flare') || eventsToday.includes('cme') || eventsToday.includes('sol214');
  const isDust = eventsToday.includes('dust');
  const isLowPower = (gauges.power ?? 80) <= 25;

  // NASA/JPL Horizons Ephemeris astronomical positions (Sun & Earth)
  const [astroData, setAstroData] = useState(() => ({
    sun: getAnalyticalPositions(sol, isNight).sun,
    earth: getAnalyticalPositions(sol, isNight).earth,
    isLive: false,
    source: 'NASA/JPL Ephemeris',
  }));

  useEffect(() => {
    let active = true;
    loadAstronomicalPositions(sol, isNight).then((res) => {
      if (active && res) {
        setAstroData(res);
      }
    });
    return () => {
      active = false;
    };
  }, [sol, isNight]);

  const sunPosition = astroData.sun;
  const earthPosition = astroData.earth;

  // 1. Trigger dust storm 60-second countdown when storm begins and panels are exposed
  useEffect(() => {
    if (isDust && choices.panelsOut && !solarBroken && !stormResolved) {
      if (dustCountdown === null) {
        setDustCountdown(60);
        setDustWarningActive(true);
        soundManager.play('warning');
        showToast('⚠️ DUST STORM WARNING: High-velocity winds! Retract solar panels within 60s to prevent structural failure!');
      }
    }
  }, [isDust, choices.panelsOut, solarBroken, stormResolved, dustCountdown, setDustCountdown, setDustWarningActive, showToast]);

  // 2. Decrement countdown every 1 second
  useEffect(() => {
    if (!dustWarningActive || dustCountdown === null || dustCountdown <= 0) return;

    const interval = setInterval(() => {
      const cur = useGameStore.getState().dustCountdown;
      if (cur === null) return;
      const next = cur - 1;
      setDustCountdown(next);

      if (next <= 0) {
        // Countdown reached 0 while panels are still out -> Failure sequence!
        const panelsStillOut = useGameStore.getState().game?.choices?.panelsOut;
        if (panelsStillOut) {
          setSolarBroken(true);
          setDustWarningActive(false);
          soundManager.play('warning');
          showToast('💥 CRITICAL FAILURE: Solar Panel detached and crashed onto lunar surface in dust storm!');
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dustWarningActive, dustCountdown, setDustCountdown, setSolarBroken, setDustWarningActive, showToast]);

  // 3. Prevent damage if player retracts panels before timer reaches 0
  useEffect(() => {
    if (dustWarningActive && !choices.panelsOut && !solarBroken) {
      setStormResolved(true);
      setDustWarningActive(false);
      setDustCountdown(null);
      soundManager.play('click');
      showToast('✅ Solar array safely secured in underground bay. Storm damage prevented!');
    }
  }, [dustWarningActive, choices.panelsOut, solarBroken, setStormResolved, setDustWarningActive, setDustCountdown, showToast]);

  // 4. Reset dust storm countdown on Sol advance
  useEffect(() => {
    setDustCountdown(null);
    setDustWarningActive(false);
    setStormResolved(false);
  }, [sol, setDustCountdown, setDustWarningActive, setStormResolved]);

  // Auto-dismiss action toast after 3.5 seconds
  useEffect(() => {
    if (!actionToast) return;
    const timer = setTimeout(() => {
      showToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [actionToast, showToast]);

  // Keep ONLY ONE crew member in the scene, dynamically matching the selected character
  const activeActor = useMemo(() => {
    if (selectedCrewId === 'commander' || selectedCrewId === 'commander-nova') {
      return {
        id: 'commander',
        name: commander?.name || 'Commander Nova',
        mood: isFlare && choices.shieldOn ? 'idle' : isLowPower ? 'worried' : 'idle',
        health: 100,
      };
    }
    const crewList = crew || [];
    const found = crewList.find((c) => c.id === selectedCrewId);
    if (found) {
      return {
        id: found.id,
        name: found.name,
        mood: found.mood || 'idle',
        health: found.health ?? 100,
      };
    }
    return {
      id: 'commander',
      name: commander?.name || 'Commander Nova',
      mood: 'idle',
      health: 100,
    };
  }, [selectedCrewId, commander, crew, isFlare, choices.shieldOn, isLowPower]);

  // Proximity-only station interaction (no auto-walk / no teleporting)
  const handleStationInteract = useCallback(
    (stationId, overrideValue = undefined) => {
      const res = interactWithStation(stationId, overrideValue);
      if (res?.sound) {
        soundManager.play(res.sound);
      } else if (!res?.ok) {
        soundManager.play('click');
      }
    },
    [interactWithStation]
  );

  const handleAutoDowngrade = () => {
    if (quality === 'high') {
      updateSettings({ quality: 'medium' });
    } else if (quality === 'medium') {
      updateSettings({ quality: 'low' });
    }
  };

  const nearbyStation = nearbyStationId ? BASE_STATIONS[nearbyStationId] : null;
  const nearbyUnlocked = nearbyStation ? isStationUnlocked(nearbyStation.id, sol) : false;
  const inputPaused = Boolean(screen !== 'game' || sol214Open || activeAlert);

  return (
    <div
      className="diorama-viewport"
      role="region"
      aria-label="Lunar Outpost HD-2D 3D Diorama Viewport"
      data-fps={fps}
      data-quality={quality}
      data-camera-mode={cameraMode}
    >
      {/* FPP Helmet Crosshair Reticle */}
      {cameraMode === 'fpp' && !inputPaused && (
        <div className="fpp-crosshair" aria-hidden="true">
          <span className="fpp-crosshair-dot" />
        </div>
      )}

      {/* Floating Action Feedback Toast */}
      {actionToast && (
        <div className="action-toast-pill" role="status">
          <span>{actionToast}</span>
        </div>
      )}

      {/* Dust Storm Warning & 60-Second Countdown Banner */}
      {dustWarningActive && dustCountdown !== null && (
        <div className="dust-storm-warning-banner" role="alert">
          <div className="dust-warning-header">
            <span className="dust-warning-title">⚠️ DUST STORM EMERGENCY – RETRACT PANELS</span>
            <span className="countdown-timer-pill">{dustCountdown}s</span>
          </div>
          <div className="dust-warning-desc">
            Violent surface winds will detach the solar array from its joint if exposed when the countdown reaches zero!
          </div>
          {nearbyStationId === 'solar' ? (
            <button
              type="button"
              className="btn btn-sm dust-warning-action-btn"
              onClick={() => handleStationInteract('solar', false)}
            >
              ⚠️ Retract Solar Panels Now [E] ({dustCountdown}s left)
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-sm dust-warning-action-btn"
              onClick={() => handleStationInteract('solar')}
            >
              🚶 Run to Solar Array with WASD &amp; Press [E] ({dustCountdown}s left)
            </button>
          )}
        </div>
      )}

      {/* Top Status & Info Overlay */}
      <div className="diorama-overlay-top">
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <div className="diorama-status-pill">
            <span>{isNight ? '🌑' : isFlare ? '☄️' : isDust ? '🌪️' : '☀️'}</span>
            <span>
              {isFlare
                ? 'SOLAR STORM / RADIATION ALERT'
                : isDust
                  ? 'ELECTROSTATIC DUST HAZE'
                  : isNight
                    ? 'LONG LUNAR NIGHT (EARTHLIGHT)'
                    : 'LUNAR DAYLIGHT (SUNLIT)'}
            </span>
          </div>
          <div className="diorama-status-pill">
            <span>
              Sol {sol} · Day {sol}
            </span>
          </div>
          <div className="diorama-status-pill">
            <span>
              HD-2D ({quality.toUpperCase()}) · {fps} FPS
            </span>
          </div>
          <div className="diorama-status-pill" title={astroData.source}>
            <span>🪐 {astroData.isLive ? 'JPL Horizons (Live)' : 'JPL Ephemeris'}</span>
          </div>
          <button
            type="button"
            className="diorama-status-pill diorama-status-pill-btn"
            onClick={() => {
              soundManager.play('click');
              cycleCameraMode?.();
            }}
            title="Switch Perspective [V]: Orbit / TPP / FPP"
          >
            <span>
              {cameraMode === 'fpp'
                ? '👁️ FPP · WASD Move · Mouse Look · [E] Use'
                : cameraMode === 'tpp'
                  ? '🧭 TPP · WASD Move · Mouse Look · [E] Use'
                  : '🔄 ORBIT · WASD Walk · Drag Orbit · [E] Use'}
            </span>
          </button>
        </div>
      </div>

      {/* Bottom-Center Physical Station Proximity Prompt */}
      <div className="station-interact-hud" aria-live="polite">
        {nearbyStation ? (
          <div className="station-interact-card">
            <div className="station-interact-meta">
              <span className="station-interact-icon" aria-hidden="true">
                {nearbyStation.icon}
              </span>
              <div>
                <div className="station-interact-title">{nearbyStation.name}</div>
                <div className="station-interact-sub">
                  {nearbyStation.id === 'solar'
                    ? solarBroken
                      ? 'BROKEN · Panels detached'
                      : choices.panelsOut
                        ? 'Currently EXTENDED'
                        : 'Currently RETRACTED'
                    : nearbyStation.id === 'shield'
                      ? choices.shieldOn
                        ? 'Shield Bubble ON'
                        : 'Shield Bubble OFF'
                      : nearbyStation.id === 'oxygen'
                        ? `Fresh Air Flow: ${(choices.oxygenLevel || 'normal').toUpperCase()}`
                        : nearbyStation.id === 'greenhouse'
                          ? !nearbyUnlocked
                            ? `Locked until Sol ${nearbyStation.unlockSol}`
                            : choices.waterGreenhouse || choices.tendGreenhouse
                              ? 'Watering & Tending Active'
                              : 'Greenhouse Standby'
                          : !nearbyUnlocked
                            ? `Locked until Sol ${nearbyStation.unlockSol}`
                            : choices.queueComms
                              ? 'Earth Packet Queued'
                              : 'Comms Dish Standby'}
                </div>
              </div>
            </div>

            {!nearbyUnlocked ? (
              <span className="station-interact-locked">🔒 Sol {nearbyStation.unlockSol}</span>
            ) : nearbyStation.id === 'solar' && solarBroken ? (
              <span className="station-interact-locked">💥 Broken</span>
            ) : nearbyStation.id === 'oxygen' ? (
              <div className="station-interact-btn-group">
                {['low', 'normal', 'high'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={`btn btn-sm ${
                      (choices.oxygenLevel || 'normal') === mode ? 'btn-cyan' : 'btn-ghost'
                    }`}
                    onClick={() => handleStationInteract('oxygen', mode)}
                  >
                    {mode.toUpperCase()}
                  </button>
                ))}
                <span className="kbd-hint">[E]</span>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => handleStationInteract(nearbyStation.id)}
              >
                <span>
                  {nearbyStation.id === 'solar'
                    ? choices.panelsOut
                      ? 'Retract Solar Panels'
                      : 'Extend Solar Panels'
                    : nearbyStation.id === 'shield'
                      ? choices.shieldOn
                        ? 'Turn Shield OFF'
                        : 'Activate Shield'
                      : nearbyStation.id === 'greenhouse'
                        ? choices.waterGreenhouse || choices.tendGreenhouse
                          ? 'Set Standby'
                          : 'Water & Tend'
                        : choices.queueComms
                          ? 'Cancel Queue'
                          : 'Queue Packet'}
                </span>
                <span className="kbd-hint" style={{ color: '#FFFFFF', background: '#050302' }}>
                  E
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="station-explore-hint">
            <span>WASD to explore · Walk near a station &amp; press [E]</span>
          </div>
        )}
      </div>

      <Canvas
        shadows={quality !== 'low'}
        dpr={quality === 'low' ? [1, 1] : [1, 2]}
        camera={{ position: [0, 6.2, 14.5], fov: 44, near: 0.08, far: 650 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={({ camera, gl }) => {
          camera.lookAt(0.2, 0.15, 0);
          if (gl?.domElement) {
            gl.domElement.addEventListener('webglcontextlost', (e) => {
              e.preventDefault();
            });
          }
        }}
        fallback={<Parallax2D reason="WebGL unavailable" />}
      >
        <color
          attach="background"
          args={[isFlare ? '#1A0505' : isDust ? '#1E1510' : '#050302']}
        />
        {isDust && <fog attach="fog" args={['#C9A878', 8, 32]} />}

        <FpsMonitor onFpsUpdate={setFps} onAutoDowngrade={handleAutoDowngrade} />

        <Lighting
          isNight={isNight}
          isFlare={isFlare}
          isDust={isDust}
          isLowPower={isLowPower}
          shieldOn={Boolean(choices.shieldOn)}
          power={gauges.power ?? 80}
          reducedMotion={reducedMotion}
          sunPosition={sunPosition}
          earthPosition={earthPosition}
        />

        {/* Spherical Starfield Enclosure from provided night_sky_transparent_with_stars.glb */}
        <Suspense fallback={null}>
          <StarfieldEnclosure reducedMotion={reducedMotion} />
        </Suspense>

        {/* Deep astronomical space point stars background */}
        <Stars
          radius={320}
          depth={80}
          count={quality === 'low' ? 900 : 2200}
          factor={4.5}
          saturation={0.3}
          fade={false}
          speed={reducedMotion ? 0 : 0.08}
        />

        <SunInSky position={sunPosition} isNight={isNight} isFlare={isFlare} />
        <EarthInSky position={earthPosition} reducedMotion={reducedMotion} />

        <OutpostMeshes
          panelsOut={Boolean(choices.panelsOut)}
          shieldOn={Boolean(choices.shieldOn)}
          isLowPower={isLowPower}
          isFlare={isFlare}
          power={gauges.power ?? 80}
          level={level}
          sol={sol}
          solarBroken={solarBroken}
          queueComms={Boolean(choices.queueComms)}
          reducedMotion={reducedMotion}
          onInteractStation={handleStationInteract}
        />

        {/* 3D Physical Interaction Stations on the lunar terrain */}
        <StationMarkers
          sol={sol}
          choices={choices}
          solarBroken={solarBroken}
          nearbyStationId={nearbyStationId}
          onInteractStation={handleStationInteract}
        />

        {/* Manual WASD Explorer & Camera Rig (Orbit / TPP / FPP) */}
        <CharacterAndCameraRig
          actor={activeActor}
          sol={sol}
          panelsOut={Boolean(choices.panelsOut)}
          solarBroken={solarBroken}
          cameraMode={cameraMode}
          positionResetCount={positionResetCount}
          reducedMotion={reducedMotion}
          inputPaused={inputPaused}
          setCharacterPosition={setCharacterPosition}
          setNearbyStationId={setNearbyStationId}
        />

        <Particles
          isDust={isDust}
          isFlare={isFlare}
          quality={quality}
          reducedMotion={reducedMotion}
        />

        <PostFX
          quality={quality}
          reducedMotion={reducedMotion}
          isFlare={isFlare}
          focusTarget={[0.2, 0.6, 0.0]}
        />
      </Canvas>

      <div className="diorama-overlay-bottom">
        <div className="node-tag-list">
          <span className="node-tag active">Habitat (Day 1)</span>
          <span className={`node-tag ${solarBroken ? 'broken-danger' : choices.panelsOut ? 'active' : ''}`}>
            SolarArray: {solarBroken ? 'BROKEN (DETACHED)' : choices.panelsOut ? 'EXTENDED' : 'RETRACTED'}
          </span>
          <span className={`node-tag ${choices.shieldOn ? 'active' : ''}`}>
            ShieldDome: {choices.shieldOn ? 'ON' : 'OFF'}
          </span>
          <span className={`node-tag ${sol >= 2 ? 'active' : 'locked'}`}>
            Greenhouse {sol >= 2 ? '(UNLOCKED)' : '(Day 2)'}
          </span>
          <span className={`node-tag ${sol >= 3 ? 'active' : 'locked'}`}>
            Earth Antenna {sol >= 3 ? (choices.queueComms ? '(TRANSMITTING)' : '(UNLOCKED)') : '(Day 3)'}
          </span>
          <span className="node-tag active">Oxygen Storage (Day 1)</span>
          <span className="node-tag active">Rover Pad</span>
          <span className="node-tag active">Terrain</span>
        </div>
      </div>
    </div>
  );
}

export default Diorama;
