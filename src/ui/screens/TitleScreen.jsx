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
  const data = useGameStore((s) => s.data);
  const reducedMotion = useGameStore((s) => Boolean(s.settings?.reducedMotion));
  const startLevel = useGameStore((s) => s.startLevel);
  const setScreen = useGameStore((s) => s.setScreen);

  const [selectedLevel, setSelectedLevel] = useState(currentLevel);
  const [modalTab, setModalTab] = useState(null);

  const selectedLevelConfig =
    LEVEL_LIST.find((lvl) => lvl.level === selectedLevel) || LEVEL_LIST[0];

  const feedLabel = data?.loading
    ? 'SUN WEATHER: LOADING...'
    : data?.eventSource === 'live'
      ? 'NASA SUN WEATHER: LIVE'
      : 'NASA SUN WEATHER: READY';

  const feedSubdetail = data?.loading
    ? 'Checking the latest space weather reports from NASA...'
    : data?.eventSource === 'live'
      ? `Real NASA Sun storm reports are loaded (${data?.externalEvents?.length || 0} space events).`
      : 'Built-in NASA Sun storm adventure report is ready to play offline!';

  const handleStartMission = () => {
    startLevel(selectedLevel, undefined, { screen: 'briefing' });
  };

  const handleStartTutorial = () => {
    startLevel(selectedLevel, undefined, { screen: 'tutorial' });
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
        onStartMission={handleStartMission}
        onStartTutorial={handleStartTutorial}
        feedLabel={feedLabel}
        feedSubdetail={feedSubdetail}
      />
    </>
  );
}

export default TitleScreen;
