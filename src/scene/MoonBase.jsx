/**
 * @fileoverview Complete Lunar Base 3D Model (`MoonBase.jsx`).
 * Loads `public/models/Moon_base.glb` (full lunar base model), renders custom meshes
 * (Habitat, Shield Dome, Antenna, Greenhouse, Oxygen Storage, Rover Pad, Ground, Solar Array),
 * configures high-fidelity PBR materials and transparent purple hexagonal glass shield,
 * executes the original Blender deployment animations (`Moon_Baseplate.003Action`,
 * `Moon_Baseplate.005Action`, `CubeAction`, `EmptyAction`), supports physical dust-storm
 * panel detachment, and drives the antenna Empty pivot around its local Z-axis.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function MoonBase({
  panelsOut = true,
  shieldOn = false,
  isLowPower = false,
  isFlare = false,
  power = 80,
  level = 1,
  sol = 1,
  solarBroken = false,
  _queueComms = false,
  reducedMotion = false,
}) {
  const groupRef = useRef(null);
  const gltf = useGLTF('/models/Moon_base.glb');
  const shieldNormal = useTexture('/textures/polygon_normal_dx_512.jpg');

  // Clone scene graph so multiple renders do not cross-contaminate GLTF cache
  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);
    return scene;
  }, [gltf.scene]);

  // Configure repeating wrap on hexagonal glass normal map
  useEffect(() => {
    if (shieldNormal) {
      shieldNormal.wrapS = THREE.RepeatWrapping;
      shieldNormal.wrapT = THREE.RepeatWrapping;
      shieldNormal.repeat.set(14, 14);
      shieldNormal.needsUpdate = true;
    }
  }, [shieldNormal]);

  // Configure original Blender deployment animation clips:
  // - Moon_Baseplate.003Action & Moon_Baseplate.005Action (hatch doors)
  // - CubeAction (vertical joint)
  // - EmptyAction (solar mast elevation and photovoltaic panel unfolding)
  const { maxDuration, setAnimationTime } = useMemo(() => {
    const m = new THREE.AnimationMixer(clonedScene);
    let dur = 0;
    const allActions = (gltf.animations || []).map((clip) => {
      const act = m.clipAction(clip);
      act.setLoop(THREE.LoopOnce);
      act.clampWhenFinished = true;
      act.play();
      dur = Math.max(dur, clip.duration);
      return act;
    });

    const setTime = (time) => {
      const clamped = THREE.MathUtils.clamp(time, 0, dur || 2.0833);
      allActions.forEach((act) => {
        act.paused = false;
        act.time = clamped;
      });
      m.update(0);
    };

    return {
      mixer: m,
      maxDuration: dur || 2.0833,
      setAnimationTime: setTime,
    };
  }, [clonedScene, gltf.animations]);

  // Current deployment animation time ref (0 = retracted underground, maxDuration = deployed)
  const animTimeRef = useRef(panelsOut ? maxDuration : 0);
  const isInitialMount = useRef(true);

  // Set initial deployment state once on mount
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const initialT = panelsOut ? maxDuration : 0;
      animTimeRef.current = initialT;
      setAnimationTime(initialT);
    }
  }, [setAnimationTime, maxDuration, panelsOut]);

  const antennaUpgradeRef = useRef(null);
  const shieldMeshesRef = useRef([]);
  const solarPanelsRef = useRef(null);
  const solarBlueMatRef = useRef(null);
  const greenhouseMatRef = useRef(null);
  const oxyMetalMatRef = useRef(null);
  const connectorMatRef = useRef(null);

  // Fall progress ref for dust-storm physical panel detachment
  const detachProgressRef = useRef(solarBroken ? 1 : 0);

  // Configure PBR materials, textures & shading
  useEffect(() => {
    const mats = new Map();
    shieldMeshesRef.current = [];

    clonedScene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        const mList = Array.isArray(obj.material) ? obj.material : [obj.material];
        mList.forEach((mat) => {
          if (!mat) return;
          const clonedMat = mat.clone();
          mats.set(clonedMat.name || obj.name, clonedMat);

          const matName = (clonedMat.name || '').toLowerCase();
          const objName = (obj.name || '').toLowerCase();

          // 1. Central Protective Shield Dome (Special Transparent Purple Hexagonal Glass; disappears when off, no glow when on)
          if (
            objName.includes('shield_dome') ||
            matName.includes('hexagonal pattern glass') ||
            matName.includes('dome') ||
            objName.includes('sphere008_2')
          ) {
            clonedMat.color.set('#9333EA'); // Royal purple tinted glass
            clonedMat.transparent = true;
            clonedMat.opacity = 0.35;
            clonedMat.roughness = 0.12;
            clonedMat.metalness = 0.18;
            if ('clearcoat' in clonedMat) {
              clonedMat.clearcoat = 1.0;
              clonedMat.clearcoatRoughness = 0.06;
            }
            if (shieldNormal) {
              clonedMat.normalMap = shieldNormal;
              clonedMat.normalScale.set(0.75, 0.75);
            }
            clonedMat.emissive.set('#000000');
            clonedMat.emissiveIntensity = 0;
            clonedMat.depthWrite = false;
            clonedMat.side = THREE.DoubleSide;

            shieldMeshesRef.current.push(obj);
            obj.visible = Boolean(shieldOn);
          }
          // 2. Moon Base White Composite Hull
          else if (matName.includes('moon_base_white')) {
            clonedMat.color.set('#FFFFFF');
            clonedMat.roughness = 0.52;
            clonedMat.metalness = 0.18;
            clonedMat.side = THREE.DoubleSide;
          }
          // 3. Base Metal (Structural titanium & aluminum struts)
          else if (matName.includes('base_metal')) {
            clonedMat.color.set('#A8A29E');
            clonedMat.roughness = 0.28;
            clonedMat.metalness = 0.85;
            clonedMat.side = THREE.DoubleSide;
          }
          // 4. Blue Glass (Observation cupolas)
          else if (matName.includes('blue_glass')) {
            clonedMat.color.set('#0066FF');
            clonedMat.transparent = true;
            clonedMat.opacity = 0.65;
            clonedMat.roughness = 0.14;
            clonedMat.metalness = 0.1;
            if ('clearcoat' in clonedMat) {
              clonedMat.clearcoat = 1.0;
              clonedMat.clearcoatRoughness = 0.05;
            }
            clonedMat.side = THREE.DoubleSide;
          }
          // 5. Greenhouse Hydroponics Biome
          else if (matName.includes('greenhouse_green')) {
            clonedMat.color.set('#86EFAC');
            clonedMat.roughness = 0.3;
            clonedMat.metalness = 0.1;
            clonedMat.emissive.set('#10B981');
            clonedMat.emissiveIntensity = 0.25;
            clonedMat.side = THREE.DoubleSide;
            greenhouseMatRef.current = clonedMat;
          }
          // 6. Base Black (Matte composite seals & airlock trim)
          else if (matName.includes('base_black')) {
            clonedMat.color.set('#27272A');
            clonedMat.roughness = 0.65;
            clonedMat.metalness = 0.25;
            clonedMat.side = THREE.DoubleSide;
          }
          // 7. Oxygen Metal Cylinders
          else if (matName.includes('oxy_metal')) {
            clonedMat.color.set('#38BDF8');
            clonedMat.roughness = 0.32;
            clonedMat.metalness = 0.68;
            clonedMat.side = THREE.DoubleSide;
            oxyMetalMatRef.current = clonedMat;
          }
          // 8. Blue Metal Reinforcement
          else if (matName.includes('blue_metal')) {
            clonedMat.color.set('#6366F1');
            clonedMat.roughness = 0.3;
            clonedMat.metalness = 0.75;
            clonedMat.side = THREE.DoubleSide;
          }
          // 9. Lunar Surface Regolith (Textures preserved)
          else if (matName.includes('moon_material')) {
            clonedMat.roughness = 0.92;
            clonedMat.metalness = 0.05;
            clonedMat.side = THREE.DoubleSide;
          }
          // 10. Safety Orange Conduit Connectors
          else if (matName.includes('connectors')) {
            clonedMat.color.set('#F97316');
            clonedMat.roughness = 0.36;
            clonedMat.metalness = 0.25;
            clonedMat.emissive.set('#EA580C');
            clonedMat.emissiveIntensity = 0.25;
            clonedMat.side = THREE.DoubleSide;
            connectorMatRef.current = clonedMat;
          }
          // 11. Base Foundation
          else if (matName === 'base') {
            clonedMat.color.set('#3F3F46');
            clonedMat.roughness = 0.42;
            clonedMat.metalness = 0.55;
            clonedMat.side = THREE.DoubleSide;
          }
          // 12. Solar Metal Armature
          else if (matName.includes('solar_metal')) {
            clonedMat.color.set('#CBD5E1');
            clonedMat.roughness = 0.22;
            clonedMat.metalness = 0.82;
            clonedMat.side = THREE.DoubleSide;
          }
          // 13. Solar Blue Photovoltaic Cells
          else if (matName.includes('solar_blue')) {
            clonedMat.color.set('#1D4ED8');
            clonedMat.roughness = 0.12;
            clonedMat.metalness = 0.35;
            clonedMat.emissive.set('#2563EB');
            clonedMat.emissiveIntensity = panelsOut && !solarBroken ? 0.42 : 0.02;
            clonedMat.side = THREE.DoubleSide;
            solarBlueMatRef.current = clonedMat;
          }

          if (Array.isArray(obj.material)) {
            obj.material[mList.indexOf(mat)] = clonedMat;
          } else {
            obj.material = clonedMat;
          }
        });
      }
    });

    // References to dynamic scene nodes
    antennaUpgradeRef.current = clonedScene.getObjectByName('antenna_upgrade');
    solarPanelsRef.current = clonedScene.getObjectByName('solar_panels');

    // Hide static sky models placed inside GLB at [0, 100, 0] so they are driven by Horizons
    const earthInGlb = clonedScene.getObjectByName('The_earth');
    if (earthInGlb) earthInGlb.visible = false;
    const sunInGlb = clonedScene.getObjectByName('The_Sun');
    if (sunInGlb) sunInGlb.visible = false;
  }, [clonedScene, shieldNormal, panelsOut, shieldOn, solarBroken]);

  // Progressive day-based infrastructure unlocks
  useEffect(() => {
    // Day 1: Main base + Oxygen storage
    const oxygen = clonedScene.getObjectByName('oxygen_storage');
    if (oxygen) oxygen.visible = true;

    // Day 2: Greenhouse unlocked
    const greenhouse = clonedScene.getObjectByName('green_house_upgrade');
    if (greenhouse) greenhouse.visible = (sol ?? 1) >= 2;

    // Day 3+: Earth communications antenna unlocked
    const antenna = clonedScene.getObjectByName('antenna_upgrade');
    if (antenna) {
      antenna.visible = (sol ?? 1) >= 3;
      antennaUpgradeRef.current = antenna;
    }
  }, [clonedScene, sol]);

  // Dynamic animation and interaction update per frame
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // 1. Solar array deployment / retraction with original Blender animation
    if (!solarBroken) {
      const targetTime = panelsOut ? maxDuration : 0;
      const speed = reducedMotion ? 20.0 : 1.6;
      const diff = targetTime - animTimeRef.current;

      if (Math.abs(diff) > 0.0001) {
        const maxStep = (delta * maxDuration) / speed;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), maxStep);
        animTimeRef.current = THREE.MathUtils.clamp(
          animTimeRef.current + step,
          0,
          maxDuration
        );
        setAnimationTime(animTimeRef.current);
      }
    }

    // 2. Solar Panel Failure / Physical Detachment sequence in Dust Storm
    if (solarPanelsRef.current) {
      if (solarBroken) {
        detachProgressRef.current = THREE.MathUtils.clamp(
          detachProgressRef.current + delta * 2.2,
          0,
          1
        );
        const p = detachProgressRef.current;
        // Gravity acceleration ease-in curve
        const fallEase = p * p;

        // Displace from vertical mast to the lunar surface
        solarPanelsRef.current.position.y = THREE.MathUtils.lerp(0.508, -5.2, fallEase);
        solarPanelsRef.current.position.x = THREE.MathUtils.lerp(-0.004, 2.6, fallEase);
        solarPanelsRef.current.position.z = THREE.MathUtils.lerp(-0.016, 1.6, fallEase);

        // Tilt detached panel onto ground
        solarPanelsRef.current.rotation.z = THREE.MathUtils.lerp(0, 0.78, fallEase);
        solarPanelsRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.42, fallEase);
        solarPanelsRef.current.rotation.y = THREE.MathUtils.lerp(0, 0.35, fallEase);
      } else {
        detachProgressRef.current = 0;
        solarPanelsRef.current.position.set(-0.004, 0.508, -0.016);
        solarPanelsRef.current.rotation.set(0, 0, 0);
      }
    }

    // 3. Shield Dome: disappears when turned off, reappears when turned on (no glow)
    if (shieldMeshesRef.current.length > 0) {
      shieldMeshesRef.current.forEach((mesh) => {
        mesh.visible = Boolean(shieldOn);
      });
    }

    // 5. Solar cells glow when generating power
    if (solarBlueMatRef.current) {
      const targetEmissive = !solarBroken && panelsOut && power > 0 ? 0.42 : 0.02;
      solarBlueMatRef.current.emissiveIntensity = targetEmissive;
    }

    // 6. Hydroponics biome interior illumination
    if (greenhouseMatRef.current) {
      greenhouseMatRef.current.emissiveIntensity = level >= 2 ? 0.65 : 0.25;
    }

    // 7. Oxygen tanks subtle pulse during solar flares
    if (oxyMetalMatRef.current && isFlare && !reducedMotion) {
      oxyMetalMatRef.current.emissive.set('#00F0FF');
      oxyMetalMatRef.current.emissiveIntensity = 0.25 + Math.sin(t * 5) * 0.15;
    } else if (oxyMetalMatRef.current) {
      oxyMetalMatRef.current.emissive.set('#000000');
      oxyMetalMatRef.current.emissiveIntensity = 0;
    }

    // 8. Connectors flash warning pulse during low power
    if (connectorMatRef.current && isLowPower && !reducedMotion) {
      connectorMatRef.current.emissive.set('#FF2200');
      connectorMatRef.current.emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.35;
    } else if (connectorMatRef.current) {
      connectorMatRef.current.emissive.set('#EA580C');
      connectorMatRef.current.emissiveIntensity = 0.25;
    }
  });

  return (
    <group
      ref={groupRef}
      name="MoonBaseSceneRoot"
      position={[0.6, -0.72, -0.3]}
      scale={[0.42, 0.42, 0.42]}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

// Pre-load model and textures for instantaneous render
useGLTF.preload('/models/Moon_base.glb');
useTexture.preload('/textures/polygon_normal_dx_512.jpg');

export default MoonBase;
