/**
 * @fileoverview Centralized tunable game balance constants for MOONWATCH: Sol 214.
 * Pure JavaScript module with zero UI or scene dependencies.
 */

export const STARTING_BATTERY = 80;
export const STARTING_OXYGEN = 100;
export const STARTING_SHIELD = 100;
export const STARTING_CREW_HEALTH = 100;

export const SOLAR_GENERATION_DAY = 18;
export const SOLAR_GENERATION_NIGHT = 0;
export const BASE_CONSUMPTION = 8;
export const SHIELD_COST = 6;
export const DUST_STORM_SOLAR_MULTIPLIER = 0.3;
export const DUST_STORM_DURATION_SOLS = 2;
export const NIGHT_DURATION_SOLS = 3;
export const DAY_DURATION_SOLS = 4;
export const FLARE_SHIELD_MITIGATION = 0.8;

/**
 * Master balance configuration object.
 * Tuned so a simulated first-time heuristic player achieves a 40%–60% win rate in Level 1
 * and balanced progression across Levels 1–3.
 */
export const BALANCE = {
  // Gauge bounds & starting values
  minGauge: 0,
  maxGauge: 100,
  startingBattery: STARTING_BATTERY,
  startingPower: STARTING_BATTERY,
  startingOxygen: STARTING_OXYGEN,
  startingShield: STARTING_SHIELD,
  startingCrewHealth: STARTING_CREW_HEALTH,

  // Mission timeline numbering (Sol 7 on Level 1 = Mission Sol 214)
  missionBaseSol: 207,
  sol214TargetSol: 7,
  sol214MissionSol: 214,

  // Power generation & consumption per Sol
  solarGenerationDay: SOLAR_GENERATION_DAY, // +18/Sol when panels out during day
  solarGenerationNight: SOLAR_GENERATION_NIGHT, // 0 solar during lunar night
  baseConsumption: BASE_CONSUMPTION, // -8/Sol base habitat draw
  shieldCost: SHIELD_COST, // -6/Sol when shield dome is active
  shieldPassiveRegen: 5, // +5/Sol shield capacitor recovery on calm powered Sols

  // Lunar day/night cycle (7-Sol cycle: 4 Sols day, 3 Sols night)
  // Cycle layout: Sols 1-3 Day, Sols 4-6 Night (3 Sols), Sol 7 Day (Mission Sol 214!)
  cycleLengthSols: 7,
  daySolsPerCycle: DAY_DURATION_SOLS,
  nightSolsPerCycle: NIGHT_DURATION_SOLS,
  nightCycleOffsets: [3, 4, 5], // 0-indexed within 7-Sol cycle -> Sols 4,5,6 and 11,12,13

  // Dust storm parameters
  dustStormSolarMultiplier: DUST_STORM_SOLAR_MULTIPLIER, // solar * 0.3 for 2 Sols
  dustStormDurationSols: DUST_STORM_DURATION_SOLS,
  dustStormPanelPowerLoss: 8, // extra power loss from dust abrasion if panels left extended
  dustStormPanelShieldWear: 5, // dust abrasion on shield emitters when panels extended

  // Oxygen consumption & life-support trade-offs by setting ('low' | 'normal' | 'high')
  // DESIGN_DOC reference: -2 per crew-Sol raw consumption on normal (4 crew = -8 raw)
  oxygenConsumptionPerCrew: 2,
  oxygenConsumptionByLevel: {
    low: {
      label: 'Low (Eco)',
      perCrewRaw: 2.0,
      generatorOutput: 0,
      netOxygenDelta: -8, // 4 crew * -2/crew-Sol with eco-throttled O2 generator
      powerCost: -3, // saves 3 power/Sol
      crewHealthDelta: -6, // thin cabin air decays crew health
    },
    normal: {
      label: 'Normal',
      perCrewRaw: 2.0,
      generatorOutput: 4,
      netOxygenDelta: -4, // steady net consumption (-4/Sol) after baseline O2 generator
      powerCost: 0, // included in base habitat power draw
      crewHealthDelta: 0, // stable crew health
    },
    high: {
      label: 'High (Boost)',
      perCrewRaw: 2.0,
      generatorOutput: 15,
      netOxygenDelta: 7, // replenishes cabin O2 (+7/Sol)
      powerCost: 3, // costs +3 power/Sol
      crewHealthDelta: 3, // revitalizes crew (+3 health/Sol)
    },
  },

  // Penalties when battery hits 0 (Oxygen generator & heaters shut down)
  powerOutageOxygenDrain: 24, // -24 O2/Sol when life support goes offline
  powerOutageCrewDamage: 18, // -18 health/Sol from freezing cabin & hypoxia
  lowOxygenThreshold: 35, // O2 <= 35 triggers 'worried' mood and health decay
  lowOxygenCrewDamage: 7, // -7 health/Sol when cabin oxygen is low
  criticalOxygenThreshold: 15, // O2 <= 15 triggers severe hypoxia
  criticalOxygenCrewDamage: 15, // -15 health/Sol when cabin oxygen is critical

  // Solar flare (FLR) & Coronal Mass Ejection (CME) damage & shield mitigation
  flareShieldMitigation: FLARE_SHIELD_MITIGATION, // 80% damage reduction when shield is active
  flare: {
    minor: {
      classPrefix: 'C',
      shieldDamage: 15,
      crewDamage: 6,
      exposedPanelPowerLoss: 10,
    },
    major: {
      classPrefix: 'M',
      shieldDamage: 25, // DESIGN_DOC: -25 shield, -10 crew health each (unshielded)
      crewDamage: 10,
      exposedPanelPowerLoss: 16,
    },
    extreme: {
      classPrefix: 'X',
      shieldDamage: 40,
      crewDamage: 20,
      exposedPanelPowerLoss: 24,
    },
  },

  cme: {
    minor: {
      shieldDamage: 15,
      crewDamage: 6,
      exposedPanelPowerLoss: 10,
      durationSols: 1,
      leadTimeSols: 3,
    },
    major: {
      shieldDamage: 25,
      crewDamage: 10,
      exposedPanelPowerLoss: 16,
      durationSols: 2,
      leadTimeSols: 2,
    },
    extreme: {
      shieldDamage: 38,
      crewDamage: 18,
      exposedPanelPowerLoss: 22,
      durationSols: 2,
      leadTimeSols: 1,
    },
  },

  // Sol 214 Hero Event (Level 1, Sol 7 = Mission Sol 214)
  sol214: {
    sol: 7,
    missionSol: 214,
    countdownSeconds: 10,
    retract: {
      powerDelta: -4, // no solar generated, small motor draw, array protected
      shieldDelta: -10, // shield absorbs glancing X-ray pulse
      crewDamage: 0, // crew safe in shelter
      panelDamaged: false,
      damagedSolarMultiplier: 1.0,
      damagedDurationSols: 0,
    },
    leaveOut: {
      powerDelta: -30, // geomagnetic surge through extended panels drains battery bank
      shieldDelta: -35, // heavy shield overload
      crewDamageUnshielded: 20, // radiation & electrical arc hazard
      crewDamageShielded: 4, // 80% mitigated crew damage if shield was active
      panelDamaged: true,
      damagedSolarMultiplier: 0.45, // scorched array generates 45% power for next 3 Sols
      damagedDurationSols: 3,
    },
  },

  // Level 2: Greenhouse & CO2 scrubbing
  greenhouse: {
    co2OxygenDrainPerSol: 1, // additional O2 loss from CO2 build-up in Level 2+
    waterPowerCost: 1, // power cost to pump water & run grow lamps
    oxygenBoost: 9, // +9 O2/Sol when greenhouse is watered/tended
    crewHealthBoost: 2, // +2 crew health/Sol from fresh greens & morale
    wiltOxygenPenalty: 1, // extra O2 loss if greenhouse is neglected for 2+ Sols
  },

  // Level 3: Earth communications delay & antenna queue
  comms: {
    defaultDelaySols: 2, // 2-Sol round-trip Earth telemetry delay
    blackoutDelaySols: 3, // 3-Sol delay during solar interference
    antennaPowerCost: 1, // power cost to transmit high-gain packet
    telemetryPowerBonus: 10, // Earth flight control battery routing optimization upon arrival
    telemetryShieldBonus: 12, // Earth magnetic harmonic calibration upon arrival
    telemetryOxygenBonus: 8, // Earth life-support trim adjustment upon arrival
    desyncPenaltyIntervalSols: 5, // if no comms queued for 5 Sols, habitat efficiency drops
    desyncPowerPenalty: 3,
  },
};

export default BALANCE;
