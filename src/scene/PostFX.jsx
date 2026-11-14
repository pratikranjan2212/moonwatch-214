/**
 * @fileoverview HD-2D Post-Processing effects (Bloom, Tilt-Shift DepthOfField, Vignette).
 * Respects quality presets:
 * - 'high': Bloom + Tilt-Shift DepthOfField + Vignette
 * - 'medium': Bloom + Vignette
 * - 'low' or reducedMotion: disabled
 */

import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';

export function PostFX({
  quality = 'high',
  reducedMotion = false,
  isFlare = false,
  focusTarget = [0.2, 0.6, 0.0],
}) {
  if (quality === 'low' || reducedMotion) {
    return null;
  }

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={isFlare ? 1.1 : 0.55}
        luminanceThreshold={0.82}
        luminanceSmoothing={0.25}
        mipmapBlur
      />
      {quality === 'high' && (
        <DepthOfField
          target={focusTarget}
          worldFocusRange={20}
          focalLength={0.045}
          bokehScale={0.65}
        />
      )}
      <Vignette eskil={false} offset={0.2} darkness={0.45} />
    </EffectComposer>
  );
}

export default PostFX;
