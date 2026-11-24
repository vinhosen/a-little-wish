/**
 * A Little Wish — Lightweight Reactive State Store
 */

import { KRATHONGS } from './config.js';

const initialState = () => ({
  scene: 1,
  krathongIndex: 0,
  candleLit: false,
  wishText: '',
  hasReleased: false,
  floatCompleted: false,
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

  get selectedKrathong() {
    return KRATHONGS[this._state.krathongIndex] || KRATHONGS[0];
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

  /**
   * Cleanly reset the experience back to Scene 1 while keeping
   * the user's current audio mute/unmute preference intact.
   */
  resetExperience() {
    const keepSound = this._state.soundEnabled;
    const keepToggle = this._state.userToggledSound;
    this._state = {
      ...initialState(),
      soundEnabled: keepSound,
      userToggledSound: keepToggle,
    };
    for (const fn of this._listeners) {
      fn(this._state, this._state);
    }
  }
}

export const store = new AppState();
