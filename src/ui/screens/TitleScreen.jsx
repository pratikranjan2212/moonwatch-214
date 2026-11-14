import { useState } from 'react';
import { LEVEL_LIST } from '../../engine/levels.js';
import { useGameStore } from '../../store/useGameStore.js';
import HeroSection from '../landing/HeroSection.jsx';
import ProgramModal from '../landing/ProgramModal.jsx';
import '../landing/landing.css';

/**
 * Welcome / landing screen for MOONWATCH replacing the legacy title card
 * with the Bayer-dithered pixel Moon hero and editorial mission modal while
 * preserving full store integration (campaigns, seed, tutorial, settings).
 */
export function TitleScreen() {
  const currentLevel = useGameStore((s) => s.game?.level) || 1;
  const currentSeed = useGameStore((s) => s.game?.seed) || 2142026;
  const data = useGameStore((s) => s.data);
  const reducedMotion = useGameStore((s) => Boolean(s.settings?.reducedMotion));
  const startLevel = useGameStore((s) => s.startLevel);
  const setScreen = useGameStore((s) => s.setScreen);

  const [selectedLevel, setSelectedLevel] = useState(currentLevel);
  const [seedInput, setSeedInput] = useState(String(currentSeed));
  const [modalTab, setModalTab] = useState(null);

  const selectedLevelConfig =
    LEVEL_LIST.find((lvl) => lvl.level === selectedLevel) || LEVEL_LIST[0];

  const feedLabel = data?.loading
    ? 'DONKI: SYNCING...'
    : data?.eventSource === 'live'
      ? 'DONKI: LIVE FEED'
      : 'DONKI: SOL 214 SNAPSHOT';

  const feedSubdetail = data?.loading
    ? 'Connecting to NASA DONKI space weather feed...'
    : data?.eventSource === 'live'
      ? `Live NASA DONKI telemetry active (${data?.externalEvents?.length || 0} events mapped).`
      : `Offline curated snapshot active (${data?.activeSnapshotName || 'Sol 214 sequence'}).`;

  const getCleanSeed = () => (seedInput.trim() !== '' ? seedInput.trim() : undefined);

  const handleStartMission = () => {
    startLevel(selectedLevel, getCleanSeed(), { screen: 'briefing' });
  };

  const handleStartTutorial = () => {
    startLevel(selectedLevel, getCleanSeed(), { screen: 'tutorial' });
  };

  const handleRandomizeSeed = () => {
    const nextSeed = Math.floor(100000 + Math.random() * 899999);
    setSeedInput(String(nextSeed));
  };

  return (
    <>
      <HeroSection
        onOpenModal={setModalTab}
        onStartTutorial={handleStartTutorial}
        onOpenSettings={() => setScreen('settings')}
        missionCount={LEVEL_LIST.length}
        selectedTargetSols={selectedLevelConfig.targetSols}
        feedLabel={feedLabel}
        reducedMotion={reducedMotion}
      />

      <ProgramModal
        activeTab={modalTab}
        onClose={() => setModalTab(null)}
        onSwitchTab={setModalTab}
        selectedLevel={selectedLevel}
        onSelectLevel={setSelectedLevel}
        seedInput={seedInput}
        onChangeSeed={setSeedInput}
        onRandomizeSeed={handleRandomizeSeed}
        onStartMission={handleStartMission}
        onStartTutorial={handleStartTutorial}
        feedLabel={feedLabel}
        feedSubdetail={feedSubdetail}
      />
    </>
  );
}

export default TitleScreen;
