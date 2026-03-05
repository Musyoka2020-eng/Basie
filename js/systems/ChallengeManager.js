/**
 * ChallengeManager.js
 * Tracks daily/weekly challenges + two separate pass XP tracks:
 *   - Daily Pass  (fed by daily challenge claims, resets each day)
 *   - Weekly Pass (fed by weekly challenge claims, resets each Monday)
 * Milestones auto-deliver rewards when the XP threshold is crossed.
 */
import { eventBus }                                               from '../core/EventBus.js';
import { CHALLENGES_CONFIG, DAILY_PASS_CONFIG, CHALLENGE_PASS_CONFIG } from '../entities/GAME_DATA.js';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${Math.ceil((((d - yearStart) / 86400000) + 1) / 7)}`;
}

export class ChallengeManager {
  /**
   * @param {import('./ResourceManager.js').ResourceManager}    resourceManager
   * @param {import('./MailManager.js').MailManager}             mailManager
   * @param {import('./InventoryManager.js').InventoryManager}  inventoryManager
   */
  constructor(resourceManager, mailManager, inventoryManager) {
    this.name  = 'ChallengeManager';
    this._rm   = resourceManager;
    this._mail = mailManager;
    this._inv  = inventoryManager;   // may be null; only used for pass milestone items

    /** @type {Map<string, { progress: number, claimed: boolean, lastReset: string }>} */
    this._state = new Map();
    for (const cfg of CHALLENGES_CONFIG) {
      this._state.set(cfg.id, { progress: 0, claimed: false, lastReset: this._resetKey(cfg.type) });
    }

    // Daily Pass state (resets each day)
    this._dailyPassXp               = 0;
    this._dailyPassDay               = todayStr();
    this._dailyPassClaimedMilestones = new Set();

    // Weekly Pass state (resets each Monday)
    this._weeklyPassXp               = 0;
    this._weeklyPassWeek             = isoWeek();
    this._weeklyPassClaimedMilestones = new Set();

    this._resetAccumMs = 0;
    this._registerEvents();
    this._resetIfNeeded();
  }

  // ─── LIFECYCLE ─────────────────────────────────────────────────

  init() { /* setup done in constructor */ }

  _registerEvents() {
    for (const cfg of CHALLENGES_CONFIG) {
      eventBus.on(cfg.objective.event, d => this._progress(cfg.id, d));
    }
  }

  update(dt) {
    this._resetAccumMs += dt;
    if (this._resetAccumMs >= 60_000) {
      this._resetAccumMs = 0;
      this._resetIfNeeded();
    }
  }

  // ─── RESET ─────────────────────────────────────────────────────

  _resetKey(type) {
    return type === 'weekly' ? isoWeek() : todayStr();
  }

  _resetIfNeeded() {
    let changed = false;

    for (const cfg of CHALLENGES_CONFIG) {
      const entry      = this._state.get(cfg.id);
      const currentKey = this._resetKey(cfg.type);
      if (entry.lastReset !== currentKey) {
        entry.progress  = 0;
        entry.claimed   = false;
        entry.lastReset = currentKey;
        changed = true;
      }
    }

    // Daily pass resets each day
    const today = todayStr();
    if (this._dailyPassDay !== today) {
      this._dailyPassXp               = 0;
      this._dailyPassDay               = today;
      this._dailyPassClaimedMilestones = new Set();
      changed = true;
    }

    // Weekly pass resets each Monday
    const currentWeek = isoWeek();
    if (this._weeklyPassWeek !== currentWeek) {
      this._weeklyPassXp               = 0;
      this._weeklyPassWeek             = currentWeek;
      this._weeklyPassClaimedMilestones = new Set();
      changed = true;
    }

    if (changed) eventBus.emit('challenges:updated', this._getPublicState());
  }

  // ─── PROGRESS ──────────────────────────────────────────────────

  _progress(id, eventData) {
    const cfg   = CHALLENGES_CONFIG.find(c => c.id === id);
    const entry = this._state.get(id);
    if (!cfg || !entry || entry.claimed) return;

    const amount = cfg.objective.countField
      ? (eventData?.[cfg.objective.countField] ?? 1)
      : 1;
    entry.progress = Math.min(entry.progress + amount, cfg.objective.count);

    eventBus.emit('challenges:updated', this._getPublicState());
  }

  // ─── CLAIM ─────────────────────────────────────────────────────

  claimReward(id) {
    const cfg   = CHALLENGES_CONFIG.find(c => c.id === id);
    const entry = this._state.get(id);
    if (!cfg || !entry)                       return false;
    if (entry.claimed)                         return false;
    if (entry.progress < cfg.objective.count)  return false;

    entry.claimed = true;

    if (!this._inv) throw new Error('ChallengeManager: InventoryManager not wired — cannot grant rewards.');
    this._inv.grantRewards(cfg.reward);

    const rewardText = cfg.reward
      .map(r => r.type === 'resource' ? `+${r.quantity} ${r.itemId}` : r.itemId.replace(/_/g, ' '))
      .join(', ');

    this._mail.send({
      type:    'system',
      subject: `✅ Challenge Complete: ${cfg.name}`,
      body:    `Completed "${cfg.description}". Rewards: ${rewardText}`,
      icon:    '🏆',
    });

    // Route XP to the correct pass based on challenge type
    if (cfg.xpReward) this._awardPassXp(cfg.xpReward, cfg.type);

    eventBus.emit('challenges:claimReward', { id, rewards: cfg.reward });
    eventBus.emit('challenges:updated', this._getPublicState());
    return true;
  }

  // ─── PASS XP ───────────────────────────────────────────────────

  /** @param {number} amount  @param {'daily'|'weekly'} type */
  _awardPassXp(amount, type) {
    if (type === 'daily') {
      this._dailyPassXp += amount;
    } else {
      this._weeklyPassXp += amount;
    }
    // Milestones are NOT auto-claimed — the player must click each chest to claim.
    eventBus.emit('challenges:updated', this._getPublicState());
  }

  /**
   * Player-initiated claim for a pass milestone chest.
   * Rewards go to inventory (via grantRewards), not base resources directly.
   * @param {'daily'|'weekly'} type
   * @param {number} index  — zero-based index into the pass config array
   * @returns {{ success: boolean, reason?: string }}
   */
  claimPassMilestone(type, index) {
    const config     = type === 'daily' ? DAILY_PASS_CONFIG : CHALLENGE_PASS_CONFIG;
    const claimedSet = type === 'daily' ? this._dailyPassClaimedMilestones : this._weeklyPassClaimedMilestones;
    const currentXp  = type === 'daily' ? this._dailyPassXp : this._weeklyPassXp;
    const milestone  = config[index];

    if (!milestone)               return { success: false, reason: 'Milestone not found.' };
    if (claimedSet.has(index))    return { success: false, reason: 'Already claimed.' };
    if (currentXp < milestone.xp) return { success: false, reason: 'Not yet unlocked.' };

    claimedSet.add(index);
    if (!this._inv) throw new Error('ChallengeManager: InventoryManager not wired — cannot grant milestone rewards.');
    this._inv.grantRewards(milestone.rewards);

    eventBus.emit('challenges:passMilestone', { index, milestone, type });
    eventBus.emit('challenges:updated', this._getPublicState());
    return { success: true };
  }

  // ─── PUBLIC API ────────────────────────────────────────────────

  getActiveChallenges() {
    return CHALLENGES_CONFIG.map(cfg => {
      const entry = this._state.get(cfg.id) ?? { progress: 0, claimed: false };
      return {
        ...cfg,
        progress:  entry.progress,
        claimed:   entry.claimed,
        completed: entry.progress >= cfg.objective.count,
      };
    });
  }

  getDailyPassState() {
    const maxXp = DAILY_PASS_CONFIG[DAILY_PASS_CONFIG.length - 1].xp;
    return {
      xp:        this._dailyPassXp,
      maxXp,
      day:       this._dailyPassDay,
      milestones: DAILY_PASS_CONFIG.map((m, i) => ({
        ...m,
        index:    i,
        claimed:  this._dailyPassClaimedMilestones.has(i),
        unlocked: this._dailyPassXp >= m.xp,
      })),
    };
  }

  getPassState() {
    const maxXp = CHALLENGE_PASS_CONFIG[CHALLENGE_PASS_CONFIG.length - 1].xp;
    return {
      xp:        this._weeklyPassXp,
      maxXp,
      week:      this._weeklyPassWeek,
      milestones: CHALLENGE_PASS_CONFIG.map((m, i) => ({
        ...m,
        index:    i,
        claimed:  this._weeklyPassClaimedMilestones.has(i),
        unlocked: this._weeklyPassXp >= m.xp,
      })),
    };
  }

  getClaimableCount() {
    return this.getActiveChallenges().filter(c => c.completed && !c.claimed).length;
  }

  // ─── SERIALIZATION ─────────────────────────────────────────────

  serialize() {
    return {
      challenges: Object.fromEntries(this._state),
      dailyPass: {
        xp:               this._dailyPassXp,
        day:              this._dailyPassDay,
        claimedMilestones: [...this._dailyPassClaimedMilestones],
      },
      weeklyPass: {
        xp:               this._weeklyPassXp,
        week:             this._weeklyPassWeek,
        claimedMilestones: [...this._weeklyPassClaimedMilestones],
      },
    };
  }

  deserialize(data) {
    if (!data) return;

    // Support old flat format (before passes were added)
    const challengeData = data.challenges ?? data;
    for (const [id, entry] of Object.entries(challengeData)) {
      if (this._state.has(id)) Object.assign(this._state.get(id), entry);
    }

    if (data.dailyPass) {
      this._dailyPassXp               = data.dailyPass.xp ?? 0;
      this._dailyPassDay               = data.dailyPass.day ?? todayStr();
      this._dailyPassClaimedMilestones = new Set(data.dailyPass.claimedMilestones ?? []);
    }

    // Support old single-pass format (data.pass) migrating to weeklyPass
    const weekly = data.weeklyPass ?? data.pass;
    if (weekly) {
      this._weeklyPassXp               = weekly.xp ?? 0;
      this._weeklyPassWeek             = weekly.week ?? isoWeek();
      this._weeklyPassClaimedMilestones = new Set(weekly.claimedMilestones ?? []);
    }

    this._resetIfNeeded();
  }

  _getPublicState() {
    return {
      challenges: this.getActiveChallenges(),
      dailyPass:  this.getDailyPassState(),
      weeklyPass: this.getPassState(),
    };
  }
}
