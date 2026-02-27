/**
 * UnitManager.js
 * Handles unit training, queue management, and army tracking.
 * Units use a tier system: each base unit type (infantry/ranged/cavalry/siege)
 * has 10 tiers. Reserve and queue keys use the format "infantry_t1", "ranged_t3", etc.
 */
import { eventBus } from '../core/EventBus.js';
import { UNITS_CONFIG, BUILDINGS_CONFIG } from '../entities/GAME_DATA.js';

export class UnitManager {
  /**
   * @param {import('./ResourceManager.js').ResourceManager} rm
   * @param {import('./BuildingManager.js').BuildingManager} bm
   */
  constructor(rm, bm) {
    this.name = 'UnitManager';
    this._rm = rm;
    this._bm = bm;
    this._tm = null; // set via setTechnologyManager() after TechnologyManager is created
    /** @type {Map<string, number>} tierKey (e.g. 'infantry_t1') -> count */
    this._reserve = new Map();
    /** @type {Map<string, {id: string, name: string, units: Map<string, number>, slotUnitLinks: Map<number, string>}>} squadId -> squad */
    this._squads = new Map();
    this._squadCounter = 1;
    /** @type {Map<string, Array<{count, endsAt, name, icon, tier}>>} tierKey -> queue */
    this._queues = new Map();
  }

  // ── Tier key helpers ───────────────────────────────────────────────────────
  /** @private Returns the tier key for reserve/queue maps. */
  _tierKey(unitId, tier) { return `${unitId}_t${tier}`; }

  /** @private Parses a tier key back to { unitId, tier }. */
  _parseTierKey(key) {
    const lastT = key.lastIndexOf('_t');
    if (lastT === -1) return { unitId: key, tier: 1 }; // legacy key
    return { unitId: key.substring(0, lastT), tier: parseInt(key.substring(lastT + 2)) || 1 };
  }

  /** @param {import('../systems/TechnologyManager.js').TechnologyManager} tm */
  setTechnologyManager(tm) {
    this._tm = tm;
  }

  update(dt) {
    const now = Date.now();
    let queueChanged = false;

    for (const [unitId, queueArray] of this._queues.entries()) {
      if (queueArray.length === 0) continue;

      const current = queueArray[0];
      if (now >= current.endsAt) {
        // Training complete — 'unitId' variable is actually the tierKey (e.g. 'infantry_t1')
        queueArray.shift();
        
        // Add to reserve (unitId here is the tierKey since queues are keyed by tierKey)
        const existing = this._reserve.get(unitId) ?? 0;
        this._reserve.set(unitId, existing + current.count);
        
        // Start next item in this specific queue
        if (queueArray.length > 0) {
          const { unitId: baseId, tier } = this._parseTierKey(unitId);
          const cfg = UNITS_CONFIG[baseId];
          const tierCfg = cfg?.tiers?.[tier - 1] ?? cfg;
          const trainMs = (tierCfg?.trainTime ?? 10) * 1000 * queueArray[0].count;
          queueArray[0].startedAt = now;
          queueArray[0].endsAt = now + trainMs;
        }

        eventBus.emit('unit:trained', { tierKey: unitId, count: current.count });
        eventBus.emit('army:updated');
        queueChanged = true;
      }
    }

    if (queueChanged) {
      eventBus.emit('unit:queueUpdated', this.getAllQueues());
    }
  }

  /**
   * Reduce the active training timer by `seconds` seconds.
   * Applies to the first active training queue item across all unit types.
   * @param {number} seconds
   * @returns {{ success: boolean, remaining?: number, reason?: string }}
   */
  reduceActiveTrainTimer(seconds) {
    const now = Date.now();
    for (const [, queueArray] of this._queues.entries()) {
      if (queueArray.length === 0) continue;
      const current = queueArray[0];
      if (current.endsAt && current.endsAt > now) {
        const skipMs = (seconds >= 999999 ? current.endsAt - now + 1000 : seconds * 1000);
        current.endsAt = Math.max(now, current.endsAt - skipMs);
        eventBus.emit('unit:queueUpdated', this.getAllQueues());
        const remaining = Math.max(0, current.endsAt - now);
        return { success: true, remaining, completed: remaining <= 0 };
      }
    }
    return { success: false, reason: 'No units are currently training.' };
  }

  /**
   * Queue a unit tier for training.
   * @param {string} unitId  Base unit type: 'infantry', 'ranged', 'cavalry', 'siege'
   * @param {number} count
   * @param {number} [tier=1]  Tier 1–10
   * @returns {{ success: boolean, reason?: string }}
   */
  train(unitId, count = 1, tier = 1) {
    const cfg = UNITS_CONFIG[unitId];
    if (!cfg) return { success: false, reason: 'Unknown unit type.' };
    if (tier < 1 || tier > (cfg.tiers?.length ?? 1)) {
      return { success: false, reason: `Invalid tier ${tier} for ${cfg.name}.` };
    }

    // HQ unlock gate — base unit type must be unlocked by current HQ level
    if (!this._bm.getHQUnlockedIds('units').has(unitId)) {
      const reqLv = this._bm.getRequiredHQLevel('units', unitId);
      return { success: false, reason: reqLv ? `Requires HQ Lv.${reqLv}` : 'Not yet unlockable.' };
    }

    const tierCfg = cfg.tiers?.[tier - 1] ?? cfg;

    // Tech gate for tier 4+
    if (tier >= 4 && tierCfg.techRequired) {
      const techLevel = this._tm?.getLevelOf(tierCfg.techRequired) ?? 0;
      const neededLevel = tier - 3; // tier 4 needs level 1, tier 5 needs level 2, etc.
      if (techLevel < neededLevel) {
        const techName = tierCfg.techRequired.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return { success: false, reason: `Requires ${techName} Lv.${neededLevel} to train tier ${tier}.` };
      }
    }

    const tierKey  = this._tierKey(unitId, tier);
    const unitQueue = this._queues.get(tierKey) || [];
    if (unitQueue.length >= 3) {
      return { success: false, reason: `Queue for ${tierCfg.name} (T${tier}) is full (max 3 slots).` };
    }

    // Building requirement (unit's buildingId must be built)
    const requiredBldg = cfg.buildingId;
    if (requiredBldg && this._bm.getLevelOf(requiredBldg) < 1) {
      const bldgName = BUILDINGS_CONFIG[requiredBldg]?.name ?? requiredBldg;
      return { success: false, reason: `Requires ${bldgName} to be built.` };
    }

    // Scale cost by count
    const totalCost = {};
    for (const [res, amt] of Object.entries(tierCfg.cost)) {
      totalCost[res] = amt * count;
    }

    if (!this._rm.canAfford(totalCost)) return { success: false, reason: 'Insufficient resources.' };
    this._rm.spend(totalCost);

    const trainMs   = (tierCfg.trainTime ?? 10) * 1000 * count;
    const isFirst   = unitQueue.length === 0;
    const now       = Date.now();

    unitQueue.push({
      count, tier, tierKey,
      endsAt:    isFirst ? now + trainMs : 0,
      startedAt: isFirst ? now : 0,
      name: tierCfg.name,
      icon: cfg.icon,
    });
    this._queues.set(tierKey, unitQueue);

    eventBus.emit('unit:queueUpdated', this.getAllQueues());
    return { success: true };
  }

  /**
   * Upgrade units in reserve from one tier to the next.
   * @param {string} unitId
   * @param {number} fromTier
   * @param {number} count
   * @returns {{ success: boolean, reason?: string }}
   */
  upgradeTier(unitId, fromTier, count) {
    const cfg = UNITS_CONFIG[unitId];
    if (!cfg) return { success: false, reason: 'Unknown unit type.' };
    const toTier = fromTier + 1;
    if (toTier > (cfg.tiers?.length ?? 1)) {
      return { success: false, reason: 'Already at maximum tier.' };
    }

    const tierCfg = cfg.tiers?.[fromTier - 1];
    if (!tierCfg?.upgradeCost) {
      return { success: false, reason: 'This tier cannot be upgraded.' };
    }

    // Check tech requirement for destination tier
    const destTierCfg = cfg.tiers?.[toTier - 1];
    if (destTierCfg?.techRequired) {
      const neededLevel = toTier - 3;
      if ((this._tm?.getLevelOf(destTierCfg.techRequired) ?? 0) < neededLevel) {
        const techName = destTierCfg.techRequired.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        return { success: false, reason: `Requires ${techName} Lv.${neededLevel}.` };
      }
    }

    const fromKey = this._tierKey(unitId, fromTier);
    const available = this._reserve.get(fromKey) ?? 0;
    if (available < count) {
      return { success: false, reason: `Not enough T${fromTier} ${cfg.name} in reserve (have ${available}, need ${count}).` };
    }

    const totalCost = {};
    for (const [res, amt] of Object.entries(tierCfg.upgradeCost)) {
      totalCost[res] = amt * count;
    }
    if (!this._rm.canAfford(totalCost)) return { success: false, reason: 'Insufficient resources for upgrade.' };
    this._rm.spend(totalCost);

    // Deduct from lower tier, add to higher tier
    this._reserve.set(fromKey, available - count);
    const toKey = this._tierKey(unitId, toTier);
    this._reserve.set(toKey, (this._reserve.get(toKey) ?? 0) + count);

    eventBus.emit('army:updated');
    return { success: true };
  }

  cancelTrain(tierKey, index) {
    const queue = this._queues.get(tierKey);
    if (!queue || index < 0 || index >= queue.length) return { success: false };

    const item = queue[index];
    const { unitId, tier } = this._parseTierKey(tierKey);
    const cfg = UNITS_CONFIG[unitId];
    const tierCfg = cfg?.tiers?.[tier - 1] ?? cfg;

    // Refund resources
    const refund = {};
    for (const [res, amt] of Object.entries(tierCfg?.cost ?? {})) {
      refund[res] = amt * item.count;
    }
    this._rm.add(refund);

    // Remove from queue
    queue.splice(index, 1);

    // If we removed the active item, start the next one
    if (index === 0 && queue.length > 0) {
      const next = queue[0];
      next.startedAt = Date.now();
      next.endsAt = next.startedAt + ((tierCfg?.trainTime ?? 10) * 1000 * next.count);
    }

    if (queue.length === 0) {
      this._queues.delete(tierKey);
    }

    eventBus.emit('unit:queueUpdated', this.getAllQueues());
    eventBus.emit('army:updated');
    return { success: true };
  }

  // Gets a flat array of all queue items for UI rendering
  getAllQueues() {
    const all = [];
    for (const [tierKey, queueArray] of this._queues.entries()) {
      const { unitId, tier } = this._parseTierKey(tierKey);
      const cfg     = UNITS_CONFIG[unitId];
      const tierCfg = cfg?.tiers?.[tier - 1] ?? cfg;
      queueArray.forEach((item, index) => {
        all.push({ ...item, tierKey, unitId, tier, buildingId: cfg?.buildingId, queueIndex: index });
      });
    }
    return all;
  }

  getReserve() {
    const result = [];
    for (const [tierKey, count] of this._reserve) {
      if (count <= 0) continue;
      const { unitId, tier } = this._parseTierKey(tierKey);
      const cfg     = UNITS_CONFIG[unitId];
      const tierCfg = cfg?.tiers?.[tier - 1];
      if (!cfg || !tierCfg) continue;
      result.push({
        unitId, tier, tierKey, count,
        name: tierCfg.name,
        icon: cfg.icon,
        category: cfg.category,
        buildingId: cfg.buildingId,
        stats: tierCfg.stats,
        cost: tierCfg.cost,
        upgradeCost: tierCfg.upgradeCost ?? null,
        techRequired: tierCfg.techRequired ?? null,
      });
    }
    return result;
  }

  getSquads() {
    return Array.from(this._squads.values()).map(s => {
      const units = [];
      for (const [tierKey, count] of s.units) {
        if (count <= 0) continue;
        const { unitId, tier } = this._parseTierKey(tierKey);
        const cfg     = UNITS_CONFIG[unitId];
        const tierCfg = cfg?.tiers?.[tier - 1];
        if (!cfg || !tierCfg) continue;
        units.push({ unitId, tier, tierKey, count, name: tierCfg.name, icon: cfg.icon, category: cfg.category, stats: tierCfg.stats, buildingId: cfg.buildingId });
      }
      return { ...s, units, slotUnitLinks: s.slotUnitLinks ?? new Map(), slotUnits: s.slotUnits ?? new Map() };
    });
  }

  getSquad(squadId) {
    const squad = this._squads.get(squadId);
    if (!squad) return null;
    const units = [];
    for (const [tierKey, count] of squad.units) {
      if (count <= 0) continue;
      const { unitId, tier } = this._parseTierKey(tierKey);
      const cfg     = UNITS_CONFIG[unitId];
      const tierCfg = cfg?.tiers?.[tier - 1];
      if (!cfg || !tierCfg) continue;
      units.push({ unitId, tier, tierKey, count, name: tierCfg.name, icon: cfg.icon, category: cfg.category, stats: tierCfg.stats, buildingId: cfg.buildingId });
    }
    return { ...squad, units, slotUnitLinks: squad.slotUnitLinks ?? new Map(), slotUnits: squad.slotUnits ?? new Map() };
  }

  /**
   * Get per-slot unit info (one type+tier per slot).
   * @param {string} squadId
   * @param {number} slotIndex
   * @returns {{ tierKey: string, unitId: string, tier: number, count: number, name: string, icon: string } | null}
   */
  getSlotUnit(squadId, slotIndex) {
    const squad = this._squads.get(squadId);
    if (!squad) return null;
    const entry = (squad.slotUnits ?? new Map()).get(slotIndex);
    if (!entry || entry.count <= 0) return null;
    const { unitId, tier } = this._parseTierKey(entry.tierKey);
    const cfg = UNITS_CONFIG[unitId];
    const tierCfg = cfg?.tiers?.[tier - 1];
    return { tierKey: entry.tierKey, unitId, tier, count: entry.count, name: tierCfg?.name ?? unitId, icon: cfg?.icon ?? '⚔️' };
  }

  /**
   * Remove all units owned by a slot, return them to reserve, and clear the slot link.
   * @param {string} squadId
   * @param {number} slotIndex
   */
  clearSlotUnits(squadId, slotIndex) {
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    if (!squad.slotUnits) squad.slotUnits = new Map();
    const entry = squad.slotUnits.get(slotIndex);
    if (entry && entry.count > 0) {
      const squadCount = squad.units.get(entry.tierKey) ?? 0;
      squad.units.set(entry.tierKey, Math.max(0, squadCount - entry.count));
      const reserveCount = this._reserve.get(entry.tierKey) ?? 0;
      this._reserve.set(entry.tierKey, reserveCount + entry.count);
    }
    squad.slotUnits.delete(slotIndex);
    squad.slotUnitLinks?.delete(slotIndex);
    eventBus.emit('army:updated');
    return { success: true };
  }

  createSquad(name) {
    const maxSquads = this.getMaxSquads();
    if (this._squads.size >= maxSquads) {
      return { success: false, reason: `Squad limit reached (${maxSquads}). Build another Barracks to unlock a new squad slot.` };
    }
    const id = 'squad_' + this._squadCounter++;
    this._squads.set(id, { id, name, units: new Map(), slotUnitLinks: new Map(), slotUnits: new Map() });
    eventBus.emit('army:updated');
    return { success: true, squadId: id };
  }

  /**
   * Returns how many squads can be created based on built Barracks count.
   * Each built Barracks instance provides one squad slot.
   * @returns {number}
   */
  getMaxSquads() {
    const built = this._bm.getBuiltInstanceCount('barracks');
    return Math.max(1, built); // always at least 1 so new players aren't stuck
  }

  /**
   * Maximum units per squad based on barracks level (level × 3).
   * @returns {number}
   */
  getMaxSquadSize() {
    return Math.max(3, this._bm.getLevelOf('barracks') * 3);
  }

  renameSquad(squadId, newName) {
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    squad.name = newName;
    eventBus.emit('army:updated');
    return { success: true };
  }

  deleteSquad(squadId) {
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    
    // Return units to reserve
    for (const [unitId, count] of squad.units) {
      const reserveTargetCount = this._reserve.get(unitId) ?? 0;
      this._reserve.set(unitId, reserveTargetCount + count);
    }
    
    this._squads.delete(squadId);
    eventBus.emit('army:updated');
    return { success: true };
  }

  /**
   * Link a slot index to a unit type for strategic effectiveness bonus.
   * @param {string} squadId
   * @param {number} slotIndex  0-based slot index
   * @param {string} unitType   'infantry' | 'ranged' | 'cavalry' | 'siege'
   */
  linkSlotUnit(squadId, slotIndex, unitType) {
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    if (!squad.slotUnitLinks) squad.slotUnitLinks = new Map();
    squad.slotUnitLinks.set(slotIndex, unitType);
    eventBus.emit('army:updated');
    return { success: true };
  }

  /**
   * Remove the slot-unit link for a given slot.
   * @param {string} squadId
   * @param {number} slotIndex
   */
  unlinkSlotUnit(squadId, slotIndex) {
    return this.clearSlotUnits(squadId, slotIndex);
  }

  /**
   * @param {string} squadId
   * @param {string} unitId
   * @param {number} count
   * @param {number} [tier=1]
   * @param {number|null} [slotIndex=null]  When provided, tracks per-slot ownership.
   */
  assignToSquad(squadId, unitId, count, tier = 1, slotIndex = null) {
    if (count <= 0) return { success: false, reason: 'Invalid count' };
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    const tierKey = this._tierKey(unitId, tier);
    const reserveCount = this._reserve.get(tierKey) ?? 0;
    if (reserveCount < count) return { success: false, reason: 'Not enough in reserve' };

    // If adding to a slot and the slot already has a different tier, clear the old one first
    if (slotIndex !== null) {
      if (!squad.slotUnits) squad.slotUnits = new Map();
      const existing = squad.slotUnits.get(slotIndex);
      if (existing && existing.tierKey !== tierKey) {
        // Return old tier's units to reserve
        const oldCount = squad.units.get(existing.tierKey) ?? 0;
        squad.units.set(existing.tierKey, Math.max(0, oldCount - existing.count));
        this._reserve.set(existing.tierKey, (this._reserve.get(existing.tierKey) ?? 0) + existing.count);
        squad.slotUnits.delete(slotIndex);
      }
    }

    this._reserve.set(tierKey, reserveCount - count);
    squad.units.set(tierKey, (squad.units.get(tierKey) ?? 0) + count);

    if (slotIndex !== null) {
      if (!squad.slotUnits) squad.slotUnits = new Map();
      const prev = squad.slotUnits.get(slotIndex);
      squad.slotUnits.set(slotIndex, { tierKey, count: (prev?.tierKey === tierKey ? prev.count : 0) + count });
    }

    eventBus.emit('army:updated');
    return { success: true };
  }

  removeFromSquad(squadId, unitId, count, tier = 1) {
    if (count <= 0) return { success: false, reason: 'Invalid count' };
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    const tierKey = this._tierKey(unitId, tier);
    const squadCount = squad.units.get(tierKey) ?? 0;
    if (squadCount < count) return { success: false, reason: 'Not enough in squad' };

    squad.units.set(tierKey, squadCount - count);
    const reserveTargetCount = this._reserve.get(tierKey) ?? 0;
    this._reserve.set(tierKey, reserveTargetCount + count);
    eventBus.emit('army:updated');
    return { success: true };
  }

  getTotalUnitCount() {
    let total = 0;
    for (const count of this._reserve.values()) total += count;
    for (const squad of this._squads.values()) {
      for (const count of squad.units.values()) total += count;
    }
    return total;
  }

  /** Remove units (for combat losses) — losses keyed by tierKey */
  removeUnitsFromSquad(squadId, losses) {
    const squad = this._squads.get(squadId);
    if (!squad) return;
    for (const [key, count] of Object.entries(losses)) {
      // Support both tierKey ('infantry_t1') and legacy unitId ('footman')
      const tierKey = key.includes('_t') ? key : this._tierKey(key, 1);
      const cur = squad.units.get(tierKey) ?? 0;
      squad.units.set(tierKey, Math.max(0, cur - count));
    }
    eventBus.emit('army:updated');
  }

  _checkRequirements(requires) {
    if (!requires) return { met: true };
    for (const [key, minLevel] of Object.entries(requires)) {
      // If the key is a known building, check building level
      if (BUILDINGS_CONFIG[key] !== undefined) {
        if (this._bm.getLevelOf(key) < minLevel) {
          const name = BUILDINGS_CONFIG[key]?.name ?? key;
          return { met: false, reason: `Requires ${name} Lv.${minLevel}` };
        }
      } else {
        // Treat as a technology requirement — minLevel acts as minimum research level
        const researchedLevel = this._tm?.getLevelOf(key) ?? 0;
        if (researchedLevel < minLevel) {
          // Format tech name from camelCase/snake_case to readable
          const techName = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          return { met: false, reason: `Requires ${techName}` };
        }
      }
    }
    return { met: true };
  }

  serialize() {
    const serializedSquads = {};
    for (const [id, squad] of this._squads.entries()) {
      serializedSquads[id] = {
        id:             squad.id,
        name:           squad.name,
        units:          Object.fromEntries(squad.units),
        slotUnitLinks:  Object.fromEntries(
          [...(squad.slotUnitLinks ?? new Map()).entries()].map(([k, v]) => [String(k), v])
        ),
        slotUnits: Object.fromEntries(
          [...(squad.slotUnits ?? new Map()).entries()].map(([k, v]) => [String(k), v])
        ),
      };
    }
    return {
      reserve:      Object.fromEntries(this._reserve),
      squads:       serializedSquads,
      squadCounter: this._squadCounter,
      queues:       Object.fromEntries(
        [...this._queues.entries()].map(([k, v]) => [k, v])
      ),
    };
  }

  deserialize(data) {
    if (!data) return;

    // Migration map: legacy flat unitId -> tierKey
    const LEGACY_MIGRATION = {
      footman: 'infantry_t1',
      archer:  'ranged_t1',
      knight:  'infantry_t4',
      mage:    'siege_t1',
    };
    const migrateKey = key => LEGACY_MIGRATION[key] ?? (key.includes('_t') ? key : null);
    
    const rawReserve = data.army ?? data.reserve ?? {};
    this._reserve = new Map();
    for (const [key, count] of Object.entries(rawReserve)) {
      const tierKey = migrateKey(key);
      if (tierKey && count > 0) {
        this._reserve.set(tierKey, (this._reserve.get(tierKey) ?? 0) + count);
      }
    }

    this._squads = new Map();
    if (data.squads) {
      for (const [id, s] of Object.entries(data.squads)) {
        const units = new Map();
        for (const [key, count] of Object.entries(s.units ?? {})) {
          const tierKey = migrateKey(key);
          if (tierKey && count > 0) units.set(tierKey, (units.get(tierKey) ?? 0) + count);
        }
        // Build slotUnitLinks — migrate legacy heroUnitLinks saves by assigning in slot order
        let slotUnitLinks = new Map();
        if (s.slotUnitLinks && Object.keys(s.slotUnitLinks).length > 0) {
          for (const [k, v] of Object.entries(s.slotUnitLinks)) {
            slotUnitLinks.set(Number(k), v);
          }
        } else if (s.heroUnitLinks) {
          let slotIdx = 0;
          for (const v of Object.values(s.heroUnitLinks)) {
            slotUnitLinks.set(slotIdx++, v);
          }
        }
        // Restore per-slot unit counts
        let slotUnits = new Map();
        if (s.slotUnits) {
          for (const [k, v] of Object.entries(s.slotUnits)) {
            if (v && v.tierKey) slotUnits.set(Number(k), { tierKey: migrateKey(v.tierKey) ?? v.tierKey, count: v.count ?? 0 });
          }
        }
        this._squads.set(id, { id: s.id, name: s.name, units, slotUnitLinks, slotUnits });
      }
    }
    this._squadCounter = data.squadCounter ?? 1;

    this._queues = new Map();
    if (data.queues) {
      for (const [key, arr] of Object.entries(data.queues)) {
        const tierKey = migrateKey(key) ?? key;
        if (!tierKey) continue;
        const adjustedArray = arr.map(q => ({
          ...q,
          endsAt: q.endsAt > 0 && q.endsAt < Date.now() ? Date.now() : q.endsAt,
        }));
        this._queues.set(tierKey, adjustedArray);
      }
    }
  }
}
