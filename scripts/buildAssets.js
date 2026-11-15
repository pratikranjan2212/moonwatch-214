/**
 * @fileoverview Builds and verifies Draco-compressed .glb models (named Habitat, SolarArray,
 * ShieldDome, Antenna, Rover, Greenhouse, Terrain), nearest-neighbour PNG sprite atlases + JSON
 * frame maps, SVG logo/icons, and ambient audio loop for MOONWATCH: Sol 214.
 */

import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import { PNG } from 'pngjs';

import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const RAW_DIR =
  process.env.KENNEY_RAW_DIR ||
  path.join(ROOT, 'raw_assets');
const MODELS_DIR = path.join(ROOT, 'public', 'models');
const SPRITES_DIR = path.join(ROOT, 'public', 'sprites');
const AUDIO_DIR = path.join(ROOT, 'public', 'audio');

const NODE_LAYOUTS = [
  { name: 'Habitat', translation: [0, 0, 0], scale: [1.8, 1.8, 1.8] },
  { name: 'SolarArray', translation: [-4.2, 0, -1.2], scale: [1.5, 1.5, 1.5] },
  { name: 'ShieldDome', translation: [0, 0, 0], scale: [3.2, 2.6, 3.2] },
  { name: 'Antenna', translation: [3.8, 0, -2.2], scale: [1.6, 1.6, 1.6] },
  { name: 'Rover', translation: [-2.6, 0, 3.0], scale: [1.2, 1.2, 1.2] },
  { name: 'Greenhouse', translation: [3.6, 0, 1.4], scale: [1.5, 1.5, 1.5] },
  { name: 'Terrain', translation: [0, -0.25, 0], scale: [6.0, 1.2, 6.0] },
];

function hexToRgba(hex, alpha = 255) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    alpha,
  ];
}

function setPixel(png, x, y, rgba) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const idx = (png.width * y + x) << 2;
  png.data[idx] = rgba[0];
  png.data[idx + 1] = rgba[1];
  png.data[idx + 2] = rgba[2];
  png.data[idx + 3] = rgba[3];
}

function fillRect(png, x0, y0, w, h, rgba) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      setPixel(png, x, y, rgba);
    }
  }
}

async function buildDracoModels() {
  const encoderModule = await draco3d.createEncoderModule();
  const decoderModule = await draco3d.createDecoderModule();

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      'draco3d.encoder': encoderModule,
      'draco3d.decoder': decoderModule,
    });

  // Combined outpost document
  const combinedDoc = await io.read(path.join(RAW_DIR, 'Habitat.glb'));
  const combinedScene = combinedDoc.getRoot().getDefaultScene() || combinedDoc.getRoot().listScenes()[0];
  for (const child of [...combinedScene.listChildren()]) {
    combinedScene.removeChild(child);
  }

  for (const cfg of NODE_LAYOUTS) {
    const rawPath = path.join(RAW_DIR, `${cfg.name}.glb`);
    const doc = await io.read(rawPath);
    const root = doc.getRoot();
    const scene = root.getDefaultScene() || root.listScenes()[0];

    // Wrap all scene children under a single top-level node named exactly `cfg.name`
    const namedRoot = doc.createNode(cfg.name);
    for (const child of [...scene.listChildren()]) {
      scene.removeChild(child);
      namedRoot.addChild(child);
    }
    scene.addChild(namedRoot);

    await doc.transform(draco({ method: 'edgebreaker' }));
    const outPath = path.join(MODELS_DIR, `${cfg.name}.glb`);
    await io.write(outPath, doc);

    // Also add a named mesh node to combinedDoc so outpost.glb has all 7 required node names
    const meshes = root.listMeshes();
    const firstPrim = meshes[0]?.listPrimitives()[0];
    if (firstPrim) {
      const clonedMesh = combinedDoc.createMesh(cfg.name);
      const clonedPrim = combinedDoc.createPrimitive();
      const posAcc = firstPrim.getAttribute('POSITION');
      if (posAcc) {
        const newPos = combinedDoc
          .createAccessor(`${cfg.name}_POSITION`)
          .setType('VEC3')
          .setArray(new Float32Array(posAcc.getArray()));
        clonedPrim.setAttribute('POSITION', newPos);
      }
      const normAcc = firstPrim.getAttribute('NORMAL');
      if (normAcc) {
        const newNorm = combinedDoc
          .createAccessor(`${cfg.name}_NORMAL`)
          .setType('VEC3')
          .setArray(new Float32Array(normAcc.getArray()));
        clonedPrim.setAttribute('NORMAL', newNorm);
      }
      const idxAcc = firstPrim.getIndices();
      if (idxAcc) {
        const newIdx = combinedDoc
          .createAccessor(`${cfg.name}_INDICES`)
          .setType('SCALAR')
          .setArray(new Uint16Array(idxAcc.getArray()));
        clonedPrim.setIndices(newIdx);
      }
      clonedMesh.addPrimitive(clonedPrim);
      const node = combinedDoc
        .createNode(cfg.name)
        .setMesh(clonedMesh)
        .setTranslation(cfg.translation)
        .setScale(cfg.scale);
      combinedScene.addChild(node);
    }
  }

  await combinedDoc.transform(draco({ method: 'edgebreaker' }));
  await io.write(path.join(MODELS_DIR, 'outpost.glb'), combinedDoc);
  console.log('Built Draco-compressed .glb models in', MODELS_DIR);
}

function buildCrewSpriteAtlas() {
  // 5 astronauts (commander, engineer, doctor, botanist, pilot)
  // Each row = 15 frames of 32x48 px: idle(2), walk(4), worried(2), run(4), cheer(3)
  const frameW = 32;
  const frameH = 48;
  const cols = 15;

  const characters = [
    {
      id: 'commander',
      suitLight: '#FFFFFF',
      suitBase: '#E2E8F0',
      suitDark: '#94A3B8',
      trim: '#EF4444', // Red NASA command stripes
      accent: '#F59E0B', // Gold mission patch
      visorLight: '#FEF08A', // Reflective gold visor glint
      visorBase: '#F59E0B', // Apollo gold visor
      visorDark: '#B45309',
      packBase: '#64748B',
      packLight: '#22C55E', // Green status beacon
      boots: '#1E293B',
    },
    {
      id: 'engineer',
      suitLight: '#FB923C',
      suitBase: '#EA580C', // Hazard safety orange
      suitDark: '#9A3412',
      trim: '#1E293B', // Dark industrial trim
      accent: '#FBBF24', // Caution yellow
      visorLight: '#BAE6FD',
      visorBase: '#0284C7', // Polarized cobalt visor
      visorDark: '#0369A1',
      packBase: '#475569',
      packLight: '#F59E0B', // Amber warning beacon
      boots: '#0F172A',
    },
    {
      id: 'doctor',
      suitLight: '#67E8F9',
      suitBase: '#06B6D4', // Medical cyan
      suitDark: '#0E7490',
      trim: '#FFFFFF', // Pure white emergency bands
      accent: '#DC2626', // Red cross
      visorLight: '#E0F2FE',
      visorBase: '#38BDF8', // Soft sky blue visor
      visorDark: '#0284C7',
      packBase: '#94A3B8',
      packLight: '#38BDF8', // Blue life-support telemetry
      boots: '#334155',
    },
    {
      id: 'botanist',
      suitLight: '#86EFAC',
      suitBase: '#16A34A', // Biosphere emerald green
      suitDark: '#14532D',
      trim: '#FEF08A', // Gold leaf accents
      accent: '#A3E635', // Bio-lime
      visorLight: '#A7F3D0',
      visorBase: '#10B981', // Reflective emerald visor
      visorDark: '#047857',
      packBase: '#475569',
      packLight: '#10B981', // Green O2 bio-status
      boots: '#1E293B',
    },
    {
      id: 'pilot',
      suitLight: '#818CF8',
      suitBase: '#4F46E5', // Deep flight indigo
      suitDark: '#312E81',
      trim: '#C084FC', // Amethyst violet trim
      accent: '#F43F5E', // Nav indicator
      visorLight: '#FEF9C3',
      visorBase: '#EAB308', // High-contrast flight gold visor
      visorDark: '#854D0E',
      packBase: '#334155',
      packLight: '#EC4899', // Pink flight beacon
      boots: '#0F172A',
    },
  ];

  const png = new PNG({ width: frameW * cols, height: frameH * characters.length });
  const darkOutline = hexToRgba('#0B0F19');
  const shadowRgba = hexToRgba('#05070E', 120);

  const animFrames = [
    { anim: 'idle', idx: 0, bob: 0, stride: 0, armLeft: 0, armRight: 0, visorGlint: 0, alert: false, armsUp: false },
    { anim: 'idle', idx: 1, bob: -1, stride: 0, armLeft: 0, armRight: 0, visorGlint: 1, alert: false, armsUp: false },
    { anim: 'walk', idx: 0, bob: 0, stride: -2, armLeft: -2, armRight: 2, visorGlint: 0, alert: false, armsUp: false },
    { anim: 'walk', idx: 1, bob: -1, stride: -1, armLeft: -1, armRight: 1, visorGlint: 1, alert: false, armsUp: false },
    { anim: 'walk', idx: 2, bob: 0, stride: 2, armLeft: 2, armRight: -2, visorGlint: 0, alert: false, armsUp: false },
    { anim: 'walk', idx: 3, bob: -1, stride: 1, armLeft: 1, armRight: -1, visorGlint: 1, alert: false, armsUp: false },
    { anim: 'worried', idx: 0, bob: -1, stride: 0, armLeft: -1, armRight: -1, visorGlint: 0, alert: true, armsUp: false },
    { anim: 'worried', idx: 1, bob: -2, stride: 0, armLeft: -2, armRight: -2, visorGlint: 1, alert: true, armsUp: false },
    { anim: 'run', idx: 0, bob: -1, stride: -3, armLeft: -3, armRight: 3, visorGlint: 0, alert: true, armsUp: false },
    { anim: 'run', idx: 1, bob: -2, stride: -1, armLeft: -2, armRight: 2, visorGlint: 1, alert: true, armsUp: false },
    { anim: 'run', idx: 2, bob: -1, stride: 3, armLeft: 3, armRight: -3, visorGlint: 0, alert: true, armsUp: false },
    { anim: 'run', idx: 3, bob: -2, stride: 1, armLeft: 2, armRight: -2, visorGlint: 1, alert: true, armsUp: false },
    { anim: 'cheer', idx: 0, bob: -2, stride: 0, armLeft: 0, armRight: 0, visorGlint: 0, alert: false, armsUp: true },
    { anim: 'cheer', idx: 1, bob: -4, stride: 1, armLeft: 0, armRight: 0, visorGlint: 1, alert: false, armsUp: true },
    { anim: 'cheer', idx: 2, bob: -2, stride: 0, armLeft: 0, armRight: 0, visorGlint: 0, alert: false, armsUp: true },
  ];

  const framesJson = {};

  characters.forEach((char, row) => {
    framesJson[char.id] = { idle: [], walk: [], worried: [], run: [], cheer: [] };

    const cSuitLight = hexToRgba(char.suitLight);
    const cSuitBase = hexToRgba(char.suitBase);
    const cSuitDark = hexToRgba(char.suitDark);
    const cTrim = hexToRgba(char.trim);
    const cAccent = hexToRgba(char.accent);
    const cVisorLight = hexToRgba(char.visorLight);
    const cVisorBase = hexToRgba(char.visorBase);
    const cVisorDark = hexToRgba(char.visorDark);
    const cPackBase = hexToRgba(char.packBase);
    const cPackLight = hexToRgba(char.packLight);
    const cBoots = hexToRgba(char.boots);
    const cAlertVisor = hexToRgba('#EF4444');
    const cAlertGlint = hexToRgba('#FCA5A5');

    animFrames.forEach((f, col) => {
      const ox = col * frameW;
      const oy = row * frameH;
      const by = oy + f.bob;

      // 1. Lunar Ground Contact Shadow
      fillRect(png, ox + 6, oy + 43, 20, 3, shadowRgba);
      fillRect(png, ox + 8, oy + 44, 16, 2, shadowRgba);

      // 2. PLSS Life Support Backpack
      fillRect(png, ox + 8, by + 16, 16, 15, darkOutline);
      fillRect(png, ox + 9, by + 17, 14, 13, cPackBase);
      fillRect(png, ox + 11, by + 18, 4, 10, cSuitDark);
      fillRect(png, ox + 17, by + 18, 4, 10, cSuitDark);
      setPixel(png, ox + 22, by + 14, darkOutline);
      setPixel(png, ox + 22, by + 13, f.alert ? hexToRgba('#FF3B30') : cPackLight);
      setPixel(png, ox + 23, by + 13, f.alert ? hexToRgba('#FF8080') : cSuitLight);

      // 3. Rounded EVA Space Helmet
      fillRect(png, ox + 10, by + 4, 12, 14, darkOutline);
      fillRect(png, ox + 9, by + 6, 14, 10, darkOutline);
      fillRect(png, ox + 11, by + 5, 10, 12, cSuitBase);
      fillRect(png, ox + 10, by + 7, 12, 8, cSuitBase);
      fillRect(png, ox + 12, by + 5, 6, 2, cSuitLight);
      setPixel(png, ox + 13, by + 6, hexToRgba('#FFFFFF'));

      // 4. Apollo Gold / Reflective Curved Visor
      const vLight = f.alert ? cAlertGlint : cVisorLight;
      const vBase = f.alert ? cAlertVisor : cVisorBase;
      const vDark = f.alert ? hexToRgba('#991B1B') : cVisorDark;

      fillRect(png, ox + 11, by + 8, 10, 7, darkOutline);
      fillRect(png, ox + 12, by + 9, 8, 5, vBase);
      fillRect(png, ox + 12, by + 13, 8, 1, vDark);
      const glintX = f.visorGlint === 1 ? 13 : 14;
      fillRect(png, ox + glintX, by + 9, 3, 2, vLight);
      setPixel(png, ox + glintX, by + 9, hexToRgba('#FFFFFF'));

      // 5. Helmet-to-Suit Neck Ring
      fillRect(png, ox + 11, by + 17, 10, 2, darkOutline);
      fillRect(png, ox + 12, by + 17, 8, 1, cTrim);

      // 6. Pressurized Torso & Chest Pack
      fillRect(png, ox + 9, by + 18, 14, 14, darkOutline);
      fillRect(png, ox + 10, by + 19, 12, 12, cSuitBase);
      fillRect(png, ox + 9, by + 19, 3, 3, cTrim);
      fillRect(png, ox + 20, by + 19, 3, 3, cTrim);
      fillRect(png, ox + 12, by + 21, 8, 6, darkOutline);
      fillRect(png, ox + 13, by + 22, 6, 4, hexToRgba('#1E293B'));
      setPixel(png, ox + 14, by + 23, cAccent);
      setPixel(png, ox + 16, by + 23, f.alert ? hexToRgba('#EF4444') : hexToRgba('#10B981'));
      fillRect(png, ox + 10, by + 30, 12, 2, darkOutline);
      fillRect(png, ox + 11, by + 30, 10, 1, cBoots);
      fillRect(png, ox + 15, by + 30, 2, 2, cTrim);

      // 7. Padded Astronaut Arms & Reinforced Gloves
      if (f.armsUp) {
        fillRect(png, ox + 6, by + 10, 4, 11, darkOutline);
        fillRect(png, ox + 7, by + 11, 2, 9, cSuitBase);
        fillRect(png, ox + 6, by + 9, 4, 3, cBoots);
        fillRect(png, ox + 22, by + 10, 4, 11, darkOutline);
        fillRect(png, ox + 23, by + 11, 2, 9, cSuitBase);
        fillRect(png, ox + 22, by + 9, 4, 3, cBoots);
      } else {
        const leftArmY = by + 20 + f.armLeft;
        const rightArmY = by + 20 + f.armRight;

        fillRect(png, ox + 6, leftArmY, 4, 11, darkOutline);
        fillRect(png, ox + 7, leftArmY + 1, 2, 7, cSuitBase);
        fillRect(png, ox + 6, leftArmY + 2, 3, 2, cTrim);
        fillRect(png, ox + 6, leftArmY + 8, 4, 3, cBoots);

        fillRect(png, ox + 22, rightArmY, 4, 11, darkOutline);
        fillRect(png, ox + 23, rightArmY + 1, 2, 7, cSuitBase);
        fillRect(png, ox + 23, rightArmY + 2, 3, 2, cTrim);
        fillRect(png, ox + 22, rightArmY + 8, 4, 3, cBoots);
      }

      // 8. Pressurized EVA Legs & Joint Rings
      const leftLegX = ox + 10 + f.stride;
      const rightLegX = ox + 17 - f.stride;

      fillRect(png, leftLegX, by + 32, 5, 11, darkOutline);
      fillRect(png, leftLegX + 1, by + 33, 3, 9, cSuitBase);
      fillRect(png, leftLegX + 1, by + 36, 3, 1, cSuitDark);

      fillRect(png, rightLegX, by + 32, 5, 11, darkOutline);
      fillRect(png, rightLegX + 1, by + 33, 3, 9, cSuitBase);
      fillRect(png, rightLegX + 1, by + 36, 3, 1, cSuitDark);

      // 9. Heavy Lunar Surface Boots (Tread soles)
      fillRect(png, leftLegX - 1, by + 41, 7, 4, darkOutline);
      fillRect(png, leftLegX, by + 42, 5, 2, cBoots);
      fillRect(png, leftLegX - 1, by + 43, 7, 1, hexToRgba('#05070E'));

      fillRect(png, rightLegX - 1, by + 41, 7, 4, darkOutline);
      fillRect(png, rightLegX, by + 42, 5, 2, cBoots);
      fillRect(png, rightLegX - 1, by + 43, 7, 1, hexToRgba('#05070E'));

      framesJson[char.id][f.anim].push({
        x: ox,
        y: oy,
        w: frameW,
        h: frameH,
      });
    });
  });

  fs.writeFileSync(path.join(SPRITES_DIR, 'crew_atlas.png'), PNG.sync.write(png));
  fs.writeFileSync(
    path.join(SPRITES_DIR, 'crew_atlas.json'),
    JSON.stringify(
      {
        meta: {
          image: 'crew_atlas.png',
          size: { w: png.width, h: png.height },
          frameSize: { w: frameW, h: frameH },
          scale: 1,
          filter: 'NEAREST',
        },
        characters: framesJson,
      },
      null,
      2
    )
  );

  // Rover atlas: 4 frames of 64x32 px
  const roverPng = new PNG({ width: 64 * 4, height: 32 });
  const outline = hexToRgba('#1C1F3A');
  const roverBody = hexToRgba('#FFF1C9');
  const roverAmber = hexToRgba('#FFB020');
  const roverCyan = hexToRgba('#35D0E6');
  const roverWheel = hexToRgba('#8A8D99');

  const roverFrames = [];
  for (let i = 0; i < 4; i++) {
    const ox = i * 64;
    const bounce = i % 2;
    fillRect(roverPng, ox + 10, 10 + bounce, 42, 12, outline);
    fillRect(roverPng, ox + 12, 12 + bounce, 38, 8, roverBody);
    fillRect(roverPng, ox + 36, 8 + bounce, 10, 6, roverCyan);
    fillRect(roverPng, ox + 16, 6 + bounce, 4, 6, roverAmber);
    // 3 wheels
    [14, 28, 42].forEach((wx) => {
      fillRect(roverPng, ox + wx, 21, 8, 8, outline);
      fillRect(roverPng, ox + wx + 1, 22, 6, 6, roverWheel);
    });
    roverFrames.push({ x: ox, y: 0, w: 64, h: 32 });
  }
  fs.writeFileSync(path.join(SPRITES_DIR, 'rover_atlas.png'), PNG.sync.write(roverPng));
  fs.writeFileSync(
    path.join(SPRITES_DIR, 'rover_atlas.json'),
    JSON.stringify(
      {
        meta: {
          image: 'rover_atlas.png',
          size: { w: 256, h: 32 },
          frameSize: { w: 64, h: 32 },
          filter: 'NEAREST',
        },
        animations: { drive: roverFrames },
      },
      null,
      2
    )
  );

  // SVG Logo & UI Icons
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="32" fill="#1C1F3A"/>
  <circle cx="128" cy="128" r="96" fill="none" stroke="#8E6CFF" stroke-width="6" stroke-dasharray="12 6"/>
  <path d="M52 176 Q128 140 204 176 L204 208 L52 208 Z" fill="#8A8D99"/>
  <path d="M88 168 A40 40 0 0 1 168 168 Z" fill="#FFF1C9" stroke="#35D0E6" stroke-width="4"/>
  <circle cx="184" cy="76" r="22" fill="#FFB020"/>
  <text x="128" y="234" text-anchor="middle" fill="#FFF1C9" font-family="monospace" font-weight="bold" font-size="18">MOONWATCH: SOL 214</text>
</svg>`;
  fs.writeFileSync(path.join(SPRITES_DIR, 'logo.svg'), logoSvg);

  console.log('Built sprite atlases and SVG logo in', SPRITES_DIR);
}

function buildAmbientWav() {
  // 4-second seamless space ambient pad at 11025 Hz 16-bit mono (~88 KB)
  const sampleRate = 11025;
  const durationSec = 4;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // Mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.25 * t);
    const wave =
      0.45 * Math.sin(2 * Math.PI * 110 * t) +
      0.3 * Math.sin(2 * Math.PI * 165 * t) +
      0.25 * Math.sin(2 * Math.PI * 220 * t);
    const sample = Math.max(-1, Math.min(1, wave * env * 0.25));
    buf.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  fs.writeFileSync(path.join(AUDIO_DIR, 'ambient.wav'), buf);
  console.log('Built ambient.wav in', AUDIO_DIR);
}

await buildDracoModels();
buildCrewSpriteAtlas();
buildAmbientWav();
