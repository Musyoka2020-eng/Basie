/**
 * UnitManager.js
 * Handles unit training, queue management, and army tracking.
 */
import { eventBus } from '../core/EventBus.js';
import { UNITS_CONFIG } from '../entities/GAME_DATA.js';

export class UnitManager {
  /**
   * @param {import('./ResourceManager.js').ResourceManager} rm
   * @param {import('./BuildingManager.js').BuildingManager} bm
   */
  constructor(rm, bm) {
    this.name = 'UnitManager';
    this._rm = rm;
    this._bm = bm;
    /** @type {Map<string, number>} unitId -> count */
    this._reserve = new Map();
    /** @type {Map<string, {id: string, name: string, units: Map<string, number>}>} squadId -> squad */
    this._squads = new Map();
    this._squadCounter = 1;
    /** @type {Map<string, Array<{count, endsAt, name, icon}>>} unitId -> queue */
    this._queues = new Map();
  }

  update(dt) {
    const now = Date.now();
    let queueChanged = false;

    for (const [unitId, queueArray] of this._queues.entries()) {
      if (queueArray.length === 0) continue;

      const current = queueArray[0];
      if (now >= current.endsAt) {
        // Training complete
        queueArray.shift();
        
        // Add to reserve
        const existing = this._reserve.get(unitId) ?? 0;
        this._reserve.set(unitId, existing + current.count);
        
        // Start next item in this specific queue
        if (queueArray.length > 0) {
          const cfg = UNITS_CONFIG[unitId];
          const trainMs = cfg.trainTime * 1000 * queueArray[0].count;
          queueArray[0].startedAt = now;
          queueArray[0].endsAt = now + trainMs;
        }

        eventBus.emit('unit:trained', { unitId, count: current.count });
        eventBus.emit('army:updated');
        queueChanged = true;
      }
    }

    if (queueChanged) {
      eventBus.emit('unit:queueUpdated', this.getAllQueues());
    }
  }

  /**
   * Queue a unit for training.
   * @param {string} unitId
   * @param {number} count
   * @returns {{ success: boolean, reason?: string }}
   */
  train(unitId, count = 1) {
    const cfg = UNITS_CONFIG[unitId];
    if (!cfg) return { success: false, reason: 'Unknown unit type.' };

    const unitQueue = this._queues.get(unitId) || [];
    if (unitQueue.length >= 3) {
      return { success: false, reason: `Queue for ${cfg.name} is full (max 3 slots).` };
    }

    if (!this._checkRequirements(cfg.requires)) {
      return { success: false, reason: `Requires the right building.` };
    }

    // Scale cost by count
    const totalCost = {};
    for (const [res, amt] of Object.entries(cfg.cost)) {
      totalCost[res] = amt * count;
    }

    if (!this._rm.canAfford(totalCost)) return { success: false, reason: 'Insufficient resources.' };
    this._rm.spend(totalCost);

    const trainMs = cfg.trainTime * 1000 * count;

    // If the queue is empty, training begins now. Otherwise, it waits and we don't set endsAt until it reaches the front.
    const isFirst = unitQueue.length === 0;
    const now     = Date.now();
    const endsAt  = isFirst ? now + trainMs : 0;
    const startedAt = isFirst ? now : 0;

    unitQueue.push({ count, endsAt, startedAt, name: cfg.name, icon: cfg.icon });
    this._queues.set(unitId, unitQueue);

    eventBus.emit('unit:queueUpdated', this.getAllQueues());
    return { success: true };
  }

  cancelTrain(unitId, index) {
    const queue = this._queues.get(unitId);
    if (!queue || index < 0 || index >= queue.length) return { success: false };

    const item = queue[index];
    const cfg = UNITS_CONFIG[unitId];

    // Refund resources
    const refund = {};
    for (const [res, amt] of Object.entries(cfg.cost)) {
      refund[res] = amt * item.count;
    }
    this._rm.add(refund);

    // Remove from queue
    queue.splice(index, 1);

    // If we removed the active item, we need to start the next one if it exists
    if (index === 0 && queue.length > 0) {
      const next = queue[0];
      const nextCfg = UNITS_CONFIG[unitId];
      next.startedAt = Date.now();
      next.endsAt = next.startedAt + (nextCfg.trainTime * 1000 * next.count);
    }

    if (queue.length === 0) {
      this._queues.delete(unitId);
    }

    eventBus.emit('unit:queueUpdated', this.getAllQueues());
    eventBus.emit('army:updated'); // Refresh UI
    return { success: true };
  }

  // Gets a flat array of all queue items for UI rendering
  getAllQueues() {
    const all = [];
    for (const [unitId, queueArray] of this._queues.entries()) {
      queueArray.forEach((item, index) => {
        all.push({ ...item, unitId, queueIndex: index });
      });
    }
    return all;
  }

  getReserve() {
    const result = [];
    for (const [unitId, count] of this._reserve) {
      if (count > 0) result.push({ ...UNITS_CONFIG[unitId], unitId, count });
    }
    return result;
  }

  getSquads() {
    return Array.from(this._squads.values()).map(s => {
      const units = [];
      for (const [unitId, count] of s.units) {
        if (count > 0) units.push({ ...UNITS_CONFIG[unitId], unitId, count });
      }
      return { ...s, units };
    });
  }

  getSquad(squadId) {
    const squad = this._squads.get(squadId);
    if (!squad) return null;
    const units = [];
    for (const [unitId, count] of squad.units) {
      if (count > 0) units.push({ ...UNITS_CONFIG[unitId], unitId, count });
    }
    return { ...squad, units };
  }

  createSquad(name) {
    const id = 'squad_' + this._squadCounter++;
    this._squads.set(id, { id, name, units: new Map() });
    eventBus.emit('army:updated');
    return id;
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

  assignToSquad(squadId, unitId, count) {
    if (count <= 0) return { success: false, reason: 'Invalid count' };
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    const reserveCount = this._reserve.get(unitId) ?? 0;
    if (reserveCount < count) return { success: false, reason: 'Not enough in reserve' };

    this._reserve.set(unitId, reserveCount - count);
    const squadTargetCount = squad.units.get(unitId) ?? 0;
    squad.units.set(unitId, squadTargetCount + count);
    eventBus.emit('army:updated');
    return { success: true };
  }

  removeFromSquad(squadId, unitId, count) {
    if (count <= 0) return { success: false, reason: 'Invalid count' };
    const squad = this._squads.get(squadId);
    if (!squad) return { success: false, reason: 'Squad not found' };
    const squadCount = squad.units.get(unitId) ?? 0;
    if (squadCount < count) return { success: false, reason: 'Not enough in squad' };

    squad.units.set(unitId, squadCount - count);
    const reserveTargetCount = this._reserve.get(unitId) ?? 0;
    this._reserve.set(unitId, reserveTargetCount + count);
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

  /** Remove units (for combat) */
  removeUnitsFromSquad(squadId, losses) {
    const squad = this._squads.get(squadId);
    if (!squad) return;
    for (const [unitId, count] of Object.entries(losses)) {
      const cur = squad.units.get(unitId) ?? 0;
      squad.units.set(unitId, Math.max(0, cur - count));
    }
    eventBus.emit('army:updated');
  }

  _checkRequirements(requires) {
    if (!requires) return true;
    for (const [bId, minLevel] of Object.entries(requires)) {
      if (this._bm.getLevelOf(bId) < minLevel) return false;
    }
    return true;
  }

  serialize() {
    const serializedSquads = {};
    for (const [id, squad] of this._squads.entries()) {
      serializedSquads[id] = { id: squad.id, name: squad.name, units: Object.fromEntries(squad.units) };
    }
    return {
      reserve: Object.fromEntries(this._reserve),
      squads: serializedSquads,
      squadCounter: this._squadCounter,
      queues: Object.fromEntries(this._queues),
    };
  }

  deserialize(data) {
    if (!data) return;
    
    // Legacy migration: if 'army' exists, put it all into reserve
    if (data.army) {
        this._reserve = new Map(Object.entries(data.army));
    } else {
        this._reserve = new Map(Object.entries(data.reserve ?? {}));
    }

    this._squads = new Map();
    if (data.squads) {
      for (const [id, s] of Object.entries(data.squads)) {
        this._squads.set(id, { id: s.id, name: s.name, units: new Map(Object.entries(s.units ?? {})) });
      }
    }
    this._squadCounter = data.squadCounter ?? 1;

    this._queues = new Map();
    if (data.queues) {
      for (const [unitId, arr] of Object.entries(data.queues)) {
        const adjustedArray = arr.map(q => ({
          ...q,
          // Only adjust endsAt if it is an active timer (endsAt > 0)
          endsAt: q.endsAt > 0 && q.endsAt - (Date.now() - q.endsAt) < 0 ? Date.now() : q.endsAt
        }));
        this._queues.set(unitId, adjustedArray);
      }
    } else if (data.queue) {
      // Migrate legacy flat queue
      // Dropping legacy queue to prevent edge case bugs
    }
  }
}
