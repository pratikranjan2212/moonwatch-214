import { getLevelConfig } from '../../engine/levels.js';
import useGameStore from '../../store/useGameStore.js';
import { AstraPlanetBadge } from '../landing/Icons.jsx';

export function TopBar({ hudHidden = false, onToggleHud = null }) {
  const game = useGameStore((s) => s.game);
  const data = useGameStore((s) => s.data);
  const setScreen = useGameStore((s) => s.setScreen);

  const sol = game?.sol || 1;
  const targetSols = game?.targetSols || 14;
  const missionSol = game?.missionSol || 207 + sol;
  const levelNum = game?.level || 1;
  const levelConfig = getLevelConfig(levelNum);

  const isLive = data?.eventSource === 'live';
  const snapshotName = data?.activeSnapshotName || 'May 2024 Solar Storm';

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

        <div className="sol-counter-box" aria-label={`Sol ${sol} of ${targetSols}, Mission Sol ${missionSol}`}>
          <span className="sol-primary">
            Sol {sol} / {targetSols}
          </span>
          <span className="sol-mission">Mission Sol {missionSol}</span>
        </div>

        <div className="level-badge">
          Level {levelConfig.id}: {levelConfig.name}
        </div>
      </div>

      <div className="topbar-right">
        <div
          className={`source-badge ${isLive ? 'source-live' : 'source-snapshot'}`}
          title={
            isLive
              ? 'Connected to live NASA DONKI telemetry stream'
              : `Using offline-safe NASA DONKI snapshot: ${snapshotName}`
          }
        >
          <span aria-hidden="true">{isLive ? '📡' : '🛰️'}</span>
          <span>{isLive ? 'LIVE NASA DONKI' : 'CURATED SNAPSHOT'}</span>
        </div>

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
          onClick={() => setScreen('tutorial')}
          aria-label="Open Mission Tutorial"
          title="Tutorial & Guide (?)"
        >
          <span>? Tutorial</span>
        </button>

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
