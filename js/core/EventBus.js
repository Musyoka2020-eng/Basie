/**
 * EventBus.js
 * A lightweight publish/subscribe event bus for decoupled communication
 * between all game systems. This is the backbone of the OOP architecture.
 */
export class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Register a listener for an event.
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);
    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  /**
   * Register a listener that fires only once.
   * @param {string} event
   * @param {Function} callback
   */
  once(event, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  /**
   * Remove a specific listener.
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);
    if (listeners) listeners.delete(callback);
  }

  /**
   * Emit an event with optional data payload.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    const listeners = this._listeners.get(event);
    if (!listeners || listeners.size === 0) return;
    listeners.forEach(cb => {
      try { cb(data); }
      catch (err) { console.error(`[EventBus] Error in listener for "${event}":`, err); }
    });
  }

  /**
   * Clear all listeners for a given event or all events.
   * @param {string} [event]
   */
  clear(event) {
    if (event) this._listeners.delete(event);
    else this._listeners.clear();
  }
}

// Singleton instance shared across all systems
export const eventBus = new EventBus();
