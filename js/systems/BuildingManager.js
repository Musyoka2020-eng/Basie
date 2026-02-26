/**
 * BuildingManager.js
 * Manages placing, upgrading, and tracking all base buildings.
 *
 * Multi-instance model: each building type can have multiple independent
 * copies (instances), each with its own level. Instances are unlocked by
 * conditions defined in BUILDINGS_CONFIG.instanceSlots[].
 *
 * Queue design:
 *  - `_buildQueue` is an ordered array of queue items; index 0 is always the active build.
 *  - Each item tracks its own timer (startedAt / endsAt) for serialization safety.
 *  - `_buildings` stores Map<id, [{instanceId, level}]> — only completed levels.
 *  - Resources are spent at queue time, refunded on cancel.
 */
import { eventBus }                                    from '../core/EventBus.js';
import { BUILDINGS_CONFIG, HEROES_CONFIG, QUEUE_CONFIG } from '../entities/GAME_DATA.js';

/**
 * @typedef {{ buildingId: string, instanceIndex: number, instanceId: string, pendingLevel: number, buildTimeSec: number, cost: Object, startedAt: number|null, endsAt: number|null }} BuildQueueItem
 * @typedef {{ instanceId: string, level: number }} BuildingInstance
 */

export class BuildingManager {
  /** @param {import('./ResourceManager.js').ResourceManager} resourceManager */
  constructor(resourceManager) {
    this.name = 'BuildingManager';
    this._rm  = resourceManager;

    /** @type {Map<string, BuildingInstance[]>} buildingId -> array of instances (completed levels only) */
    this._buildings = new Map();
    this._buildings.set('townhall', [{ instanceId: 'townhall_0', level: 1 }]);

    /** @type {BuildQueueItem[]} */
    this._buildQueue = [];
    this._premiumBuildSlots = 0;

    this._techBonuses = {};
    this._hm = null; // set after heroManager is constructed via setHeroManager()
    eventBus.on('resources:bonusChanged', b => { this._techBonuses = b || {}; this._notifyRates(); });
    this._notifyRates();
    this._recalculateAllCaps();
  }

  /**
   * Wire the hero manager after construction (avoids circular dependency).
   * @param {object} heroManager
   */
  setHeroManager(heroManager) {
    this._hm = heroManager;
    eventBus.on('heroes:updated', () => this._notifyRates());
  }

  // ─────────────────────────────────────────────
  // Engine tick
  // ─────────────────────────────────────────────

  update(_dt) {
    const active = this._buildQueue[0];
    if (!active?.endsAt) return;
    if (Date.now() < active.endsAt) return;

    const { buildingId, instanceIndex, pendingLevel } = active;
    const instances = this._buildings.get(buildingId);
    if (instances) {
      if (!instances[instanceIndex]) {
        instances[instanceIndex] = { instanceId: `${buildingId}_${instanceIndex}`, level: 0 };
      }
      instances[instanceIndex].level = pendingLevel;
    }

    this._recalculateAllCaps();
    eventBus.emit('building:completed', { id: buildingId, instanceIndex, building: { id: buildingId, level: pendingLevel } });

    this._buildQueue.shift();
    if (this._buildQueue.length > 0) {
      const next  = this._buildQueue[0];
      const nowMs = Date.now();
      next.startedAt = nowMs;
      next.endsAt    = nowMs + next.buildTimeSec * 1000;
    }

    this._notifyRates();
    eventBus.emit('building:queueUpdated', this.getBuildQueue());
  }

  // ─────────────────────────────────────────────
  // Public actions
  // ─────────────────────────────────────────────

  /**
   * Queue a building instance build/upgrade.
   * @param {string} buildingId
   * @param {number} [instanceIndex=0]
   * @returns {{ success: boolean, reason?: string }}
   */
  build(buildingId, instanceIndex = 0) {
    const cfg = BUILDINGS_CONFIG[buildingId];
    if (!cfg) return { success: false, reason: 'Unknown building.' };

    const unlockedCount = this._getUnlockedInstanceCount(cfg);
    if (instanceIndex >= unlockedCount) {
      return { success: false, reason: 'This building slot is not yet unlocked.' };
    }

    const instances      = this._buildings.get(buildingId) ?? [];
    const completedLevel = instances[instanceIndex]?.level ?? 0;
    const queuedCount    = this._buildQueue.filter(
      q => q.buildingId === buildingId && q.instanceIndex === instanceIndex
    ).length;
    const effectiveLevel = completedLevel + queuedCount;

    if (effectiveLevel >= cfg.maxLevel) {
      return { success: false, reason: `${cfg.name} #${instanceIndex + 1} is already at max level.` };
    }

    const maxSlots = this._getMaxBuildSlots();
    if (this._buildQueue.length >= maxSlots) {
      return {
        success: false,
        reason: `Build queue is full (${this._buildQueue.length}/${maxSlots}). Build a Construction Hall to unlock more slots.`,
      };
    }

    const reqCheck = this._checkRequirements(cfg.requires);
    if (!reqCheck.met) return { success: false, reason: reqCheck.reason };

    const pendingLevel = effectiveLevel + 1;
    const cost = this._scaleCost(cfg.baseCost, cfg.costMultiplier, effectiveLevel);
    if (!this._rm.canAfford(cost)) return { success: false, reason: 'Insufficient resources.' };

    this._rm.spend(cost);

    let buildTimeSec = cfg.buildTime * (effectiveLevel === 0 ? 1 : pendingLevel);
    if (this._techBonuses.buildTimeReduction) {
      const reduction = Math.min(0.80, this._techBonuses.buildTimeReduction);
      buildTimeSec = Math.max(1, Math.floor(buildTimeSec * (1 - reduction)));
    }

    if (!this._buildings.has(buildingId)) this._buildings.set(buildingId, []);
    const instArr = this._buildings.get(buildingId);
    if (!instArr[instanceIndex]) {
      instArr[instanceIndex] = { instanceId: `${buildingId}_${instanceIndex}`, level: 0 };
    }

    const isFirst = this._buildQueue.length === 0;
    const nowMs   = Date.now();

    if (isFirst && buildTimeSec === 0) {
      instArr[instanceIndex].level = pendingLevel;
      this._recalculateAllCaps();
      eventBus.emit('building:completed', { id: buildingId, instanceIndex, building: { id: buildingId, level: pendingLevel } });
      this._notifyRates();
      eventBus.emit('building:started', { id: buildingId, instanceIndex, cost, level: pendingLevel });
      return { success: true };
    }

    const queueItem = {
      buildingId,
      instanceIndex,
      instanceId:   instArr[instanceIndex].instanceId,
      pendingLevel,
      buildTimeSec,
      cost,
      startedAt: isFirst ? nowMs : null,
      endsAt:    isFirst ? nowMs + buildTimeSec * 1000 : null,
    };

    this._buildQueue.push(queueItem);
    eventBus.emit('building:started',      { id: buildingId, instanceIndex, cost, level: pendingLevel });
    eventBus.emit('building:queueUpdated', this.getBuildQueue());
    return { success: true };
  }

  /** Cancel a build queue item by index and refund its cost. */
  cancelBuild(queueIndex) {
    const item = this._buildQueue[queueIndex];
    if (!item) return { success: false, reason: 'Invalid queue index.' };

    this._rm.add(item.cost);
    this._buildQueue.splice(queueIndex, 1);

    if (queueIndex === 0 && this._buildQueue.length > 0) {
      const next  = this._buildQueue[0];
      const nowMs = Date.now();
      next.startedAt = nowMs;
      next.endsAt    = nowMs + next.buildTimeSec * 1000;
    }

    eventBus.emit('building:queueUpdated', this.getBuildQueue());
    return { success: true };
  }

  /** Add a premium build slot (called on premium purchase). */
  addPremiumBuildSlot() {
    this._premiumBuildSlots++;
    eventBus.emit('building:queueUpdated', this.getBuildQueue());
  }

  // ─────────────────────────────────────────────
  // Queries — used by UI
  // ─────────────────────────────────────────────

  getMaxBuildSlots() { return this._getMaxBuildSlots(); }

  getBuildSlotInfo() {
    const maxSlots = this._getMaxBuildSlots();
    return QUEUE_CONFIG.building.map(entry => ({ ...entry, unlocked: entry.slots <= maxSlots }));
  }

  getBuildQueue() {
    return this._buildQueue.map((item, idx) => ({
      ...item,
      queuePosition: idx,
      isActive:      idx === 0,
      cfg:           BUILDINGS_CONFIG[item.buildingId],
    }));
  }

  /**
   * Returns all building types grouped with per-instance status data and locked slot info.
   * Primary data source for BuildingsUI.
   */
  getBuildingTypesWithInstances() {
    const activeItem = this._buildQueue[0] ?? null;

    return Object.values(BUILDINGS_CONFIG).map(cfg => {
      const instances     = this._buildings.get(cfg.id) ?? [];
      const unlockedCount = this._getUnlockedInstanceCount(cfg);

      const instanceData = [];
      for (let idx = 0; idx < unlockedCount; idx++) {
        const inst           = instances[idx] ?? { instanceId: `${cfg.id}_${idx}`, level: 0 };
        const completedLevel = inst.level ?? 0;
        const queuedForInst  = this._buildQueue.filter(
          q => q.buildingId === cfg.id && q.instanceIndex === idx
        );
        const queuedCount    = queuedForInst.length;
        const effectiveLevel = completedLevel + queuedCount;
        const isActivelyBuilding = (
          activeItem?.buildingId === cfg.id && activeItem?.instanceIndex === idx
        );
        const activeForInst = isActivelyBuilding ? activeItem : null;
        const nextCost = this._scaleCost(cfg.baseCost, cfg.costMultiplier, effectiveLevel);
        const reqCheck = this._checkRequirements(cfg.requires);

        instanceData.push({
          ...cfg,
          instanceId:    inst.instanceId ?? `${cfg.id}_${idx}`,
          instanceIndex: idx,
          level:         completedLevel,
          effectiveLevel,
          cost:               nextCost,
          canAfford:          this._rm.canAfford(nextCost),
          requirementsMet:    reqCheck.met,
          requirementsReason: reqCheck.reason ?? null,
          isBuilding:         isActivelyBuilding,
          isActivelyBuilding,
          isQueued:           queuedCount > 0 && !isActivelyBuilding,
          queuedCount,
          isMaxLevel:         effectiveLevel >= cfg.maxLevel,
          constructionEndsAt: activeForInst?.endsAt    ?? null,
          startedAt:          activeForInst?.startedAt ?? null,
        });
      }

      const totalSlots  = cfg.instanceSlots?.length ?? 1;
      const lockedSlots = [];
      for (let idx = unlockedCount; idx < totalSlots; idx++) {
        lockedSlots.push({
          instanceIndex: idx,
          condition:     cfg.instanceSlots[idx]?.condition ?? null,
        });
      }

      return { ...cfg, instances: instanceData, lockedSlots, unlockedInstanceCount: unlockedCount, totalSlots };
    });
  }

  /** Backward-compat flat list — one entry per unlocked instance. */
  getAllBuildingsWithStatus() {
    return this.getBuildingTypesWithInstances().flatMap(t => t.instances);
  }

  getActiveBuildings() {
    const result   = [];
    const activeId = this._buildQueue[0]?.buildingId;
    for (const [id, instances] of this._buildings) {
      for (const inst of instances) {
        if ((inst.level ?? 0) > 0 || id === activeId) result.push({ id, ...inst });
      }
    }
    return result;
  }

  /**
   * Maximum completed level across all instances of a building type.
   * Used for requirement checks ("do I have a Barracks at Lv2 anywhere?").
   */
  getLevelOf(buildingId) {
    const instances = this._buildings.get(buildingId);
    if (!instances || instances.length === 0) return 0;
    return Math.max(0, ...instances.map(i => i.level ?? 0));
  }

  // ─────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────

  serialize() {
    const buildings = {};
    for (const [id, instances] of this._buildings) {
      buildings[id] = instances.map(inst => ({ instanceId: inst.instanceId, level: inst.level }));
    }
    return { buildings, buildQueue: [...this._buildQueue], premiumBuildSlots: this._premiumBuildSlots };
  }

  deserialize(data) {
    if (!data) return;
    const buildingsData = data.buildings ?? data;

    for (const [id, saved] of Object.entries(buildingsData)) {
      if (!BUILDINGS_CONFIG[id]) continue;
      if (Array.isArray(saved)) {
        // New multi-instance format
        this._buildings.set(id, saved.map((s, idx) => ({
          instanceId: s.instanceId ?? `${id}_${idx}`,
          level:      s.level ?? 0,
        })));
      } else {
        // Old single-instance format — auto-migrate to array
        this._buildings.set(id, [{ instanceId: `${id}_0`, level: saved.level ?? 0 }]);
      }
    }

    this._buildQueue = (data.buildQueue ?? []).map(item => ({
      instanceIndex: 0,
      instanceId:    `${item.buildingId}_0`,
      ...item,
    }));
    this._premiumBuildSlots = data.premiumBuildSlots ?? 0;

    // Backward-compat: old format stored constructionEndsAt on the building object
    for (const [id, saved] of Object.entries(buildingsData)) {
      if (!Array.isArray(saved) && saved.constructionEndsAt &&
          !this._buildQueue.some(q => q.buildingId === id)) {
        this._buildQueue.push({
          buildingId:    id,
          instanceIndex: 0,
          instanceId:    `${id}_0`,
          pendingLevel:  saved._pendingLevel ?? ((saved.level ?? 0) + 1),
          buildTimeSec:  saved._buildTimeSec ?? 60,
          cost:          {},
          startedAt:     saved.startedAt ?? null,
          endsAt:        saved.constructionEndsAt,
        });
      }
    }

    this._recalculateAllCaps();
    this._notifyRates();
  }

  // ─────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────

  /** @private */
  _getMaxBuildSlots() {
    let slots = 1;
    for (const entry of QUEUE_CONFIG.building) {
      if (entry.slots <= 1) continue;
      if (entry.premium && this._premiumBuildSlots < entry.slots - 2) continue;
      if (entry.requires) {
        const allMet = Object.entries(entry.requires).every(
          ([bId, minLv]) => this.getLevelOf(bId) >= minLv
        );
        if (!allMet) continue;
      }
      slots = entry.slots;
    }
    return slots;
  }

  /** @private */
  _getUnlockedInstanceCount(cfg) {
    const slots = cfg.instanceSlots;
    if (!slots || slots.length === 0) return 1;
    let count = 0;
    for (const slot of slots) {
      if (this._checkCondition(slot.condition)) count++;
      else break;
    }
    return Math.max(1, count);
  }

  /** @private */
  _checkCondition(condition) {
    if (!condition) return true;
    return Object.entries(condition).every(([bId, minLv]) => this.getLevelOf(bId) >= minLv);
  }

  /**
   * Recalculate ALL storage caps by summing contributions from every instance.
   * @private
   */
  _recalculateAllCaps() {
    // Start from base caps
    const caps = { gold: 5000, wood: 5000, stone: 5000, food: 1000, mana: 500 };
    for (const [id, instances] of this._buildings) {
      const cfg = BUILDINGS_CONFIG[id];
      if (!cfg?.storageCap) continue;
      for (const inst of instances) {
        if ((inst.level ?? 0) <= 0) continue;
        for (const [res, perLevel] of Object.entries(cfg.storageCap)) {
          caps[res] = (caps[res] ?? 0) + perLevel * inst.level;
        }
      }
    }
    for (const [res, cap] of Object.entries(caps)) this._rm.setCap(res, cap);
  }

  /** @private */
  _notifyRates() {
    const active = [];
    for (const [id, instances] of this._buildings) {
      const cfg = BUILDINGS_CONFIG[id];
      if (!cfg?.effects) continue;
      for (const inst of instances) {
        if ((inst.level ?? 0) <= 0) continue;

        // Check for a hero stationed at this instance and compute production bonus
        const stationedHero = this._hm?.getBuildingHero(inst.instanceId) ?? null;
        let scaledEffects = cfg.effects;
        if (stationedHero) {
          const heroCfg = HEROES_CONFIG[stationedHero.heroId];
          const buildingType = inst.instanceId.replace(/_\d+$/, '');
          if (heroCfg?.buildingBonus?.buildingType === buildingType) {
            const multiplier = 1 + stationedHero.level * 0.05;
            scaledEffects = {};
            for (const [res, val] of Object.entries(cfg.effects)) {
              scaledEffects[res] = val * multiplier;
            }
          }
        }

        active.push({ effects: scaledEffects, level: inst.level });
      }
    }
    this._rm.recalculateRates(active);
  }

  /** @private */
  _scaleCost(baseCost, multiplier, currentLevel) {
    const out = {};
    for (const [res, amount] of Object.entries(baseCost)) {
      out[res] = Math.floor(amount * Math.pow(multiplier, currentLevel));
    }
    return out;
  }

  /** @private */
  _checkRequirements(requires) {
    if (!requires) return { met: true };
    for (const [bId, minLevel] of Object.entries(requires)) {
      if (this.getLevelOf(bId) < minLevel) {
        const name = BUILDINGS_CONFIG[bId]?.name ?? bId;
        return { met: false, reason: `Requires ${name} Lv.${minLevel}` };
      }
    }
    return { met: true };
  }
}
