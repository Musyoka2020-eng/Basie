/**
 * UserManager.js
 * Manages the player profile: name, level, XP, and settings.
 * In a future version, would handle Firebase Auth state.
 */
import { eventBus } from '../core/EventBus.js';

const XP_PER_LEVEL_BASE = 500;

export class UserManager {
  constructor() {
    this.name = 'UserManager';
    this._profile = {
      username: 'Commander',
      level: 1,
      xp: 0,
      xpToNext: XP_PER_LEVEL_BASE,
      isGuest: false,
    };
  }

  getProfile() { return { ...this._profile }; }

  setUsername(name) {
    this._profile.username = name || 'Commander';
    eventBus.emit('user:profileUpdated', this.getProfile());
  }

  /**
   * Add experience points and trigger level-up if threshold met.
   * @param {number} amount
   */
  addXP(amount) {
    this._profile.xp += amount;
    while (this._profile.xp >= this._profile.xpToNext) {
      this._profile.xp -= this._profile.xpToNext;
      this._profile.level++;
      this._profile.xpToNext = Math.floor(XP_PER_LEVEL_BASE * Math.pow(1.4, this._profile.level - 1));
      eventBus.emit('user:levelUp', { level: this._profile.level });
    }
    eventBus.emit('user:xpGained', { xp: amount, profile: this.getProfile() });
  }

  setGuest(isGuest) {
    this._profile.isGuest = isGuest;
  }

  update(dt) { /* No tick needed */ }

  serialize() { return { ...this._profile }; }

  deserialize(data) {
    if (!data) return;
    Object.assign(this._profile, data);
  }
}
