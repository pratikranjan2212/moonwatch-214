/**
 * @fileoverview Zustand store bridging the pure-JS simulation engine (`src/engine`)
 * with the React UI layer (`src/ui`) and React Three Fiber scene layer (`src/scene`).
 */

import { create } from 'zustand';
import { buildDebrief } from '../engine/debrief.js';
import { getEventsForSol, getForecast, normalizeEventType } from '../engine/events.js';
import { createRNG, normalizeSeed } from '../engine/rng.js';
import { createInitialState, resolveSol214Choice, tick } from '../engine/tick.js';

/**
 * @typedef {Object} GaugesState
 * @property {number} power  - Battery charge (0–100)
 * @property {number} oxygen - Breathable cabin oxygen (0–100)
 * @property {number} shield - Radiation shield dome integrity (0–100)
 */

/**
 * @typedef {Object} CrewMemberState
 * @property {string} id
 * @property {string} name
 * @property {string} role
 * @property {number} health - Crew health (0–100)
 * @property {'idle'|'worried'|'run-to-shelter'|'cheer'|'exhausted'} mood
 */

/**
 * @typedef {Object} PlayerChoices
 * @property {boolean} panelsOut
 * @property {boolean} shieldOn
 * @property {'low'|'normal'|'high'} oxygenLevel
 * @property {boolean} [waterGreenhouse]
 * @property {boolean} [tendGreenhouse]
 * @property {boolean} [queueComms]
 */

/**
 * @typedef {Object} GameState
 * @property {number} sol
 * @property {number} solsSurvived
 * @property {number} missionSol
 * @property {number} targetSols
 * @property {number} level
 * @property {number} seed
 * @property {GaugesState} gauges
 * @property {Array<CrewMemberState>} crew
 * @property {PlayerChoices} choices
 * @property {Array<Object>} timeline
 * @property {Array<Object>} activeEvents
 * @property {Array<Object>} eventsLog
 * @property {Array<Object>} causeLog
 * @property {'playing'|'won'|'lost'} status
 * @property {Object} sol214
 * @property {Object} greenhouse
 * @property {Object} comms
 */

/**
 * @typedef {Object} UIState
 * @property {'title'|'briefing'|'tutorial'|'game'|'debrief'|'settings'} screen
 * @property {Object|null} activeAlert
 * @property {boolean} sol214Open
 * @property {number} tutorialStep
 */

/**
 * @typedef {Object} SettingsState
 * @property {number} volume
 * @property {boolean} muted
 * @property {boolean} reducedMotion
 * @property {'high'|'medium'|'low'} quality
 * @property {boolean} colourBlind
 */

/**
 * @typedef {Object} DataState
 * @property {'live'|'snapshot'} eventSource
 * @property {boolean} loading
 * @property {string|null} activeSnapshotName
 * @property {Array<Object>} externalEvents
 */

const TUTORIAL_TOTAL_STEPS = 4;

/**
 * Finds the highest-priority alert-worthy event on a given Sol.
 *
 * @param {Array<Object>} timeline
 * @param {number} sol
 * @returns {Object|null}
 */
function pickAlertForSol(timeline, sol) {
  const eventsOnSol = getEventsForSol(timeline, sol);
  const hazard = eventsOnSol.find((evt) => {
    const t = normalizeEventType(evt.type || evt.code);
    return t === 'sol214' || t === 'flare' || t === 'cme' || t === 'dust' || t === 'comms';
  });
  return hazard || null;
}

const initialGame = createInitialState({ level: 1, seed: 2142026 });

/**
 * Main Zustand store hook for MOONWATCH: Sol 214.
 */
export const useGameStore = create((set, get) => {
  /**
   * Starts (or resets) a level with a deterministic seed and optional DONKI events.
   *
   * @param {number} [level=1]
   * @param {number|string} [seed]
   * @param {Object} [options={}]
   */
  const startLevel = (level = 1, seed = undefined, options = {}) => {
    const currentData = get().data;
    const resolvedSeed =
      seed !== undefined && seed !== null
        ? normalizeSeed(seed)
        : normalizeSeed(Date.now() ^ (level * 214));
    const externalEvents = options.externalEvents ?? currentData.externalEvents ?? [];

    const nextGame = createInitialState({
      level,
      seed: resolvedSeed,
      externalEvents,
    });

    const initialAlert = pickAlertForSol(nextGame.timeline, nextGame.sol);
    const sol214Open = Boolean(
      initialAlert && normalizeEventType(initialAlert.type) === 'sol214' && !nextGame.sol214.resolved
    );
    const nextScreen = options.screen || 'game';

    set((state) => ({
      game: nextGame,
      debrief: buildDebrief(nextGame),
      ui: {
        ...state.ui,
        screen: nextScreen,
        activeAlert: initialAlert,
        sol214Open,
      },
    }));

    return nextGame;
  };

  /**
   * Updates one or more per-Sol player allocation choices (`panelsOut`, `shieldOn`,
   * `oxygenLevel`, `waterGreenhouse`, `tendGreenhouse`, `queueComms`).
   * Supports both `setChoice('panelsOut', false)` and `setChoice({ panelsOut: false })`.
   *
   * @param {string| Partial<PlayerChoices>} keyOrPartial
   * @param {any} [value]
   */
  const setChoice = (keyOrPartial, value = undefined) => {
    set((state) => {
      const updates =
        typeof keyOrPartial === 'object' && keyOrPartial !== null
          ? keyOrPartial
          : { [keyOrPartial]: value };

      return {
        game: {
          ...state.game,
          choices: {
            ...state.game.choices,
            ...updates,
          },
        },
      };
    });
  };

  /**
   * Resolves the current Sol via `engine.tick()`, updates gauges, crew, and causeLog,
   * triggers incoming event alerts or the Sol 214 hero card, and moves to `'debrief'`
   * on win or loss.
   */
  const advanceSol = () => {
    const { game, ui } = get();
    if (game.status !== 'playing') {
      return game;
    }

    const rng = createRNG(game.seed + game.sol * 101);
    const nextGame = tick(game, game.choices, rng);
    const nextDebrief = buildDebrief(nextGame);

    if (nextGame.status === 'won' || nextGame.status === 'lost') {
      set({
        game: nextGame,
        debrief: nextDebrief,
        ui: {
          ...ui,
          screen: 'debrief',
          activeAlert: null,
          sol214Open: false,
        },
      });
      return nextGame;
    }

    const incomingAlert = pickAlertForSol(nextGame.timeline, nextGame.sol);
    const isSol214Sol = Boolean(
      nextGame.sol214?.pending ||
        (incomingAlert &&
          normalizeEventType(incomingAlert.type) === 'sol214' &&
          !nextGame.sol214?.resolved)
    );

    set({
      game: nextGame,
      debrief: nextDebrief,
      ui: {
        ...ui,
        activeAlert: incomingAlert,
        sol214Open: isSol214Sol,
      },
    });

    return nextGame;
  };

  /**
   * Resolves the Sol 214 10-second hero decision ('retract' | 'leave-out').
   *
   * @param {'retract'|'leave-out'|string|boolean|Object} decision
   */
  const resolveSol214 = (decision = 'retract') => {
    const { game, ui } = get();
    const updatedGame = resolveSol214Choice(game, decision);
    const updatedDebrief = buildDebrief(updatedGame);
    const nextScreen =
      updatedGame.status === 'won' || updatedGame.status === 'lost' ? 'debrief' : ui.screen;

    set({
      game: updatedGame,
      debrief: updatedDebrief,
      ui: {
        ...ui,
        screen: nextScreen,
        sol214Open: false,
      },
    });

    return updatedGame;
  };

  /**
   * Restarts the current (or specified) level.
   * Pass `{ sameSeed: true }` to replay the exact same seed, or omit for a fresh seed.
   *
   * @param {Object} [options={}]
   * @param {boolean} [options.sameSeed=false]
   * @param {number} [options.level]
   * @param {number|string} [options.seed]
   */
  const restart = (options = {}) => {
    const currentGame = get().game;
    const targetLevel = options.level ?? currentGame.level ?? 1;
    const nextSeed =
      options.seed !== undefined
        ? options.seed
        : options.sameSeed
          ? currentGame.seed
          : normalizeSeed(currentGame.seed + 7919);

    return startLevel(targetLevel, nextSeed, { screen: options.screen || 'game' });
  };

  /**
   * Navigates to a UI screen ('title'|'briefing'|'tutorial'|'game'|'debrief'|'settings').
   *
   * @param {'title'|'briefing'|'tutorial'|'game'|'debrief'|'settings'} screen
   */
  const setScreen = (screen) => {
    set((state) => ({
      ui: {
        ...state.ui,
        screen,
      },
    }));
  };

  /**
   * Dismisses the currently active incoming hazard alert modal.
   */
  const dismissAlert = () => {
    set((state) => ({
      ui: {
        ...state.ui,
        activeAlert: null,
      },
    }));
  };

  /**
   * Advances the guided tutorial step, transitioning to `'game'` once complete.
   */
  const nextTutorialStep = () => {
    set((state) => {
      const nextStep = state.ui.tutorialStep + 1;
      if (nextStep >= TUTORIAL_TOTAL_STEPS) {
        return {
          ui: {
            ...state.ui,
            tutorialStep: 0,
            screen: 'game',
          },
        };
      }
      return {
        ui: {
          ...state.ui,
          tutorialStep: nextStep,
        },
      };
    });
  };

  /**
   * Updates user accessibility, audio, and rendering quality settings.
   *
   * @param {Partial<SettingsState>} partialSettings
   */
  const updateSettings = (partialSettings = {}) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...partialSettings,
      },
    }));
  };

  /**
   * Injects normalized external NASA DONKI events (live or snapshot) into the store,
   * and updates the current game timeline if the run is still on Sol 1 before any ticks.
   *
   * @param {Array<Object>} events
   * @param {Object} [meta={}]
   * @param {'live'|'snapshot'} [meta.eventSource]
   * @param {boolean} [meta.loading]
   * @param {string|null} [meta.activeSnapshotName]
   */
  const setExternalEvents = (events = [], meta = {}) => {
    const safeEvents = Array.isArray(events) ? events : [];
    set((state) => {
      const nextData = {
        ...state.data,
        externalEvents: safeEvents,
        eventSource: meta.eventSource ?? meta.source ?? state.data.eventSource ?? 'snapshot',
        loading: meta.loading !== undefined ? Boolean(meta.loading) : false,
        activeSnapshotName:
          meta.activeSnapshotName !== undefined
            ? meta.activeSnapshotName
            : state.data.activeSnapshotName,
      };

      const shouldRebuildCurrentGame =
        state.game.sol === 1 &&
        state.game.status === 'playing' &&
        state.game.causeLog.length === 0;

      const updatedGame = shouldRebuildCurrentGame
        ? createInitialState({
            level: state.game.level,
            seed: state.game.seed,
            externalEvents: safeEvents,
          })
        : state.game;

      return {
        data: nextData,
        game: updatedGame,
      };
    });
  };

  const setSelectedCrew = (crewId) => {
    set({ selectedCrewId: crewId || 'commander' });
  };

  const actions = {
    startLevel,
    setChoice,
    advanceSol,
    resolveSol214,
    restart,
    setScreen,
    dismissAlert,
    nextTutorialStep,
    updateSettings,
    setExternalEvents,
    setSelectedCrew,
  };

  return {
    game: initialGame,
    debrief: buildDebrief(initialGame),
    selectedCrewId: 'commander',
    ui: {
      screen: 'title',
      activeAlert: null,
      sol214Open: false,
      tutorialStep: 0,
    },
    settings: {
      volume: 0.8,
      muted: false,
      reducedMotion: false,
      quality: 'high',
      colourBlind: false,
    },
    data: {
      eventSource: 'snapshot',
      loading: false,
      activeSnapshotName: 'May 2024 Gannon Superstorm (AR 13664)',
      externalEvents: [],
    },
    actions,
    // Expose actions directly on store root as well for flexible selector usage
    ...actions,
    // Selector helpers
    getForecast: (lookaheadSols = 4) => {
      const { game } = get();
      return getForecast(game.timeline, game.sol, lookaheadSols);
    },
  };
});

export default useGameStore;
