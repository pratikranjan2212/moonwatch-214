/**
 * @fileoverview Comprehensive Vitest unit tests for the MOONWATCH: Sol 214 engine and Zustand store.
 */

import { describe, expect, it } from 'vitest';
import { BALANCE } from '../balance.js';
import { buildDebrief } from '../debrief.js';
import {
  EVENT_DEFINITIONS,
  buildTimeline,
  getEventsForSol,
  getFactSheet,
  getForecast,
  isLunarNightSol,
  normalizeExternalEvent,
} from '../events.js';
import { COMMANDER, CREW_MOODS, LEVELS, STARTER_CREW, createInitialCrew, getLevelConfig } from '../levels.js';
import { createRNG, mulberry32, normalizeSeed } from '../rng.js';
import { createInitialState, resolveSol214Choice, tick } from '../tick.js';
import { useGameStore } from '../../store/useGameStore.js';
import { firstTimeStrategy, optimalStrategy, simulateSingleRun } from '../../../scripts/simulate.js';

describe('1. Seeded RNG Determinism (rng.js)', () => {
  it('normalizes string, number, bigint, and empty seeds deterministically', () => {
    expect(normalizeSeed(214)).toBe(214);
    expect(normalizeSeed('sol-214-alpha')).toBe(normalizeSeed('sol-214-alpha'));
    expect(normalizeSeed('sol-214-alpha')).not.toBe(normalizeSeed('sol-214-beta'));
    expect(normalizeSeed(42n)).toBe(42);
    expect(normalizeSeed(null)).toBeGreaterThan(0);
    expect(normalizeSeed(undefined)).toBe(normalizeSeed(''));
  });

  it('produces identical float and integer sequences for the same seed', () => {
    const rngA = createRNG('moonwatch-seed-214');
    const rngB = createRNG('moonwatch-seed-214');
    const rngC = createRNG('different-seed-999');

    const seqA = Array.from({ length: 20 }, () => rngA.nextFloat());
    const seqB = Array.from({ length: 20 }, () => rngB.nextFloat());
    const seqC = Array.from({ length: 20 }, () => rngC.nextFloat());

    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    seqA.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    });

    const rawA = mulberry32(12345);
    const rawB = mulberry32(12345);
    expect(rawA()).toBe(rawB());
  });

  it('supports nextInt, pick, shuffle (pure), fork, and clone helpers', () => {
    const rng1 = createRNG(987654);
    const rng2 = createRNG(987654);

    for (let i = 0; i < 25; i += 1) {
      const val1 = rng1.nextInt(3, 11);
      const val2 = rng2.nextInt(3, 11);
      expect(val1).toBe(val2);
      expect(val1).toBeGreaterThanOrEqual(3);
      expect(val1).toBeLessThanOrEqual(11);
    }

    const originalArray = ['engineer', 'doctor', 'botanist', 'pilot'];
    const copyBefore = [...originalArray];
    const shuffled1 = rng1.shuffle(originalArray);
    const shuffled2 = rng2.shuffle(originalArray);

    expect(originalArray).toEqual(copyBefore); // Never mutates input
    expect(shuffled1).toEqual(shuffled2);
    expect(shuffled1.sort()).toEqual([...originalArray].sort());

    const forked1 = rng1.fork('timeline');
    const forked2 = rng2.fork('timeline');
    expect(forked1.nextFloat()).toBe(forked2.nextFloat());

    const cloned = rng1.clone();
    expect(rng1.nextFloat()).toBe(cloned.nextFloat());
  });

  it('produces an identical full-game run when replayed with the same seed and strategy', () => {
    const runA = simulateSingleRun(1, 20261112, firstTimeStrategy);
    const runB = simulateSingleRun(1, 20261112, firstTimeStrategy);

    expect(runA.status).toBe(runB.status);
    expect(runA.sol).toBe(runB.sol);
    expect(runA.solsSurvived).toBe(runB.solsSurvived);
    expect(runA.gauges).toEqual(runB.gauges);
    expect(runA.crew).toEqual(runB.crew);
    expect(runA.causeLog).toEqual(runB.causeLog);
  });
});

describe('2. Levels, Crew & Event Timeline Builder (levels.js & events.js)', () => {
  it('defines Levels 1 (14 Sols), 2 (21 Sols), and 3 (28 Sols) plus Commander Nova & 4 Crew', () => {
    expect(LEVELS[1].targetSols).toBe(14);
    expect(LEVELS[2].targetSols).toBe(21);
    expect(LEVELS[3].targetSols).toBe(28);
    expect(getLevelConfig(99).id).toBe(1);

    expect(COMMANDER.name).toContain('Nova');
    expect(STARTER_CREW).toHaveLength(4);
    expect(STARTER_CREW.map((c) => c.role)).toEqual(['Engineer', 'Doctor', 'Botanist', 'Pilot']);

    const crewClone = createInitialCrew();
    crewClone[0].health = 10;
    expect(STARTER_CREW[0].health).toBe(100);
  });

  it('provides kid-friendly science fact sheets for every event type', () => {
    const types = ['flare', 'cme', 'dust', 'night', 'comms', 'sol214'];
    types.forEach((t) => {
      const sheet = getFactSheet(t);
      expect(sheet.whatItIs.length).toBeGreaterThan(10);
      expect(sheet.realWorldImpact.length).toBeGreaterThan(10);
      expect(sheet.howAstronautsRespond.length).toBeGreaterThan(10);
      expect(sheet.oneLineFact.length).toBeGreaterThan(10);
      expect(sheet.tryThisTip.length).toBeGreaterThan(10);
    });
    expect(EVENT_DEFINITIONS.FLR.type).toBe('flare');
    expect(EVENT_DEFINITIONS.CME.type).toBe('cme');
  });

  it('guarantees the Sol 214 hero event at Sol 7 (Mission Sol 214) on Level 1 and merges NASA DONKI events', () => {
    const sampleDonkiEvents = [
      {
        flrID: '2024-05-10T06:27:00-FLR-001',
        beginTime: '2024-05-10T06:27Z',
        classType: 'M5.2',
        activeRegionNum: 13664,
        note: 'Major M-class flare observed by GOES-P.',
      },
      {
        activityID: '2024-05-10T06:54:00-CME-001',
        startTime: '2024-05-10T06:54Z',
        cmeAnalyses: [{ isMostAccurate: true, speed: 880, type: 'O' }],
      },
    ];

    const normFlr = normalizeExternalEvent(sampleDonkiEvents[0], 0, 14, 207);
    expect(normFlr.type).toBe('flare');
    expect(normFlr.severity).toBe('major');
    expect(normFlr.isRealNasaEvent).toBe(true);

    const timelineA = buildTimeline(1, 424242, sampleDonkiEvents);
    const timelineB = buildTimeline(1, 424242, sampleDonkiEvents);
    expect(timelineA).toEqual(timelineB);

    const sol214Evt = getEventsForSol(timelineA, 7).find((e) => e.type === 'sol214');
    expect(sol214Evt).toBeDefined();
    expect(sol214Evt.sol).toBe(7);
    expect(sol214Evt.missionSol).toBe(214);
    expect(sol214Evt.requiresChoice).toBe(true);

    // Verify 3 Lunar Night Sols per 7-Sol cycle (Sols 4,5,6 and 11,12,13 in Level 1)
    const nightEvents = timelineA.filter((e) => e.type === 'night');
    expect(nightEvents.map((e) => e.sol)).toEqual([4, 5, 6, 11, 12, 13]);
    expect(isLunarNightSol(7)).toBe(false); // Sol 7 is daytime

    const forecast = getForecast(timelineA, 5, 3);
    expect(forecast.some((e) => e.type === 'sol214')).toBe(true);
  });
});

describe('3. tick() Resource Resolution & Immutability (tick.js)', () => {
  it('never mutates input state, gauges, crew, choices, or causeLog', () => {
    const initial = createInitialState({ level: 1, seed: 101 });
    const snapshot = JSON.stringify(initial);

    const next = tick(initial, { panelsOut: false, shieldOn: true, oxygenLevel: 'high' });
    expect(JSON.stringify(initial)).toBe(snapshot);
    expect(next).not.toBe(initial);
    expect(next.gauges).not.toBe(initial.gauges);
    expect(next.crew).not.toBe(initial.crew);
  });

  it('resolves daytime solar generation (+18), base consumption (-8), and shield cost (-6)', () => {
    const state = createInitialState({
      level: 1,
      seed: 1,
      timeline: [], // Calm daytime Sol 1
    });

    // Panels out (+18), base (-8), shield off (0), normal oxygen (0 power cost, -4 O2) -> net +10 power
    const afterDay = tick(state, { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' });
    expect(afterDay.gauges.power).toBe(BALANCE.startingBattery + 18 - 8); // 90
    expect(afterDay.gauges.oxygen).toBe(BALANCE.startingOxygen + BALANCE.oxygenConsumptionByLevel.normal.netOxygenDelta);

    // With shield ON (-6) and panels retracted (0 solar) -> net -14 power
    const afterShieldedRetract = tick(state, {
      panelsOut: false,
      shieldOn: true,
      oxygenLevel: 'normal',
    });
    expect(afterShieldedRetract.gauges.power).toBe(BALANCE.startingBattery - 8 - 6); // 66
  });

  it('resolves Lunar Night (0 solar) and Dust Storm (solar * 0.3)', () => {
    const nightState = createInitialState({
      level: 1,
      seed: 2,
      timeline: [{ id: 'night-1', sol: 1, type: 'night', code: 'NIGHT' }],
    });
    const afterNight = tick(nightState, { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' });
    expect(afterNight.gauges.power).toBe(BALANCE.startingBattery - BALANCE.baseConsumption); // 72
    expect(afterNight.causeLog.some((c) => c.cause === 'night')).toBe(true);

    // Dust storm with panels out: solar is 18 * 0.3 = 5.4, minus base 8, minus dust panel loss 8
    const dustState = createInitialState({
      level: 1,
      seed: 3,
      timeline: [{ id: 'dust-1', sol: 1, type: 'dust', code: 'DUST' }],
    });
    const afterDustExposed = tick(dustState, {
      panelsOut: true,
      shieldOn: false,
      oxygenLevel: 'normal',
    });
    const expectedDustPower =
      BALANCE.startingBattery +
      BALANCE.solarGenerationDay * BALANCE.dustStormSolarMultiplier -
      BALANCE.baseConsumption -
      BALANCE.dustStormPanelPowerLoss;
    expect(afterDustExposed.gauges.power).toBeCloseTo(expectedDustPower, 2);

    // Dust storm with panels retracted: no panel abrasion loss, crew cheers surviving storm
    const afterDustRetracted = tick(dustState, {
      panelsOut: false,
      shieldOn: false,
      oxygenLevel: 'normal',
    });
    expect(
      afterDustRetracted.causeLog.some((c) => c.cause === 'dust' && c.mitigatedBy === 'panelsRetracted')
    ).toBe(true);
    expect(afterDustRetracted.crew[0].mood).toBe('cheer');
  });

  it('applies 80% shield mitigation on flares and penalizes exposed panels', () => {
    const flareTimeline = [
      { id: 'flr-maj', sol: 1, type: 'flare', code: 'FLR', severity: 'major' },
    ];
    const base = createInitialState({ level: 1, seed: 10, timeline: flareTimeline });

    // Unshielded major flare: -25 shield, -10 crew health each, mood = 'run-to-shelter'
    const unshielded = tick(base, { panelsOut: false, shieldOn: false, oxygenLevel: 'normal' });
    expect(unshielded.gauges.shield).toBe(100 - BALANCE.flare.major.shieldDamage); // 75
    expect(unshielded.crew.every((c) => c.health === 100 - BALANCE.flare.major.crewDamage)).toBe(true); // 90
    expect(unshielded.crew.every((c) => c.mood === 'run-to-shelter')).toBe(true);

    // Shielded major flare (80% mitigation): crew takes only 10 * 0.2 = 2 damage
    const shielded = tick(base, { panelsOut: false, shieldOn: true, oxygenLevel: 'normal' });
    const mitigatedDamage = Math.round(
      BALANCE.flare.major.crewDamage * (1 - BALANCE.flareShieldMitigation)
    );
    expect(mitigatedDamage).toBe(2);
    expect(shielded.crew.every((c) => c.health === 100 - mitigatedDamage)).toBe(true); // 98
    expect(shielded.causeLog.some((c) => c.cause === 'flare' && c.mitigatedBy === 'shield')).toBe(
      true
    );
  });

  it('resolves oxygen levels (low/normal/high), Level 2 Greenhouse, Level 3 Comms, and all crew moods', () => {
    // Level 2 Greenhouse boost
    const l2State = createInitialState({ level: 2, seed: 55, timeline: [] });
    l2State.gauges.oxygen = 70;
    const l2Tended = tick(l2State, {
      panelsOut: true,
      shieldOn: false,
      oxygenLevel: 'normal',
      waterGreenhouse: true,
    });
    expect(l2Tended.greenhouse.watered).toBe(true);
    expect(l2Tended.causeLog.some((c) => c.cause === 'greenhouse')).toBe(true);
    expect(l2Tended.gauges.oxygen).toBeGreaterThan(l2State.gauges.oxygen);

    // Level 3 Comms Delay Queue (2-Sol delay)
    let l3State = createInitialState({ level: 3, seed: 77, timeline: [] });
    l3State = tick(l3State, { queueComms: true }); // Queued on Sol 1 -> delivers on Sol 3
    expect(l3State.comms.queue).toHaveLength(1);
    expect(l3State.comms.queue[0].deliverSol).toBe(3);
    l3State = tick(l3State, { queueComms: false }); // Sol 2
    l3State = tick(l3State, { queueComms: false }); // Sol 3 -> delivered!
    expect(l3State.comms.packetsDelivered).toBe(1);
    expect(l3State.causeLog.some((c) => c.cause === 'comms-delivered')).toBe(true);

    // Worried mood when oxygen is low
    const lowO2State = createInitialState({ level: 1, seed: 1, timeline: [] });
    lowO2State.gauges.oxygen = 28;
    const afterLowO2 = tick(lowO2State, { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' });
    expect(afterLowO2.crew[0].mood).toBe('worried');

    // Exhausted mood when power is critically low at night
    const lowPwrNight = createInitialState({
      level: 1,
      seed: 1,
      timeline: [{ id: 'n1', sol: 1, type: 'night' }],
    });
    lowPwrNight.gauges.power = 22;
    const afterLowPwr = tick(lowPwrNight, { panelsOut: false, shieldOn: false, oxygenLevel: 'normal' });
    expect(afterLowPwr.crew[0].mood).toBe('exhausted');
    afterLowPwr.crew.forEach((c) => {
      expect(CREW_MOODS).toContain(c.mood);
    });
  });
});

describe('4. Win and Lose Conditions', () => {
  it('marks status as "won" when surviving the final target Sol', () => {
    const state = createInitialState({ level: 1, seed: 123, timeline: [] });
    state.sol = 14;
    state.targetSols = 14;

    const finalState = tick(state, { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' });
    expect(finalState.status).toBe('won');
    expect(finalState.solsSurvived).toBe(14);
    expect(finalState.crew.every((c) => c.mood === 'cheer')).toBe(true);
  });

  it('marks status as "lost" when Oxygen reaches 0', () => {
    const state = createInitialState({ level: 1, seed: 123, timeline: [] });
    state.gauges.oxygen = 3;

    const lostState = tick(state, { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' });
    expect(lostState.gauges.oxygen).toBe(0);
    expect(lostState.status).toBe('lost');
  });

  it('marks status as "lost" when all crew members reach 0 health', () => {
    const state = createInitialState({
      level: 1,
      seed: 123,
      timeline: [{ id: 'flr-x', sol: 1, type: 'flare', severity: 'extreme' }],
    });
    state.crew = state.crew.map((c) => ({ ...c, health: 10 }));

    const lostState = tick(state, { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' });
    expect(lostState.crew.every((c) => c.health === 0)).toBe(true);
    expect(lostState.status).toBe('lost');
  });
});

describe('5. Sol 214 Hero Decision Branches (resolveSol214Choice)', () => {
  it('handles "retract" branch: protects solar panels and crew while cutting solar generation', () => {
    const state = createInitialState({ level: 1, seed: 214 });
    state.sol = 7;
    state.missionSol = 214;

    const retracted = resolveSol214Choice(state, 'retract');
    expect(retracted.sol214.resolved).toBe(true);
    expect(retracted.sol214.decision).toBe('retract');
    expect(retracted.choices.panelsOut).toBe(false);
    expect(retracted.choices.shieldOn).toBe(true);
    expect(retracted.sol214.panelDamagedSolsRemaining).toBe(0);
    expect(retracted.crew.every((c) => c.health === 100)).toBe(true);
    expect(
      retracted.causeLog.some((c) => c.cause === 'sol214' && c.mitigatedBy === 'panelsRetracted')
    ).toBe(true);
  });

  it('handles "leave-out" branch: causes heavy battery surge, panel damage, and crew damage', () => {
    const state = createInitialState({ level: 1, seed: 214 });
    state.sol = 7;
    state.missionSol = 214;

    const leftOut = resolveSol214Choice(state, 'leave-out');
    expect(leftOut.sol214.resolved).toBe(true);
    expect(leftOut.sol214.decision).toBe('leave-out');
    expect(leftOut.choices.panelsOut).toBe(true);
    expect(leftOut.gauges.power).toBe(BALANCE.startingBattery + BALANCE.sol214.leaveOut.powerDelta);
    expect(leftOut.sol214.panelDamagedSolsRemaining).toBe(
      BALANCE.sol214.leaveOut.damagedDurationSols
    );
    expect(leftOut.crew[0].health).toBeLessThan(100);
    expect(leftOut.causeLog.some((c) => c.label === 'Flare hit')).toBe(true);
    expect(leftOut.causeLog.some((c) => c.label === 'Panels left out')).toBe(true);
  });
});

describe('6. Debrief Cause-Chain Generation (debrief.js)', () => {
  it('generates 5 linked cause-chain cards for the classic cascade: Flare hit -> Panels left out -> Battery drained -> Oxygen systems off -> Crew health fell', () => {
    let state = createInitialState({
      level: 1,
      seed: 214,
      timeline: [{ id: 'flr-1', sol: 1, type: 'flare', severity: 'extreme' }],
    });
    state.gauges.power = 12; // Low battery before flare hits with panels left out
    state.gauges.oxygen = 20;
    state.crew = state.crew.map((c) => ({ ...c, health: 25 }));

    state = tick(state, { panelsOut: true, shieldOn: false, oxygenLevel: 'normal' });
    expect(state.status).toBe('lost');

    const debrief = buildDebrief(state);
    expect(debrief.cards.length).toBeGreaterThanOrEqual(3);
    expect(debrief.cards.length).toBeLessThanOrEqual(5);
    expect(debrief.cards.map((c) => c.title)).toEqual([
      'Flare hit',
      'Panels left out',
      'Battery drained',
      'Oxygen systems off',
      'Crew health fell',
    ]);

    debrief.cards.forEach((card, idx) => {
      expect(card.scienceFact.length).toBeGreaterThan(10);
      expect(card.tip.length).toBeGreaterThan(10);
      expect(card.linkedToNext).toBe(idx < debrief.cards.length - 1);
    });
    expect(debrief.primaryCause).toBeTruthy();
    expect(debrief.stats.level).toBe(1);
  });

  it('always returns 3–5 cards with science facts and tips even for minimal or victorious runs', () => {
    const emptyDebrief = buildDebrief([]);
    expect(emptyDebrief.cards.length).toBeGreaterThanOrEqual(3);
    expect(emptyDebrief.cards.length).toBeLessThanOrEqual(5);

    const wonRun = simulateSingleRun(1, 42, optimalStrategy);
    const wonDebrief = buildDebrief(wonRun);
    expect(wonDebrief.outcome).toBe('won');
    expect(wonDebrief.primaryCause).toBe('mission_complete');
    expect(wonDebrief.cards.length).toBeGreaterThanOrEqual(3);
    expect(wonDebrief.cards.length).toBeLessThanOrEqual(5);
  });
});

describe('7. Zustand Store Contract (useGameStore.js)', () => {
  it('exposes game, ui, settings, data, and all required actions', () => {
    const store = useGameStore.getState();

    expect(store.game).toBeDefined();
    expect(store.ui).toEqual(
      expect.objectContaining({
        screen: expect.any(String),
        activeAlert: null,
        sol214Open: false,
        tutorialStep: 0,
      })
    );
    expect(store.settings).toEqual(
      expect.objectContaining({
        volume: expect.any(Number),
        muted: expect.any(Boolean),
        reducedMotion: expect.any(Boolean),
        quality: 'high',
        colourBlind: expect.any(Boolean),
      })
    );
    expect(store.data).toEqual(
      expect.objectContaining({
        eventSource: expect.any(String),
        loading: expect.any(Boolean),
      })
    );

    // Actions work cleanly
    store.startLevel(1, 214001);
    expect(useGameStore.getState().game.seed).toBe(214001);
    expect(useGameStore.getState().ui.screen).toBe('game');

    store.setChoice('shieldOn', true);
    expect(useGameStore.getState().game.choices.shieldOn).toBe(true);

    store.setChoice({ panelsOut: false, oxygenLevel: 'high' });
    expect(useGameStore.getState().game.choices.panelsOut).toBe(false);
    expect(useGameStore.getState().game.choices.oxygenLevel).toBe('high');

    store.advanceSol();
    expect(useGameStore.getState().game.sol).toBe(2);

    // Advance to Sol 7 (Mission Sol 214) and verify sol214Open flag triggers
    while (useGameStore.getState().game.sol < 7 && useGameStore.getState().game.status === 'playing') {
      useGameStore.getState().advanceSol();
    }
    expect(useGameStore.getState().game.sol).toBe(7);
    expect(useGameStore.getState().ui.sol214Open).toBe(true);

    store.resolveSol214('retract');
    expect(useGameStore.getState().ui.sol214Open).toBe(false);
    expect(useGameStore.getState().game.sol214.decision).toBe('retract');

    store.updateSettings({ reducedMotion: true, quality: 'medium', muted: true });
    expect(useGameStore.getState().settings.reducedMotion).toBe(true);
    expect(useGameStore.getState().settings.quality).toBe('medium');

    store.setScreen('tutorial');
    expect(useGameStore.getState().ui.screen).toBe('tutorial');
    store.nextTutorialStep();
    expect(useGameStore.getState().ui.tutorialStep).toBe(1);

    store.dismissAlert();
    expect(useGameStore.getState().ui.activeAlert).toBeNull();

    store.setExternalEvents([{ flrID: 'test-flr', classType: 'M2.0' }], {
      eventSource: 'live',
      loading: false,
      activeSnapshotName: 'Live NASA Feed',
    });
    expect(useGameStore.getState().data.eventSource).toBe('live');

    store.restart({ sameSeed: true });
    expect(useGameStore.getState().game.sol).toBe(1);
    expect(useGameStore.getState().game.seed).toBe(214001);
  });
});
