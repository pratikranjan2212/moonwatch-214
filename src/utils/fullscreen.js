/**
 * @fileoverview Cross-browser Fullscreen API helpers and React hook.
 */

import { useEffect, useState } from 'react';

export function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  const root = document.documentElement;
  return Boolean(root?.requestFullscreen || root?.webkitRequestFullscreen);
}

/**
 * Toggles document-level browser fullscreen cleanly.
 * Returns `true` if a fullscreen change call succeeded, `false` otherwise.
 */
export async function toggleBrowserFullscreen() {
  if (typeof document === 'undefined') return false;
  try {
    if (getFullscreenElement()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      return true;
    }

    const root = document.documentElement;
    if (root?.requestFullscreen) {
      await root.requestFullscreen();
      return true;
    }
    if (root?.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      return true;
    }
  } catch {
    // Fullscreen can be declined by browser permissions policy; fail cleanly
  }
  return false;
}

/**
 * Subscribes a React component to live browser fullscreen state.
 */
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(getFullscreenElement()));
  const supported = isFullscreenSupported();

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const sync = () => setIsFullscreen(Boolean(getFullscreenElement()));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  return {
    isFullscreen,
    supported,
    toggleFullscreen: toggleBrowserFullscreen,
  };
}
