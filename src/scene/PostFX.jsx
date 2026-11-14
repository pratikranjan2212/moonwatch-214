/**
 * @fileoverview HD-2D Post-Processing effects (Restrained Bloom, Crisp Optics, Vignette).
 * Respects quality presets:
 * - 'high': Restrained Bloom + Vignette
 * - 'medium': Restrained Bloom + Vignette
 * - 'low' or reducedMotion: disabled
 *
 * Eliminates excessive depth-of-field blur to ensure celestial objects (Sun, Earth)
 * and starry sky elements remain crisp and distinguishable rather than blurry blobs.
 */

import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

export function PostFX({
  quality = 'high',
  reducedMotion = false,
  isFlare = false,
}) {
  if (quality === 'low' || reducedMotion) {
    return null;
  }

  return (
    <EffectComposer multisampling={4}>
      {/* Restrained bloom to create a natural glowing optical effect for stars and Sun */}
      <Bloom
        intensity={isFlare ? 0.95 : 0.48}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.25}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.2} darkness={0.42} />
    </EffectComposer>
  );
}

export default PostFX;
