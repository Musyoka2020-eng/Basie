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
import { BUILDINGS_CONFIG, HEROES_CONFIG, QUEUE_CONFIG, HQ_UNLOCK_TABLE } from '../entities/GAME_DATA.js';

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
    this._premiumBuildSlots    = 0;
    this._shopBuildSlotBought  = false; // tracks one-time shop slot purchase
    this._vipBuildTimeReduction = 0;  // cumulative fractional reduction from VIP perks

    this._techBonuses = {};
    this._hm = null; // set after heroManager is constructed via setHeroManager()
    this._um = null; // set after unitManager is constructed via setUnitManager()

    /** Population / cafeteria tick state */
    this._cafeteriaShortfall = false;
    this._cafeteriaWarningSent = false;
    this._cafeteriaShortfallCooldown = 0; // seconds remaining before next shortfall notification can fire
    this._autoRestockTimer   = 0;
    this._automations = { cafeteriaRestock: false };

    eventBus.on('resources:bonusChanged', b => { this._techBonuses = b || {}; this._notifyRates(); });
    eventBus.on('population:updated',     () => this._notifyRates());
    // VIP perk: stacking build time reduction + extra build slot at VIP III
    eventBus.on('user:vipUpdate', ({ perks, deltaPerks, isInit }) => {
      this._vipBuildTimeReduction = Math.min(0.80, perks?.buildTimeReduction ?? 0);
      const slotsToAdd = isInit
        ? (perks?.extraBuildSlots ?? 0)
        : (deltaPerks?.extraBuildSlots ?? 0);
      for (let i = 0; i < slotsToAdd; i++) this.addPremiumBuildSlot();
    });
    // Sandbox mode: near-instant build times
    this._gameMode = 'campaign';
    eventBus.on('game:modeChanged', ({ mode }) => { this._gameMode = mode; });
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

  /**
   * Wire the unit manager after construction (avoids circular dependency).
   * Used to query training queue depths per building.
   * @param {object} unitManager
   */
  setUnitManager(unitManager) {
    this._um = unitManager;
  }

  // ─────────────────────────────────────────────
  // Engine tick
  // ─────────────────────────────────────────────

  update(dt) {
    // ── Build queue tick ────────────────────────────────────────────
    const active = this._buildQueue[0];
    // Sandbox mode: advance the timer 100× faster by subtracting 99/100 of the
    // elapsed time from endsAt each tick (real dt still passes, so total = 100×).
    if (active?.endsAt && this._gameMode === 'sandbox') {
      active.endsAt -= dt * 99 * 1000;
    }
    if (active?.endsAt && Date.now() >= active.endsAt) {
      const { buildingId, instanceIndex, pendingLevel } = active;

      // Remove from queue FIRST so that any event handler calling getBuildQueue()
      // sees the correct post-completion state (avoids stuck-at-0s display).
      this._buildQueue.shift();
      if (this._buildQueue.length > 0) {
        const next  = this._buildQueue[0];
        const nowMs = Date.now();
        next.startedAt = nowMs;
        next.endsAt    = nowMs + next.buildTimeSec * 1000;
      }

      // Apply the completed level
      const instances = this._buildings.get(buildingId);
      if (instances) {
        if (!instances[instanceIndex]) {
          instances[instanceIndex] = { instanceId: `${buildingId}_${instanceIndex}`, level: 0 };
        }
        instances[instanceIndex].level = pendingLevel;
      }

      this._recalculateAllCaps();
      this._notifyRates();

      // Emit after queue is already updated so listeners see correct state
      eventBus.emit('building:completed', { id: buildingId, instanceIndex, building: { id: buildingId, level: pendingLevel } });
      eventBus.emit('building:queueUpdated', this.getBuildQueue());
    }

    // ── Auto-restock cafeteria ─────────────────────────────────────
    if (this._cafeteriaShortfallCooldown > 0) this._cafeteriaShortfallCooldown -= dt;
    if (this._automations.cafeteriaRestock) {
      this._autoRestockTimer += dt;

      // Emergency path: if any cafeteria instance is completely empty, skip the timer
      const cafInstances = this._buildings.get('cafeteria') ?? [];
      const isAnyEmpty = cafInstances.some(inst =>
        (inst.level ?? 0) > 0 && ((inst.stock?.food ?? 0) <= 0 || (inst.stock?.water ?? 0) <= 0)
      );
      if (isAnyEmpty) this._autoRestockTimer = 30; // force restock this tick

      if (this._autoRestockTimer >= 30) {
        this._autoRestockTimer = 0;
        const snap = this._rm.getSnapshot();
        const cafCfg = BUILDINGS_CONFIG['cafeteria'];
        const _cafFp = cafCfg?.foodCapacityPerLevel  ?? 200;
        const _cafWp = cafCfg?.waterCapacityPerLevel ?? 200;
        // Keep at least 50 food/water in the global pool; restock whatever remains above that
        const POOL_RESERVE = 50;
        for (const inst of cafInstances) {
          if ((inst.level ?? 0) <= 0) continue;
          const lv = inst.level;
          const foodStockCap  = Array.isArray(_cafFp) ? (_cafFp[lv] ?? 0) : _cafFp  * lv;
          const waterStockCap = Array.isArray(_cafWp) ? (_cafWp[lv] ?? 0) : _cafWp * lv;
          const globalFood  = snap.food?.amount  ?? 0;
          const globalWater = snap.water?.amount ?? 0;
          if (!inst.stock) inst.stock = { food: 0, water: 0 };
          const foodNeeded  = Math.max(0, foodStockCap  - inst.stock.food);
          const waterNeeded = Math.max(0, waterStockCap - inst.stock.water);
          if (foodNeeded > 0 || waterNeeded > 0) {
            const cost = {};
            if (foodNeeded  > 0 && globalFood  > POOL_RESERVE)
              cost.food  = Math.min(foodNeeded,  globalFood  - POOL_RESERVE);
            if (waterNeeded > 0 && globalWater > POOL_RESERVE)
              cost.water = Math.min(waterNeeded, globalWater - POOL_RESERVE);
            if (Object.keys(cost).length > 0 && this._rm.spend(cost)) {
              inst.stock.food  = Math.min(inst.stock.food  + (cost.food  ?? 0), foodStockCap);
              inst.stock.water = Math.min(inst.stock.water + (cost.water ?? 0), waterStockCap);
              eventBus.emit('building:cafeteria:restocked', { instanceId: inst.instanceId, stock: { ...inst.stock } });
            }
          }
        }
      }
    }

    // ── Cafeteria drain by houses, then population growth/decay ────
    this._cafeteriaShortfall = false;
    const houseInstances = this._buildings.get('house') ?? [];
    const cafInstances   = this._buildings.get('cafeteria') ?? [];
    const population     = this._rm.getPopulation();

    for (const houseInst of houseInstances) {
      if ((houseInst.level ?? 0) <= 0) continue;
      const people      = Math.min(population.current, houseInst.level * 10);
      const foodDrain   = people * 0.1 * dt;
      const waterDrain  = people * 0.1 * dt;
      let remainFood    = foodDrain;
      let remainWater   = waterDrain;
      // Drain from cafeteria instances (round-robin)
      for (const caf of cafInstances) {
        if (remainFood <= 0 && remainWater <= 0) break;
        if ((caf.level ?? 0) <= 0) continue;
        if (!caf.stock) caf.stock = { food: 0, water: 0 };
        const takenFood  = Math.min(remainFood,  caf.stock.food);
        const takenWater = Math.min(remainWater, caf.stock.water);
        caf.stock.food  -= takenFood;
        caf.stock.water -= takenWater;
        remainFood  -= takenFood;
        remainWater -= takenWater;
      }
      if (remainFood > 0 || remainWater > 0) this._cafeteriaShortfall = true;
    }

    if (!this._cafeteriaShortfall) {
      if (population.current < population.cap) {
        this._rm.growPopulation(0.05 * dt);
      }
      // Reset warning flag once shortfall clears
      if (this._cafeteriaWarningSent) {
        this._cafeteriaWarningSent = false;
      }
    } else {
      this._rm.shrinkPopulation(0.02 * dt);
      // Emit shortfall event at most once per 2-minute cooldown period
      if (!this._cafeteriaWarningSent && this._cafeteriaShortfallCooldown <= 0) {
        this._cafeteriaWarningSent = true;
        this._cafeteriaShortfallCooldown = 120;
        eventBus.emit('building:cafeteria:shortfall', { message: 'Cafeteria is out of food or water — population is shrinking!' });
      }
    }
  }

  // ─────────────────────────────────────────────
  // Pure query helpers (no side-effects)
  // ─────────────────────────────────────────────

  /**
   * Check whether a building slot can be started (slot unlocked + base requires met).
   * Pure query — no side-effects, no resource changes.
   * @param {string} buildingId
   * @param {number} [instanceIndex=0]
   * @returns {{ ok: boolean, reason?: string }}
   */
  canBuild(buildingId, instanceIndex = 0) {
    const cfg = BUILDINGS_CONFIG[buildingId];
    if (!cfg) return { ok: false, reason: 'Unknown building.' };

    const unlockedCount = this._getUnlockedInstanceCount(cfg);
    if (instanceIndex >= unlockedCount) {
      const slot = cfg.instanceSlots?.[instanceIndex];
      const cond = slot?.condition;
      if (cond) {
        const parts = Object.entries(cond).map(([bId, minLv]) => {
          const name = BUILDINGS_CONFIG[bId]?.name ?? bId;
          return `${name} Lv.${minLv}`;
        });
        return { ok: false, reason: `Slot locked — requires: ${parts.join(', ')}` };
      }
      return { ok: false, reason: 'This building slot is not yet unlocked.' };
    }

    const reqCheck = this._checkRequirements(cfg.requires);
    if (!reqCheck.met) return { ok: false, reason: reqCheck.reason };

    return { ok: true };
  }

  /**
   * Check whether a building instance can be upgraded to the next level (per-level requires met).
   * Pure query — no side-effects, no resource changes.
   * @param {string} buildingId
   * @param {number} [instanceIndex=0]
   * @returns {{ ok: boolean, reason?: string }}
   */
  canUpgrade(buildingId, instanceIndex = 0) {
    const cfg = BUILDINGS_CONFIG[buildingId];
    if (!cfg) return { ok: false, reason: 'Unknown building.' };

    const instances      = this._buildings.get(buildingId) ?? [];
    const completedLevel = instances[instanceIndex]?.level ?? 0;
    const queuedCount    = this._buildQueue.filter(
      q => q.buildingId === buildingId && q.instanceIndex === instanceIndex
    ).length;
    const effectiveLevel = completedLevel + queuedCount;

    if (effectiveLevel >= cfg.maxLevel) {
      return { ok: false, reason: `${cfg.name} #${instanceIndex + 1} is already at max level.` };
    }

    // Instance ordering: slot N cannot exceed the level of slot N-1
    if (instanceIndex > 0) {
      const prevInst      = instances[instanceIndex - 1];
      const prevCompleted = prevInst?.level ?? 0;
      const prevQueued    = this._buildQueue.filter(
        q => q.buildingId === buildingId && q.instanceIndex === instanceIndex - 1
      ).length;
      const prevEffective = prevCompleted + prevQueued;
      if (effectiveLevel + 1 > prevEffective) {
        return { ok: false, reason: `Upgrade ${cfg.name} #${instanceIndex} to Lv.${effectiveLevel + 1} first.` };
      }
    }

    const pendingLevel = effectiveLevel + 1;
    const lvlReqCheck  = this._checkRequirements(cfg.levelRequirements?.[pendingLevel]);
    if (!lvlReqCheck.met) return { ok: false, reason: lvlReqCheck.reason };

    return { ok: true };
  }

  /**
   * Return all unmet build/upgrade conditions for a building instance as human-readable strings.
   * Returns an empty array when every requirement is satisfied.
   * @param {string} buildingId
   * @param {number} [instanceIndex=0]
   * @returns {string[]}
   */
  getMissingRequirements(buildingId, instanceIndex = 0) {
    const cfg = BUILDINGS_CONFIG[buildingId];
    if (!cfg) return ['Unknown building.'];

    const missing = [];

    // Slot condition check
    const unlockedCount = this._getUnlockedInstanceCount(cfg);
    if (instanceIndex >= unlockedCount) {
      const slot = cfg.instanceSlots?.[instanceIndex];
      const cond = slot?.condition;
      if (cond) {
        for (const [bId, minLv] of Object.entries(cond)) {
          if (this.getLevelOf(bId) < minLv) {
            const name = BUILDINGS_CONFIG[bId]?.name ?? bId;
            missing.push(`Requires ${name} Lv.${minLv}`);
          }
        }
      }
      return missing;
    }

    // Base requires
    missing.push(...this._collectMissing(cfg.requires));

    // Per-level requires
    const instances      = this._buildings.get(buildingId) ?? [];
    const completedLevel = instances[instanceIndex]?.level ?? 0;
    const queuedCount    = this._buildQueue.filter(
      q => q.buildingId === buildingId && q.instanceIndex === instanceIndex
    ).length;
    const effectiveLevel = completedLevel + queuedCount;
    const pendingLevel   = effectiveLevel + 1;
    missing.push(...this._collectMissing(cfg.levelRequirements?.[pendingLevel]));

    // Instance ordering: slot N cannot exceed the level of slot N-1
    if (instanceIndex > 0) {
      const prevInst      = instances[instanceIndex - 1];
      const prevCompleted = prevInst?.level ?? 0;
      const prevQueued    = this._buildQueue.filter(
        q => q.buildingId === buildingId && q.instanceIndex === instanceIndex - 1
      ).length;
      const prevEffective = prevCompleted + prevQueued;
      if (effectiveLevel + 1 > prevEffective) {
        missing.push(`${cfg.name} #${instanceIndex} must reach Lv.${effectiveLevel + 1} first`);
      }
    }

    return missing;
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

    // Slot unlock + base requires
    const buildCheck = this.canBuild(buildingId, instanceIndex);
    if (!buildCheck.ok) return { success: false, reason: buildCheck.reason };

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

    // Per-level requirements (e.g. House Lv.3 needs Cafeteria Lv.2; Bank Lv.3 needs Population ≥ 20)
    const upgradeCheck = this.canUpgrade(buildingId, instanceIndex);
    if (!upgradeCheck.ok) return { success: false, reason: upgradeCheck.reason };

    const pendingLevel = effectiveLevel + 1;

    const cost = this._scaleCost(cfg.baseCost, cfg.costMultiplier, effectiveLevel);
    if (!this._rm.canAfford(cost)) return { success: false, reason: 'Insufficient resources.' };

    this._rm.spend(cost);

    let buildTimeSec = cfg.buildTime * (effectiveLevel === 0 ? 1 : pendingLevel);
    if (this._techBonuses.buildTimeReduction) {
      const reduction = Math.min(0.80, this._techBonuses.buildTimeReduction);
      buildTimeSec = Math.max(1, Math.floor(buildTimeSec * (1 - reduction)));
    }
    if (this._vipBuildTimeReduction > 0) {
      buildTimeSec = Math.max(1, Math.floor(buildTimeSec * (1 - this._vipBuildTimeReduction)));
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

  /** Whether the player has bought the shop build-queue expansion (slot 3). */
  isShopBuildSlotBought() { return this._shopBuildSlotBought; }

  /** One-time shop slot grant — sets the flag, increments premium counter, fires event. */
  grantShopBuildSlot() {
    if (this._shopBuildSlotBought) return;
    this._shopBuildSlotBought = true;
    this._premiumBuildSlots++;
    eventBus.emit('building:queueUpdated', this.getBuildQueue());
  }

  // ─────────────────────────────────────────────
  // Cafeteria & automation
  // ─────────────────────────────────────────────

  /**
   * Returns all cafeteria instances with their current stock and stock cap.
   */
  getCafeteriaStock() {
    const instances = this._buildings.get('cafeteria') ?? [];
    const cfg = BUILDINGS_CONFIG['cafeteria'];
    const _fp = cfg?.foodCapacityPerLevel  ?? 200;
    const _wp = cfg?.waterCapacityPerLevel ?? 200;
    return instances
      .filter(inst => (inst.level ?? 0) > 0)
      .map(inst => ({
        instanceId: inst.instanceId,
        level: inst.level,
        stock: inst.stock ?? { food: 0, water: 0 },
        stockCap: {
          food:  Array.isArray(_fp) ? (_fp[inst.level]  ?? 0) : _fp  * inst.level,
          water: Array.isArray(_wp) ? (_wp[inst.level] ?? 0) : _wp * inst.level,
        },
      }));
  }

  /**
   * Manually restock a cafeteria instance from the global pool.
   * @param {string} instanceId
   * @param {number} foodAmount  — desired food to add (actual limited by stock cap + global supply)
   * @param {number} waterAmount — desired water to add
   * @returns {{ success: boolean, reason?: string }}
   */
  restockCafeteria(instanceId, foodAmount, waterAmount) {
    let targetInst = null;
    for (const inst of (this._buildings.get('cafeteria') ?? [])) {
      if (inst.instanceId === instanceId) { targetInst = inst; break; }
    }
    if (!targetInst || (targetInst.level ?? 0) <= 0) {
      return { success: false, reason: 'Cafeteria instance not found.' };
    }
    if (!targetInst.stock) targetInst.stock = { food: 0, water: 0 };
    const cafCfg = BUILDINGS_CONFIG['cafeteria'];
    const _rFp = cafCfg?.foodCapacityPerLevel  ?? 200;
    const _rWp = cafCfg?.waterCapacityPerLevel ?? 200;
    const lv = targetInst.level;
    const foodStockCap  = Array.isArray(_rFp) ? (_rFp[lv] ?? 0) : _rFp  * lv;
    const waterStockCap = Array.isArray(_rWp) ? (_rWp[lv] ?? 0) : _rWp * lv;
    const canAddFood  = Math.max(0, Math.min(foodAmount,  foodStockCap  - targetInst.stock.food));
    const canAddWater = Math.max(0, Math.min(waterAmount, waterStockCap - targetInst.stock.water));

    if (canAddFood === 0 && canAddWater === 0) {
      return { success: false, reason: 'Cafeteria stock is already full.' };
    }

    const cost = {};
    if (canAddFood  > 0) cost.food  = canAddFood;
    if (canAddWater > 0) cost.water = canAddWater;

    if (!this._rm.spend(cost)) return { success: false, reason: 'Not enough resources.' };
    targetInst.stock.food  += canAddFood;
    targetInst.stock.water += canAddWater;
    eventBus.emit('building:cafeteria:restocked', { instanceId, stock: { ...targetInst.stock } });
    return { success: true };
  }

  /**
   * Enable an automation (e.g. cafeteria auto-restock via diamond shop purchase).
   * @param {'cafeteriaRestock'} type
   */
  enableAutomation(type) {
    if (type in this._automations) {
      this._automations[type] = true;
      // Trigger immediately — jump timer so next tick fires a restock right away
      if (type === 'cafeteriaRestock') this._autoRestockTimer = 30;
      eventBus.emit('building:automationEnabled', { type });
    }
  }

  getAutomations() { return { ...this._automations }; }

  // ─────────────────────────────────────────────
  // Queries — used by UI
  // ─────────────────────────────────────────────

  getMaxBuildSlots() { return this._getMaxBuildSlots(); }

  /**
   * Returns the number of training queue items (across all tiers) for a given
   * training building. Delegates to UnitManager which owns the training queues.
   * @param {string} buildingId
   * @returns {number}
   */
  getBuildingQueueDepth(buildingId) {
    return this._um?.getTrainingQueueDepthForBuilding(buildingId) ?? 0;
  }

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
        const nextCost    = this._scaleCost(cfg.baseCost, cfg.costMultiplier, effectiveLevel);
        const reqCheck    = this._checkRequirements(cfg.requires);
        const lvlReqCheck = this._checkRequirements(cfg.levelRequirements?.[effectiveLevel + 1]);
        const finalReqMet    = reqCheck.met && lvlReqCheck.met;
        const finalReqReason = !reqCheck.met ? (reqCheck.reason ?? null) : (lvlReqCheck.reason ?? null);
        // Collect all unmet requirements for detailed UI display
        const missingRequirements = [
          ...this._collectMissing(cfg.requires),
          ...this._collectMissing(cfg.levelRequirements?.[effectiveLevel + 1]),
        ];

        // Next level build time (raw, before tech reductions) — for UI display
        const rawNextBuildTime = effectiveLevel < cfg.maxLevel
          ? cfg.buildTime * (effectiveLevel === 0 ? 1 : effectiveLevel + 1)
          : null;
        let nextLevelBuildTime = rawNextBuildTime;
        if (rawNextBuildTime !== null && this._techBonuses.buildTimeReduction) {
          const reduction = Math.min(0.80, this._techBonuses.buildTimeReduction);
          nextLevelBuildTime = Math.max(1, Math.floor(rawNextBuildTime * (1 - reduction)));
        }

        // Cafeteria depletion timer
        let drainRatePerSec = 0;
        let depletionSec    = Infinity;
        if (cfg.id === 'cafeteria' && (inst.level ?? 0) > 0) {
          const pop        = this._rm.getPopulation();
          const houseInsts = this._buildings.get('house') ?? [];
          drainRatePerSec  = houseInsts.reduce((s, h) => {
            if ((h.level ?? 0) <= 0) return s;
            return s + Math.min(pop.current, h.level * 10) * 0.1;
          }, 0);
          if (drainRatePerSec > 0 && inst.stock) {
            const minStock = Math.min(inst.stock.food ?? 0, inst.stock.water ?? 0);
            depletionSec   = minStock / drainRatePerSec;
          }
        }

        instanceData.push({
          ...cfg,
          instanceId:    inst.instanceId ?? `${cfg.id}_${idx}`,
          instanceIndex: idx,
          level:         completedLevel,
          effectiveLevel,
          cost:               nextCost,
          canAfford:          this._rm.canAfford(nextCost),
          requirementsMet:    finalReqMet,
          requirementsReason: finalReqReason,
          missingRequirements,
          isBuilding:         isActivelyBuilding,
          isActivelyBuilding,
          isQueued:           queuedCount > 0 && !isActivelyBuilding,
          queuedCount,
          isMaxLevel:         effectiveLevel >= cfg.maxLevel,
          nextLevelBuildTime,
          constructionEndsAt: activeForInst?.endsAt    ?? null,
          startedAt:          activeForInst?.startedAt ?? null,
          stock:              inst.stock ?? null,
          drainRatePerSec,
          depletionSec,
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

      // HQ (townhall) lock info for this building type
      const hqRequiredLevel = this.getRequiredHQLevel('buildings', cfg.id);
      const isHQLocked = hqRequiredLevel !== null && this.getHQLevel() < hqRequiredLevel;

      return { ...cfg, instances: instanceData, lockedSlots, unlockedInstanceCount: unlockedCount, totalSlots, isHQLocked, hqRequiredLevel };
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

  /**
   * Level of a specific building instance (e.g. 'barracks_1').
   * Returns 0 if the instance doesn't exist or hasn't been built.
   */
  getInstanceLevelOf(instanceId) {
    const last      = instanceId.lastIndexOf('_');
    const buildingId = instanceId.substring(0, last);
    const idx       = parseInt(instanceId.substring(last + 1), 10);
    return this._buildings.get(buildingId)?.[idx]?.level ?? 0;
  }

  /** Current HQ (townhall) level. */
  getHQLevel() {
    return this.getLevelOf('townhall');
  }

  /**
   * Returns a Set of IDs unlocked at or below the current HQ level for a given category.
   * @param {'buildings'|'units'|'techs'} category
   * @returns {Set<string>}
   */
  getHQUnlockedIds(category) {
    const hqLv = this.getHQLevel();
    const ids   = new Set();
    for (const [lvStr, entry] of Object.entries(HQ_UNLOCK_TABLE)) {
      if (parseInt(lvStr) <= hqLv && entry[category]) {
        for (const id of entry[category]) ids.add(id);
      }
    }
    return ids;
  }

  /**
   * Returns the minimum HQ level required to unlock a given id in the specified category,
   * or null if not found in the table (always available from HQ 1).
   * @param {'buildings'|'units'|'techs'} category
   * @param {string} id
   * @returns {number|null}
   */
  getRequiredHQLevel(category, id) {
    for (const [lvStr, entry] of Object.entries(HQ_UNLOCK_TABLE)) {
      if (entry[category]?.includes(id)) return parseInt(lvStr);
    }
    return null;
  }

  /**
   * Returns the cumulative HQ benefits at the current HQ level.
   * @returns {{ productionBonus: number, attackBonus: number, defenseBonus: number, storageBonus: number }}
   */
  getHQBenefits() {
    const hqLv = this.getHQLevel();
    const out  = { productionBonus: 0, attackBonus: 0, defenseBonus: 0, storageBonus: 0 };
    for (const [lvStr, entry] of Object.entries(HQ_UNLOCK_TABLE)) {
      if (parseInt(lvStr) <= hqLv && entry.benefits) {
        for (const [k, v] of Object.entries(entry.benefits)) {
          if (k in out) out[k] += v;
        }
      }
    }
    return out;
  }

  /**
   * Number of fully built (level >= 1) instances of a building type.
   * @param {string} buildingId
   * @returns {number}
   */
  getBuiltInstanceCount(buildingId) {
    const instances = this._buildings.get(buildingId) ?? [];
    return instances.filter(i => (i.level ?? 0) >= 1).length;
  }

  /**
   * Reduce the active build timer by `seconds` seconds.
   * If seconds >= 999999, the build completes instantly.
   * @param {number} seconds
   * @returns {{ success: boolean, remaining?: number, reason?: string }}
   */
  reduceActiveTimer(seconds) {
    const active = this._buildQueue[0];
    if (!active?.endsAt) return { success: false, reason: 'No active build in progress.' };
    const now    = Date.now();
    if (active.endsAt <= now) return { success: false, reason: 'Build already complete.' };
    const skipMs = seconds >= 999999 ? active.endsAt - now + 1000 : seconds * 1000;
    active.endsAt = Math.max(now, active.endsAt - skipMs);
    eventBus.emit('building:queueUpdated', this.getBuildQueue());
    const remaining = Math.max(0, active.endsAt - now);
    return { success: true, remaining, completed: remaining <= 0 };
  }

  // ─────────────────────────────────────────────
  // Serialization
  // ─────────────────────────────────────────────

  serialize() {
    const buildings = {};
    for (const [id, instances] of this._buildings) {
      buildings[id] = instances.map(inst => {
        const out = { instanceId: inst.instanceId, level: inst.level };
        if (inst.stock !== undefined) out.stock = { ...inst.stock };
        return out;
      });
    }
    return {
      buildings,
      buildQueue:           [...this._buildQueue],
      premiumBuildSlots:    this._premiumBuildSlots,
      shopBuildSlotBought:  this._shopBuildSlotBought,
      automations:          { ...this._automations },
    };
  }

  deserialize(data) {
    if (!data) return;
    const buildingsData = data.buildings ?? data;

    for (const [id, saved] of Object.entries(buildingsData)) {
      if (!BUILDINGS_CONFIG[id]) continue;
      if (Array.isArray(saved)) {
        // New multi-instance format
        this._buildings.set(id, saved.map((s, idx) => {
          const inst = {
            instanceId: s.instanceId ?? `${id}_${idx}`,
            level:      s.level ?? 0,
          };
          if (s.stock !== undefined) inst.stock = { food: s.stock.food ?? 0, water: s.stock.water ?? 0 };
          return inst;
        }));
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
    this._shopBuildSlotBought = data.shopBuildSlotBought ?? false;
    if (data.automations) {
      for (const [k, v] of Object.entries(data.automations)) {
        if (k in this._automations) this._automations[k] = v;
      }
    }

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

    // Immediately apply any queue items whose timer already expired while the
    // game was closed (catches completions that happened < 5s before the page
    // was last saved, which the offline-progress sim would otherwise skip).
    const nowMs = Date.now();
    while (this._buildQueue.length > 0) {
      const head = this._buildQueue[0];
      if (!head.endsAt || head.endsAt > nowMs) break;

      this._buildQueue.shift();
      const { buildingId, instanceIndex, pendingLevel } = head;
      const instances = this._buildings.get(buildingId);
      if (instances) {
        if (!instances[instanceIndex]) {
          instances[instanceIndex] = { instanceId: `${buildingId}_${instanceIndex}`, level: 0 };
        }
        instances[instanceIndex].level = pendingLevel;
      }
      // Assign timer to the next item if it doesn't have one yet
      if (this._buildQueue.length > 0 && !this._buildQueue[0].endsAt) {
        const next = this._buildQueue[0];
        next.startedAt = nowMs;
        next.endsAt    = nowMs + next.buildTimeSec * 1000;
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
    // Base is zero — storageCap arrays on each building provide the full cap at their level
    const caps = { wood: 0, stone: 0, iron: 0, food: 0, water: 0, diamond: Infinity, money: 0 };
    let popCap       = 0;
    let foodStoreCap = 0;  // total cafeteria food-stock capacity
    let waterStoreCap = 0; // total cafeteria water-stock capacity

    for (const [id, instances] of this._buildings) {
      const cfg = BUILDINGS_CONFIG[id];
      if (!cfg?.storageCap) {
        // House: contributes to population cap, not resource cap
      } else {
        for (const inst of instances) {
          if ((inst.level ?? 0) <= 0) continue;
          for (const [res, perLevel] of Object.entries(cfg.storageCap)) {
            const contrib = Array.isArray(perLevel)
              ? (perLevel[inst.level] ?? 0)
              : perLevel * inst.level;
            caps[res] = (caps[res] ?? 0) + contrib;
          }
        }
      }

      // Population cap from houses — use config-driven value, hard ceiling 1000
      if (id === 'house') {
        const popPerLevel = cfg.populationCapacityPerLevel ?? 10;
        for (const inst of instances) {
          popCap += (inst.level ?? 0) * popPerLevel;
        }
      }

      // Cafeteria food/water stock capacity — use config-driven values
      if (id === 'cafeteria') {
        const fpArr = cfg.foodCapacityPerLevel  ?? 200;
        const wpArr = cfg.waterCapacityPerLevel ?? 200;
        for (const inst of instances) {
          const lv = inst.level ?? 0;
          foodStoreCap  += Array.isArray(fpArr) ? (fpArr[lv] ?? 0) : lv * fpArr;
          waterStoreCap += Array.isArray(wpArr) ? (wpArr[lv] ?? 0) : lv * wpArr;
        }
      }
    }

    for (const [res, cap] of Object.entries(caps)) {
      // Apply storageCapacityBonus from tech research (e.g. infrastructure tech)
      let finalCap = cap;
      if (isFinite(cap) && this._techBonuses.storageCapacityBonus) {
        finalCap = Math.floor(cap * (1 + this._techBonuses.storageCapacityBonus));
      }
      this._rm.setCap(res, finalCap);
    }
    this._rm.setPopulationCap(Math.min(popCap, 1000));
    this._rm.setFoodCapacity(foodStoreCap);
    this._rm.setWaterCapacity(waterStoreCap);
  }

  /** @private */
  _notifyRates() {
    const active = [];
    const pop = this._rm.getPopulation();
    const bankEfficiency = pop.cap > 0 ? Math.min(pop.current / pop.cap, 1) : 0;

    for (const [id, instances] of this._buildings) {
      const cfg = BUILDINGS_CONFIG[id];
      if (!cfg?.effects) continue;
      for (const inst of instances) {
        if ((inst.level ?? 0) <= 0) continue;

        // Check for a hero stationed at this instance and compute production bonus
        const stationedHero = this._hm?.getBuildingHero(inst.instanceId) ?? null;
        let scaledEffects = cfg.effects;

        if (id === 'bank') {
          // Money output scales with population fill ratio (0 pop → 0 income)
          scaledEffects = {};
          for (const [res, val] of Object.entries(cfg.effects)) {
            scaledEffects[res] = val * bankEfficiency;
          }
        } else if (stationedHero) {
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
      if (bId === 'population') {
        const pop = this._rm.getPopulation();
        if (pop.current < minLevel) {
          return { met: false, reason: `Requires Population ≥ ${minLevel}` };
        }
      } else if (this.getLevelOf(bId) < minLevel) {
        const name = BUILDINGS_CONFIG[bId]?.name ?? bId;
        return { met: false, reason: `Requires ${name} Lv.${minLevel}` };
      }
    }
    return { met: true };
  }

  /**
   * Collect ALL unmet conditions from a requires map as human-readable strings.
   * Unlike _checkRequirements, does not stop at the first failure.
   * @private
   */
  _collectMissing(requires) {
    if (!requires) return [];
    const missing = [];
    for (const [bId, minLevel] of Object.entries(requires)) {
      if (bId === 'population') {
        const pop = this._rm.getPopulation();
        if (pop.current < minLevel) {
          missing.push(`Requires Population ≥ ${minLevel} (current: ${Math.floor(pop.current)})`);
        }
      } else if (this.getLevelOf(bId) < minLevel) {
        const name = BUILDINGS_CONFIG[bId]?.name ?? bId;
        missing.push(`Requires ${name} Lv.${minLevel}`);
      }
    }
    return missing;
  }
}
