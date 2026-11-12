import soundManager from '../../audio/soundManager.js';
import { BALANCE } from '../../engine/balance.js';
import { getEventsForSol, isLunarNightSol, normalizeEventType } from '../../engine/events.js';
import useGameStore from '../../store/useGameStore.js';

const OXYGEN_MODES = ['low', 'normal', 'high'];

export function Controls() {
  const game = useGameStore((s) => s.game);
  const setChoice = useGameStore((s) => s.setChoice);
  const advanceSol = useGameStore((s) => s.advanceSol);

  const choices = game?.choices || {
    panelsOut: true,
    shieldOn: false,
    oxygenLevel: 'normal',
    waterGreenhouse: false,
    tendGreenhouse: false,
    queueComms: false,
  };

  const level = game?.level || 1;
  const sol = game?.sol || 1;
  const isPlaying = game?.status === 'playing';
  const solEvents = getEventsForSol(game?.timeline, sol);
  const isNight =
    isLunarNightSol(sol) ||
    solEvents.some((e) => normalizeEventType(e.type || e.code) === 'night');
  const hasDust = solEvents.some((e) => normalizeEventType(e.type || e.code) === 'dust');
  const isPanelDamaged = (game?.sol214?.panelDamagedSolsRemaining || 0) > 0;

  const handleTogglePanels = () => {
    soundManager.play('motor');
    setChoice('panelsOut', !choices.panelsOut);
  };

  const handleToggleShield = () => {
    soundManager.play('click');
    setChoice('shieldOn', !choices.shieldOn);
  };

  const handleCycleOxygen = () => {
    soundManager.play('click');
    const idx = OXYGEN_MODES.indexOf(choices.oxygenLevel || 'normal');
    const nextMode = OXYGEN_MODES[(idx + 1) % OXYGEN_MODES.length];
    setChoice('oxygenLevel', nextMode);
  };

  const handleToggleWaterGreenhouse = () => {
    soundManager.play('click');
    setChoice('waterGreenhouse', !choices.waterGreenhouse);
  };

  const handleToggleTendGreenhouse = () => {
    soundManager.play('click');
    setChoice('tendGreenhouse', !choices.tendGreenhouse);
  };

  const handleToggleQueueComms = () => {
    soundManager.play('click');
    setChoice('queueComms', !choices.queueComms);
  };

  // Estimate per-Sol power budget preview matching tick.js generation & dust/damage multipliers
  const o2Key = OXYGEN_MODES.includes(choices.oxygenLevel) ? choices.oxygenLevel : 'normal';
  const o2Spec = BALANCE.oxygenConsumptionByLevel[o2Key];
  let estGen = choices.panelsOut && !isNight ? BALANCE.solarGenerationDay : 0;
  if (estGen > 0 && hasDust) {
    estGen *= BALANCE.dustMultiplier;
  }
  if (estGen > 0 && isPanelDamaged) {
    estGen *= BALANCE.sol214.leaveOut.panelEfficiencyMultiplier;
  }
  estGen = Math.round(estGen);

  const estDraw =
    BALANCE.baseConsumption +
    (choices.shieldOn ? BALANCE.shieldCost : 0) +
    o2Spec.powerCost +
    (choices.panelsOut && hasDust ? BALANCE.dustExposedPanelPowerLoss : 0) +
    (level >= 2 && (choices.waterGreenhouse || choices.tendGreenhouse)
      ? BALANCE.greenhouse.waterPowerCost
      : 0) +
    (level >= 3 && choices.queueComms ? BALANCE.comms.antennaPowerCost : 0);
  const estNetPower = estGen - estDraw;

  return (
    <section className="hud-panel controls-panel" aria-label="Per-Sol Power Allocation Controls">
      <div className="hud-section-title">
        <span>Sol {sol} Command Allocation</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
          Est. Net Power:{' '}
          <strong style={{ color: estNetPower >= 0 ? '#34D399' : 'var(--power)' }}>
            {estNetPower >= 0 ? `+${estNetPower}` : estNetPower}/Sol
          </strong>
        </span>
      </div>

      <div className="controls-toggles-grid">
        {/* 1. Solar Panels Toggle */}
        <button
          type="button"
          className={`control-toggle-btn ${choices.panelsOut ? 'active-power' : ''}`}
          onClick={handleTogglePanels}
          disabled={!isPlaying}
          aria-pressed={Boolean(choices.panelsOut)}
        >
          <div className="control-top-line">
            <span>Solar Panels</span>
            <span className="kbd-hint">[1 / P]</span>
          </div>
          <div className="control-state-value">
            {choices.panelsOut ? 'EXTENDED' : 'RETRACTED'}
          </div>
          <div className="control-cost-hint">
            {choices.panelsOut
              ? isNight
                ? '+0 Power (Night) · Exposed'
                : `+${BALANCE.solarGenerationDay} Power/Sol · Exposed`
              : '+0 Power · Protected'}
          </div>
        </button>

        {/* 2. Shield Dome Toggle */}
        <button
          type="button"
          className={`control-toggle-btn ${choices.shieldOn ? 'active-shield' : ''}`}
          onClick={handleToggleShield}
          disabled={!isPlaying}
          aria-pressed={Boolean(choices.shieldOn)}
        >
          <div className="control-top-line">
            <span>Shield Dome</span>
            <span className="kbd-hint">[2 / S]</span>
          </div>
          <div className="control-state-value">{choices.shieldOn ? 'ON (80% MIT)' : 'OFF'}</div>
          <div className="control-cost-hint">
            {choices.shieldOn ? `-${BALANCE.shieldCost} Power/Sol · Blocks Flares` : '0 Power · Unshielded'}
          </div>
        </button>

        {/* 3. Oxygen Level Selector */}
        <button
          type="button"
          className="control-toggle-btn active-oxygen"
          onClick={handleCycleOxygen}
          disabled={!isPlaying}
          aria-label={`Oxygen Level ${o2Key.toUpperCase()}. Click to cycle Low, Normal, High`}
        >
          <div className="control-top-line">
            <span>Oxygen Level</span>
            <span className="kbd-hint">[3 / O]</span>
          </div>
          <div className="control-state-value">{o2Key.toUpperCase()}</div>
          <div className="control-cost-hint">
            O₂ {o2Spec.netOxygenDelta >= 0 ? `+${o2Spec.netOxygenDelta}` : o2Spec.netOxygenDelta}/Sol ·{' '}
            {o2Spec.powerCost === 0
              ? 'Base Power'
              : o2Spec.powerCost > 0
                ? `-${o2Spec.powerCost} Power`
                : `+${Math.abs(o2Spec.powerCost)} Saved`}
          </div>
        </button>

        {/* Level 2 Conditional Controls: Water Greenhouse & Tend Crops */}
        {level >= 2 && (
          <>
            <button
              type="button"
              className={`control-toggle-btn ${choices.waterGreenhouse ? 'active-oxygen' : ''}`}
              onClick={handleToggleWaterGreenhouse}
              disabled={!isPlaying}
              aria-pressed={Boolean(choices.waterGreenhouse)}
            >
              <div className="control-top-line">
                <span>Water Greenhouse</span>
                <span className="kbd-hint">[4 / G]</span>
              </div>
              <div className="control-state-value">
                {choices.waterGreenhouse ? 'WATERING ON' : 'STANDBY'}
              </div>
              <div className="control-cost-hint">
                -{BALANCE.greenhouse.waterPowerCost} Power · +{BALANCE.greenhouse.oxygenBoost} O₂/Sol
              </div>
            </button>

            <button
              type="button"
              className={`control-toggle-btn ${choices.tendGreenhouse ? 'active-oxygen' : ''}`}
              onClick={handleToggleTendGreenhouse}
              disabled={!isPlaying}
              aria-pressed={Boolean(choices.tendGreenhouse)}
            >
              <div className="control-top-line">
                <span>Tend Crops</span>
                <span className="kbd-hint">[L2]</span>
              </div>
              <div className="control-state-value">
                {choices.tendGreenhouse ? 'TENDING CROPS' : 'IDLE'}
              </div>
              <div className="control-cost-hint">
                Scrubs CO₂ & boosts crew morale (+{BALANCE.greenhouse.crewHealthBoost} HP)
              </div>
            </button>
          </>
        )}

        {/* Level 3 Conditional Control: Queue Earth Comms */}
        {level >= 3 && (
          <button
            type="button"
            className={`control-toggle-btn ${choices.queueComms ? 'active-power' : ''}`}
            onClick={handleToggleQueueComms}
            disabled={!isPlaying}
            aria-pressed={Boolean(choices.queueComms)}
          >
            <div className="control-top-line">
              <span>Queue Earth Comms</span>
              <span className="kbd-hint">[5 / C]</span>
            </div>
            <div className="control-state-value">
              {choices.queueComms ? 'PACKET QUEUED' : 'ANTENNA IDLE'}
            </div>
            <div className="control-cost-hint">
              -{BALANCE.comms.antennaPowerCost} Power · {game?.comms?.delaySols || 2}-Sol Earth Delay
            </div>
          </button>
        )}
      </div>

      <div className="controls-action-row">
        <button
          type="button"
          className="btn btn-primary next-sol-btn"
          onClick={() => {
            soundManager.play('click');
            advanceSol();
          }}
          disabled={!isPlaying}
        >
          <span>Advance to Next Sol (Sol {sol} → {Math.min(game?.targetSols || 14, sol + 1)})</span>
          <span className="kbd-hint" style={{ color: '#FFF1C9', background: '#1C1F3A' }}>
            [Space / Enter]
          </span>
        </button>
      </div>
    </section>
  );
}

export default Controls;
