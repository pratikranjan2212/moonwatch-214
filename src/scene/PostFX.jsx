/**
 * @fileoverview HD-2D Post-Processing effects (Bloom, Tilt-Shift DepthOfField, Vignette).
 * Respects quality presets:
 * - 'high': Bloom + Tilt-Shift DepthOfField + Vignette
 * - 'medium': Bloom + Vignette
 * - 'low' or reducedMotion: disabled
 */

import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';

export function PostFX({ quality = 'high', reducedMotion = false, isFlare = false }) {
  if (quality === 'low' || reducedMotion) {
    return null;
  }

  return (
    <EffectComposer disableNormalPass multisampling={0}>
      <Bloom
        intensity={isFlare ? 1.25 : 0.75}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.3}
        mipmapBlur
      />
      {quality === 'high' && (
        <DepthOfField
          focusDistance={0.018}
          focalLength={0.035}
          bokehScale={2.2}
          height={360}
        />
      )}
      <Vignette eskil={false} offset={0.18} darkness={0.55} />
    </EffectComposer>
  );
}

export default PostFX;
