/**
 * @fileoverview 3D Interactive Station Markers on the Lunar Surface.
 * Renders holographic beacons, ground rings, current system ON/OFF statuses,
 * locked/broken states, and proximity-gated interaction triggers.
 */

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { BASE_STATIONS, isNearStation, isStationUnlocked } from '../engine/stations.js';

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
          if (e.delta > 6) return;
          e.stopPropagation();
          onInteract(station.id);
        }}
        cursor="pointer"
      >
        <ringGeometry args={[0.22, 0.34, 24]} />
        <meshBasicMaterial
          color={isBroken ? '#EF4444' : isLocked ? '#64748B' : hovered || isCharacterNear ? '#FF8F55' : station.color}
          transparent
          opacity={isCharacterNear ? 0.95 : hovered ? 0.8 : 0.45}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Outer proximity pulse ring when player is within operating range */}
      {isCharacterNear && !isBroken && !isLocked && (
        <mesh position={[0, -0.263, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.46, 28]} />
          <meshBasicMaterial color="#FF8F55" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Vertical light beam beacon */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 8]} />
        <meshBasicMaterial
          color={isBroken ? '#EF4444' : isLocked ? '#475569' : station.color}
          transparent
          opacity={isCharacterNear ? 0.85 : 0.3}
        />
      </mesh>

      {/* Floating HTML Station Prompt & Status Pill (constant readable screen size in Orbit/TPP/FPP) */}
      <Html
        position={[0, 0.62, 0]}
        center
        style={{
          pointerEvents: 'auto',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInteract(station.id);
          }}
          className={`station-3d-badge ${isCharacterNear ? 'in-range' : ''} ${isBroken ? 'broken' : ''} ${isLocked ? 'locked' : ''}`}
          aria-label={`${station.name}: ${systemState}. ${
            isCharacterNear ? 'Press E or click to operate.' : 'Walk closer with WASD to interact.'
          }`}
        >
          <span className="station-icon" aria-hidden="true">
            {station.icon}
          </span>
          <span className="station-info-col">
            <span className="station-name-text">{station.shortName}</span>
            <span className="station-state-text">
              {isBroken ? 'BROKEN' : isLocked ? `LOCKED (Day ${station.unlockSol})` : systemState}
            </span>
          </span>
          {isCharacterNear && !isBroken && !isLocked && (
            <span className="station-action-pill">[E] OPERATE</span>
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
  nearbyStationId = null,
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
        return choices.waterGreenhouse || choices.tendGreenhouse ? 'ACTIVE' : 'STANDBY';
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
        const isNear = nearbyStationId
          ? nearbyStationId === station.id
          : isNearStation(characterPosition, station.id);

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
