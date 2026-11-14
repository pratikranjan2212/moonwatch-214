// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './ui/missionDeck.css';
import Parallax2D from './scene/Parallax2D.jsx';
import SpriteActor from './scene/SpriteActor.jsx';
import MissionHUD from './ui/MissionHUD.jsx';
import LandingScreen from './ui/LandingScreen.jsx';
import WelcomeScreen from './ui/WelcomeScreen.jsx';
import BriefingScreen, { CREW_ROSTER } from './ui/BriefingScreen.jsx';
import PauseModal from './ui/PauseModal.jsx';
import useFpsMonitor from './engine/useFpsMonitor.js';

const O2_CYCLE = ['LOW', 'NORMAL', 'HIGH'];
const LEVEL_SOLS = { 1: 14, 2: 21, 3: 28 };

export default function App() {
  // 4-step screen flow: 'HOME' -> 'LEVELS' -> 'BRIEFING' -> 'PLAYING'
  const [screen, setScreen] = useState('HOME');
  const [level, setLevel] = useState(1);
  const [selectedCharacter, setSelectedCharacter] = useState(CREW_ROSTER[0]);
  const [isPaused, setIsPaused] = useState(false);

  const [sol, setSol] = useState(1);
  const [countdown, setCountdown] = useState(30);

  // Station states
  const [solarExtended, setSolarExtended] = useState(true);
  const [shieldActive, setShieldActive] = useState(false);
  const [oxygenLevel, setOxygenLevel] = useState('NORMAL');
  const [greenhouseActive, setGreenhouseActive] = useState(false);
  const [commsQueued, setCommsQueued] = useState(false);
  const [activeStation, setActiveStation] = useState('OXYGEN');

  // Space-Weather Alert & Accessibility states
  const [alertModal, setAlertModal] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [graphicsPreset, setGraphicsPreset] = useState('HIGH');

  const fps = useFpsMonitor(graphicsPreset, setGraphicsPreset);
  const maxSol = LEVEL_SOLS[level] || 14;

  // Resets all mission stations & timers to Sol 1 defaults
  const resetMissionState = useCallback(() => {
    setSol(1);
    setCountdown(30);
    setSolarExtended(true);
    setShieldActive(false);
    setOxygenLevel('NORMAL');
    setGreenhouseActive(false);
    setCommsQueued(false);
    setActiveStation('OXYGEN');
    setAlertModal(null);
    setIsPaused(false);
  }, []);

  const handleStartGame = () => {
    resetMissionState();
    setScreen('PLAYING');
  };

  const handleRestartMission = () => {
    resetMissionState();
  };

  const handleExitToWelcome = () => {
    resetMissionState();
    setScreen('HOME');
  };

  const handleAdvanceSol = useCallback(() => {
    if (isPaused) return;
    setSol((prev) => Math.min(prev + 1, maxSol));
    setCountdown(30);
  }, [isPaused, maxSol]);

  // Countdown freezes when not playing, when paused, or when Reduced Motion is active
  useEffect(() => {
    if (screen !== 'PLAYING' || isPaused || reducedMotion) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleAdvanceSol();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, isPaused, reducedMotion, handleAdvanceSol]);

  return (
    <main
      className={`mission-root ${alertModal && !isPaused ? 'shake-active' : ''} ${
        reducedMotion ? 'reduced-motion' : ''
      }`}
    >
      <Parallax2D
        graphicsPreset={graphicsPreset}
        solarExtended={solarExtended}
        shieldActive={shieldActive}
        greenhouseActive={greenhouseActive}
        commsQueued={commsQueued}
      />

      {screen === 'HOME' && (
        <LandingScreen
          onStartMission={() => setScreen('LEVELS')}
        />
      )}

      {screen === 'LEVELS' && (
        <WelcomeScreen
          selectedLevel={level}
          onSelectLevel={setLevel}
          onStartMission={() => setScreen('BRIEFING')}
          onBackToHome={() => setScreen('HOME')}
          reducedMotion={reducedMotion}
          onToggleReducedMotion={() => setReducedMotion((v) => !v)}
          graphicsPreset={graphicsPreset}
          onChangeGraphics={setGraphicsPreset}
        />
      )}

      {screen === 'BRIEFING' && (
        <BriefingScreen
          selectedLevel={level}
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
          onBackToWelcome={() => setScreen('LEVELS')}
          onStartGame={handleStartGame}
        />
      )}

      {screen === 'PLAYING' && (
        <>
          <SpriteActor
            activeStation={activeStation}
            reducedMotion={reducedMotion}
            character={selectedCharacter}
          />

          <MissionHUD
            sol={sol}
            maxSol={maxSol}
            countdown={countdown}
            level={level}
            isPaused={isPaused}
            solarExtended={solarExtended}
            shieldActive={shieldActive}
            oxygenLevel={oxygenLevel}
            greenhouseActive={greenhouseActive}
            commsQueued={commsQueued}
            alertModal={alertModal}
            reducedMotion={reducedMotion}
            graphicsPreset={graphicsPreset}
            fps={fps}
            onTogglePause={() => setIsPaused((v) => !v)}
            onToggleSolar={() => {
              setSolarExtended((v) => !v);
              setActiveStation('SOLAR');
            }}
            onToggleShield={() => {
              setShieldActive((v) => !v);
              setActiveStation('SHIELD');
            }}
            onCycleOxygen={() => {
              setOxygenLevel((curr) => O2_CYCLE[(O2_CYCLE.indexOf(curr) + 1) % O2_CYCLE.length]);
              setActiveStation('OXYGEN');
            }}
            onToggleGreenhouse={() => {
              if (level >= 2) {
                setGreenhouseActive((v) => !v);
                setActiveStation('GREENHOUSE');
              }
            }}
            onToggleComms={() => {
              if (level >= 3) {
                setCommsQueued((v) => !v);
                setActiveStation('COMMS');
              }
            }}
            onAdvanceSol={handleAdvanceSol}
            onDismissAlert={() => setAlertModal(null)}
            onToggleReducedMotion={() => setReducedMotion((v) => !v)}
            onChangeGraphics={setGraphicsPreset}
          />

          {isPaused && (
            <PauseModal
              sol={sol}
              maxSol={maxSol}
              level={level}
              characterName={selectedCharacter.name}
              onResume={() => setIsPaused(false)}
              onRestart={handleRestartMission}
              onExit={handleExitToWelcome}
            />
          )}
        </>
      )}
    </main>
  );
}
