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
import { OrbitControls, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getEventsForSol, isLunarNightSol, normalizeEventType } from '../engine/events.js';
import useGameStore from '../store/useGameStore.js';
import Lighting from './Lighting.jsx';
import MoonBase from './MoonBase.jsx';
import Parallax2D from './Parallax2D.jsx';
import Particles from './Particles.jsx';
import PostFX from './PostFX.jsx';
import SpriteActor from './SpriteActor.jsx';

// Configure local Draco decoder path for 100% offline reliability
useGLTF.setDecoderPath('/draco/');

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
  queueComms = false,
  reducedMotion = false,
}) {
  const solarRef = useRef(null);
  const antennaRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (solarRef.current) {
      const targetScaleX = panelsOut ? 1 : 0.22;
      solarRef.current.scale.x += (targetScaleX - solarRef.current.scale.x) * 0.12;
    }
    if (antennaRef.current && (queueComms || level >= 3)) {
      antennaRef.current.rotation.y = Math.sin(t * 1.5) * 0.35;
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

      {/* Named Node: Antenna (Earth deep-space communications dish) */}
      <group ref={antennaRef} name="Antenna" position={[3.6, 0.85, -1.8]}>
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
          queueComms={queueComms}
          reducedMotion={reducedMotion}
        />
      </Suspense>

      {/* Earth in the Lunar Sky */}
      <mesh name="EarthInSky" position={[-16, 12, -24]}>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshStandardMaterial
          color="#1E6091"
          emissive="#35D0E6"
          emissiveIntensity={0.5}
          roughness={0.65}
        />
      </mesh>
    </group>
  );
}

/**
 * Calculates 3D Sun vector placed according to real NASA DONKI flare/CME coordinates
 * or natural lunar diurnal day/night arc.
 */
function getSolarPosition(rawEvents = [], sol = 1, isNight = false) {
  if (isNight) {
    return [-14, -18, -12];
  }

  // Find any event with real solar disk coordinates
  const flareWithLocation = rawEvents.find(
    (e) =>
      e.sourceLocation ||
      (e.latitude !== undefined && e.latitude !== null) ||
      e.code === 'SOL214' ||
      e.type === 'sol214'
  );

  let lat = 18;
  let lon = -36;
  let hasRealDonkiCoord = false;

  if (flareWithLocation) {
    if (flareWithLocation.sourceLocation) {
      const match = String(flareWithLocation.sourceLocation).match(/([NS])(\d+)([EW])(\d+)/i);
      if (match) {
        lat = (match[1].toUpperCase() === 'S' ? -1 : 1) * parseFloat(match[2]);
        lon = (match[3].toUpperCase() === 'W' ? -1 : 1) * parseFloat(match[4]);
        hasRealDonkiCoord = true;
      }
    } else if (flareWithLocation.latitude !== undefined && flareWithLocation.latitude !== null) {
      lat = Number(flareWithLocation.latitude) || 0;
      lon = Number(flareWithLocation.longitude) || 0;
      hasRealDonkiCoord = true;
    } else if (flareWithLocation.code === 'SOL214' || flareWithLocation.type === 'sol214') {
      // Historical May 10, 2024 Sol 214 super-flare from AR 13664 (N18W36)
      lat = 18;
      lon = -36;
      hasRealDonkiCoord = true;
    }
  }

  const R = 32;
  if (hasRealDonkiCoord) {
    const elevation = THREE.MathUtils.degToRad(22 + lat * 0.4);
    const azimuth = THREE.MathUtils.degToRad(55 + lon * 0.6);
    return [
      R * Math.cos(elevation) * Math.sin(azimuth),
      Math.max(6, R * Math.sin(elevation)),
      R * Math.cos(elevation) * Math.cos(azimuth),
    ];
  }

  // Natural lunar daylight sun arc if no flare location is provided
  const dayAngle = ((sol % 14) / 14) * Math.PI * 0.6 + 0.35;
  return [
    R * Math.cos(dayAngle) * 0.85,
    Math.max(8, R * Math.sin(dayAngle)),
    R * Math.cos(dayAngle) * 0.55,
  ];
}

function SunInSky({ position = [16, 20, 14], isNight = false, isFlare = false }) {
  if (isNight) return null;

  return (
    <group position={position}>
      {/* Blinding Solar Core */}
      <mesh>
        <sphereGeometry args={[1.75, 24, 24]} />
        <meshBasicMaterial color={isFlare ? '#FFF1AA' : '#FFFFFF'} />
      </mesh>
      {/* Solar Corona Atmosphere Glow */}
      <mesh>
        <sphereGeometry args={[2.9, 24, 24]} />
        <meshBasicMaterial
          color={isFlare ? '#FF6B00' : '#FFD54F'}
          transparent
          opacity={isFlare ? 0.65 : 0.42}
          side={THREE.BackSide}
        />
      </mesh>
      {/* Outer Halo */}
      <mesh>
        <sphereGeometry args={[4.8, 24, 24]} />
        <meshBasicMaterial
          color={isFlare ? '#FF1744' : '#FFE082'}
          transparent
          opacity={isFlare ? 0.35 : 0.18}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

export function Diorama() {
  const game = useGameStore((s) => s.game);
  const selectedCrewId = useGameStore((s) => s.selectedCrewId) || 'commander';
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

  const sunPosition = useMemo(
    () => getSolarPosition(rawEventsToday, sol, isNight),
    [rawEventsToday, sol, isNight]
  );

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
      <div className="diorama-overlay-top">
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
            HD-2D ({quality.toUpperCase()}) · {fps} FPS
          </span>
        </div>
        <div className="diorama-status-pill">
          <span>🔄 360° Orbit Drag</span>
        </div>
      </div>

      <Canvas
        shadows={quality !== 'low'}
        dpr={quality === 'low' ? [1, 1] : [1, 2]}
        camera={{ position: [0, 6.2, 13.5], fov: 42, near: 0.1, far: 90 }}
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
        />

        <SunInSky position={sunPosition} isNight={isNight} isFlare={isFlare} />

        {/* Dense, bright deep-space starfield */}
        <Stars
          radius={60}
          depth={35}
          count={quality === 'low' ? 900 : 2800}
          factor={5.5}
          saturation={0.35}
          fade={false}
          speed={reducedMotion ? 0 : 0.12}
        />

        <OutpostMeshes
          panelsOut={Boolean(choices.panelsOut)}
          shieldOn={Boolean(choices.shieldOn)}
          isLowPower={isLowPower}
          isFlare={isFlare}
          power={gauges.power ?? 80}
          level={level}
          queueComms={Boolean(choices.queueComms)}
          reducedMotion={reducedMotion}
        />

        {/* Selected Crew Member (Only ONE in the scene, dynamically updated) */}
        <SpriteActor
          key={activeActor.id}
          id={activeActor.id}
          name={activeActor.name}
          mood={activeActor.mood}
          health={activeActor.health}
          position={[0, 0.48, 2.0]}
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
          <span className="node-tag active">Habitat</span>
          <span className={`node-tag ${choices.panelsOut ? 'active' : ''}`}>
            SolarArray: {choices.panelsOut ? 'DEPLOYED' : 'RETRACTED'}
          </span>
          <span className={`node-tag ${choices.shieldOn ? 'active' : ''}`}>
            ShieldDome: {choices.shieldOn ? 'ON' : 'OFF'}
          </span>
          <span className={`node-tag ${level >= 2 ? 'active' : ''}`}>Greenhouse</span>
          <span className={`node-tag ${level >= 3 ? 'active' : ''}`}>Antenna</span>
          <span className="node-tag active">Oxygen Storage</span>
          <span className="node-tag active">Rover Pad</span>
          <span className="node-tag active">Terrain</span>
        </div>
      </div>
    </div>
  );
}

export default Diorama;
