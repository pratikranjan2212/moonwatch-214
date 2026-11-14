/**
 * @fileoverview HD-2D React Three Fiber Lunar Outpost Diorama (`Diorama.jsx`).
 * Loads Draco-compressed `.glb` models from `/models/outpost.glb` (using local `/draco/`
 * decoder), renders named nodes (`Habitat`, `SolarArray`, `ShieldDome`, `Antenna`,
 * `Rover`, `Greenhouse`, `Terrain`), Earth in the sky, stars, `Lighting`, `SpriteActor`
 * crew billboards, `Particles`, and `PostFX`.
 * Includes an FPS monitor that exposes `window.__MOONWATCH_FPS__` and auto-downgrades
 * quality (`high` -> `medium` -> `low` -> `Parallax2D` if sustained FPS < 30).
 */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import soundManager from '../audio/soundManager.js';
import { getAnalyticalPositions, loadAstronomicalPositions } from '../data/horizonsClient.js';
import { getEventsForSol, isLunarNightSol, normalizeEventType } from '../engine/events.js';
import { BASE_STATIONS } from '../engine/stations.js';
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

  useFrame(() => {
    framesRef.current += 1;
    const now = performance.now();
    const elapsed = now - lastTimeRef.current;
    if (elapsed >= 1000) {
      const fps = Math.round((framesRef.current * 1000) / elapsed);
      framesRef.current = 0;
      lastTimeRef.current = now;
      if (typeof window !== 'undefined') {
        window.__MOONWATCH_FPS__ = fps;
      }
      onFpsUpdate?.(fps);

      if (fps < 30) {
        lowFpsStreakRef.current += 1;
        if (lowFpsStreakRef.current >= 2) {
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

function CharacterWalker({
  actor,
  characterPosition,
  targetStation,
  isTravelling,
  reachStation,
  setCharacterPosition,
  reducedMotion,
}) {
  const currentPosRef = useRef(new THREE.Vector3(...characterPosition));
  const [flipX, setFlipX] = useState(false);
  const [renderPos, setRenderPos] = useState(characterPosition);

  useFrame((_, delta) => {
    if (!isTravelling || !targetStation) {
      return;
    }
    const dest = BASE_STATIONS[targetStation]?.position;
    if (!dest) return;

    const targetVec = new THREE.Vector3(...dest);
    const dist = currentPosRef.current.distanceTo(targetVec);

    if (dist > 0.04) {
      const step = Math.min(1.0, (delta * 2.6) / dist);
      if (targetVec.x > currentPosRef.current.x + 0.015) {
        setFlipX(false);
      } else if (targetVec.x < currentPosRef.current.x - 0.015) {
        setFlipX(true);
      }
      currentPosRef.current.lerp(targetVec, step);
      const nextArr = [currentPosRef.current.x, currentPosRef.current.y, currentPosRef.current.z];
      setRenderPos(nextArr);
      setCharacterPosition?.(nextArr);
    } else {
      currentPosRef.current.copy(targetVec);
      const nextArr = [targetVec.x, targetVec.y, targetVec.z];
      setRenderPos(nextArr);
      setCharacterPosition?.(nextArr);
      reachStation?.(targetStation);
    }
  });

  return (
    <SpriteActor
      key={actor.id}
      id={actor.id}
      name={actor.name}
      mood={actor.mood}
      health={actor.health}
      position={renderPos}
      isWalking={Boolean(isTravelling)}
      flipX={flipX}
      reducedMotion={reducedMotion}
    />
  );
}

export function Diorama() {
  const game = useGameStore((s) => s.game);
  const selectedCrewId = useGameStore((s) => s.selectedCrewId) || 'commander';
  const characterPosition = useGameStore((s) => s.characterPosition) || [0.0, -0.45, 1.8];
  const targetStation = useGameStore((s) => s.targetStation);
  const isTravelling = useGameStore((s) => s.isTravelling);
  const reachStation = useGameStore((s) => s.reachStation);
  const setCharacterPosition = useGameStore((s) => s.setCharacterPosition);
  const commandMoveToStation = useGameStore((s) => s.commandMoveToStation);
  const setChoice = useGameStore((s) => s.setChoice);
  const actionToast = useGameStore((s) => s.actionToast);
  const showToast = useGameStore((s) => s.showToast);

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
  const [fallback2D, setFallback2D] = useState(false);
  const [fallbackReason, setFallbackReason] = useState(null);

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

  // Physical station click handler
  const handleStationInteract = (stationId) => {
    switch (stationId) {
      case 'shield':
        commandMoveToStation('shield', () => {
          soundManager.play('click');
          const next = !choices.shieldOn;
          setChoice('shieldOn', next);
          showToast(next ? 'Radiation Shield Dome Activated at Central Base' : 'Shield Dome Deactivated');
        }, 'Main Shield Station');
        break;
      case 'solar':
        if (solarBroken) {
          soundManager.play('warning');
          showToast('Solar Array is BROKEN: Panels detached and shattered on lunar surface.');
          return;
        }
        commandMoveToStation('solar', () => {
          soundManager.play('motor');
          const next = !choices.panelsOut;
          setChoice('panelsOut', next);
          showToast(next ? 'Solar Panels Extended at Solar Installation' : 'Solar Panels Retracted into Underground Bay');
        }, 'Solar Panel Installation');
        break;
      case 'oxygen':
        commandMoveToStation('oxygen', () => {
          soundManager.play('click');
          const modes = ['low', 'normal', 'high'];
          const idx = modes.indexOf(choices.oxygenLevel || 'normal');
          const nextMode = modes[(idx + 1) % 3];
          setChoice('oxygenLevel', nextMode);
          showToast(`Oxygen Life Support Set to ${nextMode.toUpperCase()} at O₂ Tanks`);
        }, 'Oxygen Control Station');
        break;
      case 'greenhouse':
        if (sol < 2) {
          showToast('Greenhouse Deck is LOCKED (Unlocks on Sol 2)');
          return;
        }
        commandMoveToStation('greenhouse', () => {
          soundManager.play('click');
          const next = !choices.waterGreenhouse;
          setChoice('waterGreenhouse', next);
          showToast(next ? 'Greenhouse Irrigation Activated' : 'Irrigation Switched to Standby');
        }, 'Greenhouse Control Station');
        break;
      case 'comms':
        if (sol < 3) {
          showToast('Earth Comms Antenna is LOCKED (Unlocks on Sol 3)');
          return;
        }
        commandMoveToStation('comms', () => {
          soundManager.play('click');
          const next = !choices.queueComms;
          setChoice('queueComms', next);
          showToast(next ? 'Earth Packet Queued on High-Gain Dish' : 'Comms Dish Switched to Standby');
        }, 'Earth Communications Unit');
        break;
      default:
        break;
    }
  };

  const handleAutoDowngrade = (measuredFps) => {
    if (quality === 'high') {
      updateSettings({ quality: 'medium' });
    } else if (quality === 'medium') {
      updateSettings({ quality: 'low' });
    } else if (measuredFps < 30) {
      setFallbackReason(`${measuredFps} FPS < 30 target`);
      setFallback2D(true);
    }
  };

  if (fallback2D) {
    return <Parallax2D reason={fallbackReason} />;
  }

  return (
    <div
      className="diorama-viewport"
      role="region"
      aria-label="Lunar Outpost HD-2D 3D Diorama Viewport"
      data-fps={fps}
      data-quality={quality}
    >
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
          <button
            type="button"
            className="btn btn-sm dust-warning-action-btn"
            onClick={() => handleStationInteract('solar')}
          >
            🚶 Walk to Solar Station & Retract ({dustCountdown}s remaining)
          </button>
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
          <div className="diorama-status-pill">
            <span>🔄 360° Orbit Drag</span>
          </div>
        </div>
      </div>

      <Canvas
        shadows={quality !== 'low'}
        dpr={quality === 'low' ? [1, 1] : [1, 2]}
        camera={{ position: [0, 6.2, 13.5], fov: 42, near: 0.2, far: 650 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
        }}
        onCreated={({ camera }) => {
          camera.lookAt(0.2, 0.6, 0);
        }}
        fallback={<Parallax2D reason="WebGL unavailable" />}
      >
        <color
          attach="background"
          args={[isFlare ? '#140410' : isDust ? '#2C2016' : '#020308']}
        />
        {isDust && <fog attach="fog" args={['#C9A878', 8, 32]} />}

        <OrbitControls
          makeDefault
          target={[0.2, 0.6, 0.0]}
          minDistance={7.0}
          maxDistance={22.0}
          minPolarAngle={Math.PI / 12}
          maxPolarAngle={Math.PI / 2.08}
          enableDamping
          dampingFactor={0.06}
        />

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
        />

        {/* 3D Physical Interaction Stations on the lunar terrain */}
        <StationMarkers
          sol={sol}
          choices={choices}
          solarBroken={solarBroken}
          characterPosition={characterPosition}
          onInteractStation={handleStationInteract}
        />

        {/* Selected Single Crew Member (Proportionate, Grounded, Physically walking) */}
        <CharacterWalker
          actor={activeActor}
          characterPosition={characterPosition}
          targetStation={targetStation}
          isTravelling={isTravelling}
          reachStation={reachStation}
          setCharacterPosition={setCharacterPosition}
          reducedMotion={reducedMotion}
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
