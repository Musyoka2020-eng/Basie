/**
 * TechnologyManager.js
 * Manages the multi-level research technology tree with a research queue.
 *
 * Key design decisions:
 *  - Each tech has a `maxLevel` (from TECH_CONFIG). Research is a per-level action.
 *  - Cost and time for each level scale via `levelCostMultiplier` / `levelTimeMultiplier`.
 *  - Per-level requirement overrides via `levelRequirements` in TECH_CONFIG.
 *  - A global research queue (array of techIds in order) supports multiple concurrent slots.
 *  - Queue slot count is determined by Workshop level + optional premium slots.
 *  - Effects stack linearly: completing Lv.2 adds the base effects a second time.
 */
import { eventBus }                                    from '../core/EventBus.js';
import { TECH_CONFIG, BUILDINGS_CONFIG, QUEUE_CONFIG } from '../entities/GAME_DATA.js';

export class TechnologyManager {
  /**
   * @param {import('./ResourceManager.js').ResourceManager} rm
   * @param {import('./BuildingManager.js').BuildingManager} bm
   */
  constructor(rm, bm) {
    this.name = 'TechnologyManager';
    this._rm  = rm;
    this._bm  = bm;

    /** @type {Map<string, { level: number, researchEndsAt: number|null, startedAt: number|null }>} */
    this._state = new Map();
    /** Cumulative applied bonuses from ALL completed research levels */
    this._appliedBonuses = {};
    /** Ordered research queue — array of techId strings */
    this._queue = [];
    /** Extra premium-purchased queue slots */
    this._premiumQueueSlots = 0;

    for (const id of Object.keys(TECH_CONFIG)) {
      this._state.set(id, { level: 0, researchEndsAt: null, startedAt: null });
    }
  }

  // ─────────────────────────────────────────────
  // Engine tick
  // ─────────────────────────────────────────────

  update(_dt) {
    if (!this._queue.length) return;

    const activeId = this._queue[0];
    const state    = this._state.get(activeId);
    if (!state?.researchEndsAt) return;

    if (Date.now() >= state.researchEndsAt) {
      state.researchEndsAt = null;
      state.startedAt      = null;
      state.level         += 1;

      const cfg = TECH_CONFIG[activeId];
      this._applyEffects(cfg);
      eventBus.emit('tech:researched', { id: activeId, name: cfg.name, level: state.level, effects: cfg.effects });

      this._queue.shift();
      if (this._queue.length > 0) this._startActiveQueueItem();

      eventBus.emit('tech:updated',      this.getTechWithState());
      eventBus.emit('tech:queueUpdated', this.getQueue());
    }
  }

  // ─────────────────────────────────────────────
  // Public actions
  // ─────────────────────────────────────────────

  /**
   * Reduce the active research timer by `seconds` seconds.
   * @param {number} seconds
   * @returns {{ success: boolean, remaining?: number, reason?: string }}
   */
  reduceActiveResearchTimer(seconds) {
    if (!this._queue.length) return { success: false, reason: 'No research in progress.' };
    const activeId = this._queue[0];
    const state    = this._state.get(activeId);
    if (!state?.researchEndsAt) return { success: false, reason: 'No research in progress.' };
    const now = Date.now();
    if (state.researchEndsAt <= now) return { success: false, reason: 'Research is already completing.' };
    const skipMs = (seconds >= 999999 ? state.researchEndsAt - now + 1000 : seconds * 1000);
    state.researchEndsAt = Math.max(now, state.researchEndsAt - skipMs);
    eventBus.emit('tech:queueUpdated', this.getQueue());
    const remaining = Math.max(0, state.researchEndsAt - now);
    return { success: true, remaining, completed: remaining <= 0 };
  }

  /**
   * Queue a technology for research (next available level).
   * @param {string} techId
   * @returns {{ success: boolean, reason?: string }}
   */
  research(techId) {
    const cfg = TECH_CONFIG[techId];
    if (!cfg) return { success: false, reason: 'Unknown technology.' };

    const state        = this._state.get(techId);
    const currentLevel = state.level;
    const targetLevel  = currentLevel + 1;

    if (currentLevel >= cfg.maxLevel)
      return { success: false, reason: 'Already at maximum level.' };

    if (this._queue.includes(techId))
      return { success: false, reason: 'Already in research queue.' };

    const maxSlots = this._getMaxQueueSlots();
    if (this._queue.length >= maxSlots) {
      const hint = this._getNextSlotRequirementText();
      return {
        success: false,
        reason: `Research queue full (${this._queue.length}/${maxSlots}).${hint ? ` ${hint} to unlock next slot.` : ''}`,
      };
    }

    const reqCheck = this._checkRequirements(cfg, targetLevel);
    if (!reqCheck.met) return { success: false, reason: reqCheck.reason };

    const cost = this._costForLevel(cfg, targetLevel);
    if (!this._rm.canAfford(cost)) return { success: false, reason: 'Insufficient resources.' };

    this._rm.spend(cost);
    this._queue.push(techId);
    if (this._queue.length === 1) this._startActiveQueueItem();

    eventBus.emit('tech:started',      { id: techId, name: cfg.name, level: targetLevel });
    eventBus.emit('tech:queueUpdated', this.getQueue());
    return { success: true };
  }

  /**
   * Cancel a queued research item and refund its cost.
   * @param {string} techId
   * @returns {{ success: boolean, reason?: string }}
   */
  cancelResearch(techId) {
    const idx = this._queue.indexOf(techId);
    if (idx === -1) return { success: false, reason: 'Not in queue.' };

    const cfg         = TECH_CONFIG[techId];
    const state       = this._state.get(techId);
    const targetLevel = state.level + 1;

    this._rm.add(this._costForLevel(cfg, targetLevel));
    this._queue.splice(idx, 1);

    if (idx === 0) {
      state.researchEndsAt = null;
      state.startedAt      = null;
      if (this._queue.length > 0) this._startActiveQueueItem();
    }

    eventBus.emit('tech:queueUpdated', this.getQueue());
    eventBus.emit('tech:updated',      this.getTechWithState());
    return { success: true };
  }

  /** Add a premium research queue slot (called on premium purchase). */
  addPremiumQueueSlot() {
    this._premiumQueueSlots++;
    eventBus.emit('tech:queueUpdated', this.getQueue());
  }

  // ─────────────────────────────────────────────
  // Queries — used by UI
  // ─────────────────────────────────────────────

  /** Returns the current maximum allowed queue slots. */
  getMaxQueueSlots() { return this._getMaxQueueSlots(); }

  /**
   * Returns slot metadata for rendering the queue panel UI.
   * Each entry: { slots, requires, premium, unlocked }
   */
  getQueueSlotInfo() {
    const maxSlots = this._getMaxQueueSlots();
    return QUEUE_CONFIG.research.map(entry => ({ ...entry, unlocked: entry.slots <= maxSlots }));
  }

  /**
   * Returns a hydrated snapshot of the current research queue for UI rendering.
   * @returns {Array}
   */
  getQueue() {
    return this._queue.map((techId, idx) => {
      const cfg   = TECH_CONFIG[techId];
      const state = this._state.get(techId);
      return {
        techId,
        name:           cfg.name,
        icon:           cfg.icon,
        queuePosition:  idx,
        isActive:       idx === 0,
        researchEndsAt: idx === 0 ? state.researchEndsAt : null,
        startedAt:      idx === 0 ? state.startedAt      : null,
        targetLevel:    state.level + 1,
        maxLevel:       cfg.maxLevel,
      };
    });
  }

  /** Returns all technologies with their current state, enriched for UI rendering. */
  getTechWithState() {
    const queueMap = new Map(this._queue.map((id, idx) => [id, idx]));

    return Object.values(TECH_CONFIG).map(cfg => {
      const state        = this._state.get(cfg.id);
      const currentLevel = state.level;
      const targetLevel  = currentLevel + 1;
      const isMaxed      = currentLevel >= cfg.maxLevel;
      const queuePos     = queueMap.has(cfg.id) ? queueMap.get(cfg.id) : -1;
      const isQueued     = queuePos >= 0;
      const isActive     = queuePos === 0;

      let requirementsMet    = true;
      let requirementsReason = null;
      if (!isMaxed) {
        const chk          = this._checkRequirements(cfg, targetLevel);
        requirementsMet    = chk.met;
        requirementsReason = chk.reason ?? null;
      }

      return {
        ...cfg,
        level:             currentLevel,
        isMaxed,
        isQueued,
        isActive,
        queuePosition:     queuePos,
        researchEndsAt:    isActive ? state.researchEndsAt : null,
        startedAt:         isActive ? state.startedAt      : null,
        requirementsMet,
        requirementsReason,
        nextLevelCost:     !isMaxed ? this._costForLevel(cfg, targetLevel) : null,
        nextLevelTime:     !isMaxed ? this._timeForLevel(cfg, targetLevel) : null,
      };
    });
  }

  /** @returns {boolean} true if the tech has at least Lv.1 completed */
  isResearched(techId) { return (this._state.get(techId)?.level ?? 0) > 0; }

  /** @returns {number} completed level (0 = not researched) */
  getLevelOf(techId) { return this._state.get(techId)?.level ?? 0; }

  /** @returns {Object} copy of all accumulated bonuses */
  getAppliedBonuses() { return { ...this._appliedBonuses }; }

  // ─────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────

  serialize() {
    const stateObj = {};
    for (const [id, s] of this._state) {
      stateObj[id] = { level: s.level, researchEndsAt: s.researchEndsAt, startedAt: s.startedAt };
    }
    return {
      state:             stateObj,
      bonuses:           this._appliedBonuses,
      queue:             [...this._queue],
      premiumQueueSlots: this._premiumQueueSlots,
    };
  }

  deserialize(data) {
    if (!data) return;
    for (const [id, s] of Object.entries(data.state ?? {})) {
      if (this._state.has(id)) {
        // Backward-compat: old saves used `researched: true` → migrate to level: 1
        const level = s.level ?? (s.researched ? 1 : 0);
        this._state.set(id, {
          level,
          researchEndsAt: s.researchEndsAt ?? null,
          startedAt:      s.startedAt      ?? null,
        });
      }
    }
    this._appliedBonuses    = data.bonuses           ?? {};
    this._queue             = data.queue             ?? [];
    this._premiumQueueSlots = data.premiumQueueSlots ?? 0;
    eventBus.emit('resources:bonusChanged', this._appliedBonuses);
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  /** @private */
  _startActiveQueueItem() {
    if (!this._queue.length) return;
    const activeId    = this._queue[0];
    const state       = this._state.get(activeId);
    const cfg         = TECH_CONFIG[activeId];
    const targetLevel = state.level + 1;
    const timeSec     = this._timeForLevel(cfg, targetLevel);
    const now         = Date.now();
    state.startedAt      = now;
    state.researchEndsAt = now + timeSec * 1000;
  }

  /** @private Compute max queue slots from Workshop level + premium purchases. */
  _getMaxQueueSlots() {
    let slots = 1;
    for (const entry of QUEUE_CONFIG.research) {
      if (entry.slots <= 1) continue;
      if (entry.premium && this._premiumQueueSlots < entry.slots - 2) continue;
      if (entry.requires) {
        const allMet = Object.entries(entry.requires).every(
          ([bId, minLv]) => this._bm.getLevelOf(bId) >= minLv
        );
        if (!allMet) continue;
      }
      slots = entry.slots;
    }
    return slots;
  }

  /** @private Human-readable string for what unlocks the next queue slot. */
  _getNextSlotRequirementText() {
    const current = this._getMaxQueueSlots();
    const next    = QUEUE_CONFIG.research.find(e => e.slots === current + 1);
    if (!next) return null;
    const reqs = next.requires
      ? Object.entries(next.requires).map(([bId, lv]) => `${BUILDINGS_CONFIG[bId]?.name ?? bId} Lv.${lv}`).join(', ')
      : '';
    return `Requires ${reqs}${next.premium ? ' + Premium' : ''}`;
  }

  /** @private Scaled cost for researching (targetLevel-1) → targetLevel */
  _costForLevel(cfg, targetLevel) {
    const m   = cfg.levelCostMultiplier ?? 1.6;
    const out = {};
    for (const [res, amount] of Object.entries(cfg.cost)) {
      out[res] = Math.floor(amount * Math.pow(m, targetLevel - 1));
    }
    return out;
  }

  /** @private Scaled research time (seconds) for reaching targetLevel */
  _timeForLevel(cfg, targetLevel) {
    const m = cfg.levelTimeMultiplier ?? 1.5;
    return Math.floor(cfg.researchTime * Math.pow(m, targetLevel - 1));
  }

  /**
   * @private Check requirements for researching targetLevel.
   * Merges base `requires` with `levelRequirements[targetLevel]` override.
   */
  _checkRequirements(cfg, targetLevel) {
    // HQ unlock gate — tech must appear in HQ_UNLOCK_TABLE at or below current HQ level
    if (!this._bm.getHQUnlockedIds('techs').has(cfg.id)) {
      const reqLv = this._bm.getRequiredHQLevel('techs', cfg.id);
      return { met: false, reason: reqLv ? `Requires HQ Lv.${reqLv}` : 'Not yet unlockable.' };
    }

    const merged = { ...(cfg.requires ?? {}), ...((cfg.levelRequirements ?? {})[targetLevel] ?? {}) };
    for (const [bId, minLv] of Object.entries(merged)) {
      if (this._bm.getLevelOf(bId) < minLv) {
        const name = BUILDINGS_CONFIG[bId]?.name ?? bId;
        return { met: false, reason: `${name} Lv.${minLv} required for Lv.${targetLevel}` };
      }
    }
    return { met: true };
  }

  /** @private Apply CFG effects once (called each time a level completes). */
  _applyEffects(cfg) {
    for (const [key, value] of Object.entries(cfg.effects)) {
      this._appliedBonuses[key] = (this._appliedBonuses[key] ?? 0) + value;
    }
    eventBus.emit('resources:bonusChanged', this._appliedBonuses);
  }
}
