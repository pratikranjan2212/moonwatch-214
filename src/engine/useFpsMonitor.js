// src/engine/useFpsMonitor.js
import { useState, useEffect, useRef } from 'react';

export default function useFpsMonitor(graphicsPreset, setGraphicsPreset) {
  const [fps, setFps] = useState(60);
  const lowFpsStreak = useRef(0);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let rafId;

    const measure = (now) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - lastTime));
        setFps(currentFps);

        if (currentFps < 30) {
          lowFpsStreak.current += 1;
          if (lowFpsStreak.current >= 2) {
            if (graphicsPreset === 'HIGH') setGraphicsPreset('MEDIUM');
            else if (graphicsPreset === 'MEDIUM') setGraphicsPreset('LOW');
            lowFpsStreak.current = 0;
          }
        } else {
          lowFpsStreak.current = 0;
        }

        frameCount = 0;
        lastTime = now;
      }
      rafId = requestAnimationFrame(measure);
    };

    rafId = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafId);
  }, [graphicsPreset, setGraphicsPreset]);

  return fps;
}
