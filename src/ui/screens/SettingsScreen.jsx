import useGameStore from '../../store/useGameStore.js';

export function SettingsScreen() {
  const settings = useGameStore((s) => s.settings) || {
    volume: 0.8,
    muted: false,
    reducedMotion: false,
    quality: 'high',
    colourBlind: false,
  };
  const updateSettings = useGameStore((s) => s.updateSettings);
  const setScreen = useGameStore((s) => s.setScreen);

  const volumePercent = Math.round((settings.volume ?? 0.8) * 100);

  return (
    <main className="screen-shell" aria-label="Accessibility, Audio, and Graphics Settings">
      <div className="screen-container" style={{ maxWidth: '720px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <span className="nasa-badge">ACCESSIBILITY & DISPLAY CONTROLS</span>
            <h1
              style={{
                margin: '0.35rem 0 0 0',
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                color: 'var(--sun-highlight)',
              }}
            >
              Mission Settings
            </h1>
          </div>

          <button type="button" className="btn btn-ghost" onClick={() => setScreen('game')}>
            Return to Outpost →
          </button>
        </div>

        {/* 1. Master Volume Slider */}
        <div className="settings-row">
          <div>
            <label
              htmlFor="settings-volume-slider"
              style={{ fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}
            >
              Master Volume ({volumePercent}%)
            </label>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Adjusts ambient lunar music and HUD sound effects.
            </span>
          </div>

          <input
            id="settings-volume-slider"
            type="range"
            min="0"
            max="100"
            step="5"
            value={volumePercent}
            onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
            style={{ width: '200px', accentColor: 'var(--power)' }}
          />
        </div>

        {/* 2. Mute Audio Toggle */}
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Mute All Audio</div>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Silences all alarms, button clicks, and ambient loops immediately.
            </span>
          </div>

          <button
            type="button"
            className={`btn ${settings.muted ? 'btn-danger' : 'btn-ghost'}`}
            onClick={() => updateSettings({ muted: !settings.muted })}
            aria-pressed={Boolean(settings.muted)}
          >
            {settings.muted ? '🔇 Muted (ON)' : '🔊 Sound Active (OFF)'}
          </button>
        </div>

        {/* 3. Colour-Blind Safe Mode Toggle */}
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Colour-Blind Safe Mode
            </div>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Applies high-contrast Okabe-Ito tokens and distinct SVG stripe/dot/crosshatch patterns
              to Power, Oxygen, and Shield gauges.
            </span>
          </div>

          <button
            type="button"
            className={`btn ${settings.colourBlind ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateSettings({ colourBlind: !settings.colourBlind })}
            aria-pressed={Boolean(settings.colourBlind)}
          >
            {settings.colourBlind ? '✓ Enabled (Patterns ON)' : 'Disabled'}
          </button>
        </div>

        {/* 4. Reduced Motion Toggle */}
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Reduced Motion</div>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Disables screen flash, shake, pulse animations, and pauses the Sol 214 countdown timer.
            </span>
          </div>

          <button
            type="button"
            className={`btn ${settings.reducedMotion ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => updateSettings({ reducedMotion: !settings.reducedMotion })}
            aria-pressed={Boolean(settings.reducedMotion)}
          >
            {settings.reducedMotion ? '✓ Enabled (Calm UI)' : 'Disabled'}
          </button>
        </div>

        {/* 5. Graphics Quality Preset Selector */}
        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              HD-2D Graphics Quality Preset
            </div>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              High (Bloom + Tilt-Shift + Particles), Medium (Bloom only), Low (2D/Fastest).
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }} role="group" aria-label="Quality Preset">
            {['high', 'medium', 'low'].map((preset) => {
              const isSelected = settings.quality === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`btn ${isSelected ? 'btn-cyan' : 'btn-ghost'}`}
                  onClick={() => updateSettings({ quality: preset })}
                  aria-pressed={isSelected}
                  style={{ textTransform: 'capitalize' }}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <button type="button" className="btn btn-ghost" onClick={() => setScreen('title')}>
            ← Back to Title Screen
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setScreen('game')}>
            Save & Resume Mission →
          </button>
        </div>
      </div>
    </main>
  );
}

export default SettingsScreen;
