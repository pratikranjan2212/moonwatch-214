/**
 * @fileoverview 3D Interactive Station Markers on the Lunar Surface.
 * Renders holographic beacons, ground rings, current system ON/OFF statuses,
 * locked/broken states, and click-to-walk interaction triggers.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BASE_STATIONS, isStationUnlocked } from '../engine/stations.js';

function SingleStationMarker({
  station,
  systemState,
  isLocked,
  isBroken,
  isCharacterNear,
  onInteract,
}) {
  const [hovered, setHovered] = useState(false);
  const ringRef = useRef(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.getElapsedTime() * 0.8;
    }
  });

  const [x, y, z] = station.position;

  return (
    <group position={[x, y, z]}>
      {/* Ground holographic activation disc on lunar terrain (Y = -0.265 relative to station center) */}
      <mesh
        ref={ringRef}
        position={[0, -0.265, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation();
          onInteract(station.id);
        }}
        cursor="pointer"
      >
        <ringGeometry args={[0.22, 0.32, 24]} />
        <meshBasicMaterial
          color={isBroken ? '#EF4444' : isLocked ? '#64748B' : hovered ? '#38BDF8' : station.color}
          transparent
          opacity={isCharacterNear ? 0.95 : hovered ? 0.8 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Vertical light beam beacon */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshBasicMaterial
          color={isBroken ? '#EF4444' : isLocked ? '#475569' : station.color}
          transparent
          opacity={isCharacterNear ? 0.8 : 0.3}
        />
      </mesh>

      {/* Floating HTML Station Prompt & Status Pill */}
      <Html
        position={[0, 0.65, 0]}
        center
        distanceFactor={14}
        style={{
          pointerEvents: 'auto',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <button
          type="button"
          onClick={() => onInteract(station.id)}
          className={`station-3d-badge ${isCharacterNear ? 'in-range' : ''} ${isBroken ? 'broken' : ''} ${isLocked ? 'locked' : ''}`}
          aria-label={`${station.name}: ${systemState}. Click to interact.`}
        >
          <span className="station-icon" aria-hidden="true">
            {station.icon}
          </span>
          <span className="station-info-col">
            <span className="station-name-text">{station.shortName}</span>
            <span className="station-state-text">
              {isBroken ? 'BROKEN' : isLocked ? `LOCKED (Sol ${station.unlockSol})` : systemState}
            </span>
          </span>
          {isCharacterNear && !isBroken && !isLocked && (
            <span className="station-action-pill">OPERATE</span>
          )}
        </button>
      </Html>
    </group>
  );
}

export function StationMarkers({
  sol = 1,
  choices = {},
  solarBroken = false,
  characterPosition = [0, -0.45, 1.8],
  onInteractStation,
}) {
  const getSystemState = (stationId) => {
    switch (stationId) {
      case 'shield':
        return choices.shieldOn ? 'SHIELD ON' : 'SHIELD OFF';
      case 'solar':
        if (solarBroken) return 'BROKEN';
        return choices.panelsOut ? 'EXTENDED' : 'RETRACTED';
      case 'oxygen':
        return `O₂: ${(choices.oxygenLevel || 'normal').toUpperCase()}`;
      case 'greenhouse':
        return choices.waterGreenhouse ? 'WATERING' : choices.tendGreenhouse ? 'TENDING' : 'STANDBY';
      case 'comms':
        return choices.queueComms ? 'QUEUED' : 'IDLE';
      default:
        return 'READY';
    }
  };

  return (
    <group name="InteractionStations">
      {Object.values(BASE_STATIONS).map((station) => {
        const isLocked = !isStationUnlocked(station.id, sol);
        const isBroken = station.id === 'solar' && solarBroken;
        const dist = Math.hypot(
          characterPosition[0] - station.position[0],
          characterPosition[2] - station.position[2]
        );
        const isNear = dist < 0.65;

        return (
          <SingleStationMarker
            key={station.id}
            station={station}
            systemState={getSystemState(station.id)}
            isLocked={isLocked}
            isBroken={isBroken}
            isCharacterNear={isNear}
            onInteract={(id) => onInteractStation?.(id)}
          />
        );
      })}
    </group>
  );
}

export default StationMarkers;
