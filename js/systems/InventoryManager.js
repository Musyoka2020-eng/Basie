/**
 * InventoryManager.js
 * Manages the player's item inventory.
 * Items include hero recruitment cards (specific and universal) and XP bundles.
 * Items are added via quest/achievement rewards, welcome mail, or future shop purchases.
 */
import { eventBus }       from '../core/EventBus.js';
import { INVENTORY_ITEMS } from '../entities/GAME_DATA.js';

export class InventoryManager {
  constructor() {
    this.name = 'InventoryManager';
    /** @type {Map<string, number>} itemId → quantity */
    this._items = new Map();
    this._hm = null; // set via setHeroManager()
    this._rm = null; // set via setResourceManager()
    this._bm = null; // set via setBuildingManager()
    this._um = null; // set via setUnitManager()
    this._tm = null; // set via setTechnologyManager()
  }

  setHeroManager(hm)       { this._hm = hm; }
  setResourceManager(rm)   { this._rm = rm; }
  setBuildingManager(bm)   { this._bm = bm; }
  setUnitManager(um)       { this._um = um; }
  setTechnologyManager(tm) { this._tm = tm; }

  /** Get count of fragments for a hero by heroId */
  getFragmentCount(heroId) {
    const fragId = `fragment_${heroId}`;
    return this._items.get(fragId) ?? 0;
  }

  // ─────────────────────────────────────────────
  // MUTATION
  // ─────────────────────────────────────────────

  /**
   * Add qty of an item to the inventory.
   * @param {string} itemId
   * @param {number} [qty=1]
   */
  addItem(itemId, qty = 1) {
    if (!INVENTORY_ITEMS[itemId]) {
      console.warn(`[InventoryManager] Unknown item: ${itemId}`);
      return;
    }
    this._items.set(itemId, (this._items.get(itemId) ?? 0) + qty);
    eventBus.emit('inventory:updated', this.getItems());
  }

  /**
   * Remove qty of an item. Returns false if insufficient quantity.
   * @param {string} itemId
   * @param {number} [qty=1]
   * @returns {boolean}
   */
  removeItem(itemId, qty = 1) {
    const current = this._items.get(itemId) ?? 0;
    if (current < qty) return false;
    const next = current - qty;
    if (next === 0) this._items.delete(itemId);
    else            this._items.set(itemId, next);
    eventBus.emit('inventory:updated', this.getItems());
    return true;
  }

  // ─────────────────────────────────────────────
  // QUERY
  // ─────────────────────────────────────────────

  /**
   * Check whether the player has at least qty of an item.
   * @param {string} itemId
   * @param {number} [qty=1]
   */
  hasItem(itemId, qty = 1) {
    return (this._items.get(itemId) ?? 0) >= qty;
  }

  /**
   * Get quantity of a specific item.
   * @param {string} itemId
   * @returns {number}
   */
  getQuantity(itemId) {
    return this._items.get(itemId) ?? 0;
  }

  /**
   * Returns all inventory items (config merged with current quantity).
   * Items with qty 0 are included so UI can show grayed-out entries.
   * @returns {Array<object>}
   */
  getItems() {
    return Object.values(INVENTORY_ITEMS).map(cfg => ({
      ...cfg,
      quantity: this._items.get(cfg.id) ?? 0,
    }));
  }

  /**
   * Returns only items the player currently owns (qty > 0).
   * @returns {Array<object>}
   */
  getOwnedItems() {
    return this.getItems().filter(i => i.quantity > 0);
  }

  /**
   * Returns items filtered by type.
   * @param {string} type  e.g. 'hero_card', 'hero_card_universal', 'xp_bundle'
   */
  getItemsByType(type) {
    return this.getItems().filter(i => i.type === type);
  }

  /**
   * Use/consume one of an item, applying its effect.
   * @param {string} itemId
   * @param {{ heroId?: string, queueType?: string }} [opts]
   * @returns {{ success: boolean, reason?: string }}
   */
  useItem(itemId, { heroId, queueType } = {}) {
    const cfg = INVENTORY_ITEMS[itemId];
    if (!cfg) return { success: false, reason: 'Unknown item.' };
    if (!this.hasItem(itemId)) return { success: false, reason: `You don't have ${cfg.name}.` };

    if (cfg.type === 'hero_card' || cfg.type === 'hero_card_universal') {
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      const r = this._hm.recruitWithCard(itemId);
      return r;

    } else if (cfg.type === 'recruitment_scroll') {
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      // removeItem is handled inside rollScroll so the result info is correct
      const r = this._hm.rollScroll(cfg.tier);
      // Emit inventory update (removeItem inside rollScroll already emits,
      // but addItem for the reward also emits — no extra emit needed)
      return { success: true, gachaResult: r };

    } else if (cfg.type === 'hero_fragment') {
      // Convert fragment to XP on a chosen hero
      if (!heroId) return { success: false, reason: 'Select a hero to receive the XP.' };
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      return this._hm.useFragmentAsXP(itemId, heroId);

    } else if (cfg.type === 'xp_bundle') {
      if (!heroId) return { success: false, reason: 'Select a hero to receive the XP.' };
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      // Support both cfg.xpAmount and cfg.grants.xp (GAME_DATA uses grants.xp)
      const xpAmount = cfg.xpAmount ?? cfg.grants?.xp ?? 0;
      if (!xpAmount) return { success: false, reason: 'XP bundle has no XP value configured.' };
      const r = this._hm.awardHeroXP(heroId, xpAmount);
      if (!r?.success) return { success: false, reason: r?.reason ?? 'Could not award XP.' };
      this.removeItem(itemId, 1);
      return { success: true, xpAmount };

    } else if (cfg.type === 'resource_bundle') {
      if (!this._rm) return { success: false, reason: 'Resource system not available.' };
      this.removeItem(itemId, 1);
      this._rm.add(cfg.grants);
      eventBus.emit('inventory:itemUsed', { itemId, grants: cfg.grants });
      return { success: true, grants: cfg.grants };

    } else if (cfg.type === 'buff') {
      if (!this._hm) return { success: false, reason: 'Hero system not available.' };
      this.removeItem(itemId, 1);
      this._hm.activateBuff({ value: cfg.value, durationMs: cfg.durationMs });
      eventBus.emit('inventory:itemUsed', { itemId });
      return { success: true, durationMs: cfg.durationMs, value: cfg.value };

    } else if (cfg.type === 'speed_boost') {
      const target = queueType ?? cfg.target;
      if (cfg.target !== 'any' && target !== cfg.target) {
        return { success: false, reason: `This speedup only works on ${cfg.target}.` };
      }
      const skipSec = cfg.skipSeconds >= 999999 || !isFinite(cfg.skipSeconds) ? 999999 : cfg.skipSeconds;
      let result;
      if (target === 'building') {
        if (!this._bm) return { success: false, reason: 'Building system not available.' };
        result = this._bm.reduceActiveTimer(skipSec);
      } else if (target === 'training') {
        if (!this._um) return { success: false, reason: 'Training system not available.' };
        result = this._um.reduceActiveTrainTimer(skipSec);
      } else if (target === 'research') {
        if (!this._tm) return { success: false, reason: 'Research system not available.' };
        result = this._tm.reduceActiveResearchTimer(skipSec);
      } else {
        return { success: false, reason: 'Invalid speedup target.' };
      }
      if (!result.success) return result;
      this.removeItem(itemId, 1);
      eventBus.emit('inventory:itemUsed', { itemId, target, skipSeconds: cfg.skipSeconds });
      return { success: true, remaining: result.remaining, completed: result.completed, target };

    }
    return { success: false, reason: 'This item cannot be used.' };
  }

  // ─────────────────────────────────────────────
  // GAME ENGINE HOOK
  // ─────────────────────────────────────────────

  /** No per-tick logic needed. */
  update(_dt) {}

  // ─────────────────────────────────────────────
  // PERSISTENCE
  // ─────────────────────────────────────────────

  serialize() {
    return { items: Object.fromEntries(this._items) };
  }

  deserialize(data) {
    if (!data?.items) return;
    for (const [id, qty] of Object.entries(data.items)) {
      if (INVENTORY_ITEMS[id] && qty > 0) this._items.set(id, qty);
    }
  }
}
