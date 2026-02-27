/**
 * MarketManager.js
 * Allows players to trade resources at defined exchange rates.
 * Features a "price inflation" mechanic — the more you buy the same trade,
 * the more expensive it gets (resets daily in future Firestore version).
 */
import { eventBus } from '../core/EventBus.js';

const TRADES = [
  {
    id: 'wood_for_stone',
    label: 'Trade Wood → Stone',
    from: { resource: 'wood', amount: 100 },
    to:   { resource: 'stone', amount: 90 },
    icon: '🪨',
    description: 'Exchange Wood for Stone with local merchants.',
  },
  {
    id: 'stone_for_wood',
    label: 'Trade Stone → Wood',
    from: { resource: 'stone', amount: 100 },
    to:   { resource: 'wood', amount: 90 },
    icon: '🪵',
    description: 'Exchange Stone for Wood with local merchants.',
  },
  {
    id: 'stone_for_iron',
    label: 'Trade Stone → Iron',
    from: { resource: 'stone', amount: 80 },
    to:   { resource: 'iron', amount: 30 },
    icon: '⚙️',
    description: 'Trade Stone ore deposits for processed Iron.',
  },
  {
    id: 'iron_for_money',
    label: 'Sell Iron → Money',
    from: { resource: 'iron', amount: 50 },
    to:   { resource: 'money', amount: 400 },
    icon: '🪙',
    description: 'Sell valuable Iron ore for Money to merchant caravans.',
  },
  {
    id: 'food_for_water',
    label: 'Trade Food → Water',
    from: { resource: 'food', amount: 100 },
    to:   { resource: 'water', amount: 80 },
    icon: '💧',
    description: 'Exchange surplus Food for Water reserves.',
  },
  {
    id: 'water_for_food',
    label: 'Trade Water → Food',
    from: { resource: 'water', amount: 100 },
    to:   { resource: 'food', amount: 80 },
    icon: '🌾',
    description: 'Exchange Water for Food from farmers.',
  },
];

const INFLATION_RATE   = 0.02; // +2% cost per purchase
const MAX_INFLATION    = 2.0;  // Cap at 2x base price

export class MarketManager {
  /**
   * @param {import('./ResourceManager.js').ResourceManager} rm
   */
  constructor(rm) {
    this.name = 'MarketManager';
    this._rm = rm;
    /** @type {Map<string, number>} tradeId -> numberOfTimesBought */
    this._purchaseCounts = new Map();
    TRADES.forEach(t => this._purchaseCounts.set(t.id, 0));
    /** @type {string} ISO date string of last daily reset (YYYY-MM-DD) */
    this._lastResetDate = new Date().toISOString().slice(0, 10);
    this._techBonuses = {};
    eventBus.on('resources:bonusChanged', b => { this._techBonuses = b || {}; });
  }

  /**
   * Execute a trade.
   * @param {string} tradeId
   * @returns {{ success: boolean, reason?: string, cost?: object, gain?: object }}
   */
  trade(tradeId) {
    const base = TRADES.find(t => t.id === tradeId);
    if (!base) return { success: false, reason: 'Unknown trade.' };

    const count = this._purchaseCounts.get(tradeId) ?? 0;
    const inflationMult = Math.min(1 + count * INFLATION_RATE, MAX_INFLATION);
    const actualCost = Math.ceil(base.from.amount * inflationMult);
    const actualGain = Math.floor(base.to.amount * (1 + (this._techBonuses.tradeBonus || 0)));

    const costObj = { [base.from.resource]: actualCost };
    const gainObj = { [base.to.resource]: actualGain };

    if (!this._rm.canAfford(costObj)) {
      return { success: false, reason: 'Not enough resources.', cost: costObj };
    }

    this._rm.spend(costObj);
    this._rm.add(gainObj);
    this._purchaseCounts.set(tradeId, count + 1);

    eventBus.emit('market:traded', { tradeId, cost: costObj, gain: gainObj });
    return { success: true, cost: costObj, gain: gainObj };
  }

  /**
   * Get all trades with their current inflation-adjusted costs.
   * @returns {Array}
   */
  getTradesWithPrices() {
    return TRADES.map(base => {
      const count = this._purchaseCounts.get(base.id) ?? 0;
      const inflationMult = Math.min(1 + count * INFLATION_RATE, MAX_INFLATION);
      const currentCost = Math.ceil(base.from.amount * inflationMult);
      const currentGain = Math.floor(base.to.amount * (1 + (this._techBonuses.tradeBonus || 0)));
      return {
        ...base,
        currentCost,
        currentGain,
        inflationMult: inflationMult.toFixed(2),
        purchaseCount: count,
        canAfford: this._rm.canAfford({ [base.from.resource]: currentCost }),
      };
    });
  }

  update(dt) {
    // Daily price reset — check calendar day each tick
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this._lastResetDate) {
      this._purchaseCounts = new Map();
      TRADES.forEach(t => this._purchaseCounts.set(t.id, 0));
      this._lastResetDate = today;
      eventBus.emit('market:pricesReset');
      eventBus.emit('notification:show', { type: 'info', title: '🏪 Market Reset', message: 'Daily prices have been reset!' });
    }
  }

  serialize() {
    return {
      purchaseCounts: Object.fromEntries(this._purchaseCounts),
      lastResetDate: this._lastResetDate,
    };
  }

  deserialize(data) {
    if (!data) return;
    // Restore last reset date and check if a new day has begun
    this._lastResetDate = data.lastResetDate || new Date().toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this._lastResetDate) {
      // New day since last save — reset all counts
      this._purchaseCounts = new Map();
      TRADES.forEach(t => this._purchaseCounts.set(t.id, 0));
      this._lastResetDate = today;
    } else if (data.purchaseCounts) {
      for (const [id, count] of Object.entries(data.purchaseCounts)) {
        this._purchaseCounts.set(id, count);
      }
    }
  }
}
