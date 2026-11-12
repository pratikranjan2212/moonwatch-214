import { useEffect, useRef } from 'react';
import soundManager from './audio/soundManager.js';
import { loadSpaceWeatherEvents } from './data/donkiClient.js';
import { saveRunResult } from './data/supabaseClient.js';
import Diorama from './scene/Diorama.jsx';
import useGameStore from './store/useGameStore.js';
import BriefingScreen from './ui/screens/BriefingScreen.jsx';
import DebriefScreen from './ui/screens/DebriefScreen.jsx';
import GameScreen from './ui/screens/GameScreen.jsx';
import SettingsScreen from './ui/screens/SettingsScreen.jsx';
import TitleScreen from './ui/screens/TitleScreen.jsx';
import TutorialScreen from './ui/screens/TutorialScreen.jsx';
import './ui/styles.css';

const OXYGEN_LEVEL_ORDER = ['low', 'normal', 'high'];

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
  const lastSavedRunKeyRef = useRef(null);

  useEffect(() => {
    soundManager.syncSettings({ volume, muted });
  }, [volume, muted]);

  // Trigger ambient audio on game screen and outcome cues on debrief
  useEffect(() => {
    if (screen === 'game') {
      soundManager.startAmbient();
    } else if (screen === 'title') {
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

  // Save anonymous run telemetry when a run finishes (silent fallback when offline/Supabase off)
  useEffect(() => {
    if (screen !== 'debrief' || (status !== 'won' && status !== 'lost')) {
      return;
    }
    const runKey = `${level}:${seed}:${status}:${solsSurvived}`;
    if (lastSavedRunKeyRef.current === runKey) {
      return;
    }
    lastSavedRunKeyRef.current = runKey;
    saveRunResult({
      level,
      seed,
      event_source: eventSource,
      outcome: status,
      sols_survived: solsSurvived,
      primary_cause: primaryCause,
    }).catch(() => null);
  }, [screen, status, level, seed, solsSurvived, eventSource, primaryCause]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const state = useGameStore.getState();
      if (state.ui?.screen !== 'game') return;
      if (state.ui?.sol214Open || state.ui?.activeAlert) return;

      const tag = event.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      const key = event.key;
      const lower = key.toLowerCase();
      const choices = state.game?.choices || {};

      if (key === '1' || lower === 'p') {
        event.preventDefault();
        soundManager.play('motor');
        state.setChoice('panelsOut', !choices.panelsOut);
      } else if (key === '2' || lower === 's') {
        event.preventDefault();
        soundManager.play('click');
        state.setChoice('shieldOn', !choices.shieldOn);
      } else if (key === '3' || lower === 'o') {
        event.preventDefault();
        soundManager.play('click');
        const idx = OXYGEN_LEVEL_ORDER.indexOf(choices.oxygenLevel || 'normal');
        const nextLevel = OXYGEN_LEVEL_ORDER[(idx + 1) % OXYGEN_LEVEL_ORDER.length];
        state.setChoice('oxygenLevel', nextLevel);
      } else if ((key === '4' || lower === 'g') && (state.game?.level || 1) >= 2) {
        event.preventDefault();
        soundManager.play('click');
        const nextActive = !(choices.waterGreenhouse || choices.tendGreenhouse);
        state.setChoice({ waterGreenhouse: nextActive, tendGreenhouse: nextActive });
      } else if ((key === '5' || lower === 'c') && (state.game?.level || 1) >= 3) {
        event.preventDefault();
        soundManager.play('click');
        state.setChoice('queueComms', !choices.queueComms);
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
      {screen === 'title' && <TitleScreen />}
      {screen === 'briefing' && <BriefingScreen />}
      {screen === 'tutorial' && <TutorialScreen />}
      {screen === 'game' && <GameScreen SceneComponent={SceneComponent} />}
      {screen === 'debrief' && <DebriefScreen />}
      {screen === 'settings' && <SettingsScreen />}
    </div>
  );
}
