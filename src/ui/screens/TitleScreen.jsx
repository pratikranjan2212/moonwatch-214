// src/ui/screens/TitleScreen.jsx
import { useGameStore } from '../../store/useGameStore.js';
import LandingScreen from '../LandingScreen.jsx';

/**
 * Welcome / landing screen for MOONWATCH with full-width Title,
 * Lunar South Pole Shackleton hero, interactive modals, and store integration.
 */
export function TitleScreen() {
  const currentLevel = useGameStore((s) => s.game?.level) || 1;
  const startLevel = useGameStore((s) => s.startLevel);
  const setScreen = useGameStore((s) => s.setScreen);

  const handleStartMission = () => {
    startLevel(currentLevel, undefined, { screen: 'briefing' });
  };

  const handleExploreLevels = () => {
    setScreen('levels');
  };

  return (
    <LandingScreen
      onStartMission={handleStartMission}
      onExploreLevels={handleExploreLevels}
    />
  );
}

export default TitleScreen;
