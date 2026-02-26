/**
 * MarketManager.js
 * Allows players to trade resources at defined exchange rates.
 * Features a "price inflation" mechanic — the more you buy the same trade,
 * the more expensive it gets (resets daily in future Firestore version).
 */
import { eventBus } from '../core/EventBus.js';

const TRADES = [
  {
    id: 'gold_for_wood',
    label: 'Buy Wood',
    from: { resource: 'gold', amount: 100 },
    to:   { resource: 'wood', amount: 60 },
    icon: '🪵',
    description: 'Convert Gold into Wood at market rates.',
  },
  {
    id: 'gold_for_stone',
    label: 'Buy Stone',
    from: { resource: 'gold', amount: 100 },
    to:   { resource: 'stone', amount: 50 },
    icon: '🪨',
    description: 'Convert Gold into Stone at market rates.',
  },
  {
    id: 'gold_for_food',
    label: 'Buy Food',
    from: { resource: 'gold', amount: 80 },
    to:   { resource: 'food', amount: 40 },
    icon: '🌾',
    description: 'Buy emergency food supplies.',
  },
  {
    id: 'gold_for_mana',
    label: 'Buy Mana',
    from: { resource: 'gold', amount: 200 },
    to:   { resource: 'mana', amount: 50 },
    icon: '💎',
    description: 'Purchase crystallized mana from travelling wizards.',
  },
  {
    id: 'wood_for_gold',
    label: 'Sell Wood',
    from: { resource: 'wood', amount: 80 },
    to:   { resource: 'gold', amount: 60 },
    icon: '💰',
    description: 'Sell surplus Wood for Gold.',
  },
  {
    id: 'stone_for_gold',
    label: 'Sell Stone',
    from: { resource: 'stone', amount: 80 },
    to:   { resource: 'gold', amount: 55 },
    icon: '💰',
    description: 'Sell surplus Stone for Gold.',
  },
  {
    id: 'food_for_gold',
    label: 'Sell Food',
    from: { resource: 'food', amount: 50 },
    to:   { resource: 'gold', amount: 40 },
    icon: '💰',
    description: 'Sell surplus Food at the market.',
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

  update(dt) { /* No tick needed */ }

  serialize() { return { purchaseCounts: Object.fromEntries(this._purchaseCounts) }; }
  deserialize(data) {
    if (!data?.purchaseCounts) return;
    for (const [id, count] of Object.entries(data.purchaseCounts)) {
      this._purchaseCounts.set(id, count);
    }
  }
}
