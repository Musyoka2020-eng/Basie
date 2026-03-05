/**
 * GameEngine.js
 * The central game loop using requestAnimationFrame.
 * Drives all registered system update calls with precise delta time (dt).
 * Also handles offline progress calculation on load.
 */
import { eventBus } from './EventBus.js';

export class GameEngine {
  /**
   * @param {{ log: (tag: string, msg: string, level?: string) => void }} [logManager]
   */
  constructor(logManager = null) {
    this._log     = logManager; // LogManager instance (optional)
    this._systems = [];
    this._lastTimestamp = null;
    this._rafId = null;
    this._running = false;
    this.tickCount = 0;

    // Target: 20 ticks per second for smooth but not excessive resource updates
    this.TICK_RATE_MS = 50;
    this._accumulator = 0;
    // Emit tick:ui every 20 ticks (~1s) for live UI progress bar updates
    this._uiTickInterval = 20;

    // Game mode: 'campaign' | 'survival' | 'sandbox'
    // Selectable only at new-game time; stored in save state.
    this._gameMode = 'campaign';
  }

  /** @returns {'campaign'|'survival'|'sandbox'} */
  get gameMode() { return this._gameMode; }

  /**
   * Set the active game mode. Emits 'game:modeChanged'.
   * @param {'campaign'|'survival'|'sandbox'} mode
   */
  setGameMode(mode) {
    const valid = ['campaign', 'survival', 'sandbox'];
    if (!valid.includes(mode)) return;
    this._gameMode = mode;
    eventBus.emit('game:modeChanged', { mode });
    console.log(`[GameEngine] Game mode set to: ${mode}`);
  }

  /**
   * Register a system with an update(dt) method.
   * @param {{ name: string, update: (dt: number) => void }} system
   */
  registerSystem(system) {
    if (typeof system.update !== 'function') {
      throw new Error(`[GameEngine] System "${system.name}" must have an update(dt) method.`);
    }
    this._systems.push(system);
    console.log(`[GameEngine] Registered system: ${system.name}`);
  }

  /**
   * Calculate how long the player was offline and simulate ticks.
   * @param {number} lastSavedTimestamp - Unix ms timestamp from last save
   * @returns {number} offlineMs
   */
  calculateOfflineProgress(lastSavedTimestamp) {
    if (!lastSavedTimestamp) return 0;
    const offlineMs = Date.now() - lastSavedTimestamp;
    // Cap at 24 hours of offline progress
    const cappedMs = Math.min(offlineMs, 24 * 60 * 60 * 1000);
    if (cappedMs < 5000) return 0; // Ignore less than 5s offline

    console.log(`[GameEngine] Simulating ${(cappedMs / 1000).toFixed(0)}s of offline progress.`);
    // Fast-simulate ticks for offline period
    let remaining = cappedMs;
    while (remaining > this.TICK_RATE_MS) {
      const dt = this.TICK_RATE_MS / 1000;
      this._systems.forEach(sys => {
        try { sys.update(dt); }
        catch (e) {
          console.error(`[GameEngine] Offline sim error in ${sys.name}:`, e);
          this._log?.log('GameEngine', `Offline sim error in ${sys.name}: ${e?.message ?? e}`, 'error');
        }
      });
      remaining -= this.TICK_RATE_MS;
    }
    return cappedMs;
  }

  /**
   * Start the game loop.
   */
  start() {
    if (this._running) return;
    this._running = true;
    this._lastTimestamp = performance.now();
    this._loop(this._lastTimestamp);
    console.log('[GameEngine] Loop started.');
  }

  /**
   * Stop the game loop.
   */
  stop() {
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    console.log('[GameEngine] Loop stopped.');
  }

  /**
   * The internal RAF loop.
   * @private
   */
  _loop(timestamp) {
    if (!this._running) return;

    const frameMs = Math.min(timestamp - this._lastTimestamp, 250); // Cap to prevent spiral of death
    this._lastTimestamp = timestamp;
    this._accumulator += frameMs;

    // Fixed timestep updates
    while (this._accumulator >= this.TICK_RATE_MS) {
      const dt = this.TICK_RATE_MS / 1000; // in seconds
      this._systems.forEach(sys => {
        try { sys.update(dt); }
        catch (e) {
          console.error(`[GameEngine] Error in system "${sys.name}":`, e);
          this._log?.log('GameEngine', `Error in system "${sys.name}": ${e?.message ?? e}`, 'error');
        }
      });
      this._accumulator -= this.TICK_RATE_MS;
      this.tickCount++;
      // Emit UI tick every ~1 second for live progress bar updates
      if (this.tickCount % this._uiTickInterval === 0) {
        eventBus.emit('tick:ui', { tickCount: this.tickCount });
      }
      // Heartbeat log every ~10 seconds (200 ticks @ 20 tps)
      if (this.tickCount % 200 === 0) {
        this._log?.log('GameEngine', `heartbeat tick=${this.tickCount}`, 'info');
      }
    }

    this._rafId = requestAnimationFrame(ts => this._loop(ts));
  }
}
