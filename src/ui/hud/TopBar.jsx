import { getLevelConfig } from '../../engine/levels.js';
import useGameStore from '../../store/useGameStore.js';
import { useFullscreen } from '../../utils/fullscreen.js';
import { AstraPlanetBadge } from '../landing/Icons.jsx';

export function TopBar({ hudHidden = false, onToggleHud = null }) {
  const game = useGameStore((s) => s.game);
  const setScreen = useGameStore((s) => s.setScreen);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const setCameraMode = useGameStore((s) => s.setCameraMode);
  const { isFullscreen, supported: fullscreenSupported, toggleFullscreen } = useFullscreen();

  const sol = game?.sol || 1;
  const targetSols = game?.targetSols || 14;
  const missionSol = game?.missionSol || 207 + sol;
  const levelNum = game?.level || 1;
  const levelConfig = getLevelConfig(levelNum);

  return (
    <header className="topbar" role="banner">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-brand-btn"
          onClick={() => setScreen('title')}
          title="Return to Welcome Screen"
          aria-label="Return to MOONWATCH Welcome Screen"
        >
          <AstraPlanetBadge className="topbar-brand-badge" />
          <span className="brand-pill">MOONWATCH</span>
        </button>

        <div className="sol-counter-box" aria-label={`Day ${sol} of ${targetSols}, Mission Day ${missionSol}`}>
          <span className="sol-primary">
            Day {sol} / {targetSols}
          </span>
          <span className="sol-mission">Mission Day {missionSol}</span>
        </div>

        <div className="level-badge">
          Level {levelConfig.id}: {levelConfig.name}
        </div>
      </div>

      <div className="topbar-right">
        <div className="camera-mode-group" role="group" aria-label="Camera View Mode (Shortcut V)">
          {[
            { id: 'orbit', label: 'ORBIT', title: 'Top-Down Orbit Camera [V]' },
            { id: 'tpp', label: 'TPP', title: 'Third-Person Follow View [V]' },
            { id: 'fpp', label: 'FPP', title: 'First-Person Astronaut View [V]' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`camera-mode-btn ${cameraMode === mode.id ? 'camera-mode-btn--active' : ''}`}
              onClick={() => setCameraMode(mode.id)}
              aria-pressed={cameraMode === mode.id}
              title={mode.title}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {fullscreenSupported && (
          <button
            type="button"
            className={`btn btn-sm ${isFullscreen ? 'topbar-hud-toggle--active' : 'btn-ghost'}`}
            onClick={() => toggleFullscreen()}
            aria-pressed={isFullscreen}
            title="Toggle Browser Fullscreen [F]"
          >
            <span aria-hidden="true">⛶</span>
            <span>{isFullscreen ? 'Exit Full [F]' : 'Fullscreen [F]'}</span>
          </button>
        )}

        {onToggleHud && (
          <button
            type="button"
            className={`btn topbar-hud-toggle ${hudHidden ? 'topbar-hud-toggle--active' : 'btn-ghost'}`}
            onClick={onToggleHud}
            aria-pressed={hudHidden}
            title="Toggle Full-Screen 3D Exploration View [H]"
          >
            <span>{hudHidden ? 'Show HUD [H]' : 'Clear View [H]'}</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setScreen('settings')}
          aria-label="Open Settings"
          title="Accessibility, Audio & Quality Settings"
        >
          <span aria-hidden="true">⚙</span>
          <span>Settings</span>
        </button>
      </div>
    </header>
  );
}

export default TopBar;
