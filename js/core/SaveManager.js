/**
 * SaveManager.js
 * Handles reading/writing game state to localStorage (offline-first).
 * Designed to be extensible — swap the storage backend to Firestore
 * by replacing the read/write methods here.
 */
import { eventBus } from './EventBus.js';

const SAVE_KEY = 'basie_game_state';
const AUTOSAVE_INTERVAL_MS = 30_000; // 30 seconds

export class SaveManager {
  constructor() {
    this.name = 'SaveManager';
    this._autosaveTimer = null;
  }

  /**
   * Load raw game state from localStorage.
   * @returns {object|null}
   */
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      console.log('[SaveManager] Game state loaded successfully.');
      return state;
    } catch (e) {
      console.error('[SaveManager] Failed to parse save:', e);
      return null;
    }
  }

  /**
   * Save the provided game state object to localStorage.
   * @param {object} state
   */
  save(state) {
    if (this._isWiping) return; // Prevent beforeunload hook from re-saving after a wipe
    try {
      state.lastSavedTimestamp = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      eventBus.emit('game:saved', { timestamp: state.lastSavedTimestamp });
    } catch (e) {
      console.error('[SaveManager] Failed to save state:', e);
    }
  }

  /**
   * Start auto-saving by calling the provided getter function every interval.
   * @param {Function} getStateFn - Returns the current game state object.
   */
  startAutosave(getStateFn) {
    this.stopAutosave();
    this._autosaveTimer = setInterval(() => {
      const state = getStateFn();
      this.save(state);
    }, AUTOSAVE_INTERVAL_MS);
    console.log(`[SaveManager] Autosave started (every ${AUTOSAVE_INTERVAL_MS / 1000}s).`);
  }

  stopAutosave() {
    if (this._autosaveTimer) clearInterval(this._autosaveTimer);
    this._autosaveTimer = null;
  }

  /**
   * Wipe all saved state (used by SettingsManager).
   */
  wipe() {
    this._isWiping = true;
    localStorage.removeItem(SAVE_KEY);
    eventBus.emit('game:wiped');
    console.log('[SaveManager] Save data wiped.');
  }
}
