/**
 * A Little Wish — Community World Reactive State Store
 */

import { sanitizeDesignConfig } from './services/safety.js';

export function createDefaultDesignConfig() {
  return sanitizeDesignConfig({
    baseId: 'banana-bowl',
    baseTint: null,
    diameter: 1.0,
    height: 1.0,
    candleId: 'beeswax',
    candleLit: true,
    ornaments: {
      baisiCount: 0,
      incense: false,
      pearlGarland: false,
      stardustGlow: false,
    },
    flowers: [
      {
        species: 'lotus',
        color: null,
        count: 8,
        size: 1.0,
        layout: 'outer-ring',
        radiusRatio: 0.78,
        angleOffset: 0,
      },
      {
        species: 'jasmine',
        color: null,
        count: 6,
        size: 0.88,
        layout: 'inner-ring',
        radiusRatio: 0.46,
        angleOffset: 15,
      },
    ],
  });
}

const initialState = () => ({
  scene: 1,
  session: null,
  backendMode: 'local-browser',

  // Scene 3: Creator vs System Collection (SYS-KR-001..010)
  studioMode: 'creator', // 'creator' | 'collection'
  collectionIndex: 0,
  editingKrathongId: null,
  designConfig: createDefaultDesignConfig(),

  // Scene 4 & 5
  candleLit: false,
  wishText: '',
  hasReleased: false,
  releasedRecord: null,
  exploreMode: false,

  // Community World Data
  playerKrathongs: [],
  activeProfile: null,

  // Audio
  soundEnabled: false,
  userToggledSound: false,
});

class AppState {
  constructor() {
    this._state = initialState();
    this._listeners = new Set();
  }

  get current() {
    return this._state;
  }

  update(patch) {
    this._state = { ...this._state, ...patch };
    for (const fn of this._listeners) {
      fn(this._state, patch);
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  startNewCraft({ keepSession = true } = {}) {
    const keep = keepSession ? this._state.session : null;
    this.update({
      editingKrathongId: null,
      designConfig: createDefaultDesignConfig(),
      candleLit: false,
      wishText: '',
      hasReleased: false,
      releasedRecord: null,
      exploreMode: false,
      session: keep,
    });
  }

  resetToTitle() {
    const keepSound = this._state.soundEnabled;
    const keepToggle = this._state.userToggledSound;
    const keepSession = this._state.session;
    const keepPlayers = this._state.playerKrathongs;
    const keepMode = this._state.backendMode;

    this._state = {
      ...initialState(),
      soundEnabled: keepSound,
      userToggledSound: keepToggle,
      session: keepSession,
      playerKrathongs: keepPlayers,
      backendMode: keepMode,
    };
    for (const fn of this._listeners) {
      fn(this._state, this._state);
    }
  }
}

export const store = new AppState();
