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
/**
 * Detects touch-first / coarse-pointer viewports (phones & tablets) without UA sniffing.
 * Leaves desktop mice untouched while matching mobile browsers cleanly.
 *
 * @param {Window|null} [win]
 * @param {Navigator|null} [nav]
 * @returns {boolean}
 */
export function isCoarseTouchDevice(
  win = typeof window !== 'undefined' ? window : null,
  nav = typeof navigator !== 'undefined' ? navigator : null
) {
  if (!win && !nav) return false;
  const matchMedia = typeof win?.matchMedia === 'function' ? win.matchMedia.bind(win) : null;
  const coarsePrimary = Boolean(matchMedia && matchMedia('(pointer: coarse)').matches);
  const coarseAny = Boolean(matchMedia && matchMedia('(any-pointer: coarse)').matches);
  const hoverNone = Boolean(matchMedia && matchMedia('(hover: none)').matches);
  if (coarsePrimary || (hoverNone && coarseAny)) {
    return true;
  }

  const touchPoints = Number(nav?.maxTouchPoints ?? nav?.msMaxTouchPoints ?? 0);
  const narrowViewport = typeof win?.innerWidth === 'number' ? win.innerWidth <= 1080 : false;
  return touchPoints > 0 && narrowViewport;
}

/**
 * Enters browser fullscreen idempotently without toggling back out if already active.
 * Must be called synchronously inside a real user-gesture handler on Android/mobile browsers.
 *
 * @param {Document|null} [doc]
 * @returns {Promise<boolean>}
 */
export async function enterBrowserFullscreen(
  doc = typeof document !== 'undefined' ? document : null
) {
  if (!doc) return false;
  try {
    const active =
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement ||
      null;
    if (active) return true;

    const root = doc.documentElement;
    if (root?.requestFullscreen) {
      await root.requestFullscreen();
      return true;
    }
    if (root?.webkitRequestFullscreen) {
      root.webkitRequestFullscreen();
      return true;
    }
    if (root?.msRequestFullscreen) {
      root.msRequestFullscreen();
      return true;
    }
  } catch {
    // Fullscreen can be declined by browser permissions policy; fail cleanly
  }
  return false;
}

/**
 * Enters fullscreen automatically when starting play on mobile / touch devices.
 *
 * @returns {Promise<boolean>}
 */
export function enterMobileFullscreen(
  win = typeof window !== 'undefined' ? window : null,
  nav = typeof navigator !== 'undefined' ? navigator : null,
  doc = typeof document !== 'undefined' ? document : null
) {
  if (!isCoarseTouchDevice(win, nav)) {
    return Promise.resolve(false);
  }
  return enterBrowserFullscreen(doc);
}

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
