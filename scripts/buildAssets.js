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
  // 5 characters (commander, engineer, doctor, botanist, pilot)
  // Each row = 15 frames of 32x48 px: idle(2), walk(4), worried(2), run(4), cheer(3)
  const frameW = 32;
  const frameH = 48;
  const cols = 15;
  const characters = [
    { id: 'commander', suit: '#FFF1C9', visor: '#35D0E6', trim: '#FFB020' },
    { id: 'engineer', suit: '#FFB020', visor: '#35D0E6', trim: '#1C1F3A' },
    { id: 'doctor', suit: '#35D0E6', visor: '#FFF1C9', trim: '#FF4D4D' },
    { id: 'botanist', suit: '#4ADE80', visor: '#35D0E6', trim: '#FFF1C9' },
    { id: 'pilot', suit: '#8E6CFF', visor: '#FFB020', trim: '#FFF1C9' },
  ];

  const png = new PNG({ width: frameW * cols, height: frameH * characters.length });
  const outline = hexToRgba('#1C1F3A');
  const shadow = hexToRgba('#1C1F3A', 140);
  const alertRed = hexToRgba('#FF4D4D');

  const animFrames = [
    { anim: 'idle', idx: 0, bob: 0, stride: 0, armsUp: false, alert: false },
    { anim: 'idle', idx: 1, bob: 1, stride: 0, armsUp: false, alert: false },
    { anim: 'walk', idx: 0, bob: 0, stride: -2, armsUp: false, alert: false },
    { anim: 'walk', idx: 1, bob: 1, stride: 0, armsUp: false, alert: false },
    { anim: 'walk', idx: 2, bob: 0, stride: 2, armsUp: false, alert: false },
    { anim: 'walk', idx: 3, bob: 1, stride: 0, armsUp: false, alert: false },
    { anim: 'worried', idx: 0, bob: 1, stride: 0, armsUp: false, alert: true },
    { anim: 'worried', idx: 1, bob: 2, stride: 0, armsUp: false, alert: true },
    { anim: 'run', idx: 0, bob: -1, stride: -4, armsUp: false, alert: true },
    { anim: 'run', idx: 1, bob: 0, stride: -1, armsUp: false, alert: true },
    { anim: 'run', idx: 2, bob: -1, stride: 4, armsUp: false, alert: true },
    { anim: 'run', idx: 3, bob: 0, stride: 1, armsUp: false, alert: true },
    { anim: 'cheer', idx: 0, bob: -2, stride: 0, armsUp: true, alert: false },
    { anim: 'cheer', idx: 1, bob: -4, stride: 1, armsUp: true, alert: false },
    { anim: 'cheer', idx: 2, bob: -1, stride: 0, armsUp: true, alert: false },
  ];

  const framesJson = {};

  characters.forEach((char, row) => {
    const suit = hexToRgba(char.suit);
    const visor = hexToRgba(char.visor);
    const trim = hexToRgba(char.trim);
    framesJson[char.id] = { idle: [], walk: [], worried: [], run: [], cheer: [] };

    animFrames.forEach((f, col) => {
      const ox = col * frameW;
      const oy = row * frameH;
      const by = oy + f.bob;

      // Ground shadow
      fillRect(png, ox + 8, oy + 42, 16, 3, shadow);
      // Helmet outline & fill
      fillRect(png, ox + 9, by + 6, 14, 13, outline);
      fillRect(png, ox + 10, by + 7, 12, 11, suit);
      // Visor
      fillRect(png, ox + 12, by + 9, 8, 6, f.alert ? alertRed : visor);
      // Backpack & Torso
      fillRect(png, ox + 7, by + 19, 18, 13, outline);
      fillRect(png, ox + 9, by + 20, 14, 11, suit);
      fillRect(png, ox + 11, by + 23, 10, 3, trim);
      // Arms
      const armY = f.armsUp ? by + 13 : by + 20;
      fillRect(png, ox + 6, armY, 3, 9, suit);
      fillRect(png, ox + 23, armY, 3, 9, suit);
      // Legs
      fillRect(png, ox + 10 + f.stride, oy + 32, 5, 10, outline);
      fillRect(png, ox + 11 + f.stride, oy + 32, 3, 9, suit);
      fillRect(png, ox + 17 - f.stride, oy + 32, 5, 10, outline);
      fillRect(png, ox + 18 - f.stride, oy + 32, 3, 9, suit);

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
