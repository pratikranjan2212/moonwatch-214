// src/ui/PauseModal.jsx
import React from 'react';

export default function PauseModal({
  sol,
  maxSol,
  level,
  characterName,
  onResume,
  onRestart,
  onExit,
}) {
  return (
    <div
      className="pause-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
    >
      <div className="pause-card">
        <div className="pause-badge">⏸ SIMULATION FROZEN</div>
        <h2 id="pause-title" className="pause-title">
          MISSION PAUSED
        </h2>
        <p className="pause-meta">
          Commander <strong>{characterName}</strong> • Level {level} (Sol {sol} / {maxSol})
        </p>

        <div className="pause-actions">
          <button
            type="button"
            className="pause-btn resume-btn"
            onClick={onResume}
          >
            ▶️ Resume Mission
          </button>

          <button
            type="button"
            className="pause-btn restart-btn"
            onClick={onRestart}
          >
            🔄 Restart Level {level}
          </button>

          <button
            type="button"
            className="pause-btn exit-btn"
            onClick={onExit}
          >
            🚪 Exit to Welcome Screen
          </button>
        </div>
      </div>
    </div>
  );
}
