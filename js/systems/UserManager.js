/**
 * UserManager.js
 * Manages the player profile: name, level, XP, and settings.
 * In a future version, would handle Firebase Auth state.
 */
import { eventBus } from '../core/EventBus.js';
import { DAILY_LOGIN_REWARDS, DAILY_LOGIN_MILESTONE } from '../entities/GAME_DATA.js';

const XP_PER_LEVEL_BASE = 500;

export class UserManager {
  constructor() {
    this.name = 'UserManager';
    this._profile = {
      username:       'Commander',
      level:          1,
      xp:             0,
      xpToNext:       XP_PER_LEVEL_BASE,
      isGuest:        false,
      lastLoginDate:  null,   // ISO date string 'YYYY-MM-DD'
      loginStreak:    0,
      totalDaysPlayed: 0,
    };
  }

  getProfile() { return { ...this._profile }; }

  setUsername(name) {
    this._profile.username = name || 'Commander';
    eventBus.emit('user:profileUpdated', this.getProfile());
  }

  /**
   * Call once on game launch. Detects if today is a new calendar day,
   * increments (or resets) the streak, and emits 'user:dailyLogin'.
   * Returns { day, streak, rewards } or null if already logged in today.
   */
  checkDailyLogin() {
    const todayStr = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const last     = this._profile.lastLoginDate;

    if (last === todayStr) return null;   // already claimed today

    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (last === yesterdayStr) {
      this._profile.loginStreak++;        // consecutive day
    } else {
      this._profile.loginStreak = 1;      // gap > 1 day — reset
    }

    this._profile.lastLoginDate   = todayStr;
    this._profile.totalDaysPlayed = (this._profile.totalDaysPlayed || 0) + 1;

    const streak = this._profile.loginStreak;

    // Milestone every 30 consecutive days
    let rewards;
    if (streak % 30 === 0) {
      rewards = { ...DAILY_LOGIN_MILESTONE };
    } else {
      const dayIndex = ((streak - 1) % DAILY_LOGIN_REWARDS.length);
      rewards = { ...DAILY_LOGIN_REWARDS[dayIndex].rewards };
    }

    const day = ((streak - 1) % DAILY_LOGIN_REWARDS.length) + 1;
    const payload = { day, streak, rewards };
    eventBus.emit('user:dailyLogin', payload);
    return payload;
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
