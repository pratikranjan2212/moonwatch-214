/**
 * @fileoverview Howler.js audio manager for MOONWATCH: Sol 214.
 * Lazily initializes audio only after first user interaction and respects
 * store `volume` and `muted` settings. Fails silently when offline or in headless tests.
 */

import { Howl, Howler } from 'howler';

const SOUND_PATHS = {
  click: '/audio/click.ogg',
  warning: '/audio/warning.ogg',
  siren: '/audio/siren.ogg',
  flare: '/audio/flare.ogg',
  dust: '/audio/dust.ogg',
  cheer: '/audio/cheer.ogg',
  motor: '/audio/motor.ogg',
  ambient: '/audio/ambient.wav',
};

class SoundManager {
  constructor() {
    this.sounds = {};
    this.unlocked = false;
    this.ambientPlaying = false;
    this.volume = 0.8;
    this.muted = false;
  }

  unlock() {
    if (this.unlocked || typeof window === 'undefined') return;
    this.unlocked = true;
    try {
      Howler.volume(this.muted ? 0 : this.volume);
    } catch {
      // Ignore in non-audio headless environments
    }
  }

  syncSettings({ volume = 0.8, muted = false } = {}) {
    this.volume = Math.max(0, Math.min(1, Number(volume) || 0));
    this.muted = Boolean(muted);
    try {
      Howler.mute(this.muted);
      Howler.volume(this.volume);
    } catch {
      // Ignore in non-audio environments
    }
  }

  getHowl(key) {
    if (typeof window === 'undefined' || !SOUND_PATHS[key]) return null;
    if (!this.sounds[key]) {
      const isAmbient = key === 'ambient';
      this.sounds[key] = new Howl({
        src: [SOUND_PATHS[key]],
        loop: isAmbient,
        volume: isAmbient ? 0.35 : 0.75,
        preload: true,
        onloaderror: () => {},
        onplayerror: () => {},
      });
    }
    return this.sounds[key];
  }

  play(key) {
    if (this.muted || typeof window === 'undefined') return;
    this.unlock();
    try {
      const sound = this.getHowl(key);
      if (sound) {
        sound.play();
      }
    } catch {
      // Silent fallback
    }
  }

  startAmbient() {
    if (this.muted || this.ambientPlaying || typeof window === 'undefined') return;
    this.unlock();
    try {
      const ambient = this.getHowl('ambient');
      if (ambient && !ambient.playing()) {
        ambient.play();
        this.ambientPlaying = true;
      }
    } catch {
      // Silent fallback
    }
  }

  stopAmbient() {
    try {
      const ambient = this.sounds.ambient;
      if (ambient) {
        ambient.stop();
      }
      this.ambientPlaying = false;
    } catch {
      // Silent fallback
    }
  }
}

export const soundManager = new SoundManager();
export default soundManager;
