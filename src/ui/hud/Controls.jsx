import soundManager from '../../audio/soundManager.js';
import { BALANCE } from '../../engine/balance.js';
import { getEventsForSol, isLunarNightSol, normalizeEventType } from '../../engine/events.js';
import useGameStore from '../../store/useGameStore.js';

const OXYGEN_MODES = ['low', 'normal', 'high'];

export function Controls() {
  const game = useGameStore((s) => s.game);
  const setChoice = useGameStore((s) => s.setChoice);
  const advanceSol = useGameStore((s) => s.advanceSol);
  const commandMoveToStation = useGameStore((s) => s.commandMoveToStation);
  const cancelTravel = useGameStore((s) => s.cancelTravel);
  const isTravelling = useGameStore((s) => s.isTravelling);
  const travelFeedback = useGameStore((s) => s.travelFeedback);
  const showToast = useGameStore((s) => s.showToast);
  const dustCountdown = useGameStore((s) => s.dustCountdown);
  const dustWarningActive = useGameStore((s) => s.dustWarningActive);

  const choices = game?.choices || {
    panelsOut: true,
    shieldOn: false,
    oxygenLevel: 'normal',
    waterGreenhouse: false,
    tendGreenhouse: false,
    queueComms: false,
  };

  const sol = game?.sol || 1;
  const isPlaying = game?.status === 'playing';
  const isSolarBroken = Boolean(game?.solarBroken);
  const solEvents = getEventsForSol(game?.timeline, sol);
  const isNight =
    isLunarNightSol(sol) ||
    solEvents.some((e) => normalizeEventType(e.type || e.code) === 'night');
  const hasDust = solEvents.some((e) => normalizeEventType(e.type || e.code) === 'dust');
  const isPanelDamaged = (game?.sol214?.panelDamagedSolsRemaining || 0) > 0;

  const handleRequestPanels = () => {
    if (isSolarBroken) {
      soundManager.play('warning');
      showToast?.('Solar Array is BROKEN: Panels detached and shattered on lunar surface.');
      return;
    }
    commandMoveToStation('solar', () => {
      soundManager.play('motor');
      const next = !choices.panelsOut;
      setChoice('panelsOut', next);
      showToast?.(
        next
          ? 'Solar Panels Extended at Solar Installation'
          : 'Solar Panels Retracted into Underground Bay'
      );
    }, 'Solar Panel Installation');
  };

  const handleRequestShield = () => {
    commandMoveToStation('shield', () => {
      soundManager.play('click');
      const next = !choices.shieldOn;
      setChoice('shieldOn', next);
      showToast?.(next ? 'Radiation Shield Dome Activated at Central Base' : 'Shield Dome Deactivated');
    }, 'Central Base Shield Station');
  };

  const handleRequestOxygen = () => {
    commandMoveToStation('oxygen', () => {
      soundManager.play('click');
      const idx = OXYGEN_MODES.indexOf(choices.oxygenLevel || 'normal');
      const nextMode = OXYGEN_MODES[(idx + 1) % OXYGEN_MODES.length];
      setChoice('oxygenLevel', nextMode);
      showToast?.(`Oxygen Life Support Set to ${nextMode.toUpperCase()} at O₂ Tanks`);
    }, 'Oxygen Control Station');
  };

  const handleRequestWaterGreenhouse = () => {
    if (sol < 2) {
      showToast?.('Greenhouse is LOCKED (Unlocks on Sol 2)');
      return;
    }
    commandMoveToStation('greenhouse', () => {
      soundManager.play('click');
      const next = !choices.waterGreenhouse;
      setChoice('waterGreenhouse', next);
      showToast?.(next ? 'Greenhouse Irrigation Activated' : 'Irrigation Switched to Standby');
    }, 'Greenhouse Control Station');
  };

  const handleRequestTendGreenhouse = () => {
    if (sol < 2) {
      showToast?.('Greenhouse is LOCKED (Unlocks on Sol 2)');
      return;
    }
    commandMoveToStation('greenhouse', () => {
      soundManager.play('click');
      const next = !choices.tendGreenhouse;
      setChoice('tendGreenhouse', next);
      showToast?.(next ? 'Tending Hydroponic Crops' : 'Crop Tending Completed');
    }, 'Greenhouse Control Station');
  };

  const handleRequestQueueComms = () => {
    if (sol < 3) {
      showToast?.('Earth Communications Antenna is LOCKED (Unlocks on Sol 3)');
      return;
    }
    commandMoveToStation('comms', () => {
      soundManager.play('click');
      const next = !choices.queueComms;
      setChoice('queueComms', next);
      showToast?.(next ? 'Earth Packet Queued on High-Gain Dish' : 'Comms Dish Switched to Standby');
    }, 'Earth Communications Unit');
  };

  // Estimate per-Sol power budget preview matching tick.js generation & dust/damage multipliers
  const o2Key = OXYGEN_MODES.includes(choices.oxygenLevel) ? choices.oxygenLevel : 'normal';
  const o2Spec = BALANCE.oxygenConsumptionByLevel[o2Key];
  let estGen = choices.panelsOut && !isNight && !isSolarBroken ? BALANCE.solarGenerationDay : 0;
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
    (sol >= 2 && (choices.waterGreenhouse || choices.tendGreenhouse)
      ? BALANCE.greenhouse.waterPowerCost
      : 0) +
    (sol >= 3 && choices.queueComms ? BALANCE.comms.antennaPowerCost : 0);
  const estNetPower = estGen - estDraw;

  return (
    <section className="hud-panel controls-panel" aria-label="Per-Sol Power Allocation Controls">
      <div className="hud-section-title">
        <span>Sol {sol} Physical Command Allocation</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
          Est. Net Power:{' '}
          <strong style={{ color: estNetPower >= 0 ? '#34D399' : 'var(--power)' }}>
            {estNetPower >= 0 ? `+${estNetPower}` : estNetPower}/Sol
          </strong>
        </span>
      </div>

      {/* Real-time Physical Character Movement feedback banner */}
      {isTravelling && (
        <div className="controls-travel-banner">
          <span>🚶 {travelFeedback}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={cancelTravel}
            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#FFB020' }}
          >
            Cancel Walk
          </button>
        </div>
      )}

      <div className="controls-toggles-grid">
        {/* 1. Solar Panels Toggle */}
        <button
          type="button"
          className={`control-toggle-btn ${isSolarBroken ? 'broken-danger' : choices.panelsOut ? 'active-power' : ''} ${dustWarningActive ? 'pulse-warning' : ''}`}
          onClick={handleRequestPanels}
          disabled={!isPlaying}
          aria-pressed={Boolean(choices.panelsOut)}
        >
          <div className="control-top-line">
            <span>Solar Panels</span>
            <span className="kbd-hint">[1 / P]</span>
          </div>
          <div className="control-state-value">
            {isSolarBroken
              ? 'BROKEN (DETACHED)'
              : dustWarningActive
                ? `⚠️ RETRACT NOW (${dustCountdown ?? 60}s)`
                : choices.panelsOut
                  ? 'EXTENDED'
                  : 'RETRACTED'}
          </div>
          <div className="control-cost-hint">
            {isSolarBroken
              ? '+0 Power · Detached in Storm'
              : choices.panelsOut
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
          onClick={handleRequestShield}
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
          onClick={handleRequestOxygen}
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

        {/* Day 2 Progressive Unlocks: Water Greenhouse & Tend Crops */}
        {sol >= 2 ? (
          <>
            <button
              type="button"
              className={`control-toggle-btn ${choices.waterGreenhouse ? 'active-oxygen' : ''}`}
              onClick={handleRequestWaterGreenhouse}
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
              onClick={handleRequestTendGreenhouse}
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
        ) : (
          <div className="control-toggle-btn control-locked-placeholder">
            <div className="control-top-line">
              <span>Greenhouse Deck</span>
              <span className="kbd-hint">🔒 Sol 2</span>
            </div>
            <div className="control-state-value" style={{ color: 'var(--text-secondary)' }}>
              LOCKED
            </div>
            <div className="control-cost-hint">Unlocks automatically on Sol 2</div>
          </div>
        )}

        {/* Day 3 Progressive Unlock: Queue Earth Comms */}
        {sol >= 3 ? (
          <button
            type="button"
            className={`control-toggle-btn ${choices.queueComms ? 'active-power' : ''}`}
            onClick={handleRequestQueueComms}
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
        ) : (
          <div className="control-toggle-btn control-locked-placeholder">
            <div className="control-top-line">
              <span>Earth Comms</span>
              <span className="kbd-hint">🔒 Sol 3</span>
            </div>
            <div className="control-state-value" style={{ color: 'var(--text-secondary)' }}>
              LOCKED
            </div>
            <div className="control-cost-hint">Unlocks automatically on Sol 3</div>
          </div>
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
