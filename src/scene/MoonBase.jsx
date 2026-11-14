/**
 * @fileoverview Custom Moon Base 3D Model (`MoonBase.jsx`).
 * Loads `public/models/Moon_base.glb`, renders all custom meshes
 * (Habitat & Shield, Antenna, Greenhouse, Oxygen Storage, Rover Pad, Ground, Solar Array),
 * configures high-fidelity PBR materials and shading, and plays the Blender deployment
 * animations (`Moon_Baseplate.003Action`, `Moon_Baseplate.005Action`, `CubeAction`, `EmptyAction`).
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export function MoonBase({
  panelsOut = true,
  shieldOn = false,
  isLowPower = false,
  isFlare = false,
  power = 80,
  level = 1,
  queueComms = false,
  reducedMotion = false,
}) {
  const groupRef = useRef(null);
  const gltf = useGLTF('/models/Moon_base.glb');

  // Clone the scene graph so multiple instances / resets don't mutate the cached GLTF
  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);
    return scene;
  }, [gltf.scene]);

  // Create an AnimationMixer and configure phased door & solar deployment actions.
  // Sequential deployment:
  // - Enabling (0 -> 1): Ground doors open first (phase 0 to 0.35), then panels deploy (0.35 to 1.0).
  // - Disabling (1 -> 0): Panels retract fully underground first (1.0 to 0.35), then doors close (0.35 to 0.0).
  const { applyAnimationProgress } = useMemo(() => {
    const m = new THREE.AnimationMixer(clonedScene);
    const dActions = [];
    const pActions = [];

    (gltf.animations || []).forEach((clip) => {
      const act = m.clipAction(clip);
      act.setLoop(THREE.LoopOnce);
      act.clampWhenFinished = true;
      act.play();
      if (clip.name.includes('Moon_Baseplate')) {
        dActions.push(act);
      } else {
        pActions.push(act);
      }
    });

    const applyProgress = (p) => {
      let doorTime = 0;
      let panelTime = 0.5;

      if (p <= 0.35) {
        const dp = p / 0.35;
        doorTime = dp * 0.8333;
        panelTime = 0.5;
      } else {
        doorTime = 0.8333;
        const pp = (p - 0.35) / 0.65;
        panelTime = 0.5 + pp * (2.0833 - 0.5);
      }

      dActions.forEach((act) => {
        act.paused = false;
        act.time = THREE.MathUtils.clamp(doorTime, 0, 0.8333);
      });
      pActions.forEach((act) => {
        act.paused = false;
        act.time = THREE.MathUtils.clamp(panelTime, 0.5, 2.0833);
      });
      m.update(0);
    };

    return {
      mixer: m,
      applyAnimationProgress: applyProgress,
    };
  }, [clonedScene, gltf.animations]);

  // Track target playback progress (0 = fully retracted & closed, 1 = fully deployed & open)
  const animProgressRef = useRef(panelsOut ? 1 : 0);

  // Set the initial animation state once or when reset
  useEffect(() => {
    const initialP = panelsOut ? 1.0 : 0.0;
    animProgressRef.current = initialP;
    applyAnimationProgress(initialP);
  }, [applyAnimationProgress, panelsOut]);
  const antennaRef = useRef(null);
  const shieldMeshRef = useRef(null);
  const solarBlueMatRef = useRef(null);
  const greenhouseMatRef = useRef(null);
  const oxyMetalMatRef = useRef(null);
  const connectorMatRef = useRef(null);

  // Configure high-fidelity PBR shading for all custom materials
  useEffect(() => {
    const mats = new Map();

    clonedScene.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;

        const mList = Array.isArray(obj.material) ? obj.material : [obj.material];
        mList.forEach((mat) => {
          if (!mat) return;
          // Clone material so instances don't cross-contaminate
          const clonedMat = mat.clone();
          mats.set(clonedMat.name || obj.name, clonedMat);

          const matName = clonedMat.name?.toLowerCase() || '';

          // 1. Moon Base White (Composite habitat hull)
          if (matName.includes('moon_base_white')) {
            clonedMat.color.set('#FFFFFF');
            clonedMat.roughness = 0.58;
            clonedMat.metalness = 0.15;
            clonedMat.side = THREE.DoubleSide;
          }
          // 2. Base Metal (Structural titanium/steel struts)
          else if (matName.includes('base_metal')) {
            clonedMat.color.set('#A59FA5');
            clonedMat.roughness = 0.35;
            clonedMat.metalness = 0.78;
            clonedMat.side = THREE.DoubleSide;
          }
          // 3. Blue Glass (Observation cupola & greenhouse windows)
          else if (matName.includes('blue_glass')) {
            clonedMat.color.set('#0062FF');
            clonedMat.transparent = true;
            clonedMat.opacity = 0.65;
            clonedMat.roughness = 0.18;
            clonedMat.metalness = 0.1;
            if ('clearcoat' in clonedMat) {
              clonedMat.clearcoat = 1.0;
              clonedMat.clearcoatRoughness = 0.05;
            }
            clonedMat.side = THREE.DoubleSide;
          }
          // 4. Greenhouse Green (Hydroponics biome)
          else if (matName.includes('greenhouse_green')) {
            clonedMat.color.set('#95FF9C');
            clonedMat.roughness = 0.32;
            clonedMat.metalness = 0.1;
            clonedMat.emissive.set('#10B981');
            clonedMat.emissiveIntensity = level >= 2 ? 0.65 : 0.25;
            clonedMat.side = THREE.DoubleSide;
            greenhouseMatRef.current = clonedMat;
          }
          // 5. Base Black (Matte composite seals & airlock trim)
          else if (matName.includes('base_black')) {
            clonedMat.color.set('#2D2F36');
            clonedMat.roughness = 0.62;
            clonedMat.metalness = 0.22;
            clonedMat.side = THREE.DoubleSide;
          }
          // 6. Oxygen Metal (Pressurized O2 storage cylinders)
          else if (matName.includes('oxy_metal')) {
            clonedMat.color.set('#55C7D9');
            clonedMat.roughness = 0.38;
            clonedMat.metalness = 0.62;
            clonedMat.side = THREE.DoubleSide;
            oxyMetalMatRef.current = clonedMat;
          }
          // 7. Blue Metal (Life support reinforcement)
          else if (matName.includes('blue_metal')) {
            clonedMat.color.set('#778EFF');
            clonedMat.roughness = 0.35;
            clonedMat.metalness = 0.72;
            if ('clearcoat' in clonedMat) {
              clonedMat.clearcoat = 0.6;
              clonedMat.clearcoatRoughness = 0.1;
            }
            clonedMat.side = THREE.DoubleSide;
          }
          // 8. Shield Dome (Hemispherical protective forcefield)
          else if (matName.includes('dome') || obj.name === 'Sphere008_2') {
            clonedMat.color.set('#8E02FF');
            clonedMat.transparent = true;
            clonedMat.opacity = shieldOn ? 0.32 : 0;
            clonedMat.roughness = 0.15;
            clonedMat.metalness = 0.1;
            clonedMat.emissive.set('#8E6CFF');
            clonedMat.emissiveIntensity = shieldOn ? 0.95 : 0;
            clonedMat.side = THREE.DoubleSide;
            clonedMat.depthWrite = false;
            shieldMeshRef.current = obj;
            obj.visible = Boolean(shieldOn);
          }
          // 9. Moon Material (Lunar regolith & crater surface)
          else if (matName.includes('moon_material')) {
            clonedMat.color.set('#6F6F73');
            clonedMat.roughness = 0.95;
            clonedMat.metalness = 0.0;
            clonedMat.side = THREE.DoubleSide;
          }
          // 10. Connectors (Safety orange conduit junctions)
          else if (matName.includes('connectors')) {
            clonedMat.color.set('#FF7E00');
            clonedMat.roughness = 0.4;
            clonedMat.metalness = 0.25;
            clonedMat.emissive.set('#FF5500');
            clonedMat.emissiveIntensity = 0.25;
            clonedMat.side = THREE.DoubleSide;
            connectorMatRef.current = clonedMat;
          }
          // 11. Base Foundation
          else if (matName === 'base') {
            clonedMat.color.set('#454345');
            clonedMat.roughness = 0.45;
            clonedMat.metalness = 0.5;
            clonedMat.side = THREE.DoubleSide;
          }
          // 12. Solar Metal (Articulated hinge armature)
          else if (matName.includes('solar_metal')) {
            clonedMat.color.set('#A59FA5');
            clonedMat.roughness = 0.25;
            clonedMat.metalness = 0.75;
            clonedMat.side = THREE.DoubleSide;
          }
          // 13. Solar Blue (Photovoltaic collection cells)
          else if (matName.includes('solar_blue')) {
            clonedMat.color.set('#1D4ED8');
            clonedMat.roughness = 0.15;
            clonedMat.metalness = 0.35;
            clonedMat.emissive.set('#2563EB');
            clonedMat.emissiveIntensity = panelsOut ? 0.4 : 0.02;
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

    // Reference antenna for dynamic tracking
    antennaRef.current = clonedScene.getObjectByName('antenna_upgrade');
  }, [clonedScene, level, panelsOut, shieldOn]);

  // Dynamic animation and interaction update per frame
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();

    // 1. Phased solar deployment & retraction animation
    const targetProgress = panelsOut ? 1 : 0;
    const speed = reducedMotion ? 20.0 : 1.4; // time in seconds for full sequence
    const diff = targetProgress - animProgressRef.current;

    if (Math.abs(diff) > 0.0005) {
      const step = (Math.sign(diff) * delta) / speed;
      animProgressRef.current = THREE.MathUtils.clamp(
        animProgressRef.current + step,
        0,
        1
      );
      applyAnimationProgress(animProgressRef.current);
    }

    // 2. Interactive Antenna deep-space tracking
    if (antennaRef.current && (queueComms || level >= 3) && !reducedMotion) {
      antennaRef.current.rotation.y = Math.sin(t * 1.2) * 0.22;
    }

    // 3. Dynamic Dome Forcefield luminescence when shield is ON
    if (shieldMeshRef.current) {
      shieldMeshRef.current.visible = Boolean(shieldOn);
      if (shieldOn && shieldMeshRef.current.material) {
        const pulse = reducedMotion ? 0.9 : 0.85 + Math.sin(t * 4) * 0.2;
        shieldMeshRef.current.material.opacity = 0.28 + (pulse - 0.85) * 0.1;
        shieldMeshRef.current.material.emissiveIntensity = pulse;
      }
    }

    // 4. Solar cells glow when producing power
    if (solarBlueMatRef.current) {
      const targetEmissive = panelsOut && power > 0 ? 0.38 : 0.02;
      solarBlueMatRef.current.emissiveIntensity = targetEmissive;
    }

    // 5. Oxygen tanks subtle pulse during solar flares
    if (oxyMetalMatRef.current && isFlare && !reducedMotion) {
      oxyMetalMatRef.current.emissive.set('#00F0FF');
      oxyMetalMatRef.current.emissiveIntensity = 0.25 + Math.sin(t * 5) * 0.15;
    } else if (oxyMetalMatRef.current) {
      oxyMetalMatRef.current.emissive.set('#000000');
      oxyMetalMatRef.current.emissiveIntensity = 0;
    }

    // 6. Connectors flash warning pulse during low power
    if (connectorMatRef.current && isLowPower && !reducedMotion) {
      connectorMatRef.current.emissive.set('#FF2200');
      connectorMatRef.current.emissiveIntensity = 0.5 + Math.sin(t * 8) * 0.35;
    } else if (connectorMatRef.current) {
      connectorMatRef.current.emissive.set('#FF5500');
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

// Pre-load model for instantaneous render
useGLTF.preload('/models/Moon_base.glb');

export default MoonBase;
