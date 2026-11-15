import soundManager from '../../audio/soundManager.js';
import useGameStore from '../../store/useGameStore.js';

export function Controls() {
  const game = useGameStore((s) => s.game);
  const advanceSol = useGameStore((s) => s.advanceSol);

  const sol = game?.sol || 1;
  const targetSols = game?.targetSols || 14;
  const isPlaying = game?.status === 'playing';
  const nextSol = Math.min(targetSols, sol + 1);

  return (
    <div className="controls-compact-dock" aria-label="Turn Advancement">
      <button
        type="button"
        className="btn btn-primary next-sol-btn"
        onClick={() => {
          soundManager.play('click');
          advanceSol();
        }}
        disabled={!isPlaying}
        title={`Advance to Next Day (Day ${sol} to Day ${nextSol}) [Space / Enter]`}
      >
        <span>
          Advance to Next Day ({sol} → {nextSol})
        </span>
        <span className="kbd-hint" style={{ color: '#FFFFFF', background: '#050302' }}>
          Space
        </span>
      </button>
    </div>
  );
}

export default Controls;
