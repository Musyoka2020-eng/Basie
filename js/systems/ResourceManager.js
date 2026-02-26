/**
 * ResourceManager.js
 * Manages all resource production, storage capacity, costs, and transactions.
 * Registered with the GameEngine and updated every tick.
 */
import { eventBus } from '../core/EventBus.js';

const DEFAULT_RESOURCES = {
  gold:  { amount: 500, perSec: 0, cap: 5000 },
  wood:  { amount: 300, perSec: 0, cap: 5000 },
  stone: { amount: 200, perSec: 0, cap: 5000 },
  food:  { amount: 100, perSec: 0, cap: 1000 },
  mana:  { amount: 0,   perSec: 0, cap: 500  },
};

export class ResourceManager {
  constructor() {
    this.name = 'ResourceManager';
    this._resources = JSON.parse(JSON.stringify(DEFAULT_RESOURCES));
    this._uiDirty = true;
    this._techBonuses = {};
    eventBus.on('resources:bonusChanged', b => { this._techBonuses = b || {}; });
  }

  // =============================================
  // ENGINE SYSTEM INTERFACE
  // =============================================
  /** Called every tick by GameEngine */
  update(dt) {
    let changed = false;
    for (const [key, res] of Object.entries(this._resources)) {
      if (res.perSec === 0) continue;
      const gained = res.perSec * dt;
      const before = res.amount;
      res.amount = Math.min(res.amount + gained, res.cap);
      if (res.amount !== before) changed = true;
    }
    if (changed) {
      this._uiDirty = true;
      eventBus.emit('resources:tick', this.getSnapshot());
    }
  }

  // =============================================
  // PRODUCTION RATE MANAGEMENT
  // =============================================
  /**
   * Recalculates total production rates from all buildings.
   * Called by BuildingManager whenever a building is added/upgraded.
   * @param {Array<{effects: object, level: number}>} activeBuildings
   */
  recalculateRates(activeBuildings) {
    // Reset rates
    for (const key of Object.keys(this._resources)) {
      this._resources[key].perSec = 0;
    }
    for (const b of activeBuildings) {
      if (!b.effects) continue;
      for (const [res, ratePerLevel] of Object.entries(b.effects)) {
        if (this._resources[res] !== undefined) {
          this._resources[res].perSec += ratePerLevel * b.level;
        }
      }
    }

    // Apply tech multipliers
    if (this._techBonuses.goldBonus)  this._resources.gold.perSec  *= (1 + this._techBonuses.goldBonus);
    if (this._techBonuses.woodBonus)  this._resources.wood.perSec  *= (1 + this._techBonuses.woodBonus);
    if (this._techBonuses.stoneBonus) this._resources.stone.perSec *= (1 + this._techBonuses.stoneBonus);
    if (this._techBonuses.manaBonus)  this._resources.mana.perSec  *= (1 + this._techBonuses.manaBonus);

    eventBus.emit('resources:ratesChanged', this.getSnapshot());
  }

  // =============================================
  // TRANSACTIONS
  // =============================================
  /**
   * Check if the player can afford a cost map.
   * @param {object} cost e.g. { gold: 100, wood: 50 }
   * @returns {boolean}
   */
  canAfford(cost) {
    for (const [key, amount] of Object.entries(cost)) {
      if ((this._resources[key]?.amount ?? 0) < amount) return false;
    }
    return true;
  }

  /**
   * Returns how many times a given cost map can be afforded with current resources.
   * @param {object} costMap e.g. { gold: 100, wood: 50 }
   * @returns {number}
   */
  maxAffordable(costMap) {
    let max = Infinity;
    for (const [res, amt] of Object.entries(costMap)) {
      const has = this._resources[res]?.amount ?? 0;
      max = Math.min(max, Math.floor(has / amt));
    }
    return max === Infinity ? 0 : max;
  }

  /**
   * Deduct resources if affordable. Returns success boolean.
   * @param {object} cost
   * @returns {boolean}
   */
  spend(cost) {
    if (!this.canAfford(cost)) return false;
    for (const [key, amount] of Object.entries(cost)) {
      this._resources[key].amount -= amount;
    }
    eventBus.emit('resources:spent', cost);
    this._uiDirty = true;
    return true;
  }

  /**
   * Add resources to the player's stockpile.
   * @param {object} rewards e.g. { gold: 500, xp: 100 }
   */
  add(rewards) {
    for (const [key, amount] of Object.entries(rewards)) {
      if (this._resources[key] !== undefined) {
        this._resources[key].amount = Math.min(
          this._resources[key].amount + amount,
          this._resources[key].cap
        );
      }
    }
    eventBus.emit('resources:added', rewards);
    this._uiDirty = true;
  }

  /**
   * Increase resource storage cap (triggered by buildings).
   * @param {string} resource
   * @param {number} newCap
   */
  setCap(resource, newCap) {
    if (this._resources[resource]) {
      this._resources[resource].cap = newCap;
    }
  }

  // =============================================
  // SERIALIZATION
  // =============================================
  getSnapshot() {
    const snap = {};
    for (const [key, res] of Object.entries(this._resources)) {
      snap[key] = { ...res };
    }
    return snap;
  }

  serialize() {
    return this.getSnapshot();
  }

  deserialize(data) {
    if (!data) return;
    for (const [key, res] of Object.entries(data)) {
      if (this._resources[key]) {
        this._resources[key].amount = res.amount ?? 0;
        this._resources[key].cap    = res.cap    ?? DEFAULT_RESOURCES[key].cap;
      }
    }
  }
}
