// src/App.jsx
import { useEffect, useRef, useState } from 'react';
import soundManager from './audio/soundManager.js';
import { loadSpaceWeatherEvents } from './data/donkiClient.js';
import { saveRunResult } from './data/supabaseClient.js';
import { recordMissionProgress } from './data/userProfileManager.js';
import Diorama from './scene/Diorama.jsx';
import useGameStore from './store/useGameStore.js';
import LandingScreen from './ui/LandingScreen.jsx';
import WelcomeScreen from './ui/WelcomeScreen.jsx';
import BriefingScreen from './ui/screens/BriefingScreen.jsx';
import DebriefScreen from './ui/screens/DebriefScreen.jsx';
import GameScreen from './ui/screens/GameScreen.jsx';
import SettingsScreen from './ui/screens/SettingsScreen.jsx';
import TutorialScreen from './ui/screens/TutorialScreen.jsx';
import { toggleBrowserFullscreen } from './utils/fullscreen.js';
import './ui/styles.css';
import './ui/missionDeck.css';

export default function App({ SceneComponent = Diorama }) {
  const screen = useGameStore((s) => s.ui?.screen) || 'title';
  const status = useGameStore((s) => s.game?.status) || 'playing';
  const level = useGameStore((s) => s.game?.level) || 1;
  const seed = useGameStore((s) => s.game?.seed) || 2142026;
  const solsSurvived = useGameStore((s) => s.game?.solsSurvived) ?? 0;
  const eventSource = useGameStore((s) => s.data?.eventSource) || 'snapshot';
  const primaryCause = useGameStore((s) => s.debrief?.primaryCause) || 'none';
  const colourBlind = useGameStore((s) => s.settings?.colourBlind) || false;
  const reducedMotion = useGameStore((s) => s.settings?.reducedMotion) || false;
  const volume = useGameStore((s) => s.settings?.volume) ?? 0.8;
  const muted = useGameStore((s) => s.settings?.muted) || false;
  const quality = useGameStore((s) => s.settings?.quality) || 'high';

  const setScreen = useGameStore((s) => s.setScreen);
  const startLevel = useGameStore((s) => s.startLevel);
  const updateSettings = useGameStore((s) => s.updateSettings);

  const [selectedLevel, setSelectedLevel] = useState(level);

  // Keep local selectedLevel in sync when store level updates
  useEffect(() => {
    if (level) setSelectedLevel(level);
  }, [level]);

  const lastSavedRunKeyRef = useRef(null);

  useEffect(() => {
    soundManager.syncSettings({ volume, muted });
  }, [volume, muted]);

  // Trigger ambient audio on game screen and outcome cues on debrief
  useEffect(() => {
    if (screen === 'game') {
      soundManager.startAmbient();
    } else if (screen === 'title' || screen === 'levels') {
      soundManager.stopAmbient();
    } else if (screen === 'debrief') {
      if (status === 'won') {
        soundManager.play('cheer');
      } else if (status === 'lost') {
        soundManager.play('warning');
      }
    }
  }, [screen, status]);

  // Load NASA DONKI events on startup with 3s timeout fallback to bundled snapshots
  useEffect(() => {
    let active = true;
    loadSpaceWeatherEvents({ timeoutMs: 3000 })
      .then((result) => {
        if (!active || !result) return;
        useGameStore.getState().setExternalEvents(result.events, {
          eventSource: result.source,
          loading: false,
          activeSnapshotName: result.snapshotTitle,
        });
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  // Save run telemetry and record Cadet career progress when a run finishes
  useEffect(() => {
    if (screen !== 'debrief' || (status !== 'won' && status !== 'lost')) {
      return;
    }
    const runKey = `${level}:${seed}:${status}:${solsSurvived}`;
    if (lastSavedRunKeyRef.current === runKey) {
      return;
    }
    lastSavedRunKeyRef.current = runKey;

    // Anonymous Supabase telemetry
    saveRunResult({
      level,
      seed,
      event_source: eventSource,
      outcome: status,
      sols_survived: solsSurvived,
      primary_cause: primaryCause,
    }).catch(() => null);

    // Persist Cadet career stats locally
    recordMissionProgress({
      level,
      solsSurvived,
      victory: status === 'won',
    });
  }, [screen, status, level, seed, solsSurvived, eventSource, primaryCause]);

  // Keyboard navigation & game controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      const state = useGameStore.getState();
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const key = event.key;
      const lower = key.toLowerCase();

      if (lower === 'f' && !event.repeat && !state.ui?.sol214Open && !state.ui?.activeAlert) {
        event.preventDefault();
        soundManager.play('click');
        toggleBrowserFullscreen();
        return;
      }

      if (state.ui?.screen !== 'game') return;
      if (state.ui?.sol214Open || state.ui?.activeAlert) return;

      if (lower === 'e' && !event.repeat) {
        event.preventDefault();
        const res = state.interactWithStation?.();
        if (res?.sound) {
          soundManager.play(res.sound);
        } else if (!res?.ok) {
          soundManager.play('click');
        }
      } else if (lower === 'v' && !event.repeat) {
        event.preventDefault();
        soundManager.play('click');
        state.cycleCameraMode?.();
      } else if ((key === ' ' || key === 'Enter') && tag !== 'button') {
        event.preventDefault();
        soundManager.play('click');
        state.advanceSol();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rootClasses = [
    'moonwatch-app',
    colourBlind ? 'colour-blind' : '',
    reducedMotion ? 'reduced-motion' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div id="moonwatch-app" className={rootClasses}>
      {(screen === 'title' || screen === 'HOME') && (
        <LandingScreen
          onStartMission={() => {
            startLevel(selectedLevel || 1, undefined, { screen: 'briefing' });
          }}
          onExploreLevels={() => {
            setScreen('levels');
          }}
        />
      )}

      {(screen === 'levels' || screen === 'LEVELS') && (
        <WelcomeScreen
          selectedLevel={selectedLevel}
          onSelectLevel={(lvl) => {
            setSelectedLevel(lvl);
            startLevel(lvl, undefined, { screen: 'levels' });
          }}
          onStartMission={(lvl) => {
            const target = lvl || selectedLevel || 1;
            startLevel(target, undefined, { screen: 'briefing' });
          }}
          onBackToHome={() => setScreen('title')}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => updateSettings({ reducedMotion: !reducedMotion })}
          graphicsPreset={quality?.toUpperCase() || 'HIGH'}
          onChangeGraphics={(preset) => updateSettings({ quality: preset.toLowerCase() })}
        />
      )}

      {screen === 'briefing' && <BriefingScreen />}
      {screen === 'tutorial' && <TutorialScreen />}
      {screen === 'game' && <GameScreen SceneComponent={SceneComponent} />}
      {screen === 'debrief' && <DebriefScreen />}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  );
}
