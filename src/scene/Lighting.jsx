/**
 * @fileoverview Dynamic HD-2D lighting driven by lunar outpost game state
 * (Day, Lunar Night, Solar Flare / CME, Dust Storm, and Low Power).
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export function Lighting({
  isNight = false,
  isFlare = false,
  isDust = false,
  isLowPower = false,
  shieldOn = false,
  power = 80,
  reducedMotion = false,
  sunPosition = null,
}) {
  const beaconRef = useRef(null);
  const windowLightRef = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (beaconRef.current) {
      if ((isFlare || isLowPower) && !reducedMotion) {
        beaconRef.current.intensity = 1.4 + Math.sin(t * 6) * 1.1;
      } else {
        beaconRef.current.intensity = isFlare || isLowPower ? 1.8 : 0.15;
      }
    }
    if (windowLightRef.current) {
      if (power <= 0) {
        windowLightRef.current.intensity = 0.05;
      } else if (isLowPower && !reducedMotion) {
        windowLightRef.current.intensity = 0.6 + Math.sin(t * 11) * 0.25;
      } else {
        windowLightRef.current.intensity = isNight ? 1.6 : 0.9;
      }
    }
  });

  const sunColor = isFlare ? '#FFB020' : isDust ? '#C9A878' : isNight ? '#35D0E6' : '#FFF1C9';
  const sunIntensity = isNight ? 0.22 : isDust ? 0.9 : isFlare ? 2.8 : 1.95;
  const ambientColor = isNight ? '#0E1122' : isDust ? '#483828' : isFlare ? '#2B1220' : '#3E4250';
  const ambientIntensity = isNight ? 0.3 : isDust ? 0.5 : 0.38;

  const lightPosition = sunPosition || (isNight ? [-8, 10, -6] : [14, 18, 12]);

  return (
    <group name="OutpostLighting">
      <ambientLight color={ambientColor} intensity={ambientIntensity} />
      <hemisphereLight
        args={[sunColor, '#020308', isNight ? 0.22 : 0.4]}
        position={[0, 15, 0]}
      />
      <directionalLight
        color={sunColor}
        intensity={sunIntensity}
        position={lightPosition}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-camera-near={0.5}
        shadow-camera-far={65}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />

      {/* Earth-shine directional fill light (ocean blue specular reflection on shadowed sides) */}
      <directionalLight
        color="#70B0FF"
        intensity={isNight ? 0.5 : 0.32}
        position={[-16, 12, -24]}
      />

      {/* Habitat warm window point light */}
      <pointLight
        ref={windowLightRef}
        color={isLowPower ? '#FF4D4D' : '#FFF1C9'}
        intensity={isNight ? 1.5 : 0.9}
        distance={8}
        position={[0, 1.4, 1.2]}
      />

      {/* Alert red beacon on Habitat roof */}
      <pointLight
        ref={beaconRef}
        color="#FF4D4D"
        intensity={isFlare || isLowPower ? 1.8 : 0.15}
        distance={10}
        position={[0, 2.8, 0]}
      />

      {/* Shield dome violet luminescence */}
      {shieldOn && (
        <pointLight
          color="#8E6CFF"
          intensity={1.35}
          distance={12}
          position={[0, 3.2, 0]}
        />
      )}
    </group>
  );
}

export default Lighting;
