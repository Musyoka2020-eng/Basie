/**
 * AchievementManager.js
 * Tracks player milestones and unlocks achievements.
 * Listens to EventBus events, persists unlocked state, and sends mail rewards.
 */
import { eventBus } from '../core/EventBus.js';
import { ACHIEVEMENTS_CONFIG } from '../entities/GAME_DATA.js';

const RARITY_COLORS = {
  common: 'var(--clr-text-secondary)',
  uncommon: 'var(--clr-success)',
  rare: 'var(--clr-primary)',
  legendary: 'var(--clr-gold)',
};

export class AchievementManager {
  /**
   * @param {import('./UserManager.js').UserManager} um
   * @param {import('./MailManager.js').MailManager} mail
   * @param {import('./ResourceManager.js').ResourceManager} rm
   * @param {import('./InventoryManager.js').InventoryManager} inv
   */
  constructor(um, mail, rm, inv) {
    this.name = 'AchievementManager';
    this._um   = um;
    this._mail = mail;
    this._rm   = rm;
    this._inv  = inv;
    /** @type {Map<string, { progress: number, unlocked: boolean, unlockedAt?: number }>} */
    this._state = new Map();
    this._ratchetTimer    = 0;
    this._lastMoneyChecked = 0;
    this._lastIronChecked  = 0;

    for (const id of Object.keys(ACHIEVEMENTS_CONFIG)) {
      this._state.set(id, { progress: 0, unlocked: false });
    }

    this._registerEvents();
  }

  _registerEvents() {
    eventBus.on('combat:victory',    () => this._progress('combat_win'));
    eventBus.on('unit:trained',      d  => this._progress('unit_trained', d?.count ?? 1));
    eventBus.on('building:completed',() => this._progress('build'));
    eventBus.on('quest:completed',   () => this._progress('quest_completed'));
    eventBus.on('tech:researched',   () => this._progress('research'));
    eventBus.on('hero:recruited',    () => this._progress('hero_recruited'));
    // New triggers
    eventBus.on('user:levelUp',      d  => this._progressSet('user_level', d?.level ?? 1));
    eventBus.on('user:dailyLogin',   d  => this._progressSet('login_streak', d?.streak ?? 1));
    eventBus.on('market:traded',     () => this._progress('market_trade'));
  }

  _progress(trigger, amount = 1) {
    for (const [id, cfg] of Object.entries(ACHIEVEMENTS_CONFIG)) {
      if (cfg.trigger !== trigger) continue;
      const state = this._state.get(id);
      if (state.unlocked) continue;
      state.progress = Math.min((state.progress ?? 0) + amount, cfg.count);
      if (state.progress >= cfg.count) {
        this._unlock(id, cfg);
      }
    }
    eventBus.emit('achievements:updated', this.getAchievementsWithState());
  }

  /**
   * Set progress to an absolute value (used for streak/level/ratchet triggers
   * where the event data already carries the current total).
   */
  _progressSet(trigger, value) {
    let changed = false;
    for (const [id, cfg] of Object.entries(ACHIEVEMENTS_CONFIG)) {
      if (cfg.trigger !== trigger) continue;
      const state = this._state.get(id);
      if (state.unlocked) continue;
      const newProg = Math.min(value, cfg.count);
      if (newProg > (state.progress ?? 0)) {
        state.progress = newProg;
        changed = true;
        if (state.progress >= cfg.count) this._unlock(id, cfg);
      }
    }
    if (changed) eventBus.emit('achievements:updated', this.getAchievementsWithState());
  }

  _unlock(id, cfg) {
    const state = this._state.get(id);
    if (state.unlocked) return;
    state.unlocked = true;
    state.unlockedAt = Date.now();

    // Award XP
    if (cfg.reward?.xp) this._um.addXP(cfg.reward.xp);

    // Directly apply resource rewards (non-XP)
    const resourceRewards = { ...cfg.reward };
    delete resourceRewards.xp;
    delete resourceRewards.items;
    if (this._rm && Object.keys(resourceRewards).length > 0) {
      this._rm.add(resourceRewards);
    }

    // Directly apply item rewards
    if (this._inv && cfg.reward?.items?.length) {
      for (const entry of cfg.reward.items) {
        const itemId = typeof entry === 'string' ? entry : entry.id;
        const qty    = typeof entry === 'string' ? 1     : (entry.qty ?? 1);
        this._inv.addItem(itemId, qty);
      }
    }

    // Send mail as a receipt/notification
    const mailRewards = { ...cfg.reward };
    delete mailRewards.xp;
    const hasMailReward = Object.keys(mailRewards).length > 0;

    this._mail.send({
      type: 'achievement',
      subject: `🏆 Achievement Unlocked: ${cfg.name}`,
      body: cfg.description,
      icon: cfg.icon,
      attachments: hasMailReward ? mailRewards : null,
    });

    eventBus.emit('achievement:unlocked', { id, ...cfg });
  }

  getAchievementsWithState() {
    return Object.values(ACHIEVEMENTS_CONFIG).map(cfg => ({
      ...cfg,
      ...this._state.get(cfg.id),
    }));
  }

  getUnlockedCount() {
    return [...this._state.values()].filter(s => s.unlocked).length;
  }

  update(dt) {
    // Ratchet-check cumulative resource totals once per minute
    this._ratchetTimer += dt;
    if (this._ratchetTimer < 60) return;
    this._ratchetTimer = 0;
    const stats = this._um.getProfile().stats;
    if (!stats) return;
    if (stats.moneyEarned > this._lastMoneyChecked) {
      this._progressSet('total_money', stats.moneyEarned);
      this._lastMoneyChecked = stats.moneyEarned;
    }
    if (stats.ironEarned > this._lastIronChecked) {
      this._progressSet('total_iron', stats.ironEarned);
      this._lastIronChecked = stats.ironEarned;
    }
  }

  serialize() { return Object.fromEntries(this._state); }

  deserialize(data) {
    if (!data) return;
    for (const [id, s] of Object.entries(data)) {
      if (this._state.has(id)) this._state.set(id, s);
    }
  }
}
