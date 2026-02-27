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
    this._premiumBuildSlots = 0;

    this._techBonuses = {};
    this._hm = null; // set after heroManager is constructed via setHeroManager()

    /** Population / cafeteria tick state */
    this._cafeteriaShortfall = false;
    this._cafeteriaWarningSent = false;
    this._autoRestockTimer   = 0;
    this._automations = { cafeteriaRestock: false };

    eventBus.on('resources:bonusChanged', b => { this._techBonuses = b || {}; this._notifyRates(); });
    eventBus.on('population:updated',     () => this._notifyRates());
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

  update(dt) {
    // ── Build queue tick ────────────────────────────────────────────
    const active = this._buildQueue[0];
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
    if (this._automations.cafeteriaRestock) {
      this._autoRestockTimer += dt;
      if (this._autoRestockTimer >= 30) {
        this._autoRestockTimer = 0;
        const snap = this._rm.getSnapshot();
        const cafInstances = this._buildings.get('cafeteria') ?? [];
        for (const inst of cafInstances) {
          if ((inst.level ?? 0) <= 0) continue;
          const stockCap = 200 * inst.level;
          // Only auto-restock if global pool has > 30% remaining
          if ((snap.food?.amount ?? 0) > (snap.food?.cap ?? 0) * 0.3 &&
              (snap.water?.amount ?? 0) > (snap.water?.cap ?? 0) * 0.3) {
            if (!inst.stock) inst.stock = { food: 0, water: 0 };
            const foodNeeded  = Math.max(0, stockCap - inst.stock.food);
            const waterNeeded = Math.max(0, stockCap - inst.stock.water);
            if (foodNeeded > 0 || waterNeeded > 0) {
              const cost = {};
              if (foodNeeded  > 0) cost.food  = Math.min(foodNeeded,  snap.food?.amount  ?? 0);
              if (waterNeeded > 0) cost.water = Math.min(waterNeeded, snap.water?.amount ?? 0);
              if (this._rm.spend(cost)) {
                inst.stock.food  = Math.min(inst.stock.food  + (cost.food  ?? 0), stockCap);
                inst.stock.water = Math.min(inst.stock.water + (cost.water ?? 0), stockCap);
                eventBus.emit('building:cafeteria:restocked', { instanceId: inst.instanceId, stock: { ...inst.stock } });
              }
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
      // Emit shortfall event only once per shortfall episode
      if (!this._cafeteriaWarningSent) {
        this._cafeteriaWarningSent = true;
        eventBus.emit('building:cafeteria:shortfall', { message: 'Cafeteria is out of food or water — population is shrinking!' });
      }
    }
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
    // Per-level requirements (e.g. House Lv.3 needs Cafeteria Lv.2; Bank Lv.3 needs Population ≥ 20)
    const lvlReqCheck = this._checkRequirements(cfg.levelRequirements?.[pendingLevel]);
    if (!lvlReqCheck.met) return { success: false, reason: lvlReqCheck.reason };

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
  // Cafeteria & automation
  // ─────────────────────────────────────────────

  /**
   * Returns all cafeteria instances with their current stock and stock cap.
   */
  getCafeteriaStock() {
    const instances = this._buildings.get('cafeteria') ?? [];
    return instances
      .filter(inst => (inst.level ?? 0) > 0)
      .map(inst => ({
        instanceId: inst.instanceId,
        level: inst.level,
        stock: inst.stock ?? { food: 0, water: 0 },
        stockCap: { food: 200 * inst.level, water: 200 * inst.level },
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
    const stockCap = 200 * targetInst.level;
    const canAddFood  = Math.max(0, Math.min(foodAmount,  stockCap - targetInst.stock.food));
    const canAddWater = Math.max(0, Math.min(waterAmount, stockCap - targetInst.stock.water));

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
      buildQueue:        [...this._buildQueue],
      premiumBuildSlots: this._premiumBuildSlots,
      automations:       { ...this._automations },
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
    // Start from base caps for the new resource set
    const caps = { wood: 5000, stone: 5000, iron: 2000, food: 1000, water: 2000, diamond: Infinity, money: 50000 };
    let popCap = 0;

    for (const [id, instances] of this._buildings) {
      const cfg = BUILDINGS_CONFIG[id];
      if (!cfg?.storageCap) {
        // House: contributes to population cap, not resource cap
      } else {
        for (const inst of instances) {
          if ((inst.level ?? 0) <= 0) continue;
          for (const [res, perLevel] of Object.entries(cfg.storageCap)) {
            caps[res] = (caps[res] ?? 0) + perLevel * inst.level;
          }
        }
      }

      // Population cap from houses (10 people per level, absolute max 1000)
      if (id === 'house') {
        for (const inst of instances) {
          popCap += (inst.level ?? 0) * 10;
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
}
