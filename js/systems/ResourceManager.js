/**
 * ResourceManager.js
 * Manages all resource production, storage capacity, costs, and transactions.
 * Registered with the GameEngine and updated every tick.
 */
import { eventBus } from '../core/EventBus.js';

const DEFAULT_RESOURCES = {
  wood:    { amount: 300, perSec: 0, cap: 5000  },
  stone:   { amount: 200, perSec: 0, cap: 5000  },
  iron:    { amount: 0,   perSec: 0, cap: 2000  },
  food:    { amount: 100, perSec: 0, cap: 1000  },
  water:   { amount: 200, perSec: 0, cap: 2000  },
  diamond: { amount: 20,  perSec: 0, cap: Infinity },

  money:   { amount: 0,   perSec: 0, cap: 50000 },
};

export class ResourceManager {
  constructor() {
    this.name = 'ResourceManager';
    this._resources = JSON.parse(JSON.stringify(DEFAULT_RESOURCES));
    this._uiDirty = true;
    this._techBonuses = {};
    this._heroManager = null;
    this._buildingManager = null;
    this._lastActiveBuildings = [];
    /** Population is a pseudo-resource — not spent/earned like others. */
    this._population = { current: 0, cap: 0 };
    eventBus.on('resources:bonusChanged', b => { this._techBonuses = b || {}; });
  }

  /**
   * Wire BuildingManager after construction (for HQ-level benefits).
   * @param {import('../systems/BuildingManager.js').BuildingManager} bm
   */
  setBuildingManager(bm) {
    this._buildingManager = bm;
  }

  /**
   * Wire HeroManager after construction (avoids circular dependency).
   * @param {import('../systems/HeroManager.js').HeroManager} hm
   */
  setHeroManager(hm) {
    this._heroManager = hm;
    eventBus.on('buffs:changed',                () => this._reapplyRates());
    eventBus.on('hero:productionBonusChanged',   () => this._reapplyRates());
  }

  /** Re-run recalculateRates with the cached building list. */
  _reapplyRates() {
    if (this._lastActiveBuildings.length > 0) {
      this.recalculateRates(this._lastActiveBuildings);
    }
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
      res.amount = res.cap === Infinity ? res.amount + gained : Math.min(res.amount + gained, res.cap);
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
    this._lastActiveBuildings = activeBuildings ?? this._lastActiveBuildings;
    // Reset rates
    for (const key of Object.keys(this._resources)) {
      this._resources[key].perSec = 0;
    }
    for (const b of this._lastActiveBuildings) {
      if (!b.effects) continue;
      for (const [res, ratePerLevel] of Object.entries(b.effects)) {
        if (this._resources[res] !== undefined) {
          this._resources[res].perSec += ratePerLevel * b.level;
        }
      }
    }

    // Apply tech multipliers
    if (this._techBonuses.ironBonus)  this._resources.iron.perSec  *= (1 + this._techBonuses.ironBonus);
    if (this._techBonuses.woodBonus)  this._resources.wood.perSec  *= (1 + this._techBonuses.woodBonus);
    if (this._techBonuses.stoneBonus) this._resources.stone.perSec *= (1 + this._techBonuses.stoneBonus);
    if (this._techBonuses.waterBonus) this._resources.water.perSec *= (1 + this._techBonuses.waterBonus);

    // Apply HQ-level production bonus (all resources)
    if (this._buildingManager) {
      const hqBonus = this._buildingManager.getHQBenefits().productionBonus;
      if (hqBonus > 0) {
        for (const key of Object.keys(this._resources)) {
          this._resources[key].perSec *= (1 + hqBonus);
        }
      }
    }

    // Apply building-stationed hero production bonuses (e.g. Shadowblade at Mine → +gold)
    if (this._heroManager) {
      const heroBuildingBonuses = this._heroManager.getBuildingProductionBonusMap();
      for (const [res, bonus] of Object.entries(heroBuildingBonuses)) {
        if (this._resources[res] !== undefined) {
          this._resources[res].perSec *= (1 + bonus);
        }
      }

      // Apply active production buff multiplier to ALL resource rates
      const buffMult = this._heroManager.getActiveProductionMultiplier();
      if (buffMult > 0) {
        for (const key of Object.keys(this._resources)) {
          this._resources[key].perSec *= (1 + buffMult);
        }
      }
    }

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
        const cap = this._resources[key].cap;
        this._resources[key].amount = cap === Infinity
          ? this._resources[key].amount + amount
          : Math.min(this._resources[key].amount + amount, cap);
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
  // POPULATION
  // =============================================
  getPopulation() { return { ...this._population }; }

  setPopulationCap(cap) {
    const clamped = Math.max(0, Math.min(cap, 1000));
    if (this._population.cap === clamped) return;
    this._population.cap = clamped;
    // Shrink current pop if cap dropped below it
    if (this._population.current > clamped) {
      this._population.current = clamped;
    }
    eventBus.emit('population:updated', this.getPopulation());
  }

  growPopulation(amount) {
    if (this._population.current >= this._population.cap) return;
    this._population.current = Math.min(
      this._population.current + amount,
      this._population.cap
    );
    eventBus.emit('population:updated', this.getPopulation());
  }

  shrinkPopulation(amount) {
    if (this._population.current <= 0) return;
    this._population.current = Math.max(0, this._population.current - amount);
    eventBus.emit('population:updated', this.getPopulation());
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
    return { resources: this.getSnapshot(), population: { ...this._population } };
  }

  deserialize(data) {
    if (!data) return;
    // Support both old flat format (direct resource keys) and new format ({ resources, population })
    const resourceData = data.resources ?? data;
    for (const [key, res] of Object.entries(resourceData)) {
      if (this._resources[key]) {
        this._resources[key].amount = res.amount ?? 0;
        this._resources[key].cap    = res.cap    ?? DEFAULT_RESOURCES[key]?.cap ?? 0;
      }
    }
    if (data.population) {
      this._population.current = data.population.current ?? 0;
      this._population.cap     = data.population.cap     ?? 0;
    }
  }
}
