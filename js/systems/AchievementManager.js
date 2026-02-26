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
   */
  constructor(um, mail) {
    this.name = 'AchievementManager';
    this._um = um;
    this._mail = mail;
    /** @type {Map<string, { progress: number, unlocked: boolean, unlockedAt?: number }>} */
    this._state = new Map();

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

  _unlock(id, cfg) {
    const state = this._state.get(id);
    if (state.unlocked) return;
    state.unlocked = true;
    state.unlockedAt = Date.now();

    // Award XP
    if (cfg.reward?.xp) this._um.addXP(cfg.reward.xp);

    // Send mail with rewards (non-XP)
    const mailRewards = { ...cfg.reward };
    delete mailRewards.xp;
    const hasMailReward = Object.keys(mailRewards).length > 0;

    this._mail.send({
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

  update(dt) { /* No tick needed */ }

  serialize() { return Object.fromEntries(this._state); }

  deserialize(data) {
    if (!data) return;
    for (const [id, s] of Object.entries(data)) {
      if (this._state.has(id)) this._state.set(id, s);
    }
  }
}
